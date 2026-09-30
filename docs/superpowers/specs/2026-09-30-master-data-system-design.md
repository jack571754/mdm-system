# 主数据管理系统 技术设计文档

> 日期：2026-09-30 ｜ 状态：待评审
> 产品依据：[主数据管理系统产品规划.md](../../../主数据管理系统产品规划.md)（下称「规划文档」，字段清单、权限矩阵、分期路线均以它为准）

---

## 1. 概述

轻量主数据管理系统：同步中枢 + 维护工作台 + 统一供数出口。数据域两块——产品（货品编号唯一，≤1 万条）、机制（机制编码唯一，≤数百条）。四个写入通道（数仓同步 / Excel 导入 / API 推送[V2 契约] / 手工维护）统一经过「校验 → 权威源合并 → 留痕」管道，通过查询页面、Excel 导出、查询/增量 API 统一供数。

## 2. 已确认决策

| 决策项 | 结论 |
|--------|------|
| 前端 | Vite + React + TypeScript + shadcn/ui + Tailwind CSS（SPA） |
| 后端 | Python 3.12 + FastAPI + SQLAlchemy 2.0（**同步模式**）+ Pydantic v2 |
| 数据库 | 生产 PostgreSQL；开发/测试 SQLite（`DATABASE_URL` 切换，全通用类型保证双跑） |
| 认证 | 账号密码（bcrypt）+ JWT；认证层抽象为独立模块，预留对接企业认证 |
| 数仓对接 | 直连数仓数据库只读查询，连接串/方言可配置 |
| 部署 | Linux + Docker Compose（nginx + backend + postgres 三服务） |
| 架构形态 | 单仓库 monorepo；FastAPI 单体，APScheduler 进程内调度（方案一，弃 Celery/Redis） |

## 3. 项目结构

```
主数据管理系统/
├── backend/
│   ├── app/
│   │   ├── api/          # 路由层：products / mechanisms / change_logs / sync / quality / auth / admin(枚举、用户、配置)
│   │   ├── services/     # 业务层：write_pipeline（写入管道）、sync_engine（同步引擎）、excel_io、quality、auth
│   │   ├── models/       # SQLAlchemy 模型
│   │   ├── schemas/      # Pydantic 模型
│   │   ├── core/         # config、security、database、scheduler
│   │   └── main.py
│   ├── alembic/
│   └── tests/
├── frontend/
│   └── src/{pages, components, api, hooks, lib}
├── docker-compose.yml
├── .env.example
└── docs/superpowers/specs/
```

**后端依赖**：fastapi、uvicorn、sqlalchemy、alembic、psycopg2-binary、pydantic-settings、apscheduler、passlib[bcrypt]、pyjwt、openpyxl、python-multipart；测试：pytest、httpx。

**前端依赖**：@tanstack/react-query、@tanstack/react-table、react-hook-form、zod、axios、react-router、lucide-react。

## 4. 数据模型

### 4.1 表清单

| 表 | 主键 | 说明 |
|------|------|------|
| `product` | `code`（货品编号） | 规划 §5.1 的 21 个业务字段 + 系统列（见 4.2） |
| `mechanism` | `code`（机制编码） | 规划 §5.2 的 14 个业务字段 + 系统列 |
| `mechanism_item` | `id`（代理主键） | 机制商品明细子表，见 4.3 |
| `change_log` | `id` | 变更日志，规划 §5.4 落库 |
| `enum_config` | `id` | 可配置枚举 |
| `user` | `id` | 用户与角色 |
| `sync_source` | `id` | 同步源配置 |
| `sync_run` | `id` | 同步执行记录 |
| `import_log` | `id` | 导入记录 |
| `app_config` | `key` | 键值配置（权威源优先级等） |

### 4.2 产品表 `product`

业务字段 21 列按规划 §5.1 原样落库，命名转 snake_case。要点：

- `code` 文本 PK；`name`、`brand`、`status`（商品状态）必填；
- 状态类字段（`sample_type` 正品/小样、`status` 商品状态、`sale_stage` 在售/新品/预售、`needs_maintenance` 是/否、`base_unit` 计量单位）**存文本**，取值由 `enum_config` 约束，应用层校验——不用数据库枚举类型；
- `retail_price` Numeric(12,2)，≥0；
- 系统列：`data_source`（最近变更渠道：数仓同步/Excel导入/API推送/手工）、`source_updated_at`（本系统最近变更时间）、`is_enabled`（启停标记）、`pending_delete`（待确认删除标记）、`created_at` / `updated_at`（本系统审计时间，区别于上游的 `upstream_created_at` / `upstream_write_date`）。

### 4.3 机制表 `mechanism` 与明细 `mechanism_item`

`mechanism`：`code` PK、`name` 必填、`source`（数据来源）必填；套装类型/机制类型走 `enum_config`；`start_date` / `end_date` 生效期（`end_date` ≥ `start_date`）；`mechanism_price` Numeric(12,2)；审核状态仅透传。系统列同产品表。

`mechanism_item`：

| 字段 | 约束 |
|------|------|
| `id` | 代理主键 |
| `mechanism_code` | FK → mechanism.code |
| `product_code` | FK → product.code；必须存在且未禁用（应用层校验，拒绝写入） |
| `product_name` / `product_short_name` / `product_spec` / `retail_price` | 随产品档案冗余，产品变更时级联刷新 |
| `quantity` | 必填，> 0 |
| `item_type` | 枚举：主品 / 赠品 |

约束：`UNIQUE(mechanism_code, product_code)` 联合去重。

### 4.4 变更日志 `change_log`

| 字段 | 说明 |
|------|------|
| `id` | 代理主键 |
| `object_type` | product / mechanism / mechanism_item |
| `object_code` | 货品编号 或 机制编码（明细变更另记 `sub_key` = 商品编码） |
| `field_name` | 变更字段；新增/删除记特殊值 `_created` / `_deleted` |
| `old_value` / `new_value` | 统一序列化为文本 |
| `operator` | 用户名 或 渠道名 |
| `channel` | 数仓同步 / Excel导入 / API推送 / 手工 |
| `created_at` | 操作时间 |

与业务数据**同事务**写入。保留 ≥ 1 年（不做分区，量级足够）。

### 4.5 配置与支撑表

- `enum_config(domain, field_name, value, sort_order, is_enabled)`：枚举值管理员可增改，新增枚举值仅管理员；
- `user(username, password_hash, role, is_enabled)`：角色 `admin` / `operator` / `api`，权限矩阵按规划 §9（operator 机制域只读）；
- `sync_source(domain, name, db_url, fetch_sql, field_mapping(JSON), cron_expr, is_enabled)`：`field_mapping` 为上游列名 → 本系统字段映射，上游加列/改列名不改代码；
- `sync_run(domain, source_id, started_at, finished_at, status, inserted, updated, skipped, pending_deleted, failed, error_summary)`；
- `import_log(domain, operator, filename, mode, success_count, failed_count, created_at)`；
- `app_config(key, value)`：如 `source_priority = ["数仓同步","API推送","Excel导入","手工维护"]`。

## 5. 核心写入管道 `WritePipeline`

所有通道唯一入口：`ingest(domain, records, channel, operator, options)`。

```
字段映射(仅同步通道) → 逐条校验 → 权威源合并 → diff → 事务写库+留痕 → 结果摘要
```

1. **字段映射**：同步通道按 `field_mapping` 转换；导入/手工通道结构即终态；
2. **校验**（规划 §7 全部规则）：必填、枚举（查 `enum_config`）、格式（价格 ≥ 0 两位小数、结束日期 ≥ 开始日期、明细数量 > 0）、唯一性（主键 + 明细联合去重）、引用完整性（明细商品编码必须存在且未禁用，违规行拒绝并进错误清单）、疑似重复提示（名称+规格模糊匹配，不阻断）；
3. **权威源合并**：记录级判断——库内记录 `data_source` 优先级 **高于** 本次写入渠道 → 整条跳过并留痕说明；**低于或相同 → 写入**，同渠道后写覆盖。优先级读 `app_config`；
4. **diff 与留痕**：旧值→新值与写入同事务记 `change_log`；
5. **级联刷新**：产品档案变更时同事务刷新所有引用它的 `mechanism_item` 冗余字段，各记一条留痕；
6. **返回统一结构**：`{inserted, updated, skipped, errors[]}`——同步摘要、导入结果、手工编辑共用。

**复用关系**：

- Excel 导入「预览校验」= 只跑 1–2 步不写库；「确认导入」= 全管道；支持「跳过错误行继续」(默认) / 「全部通过才导入」两种模式；
- 手工编辑 = 单条记录走同一管道（渠道=手工）；
- 批量启停 = 批量更新 `is_enabled`，同样留痕；
- V2 API 推送 = 同一管道 + 幂等键 + 字段白名单，本期仅定义契约。

## 6. API 设计

统一前缀 `/api/v1`，JWT Bearer 鉴权，角色权限按规划 §9。对接 API 独立前缀 `/api/open/v1`（api 账号专用）。

| 组 | 端点 |
|------|------|
| auth | `POST /auth/login`、`GET /auth/me` |
| products | `GET /products`（分页+关键字+品牌/类目/状态/在售/来源/启用筛选）、`GET /products/{code}`、`POST /products`、`PUT /products/{code}`、`PATCH /products/batch-status`、`GET /products/{code}/changes`、`POST /products/import/preview`、`POST /products/import/confirm`、`GET /products/export`、`GET /products/template` |
| mechanisms | 同上结构；`GET /mechanisms/{code}` 含明细；明细增改删随详情接口；导出含明细 |
| change-logs | `GET /change-logs`（对象类型/编码/操作人/渠道/时间范围筛选）、导出 |
| sync（admin） | `GET /sync/sources`（状态+最近一次 run）、`POST /sync/sources/{id}/run`、`GET /sync/pending-deletes`、`POST /sync/pending-deletes/confirm` |
| quality | `GET /quality/missing`、`GET /quality/duplicates`、`GET /quality/pending-deletes`（均支持导出） |
| admin（admin） | `enum-configs` CRUD、`users` CRUD、`app-configs`（权威源优先级） |
| open（api 账号） | `GET /open/v1/products?codes=`、`GET /open/v1/mechanisms?codes=`、`GET /open/v1/{domain}/changes?since=`（增量，按 `source_updated_at`） |

错误响应统一结构：`{code, message, details[]}`，表单/导入错误定位到具体行和字段。

## 7. 前端页面

shadcn/ui 布局：左侧导航 + 顶栏（用户/登出）。路由：

```
/login
/products            列表（TanStack Table：分页50/关键字/多条件筛选/勾选批量启停/导出）
/products/:code      详情（全字段 + 变更历史时间线）
/products/new|:code/edit   表单（zod 校验 + 疑似重复提示）
/products/import     三步导入向导（上传 → 行级错误预览 → 确认执行+结果）
/mechanisms          列表（生效中/已过期/未开始 标签，生效状态筛选）
/mechanisms/:code    详情（主表 + 明细可编辑表格：商品编码带出名称/规格/零售价，引用校验实时提示）
/mechanisms/import   三步导入向导（主表+明细同模板）
/change-logs         统一变更日志查询
/sync               同步管理（任务状态卡片/手动触发/待确认删除清单）[admin]
/quality            数据质量清单（缺失/疑似重复/待确认删除 三个 tab）[admin+operator]
/settings/enums     枚举配置 [admin]
/settings/users     用户管理 [admin]
/settings/config    权威源优先级 [admin]
```

常用筛选条件记忆（localStorage）；错误提示到具体行/字段；操作反馈用 toast。

## 8. 同步引擎与调度

- APScheduler（BackgroundScheduler）随 backend 进程启动，按 `sync_source.cron_expr` 触发（默认每日一次，可配多次）+ 页面手动触发；
- 执行放后台线程池，不阻塞 API；
- 流程：按 `fetch_sql` 直连数仓全量拉取 → 字段映射 → `WritePipeline.ingest`（渠道=数仓同步）→ 库内存在但上游消失的记录置 `pending_delete=True`（**只增改不自动删**）→ 写 `sync_run` 摘要；
- 失败处理：`sync_run.status=failed` + 错误摘要，同步管理页红点提示；通知渠道（邮件/IM）留接口不实现；
- 手动触发时同一 source 不可并发（进程内锁）。

## 9. 部署

```yaml
docker-compose services:
  nginx:    托管 frontend/dist 静态文件 + 反代 /api → backend:8000（含 HTTPS 终止）
  backend:  uvicorn app.main:app（单容器，APScheduler 内置）
  postgres: 数据卷持久化
```

- 配置经 `.env`：`DATABASE_URL`、`JWT_SECRET`、`SYNC_*` 等；`DATABASE_URL=sqlite:///...` 即切开发/测试模式；
- 数据备份：PostgreSQL 数据卷 + 每日 `pg_dump`（compose 外挂定时脚本，V1 文档说明即可）。

## 10. 测试策略

- **单元/集成（后端，pytest + SQLite 内存库）**：
  - WritePipeline 是 TDD 重点：校验规则、权威源压制、同渠道覆盖、diff 留痕、级联刷新、错误清单，逐条用例；
  - API 集成测试覆盖规划 §9 权限矩阵（每格至少一条用例：admin/operator/api/未登录）；
  - 同步引擎用本地 SQLite 模拟数仓源测试 diff 与 pending_delete 逻辑。
- **前端（vitest）**：仅测导入向导、明细行内编辑等复杂交互组件；其余手工验收。
- **验收**：以规划文档 §10 P0 验收标准为功能性验收清单。

## 11. 非功能与约束

- 列表分页默认 50 条，单表查询响应 ≤ 1 秒（万条级 + 主键/索引足够，`product.name`、`mechanism.code` 等建索引）；
- 变更日志、导入日志保留 ≥ 1 年；
- 本期不做：审批流、字段锁定（P2）、API 推送实现（V2）、维表独立管理（V2）。

## 12. 业务决策落地对齐（对齐规划 v1.0 §11）

1. **机制编码规则**：上游无编码时，系统统一生成：`M-{品牌缩写}-{年月YYYYMM}-{4位流水}`（如 `M-PROYA-202610-0001`）；
2. **类目主口径**：以 `product_category`（产品类目）为唯一有效主口径，旧 `category_old`（类目）标记废弃并仅作历史只读兼容展示，模板中全面剔除；
3. **上游空字段同步策略（昵称/版本）**：采用“非空覆盖、空值保留”的保护策略，上游为 NULL 或空时不冲掉运营手工录入的有效值；关键字段支持 `is_locked` 保护；
4. **机制 Excel 导入格式**：采用**单表扁平结构**（主表信息与明细同表，同一机制编码多行聚合为包含多个明细的机制），由解析引擎自动聚合处理。

---

## 13. 分期实施与研发计划

- **P0**：两域数据模型 + 枚举化、WritePipeline、页面手工维护（两域）、Excel 导入导出（两域）、变更留痕、数仓同步（产品+机制）、认证与权限；
- **P1**：同步管理页面、数据质量清单、增量 API、权威源优先级可配置；
- **P2**：API 推送通道、字段锁定、维表升级。

> 详细的 Sprint 任务拆解、开发甘特图、验收里程碑及质量保障措施已全面落实，详见：  
> 🔗 [主数据管理系统 实施推进与研发计划 (Implementation Plan)](../plans/2026-09-30-master-data-implementation-plan.md)
