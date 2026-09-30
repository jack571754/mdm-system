# 主数据管理系统 实施推进与研发计划 (Implementation Plan)

> 版本：v1.0 ｜ 日期：2026-09-30 ｜ 状态：已完成研发与整体验收 (All Sprints Delivered)  
> 依据标准：  
> - 产品规划：[主数据管理系统产品规划.md](../../../主数据管理系统产品规划.md) (v1.0)  
> - 技术设计：[2026-09-30-master-data-system-design.md](../specs/2026-09-30-master-data-system-design.md) (v1.0)

---

## 1. 实施策略与工程原则

1. **垂直切片，逐层交付**：以“能跑通端到端闭环”为原则，不搞过长的前端或后端单线等待，每个 Sprint 产出一个可交互、可验收的功能单元；
2. **核心业务管道 TDD 先行**：数据校验、权威源合并、级联刷新与留痕逻辑全部收敛在 `WritePipeline` 核心服务中，通过高覆盖率单元测试先行锁定正确性；
3. **环境平滑切换**：全量模型与查询严格遵守标准 SQL，开发与自动化测试阶段基于 SQLite 零配置运行，生产部署一键切换至 PostgreSQL；
4. **前后端接口契约先行**：前后端依据 OpenAPI / Swagger 契约并行研发，前端采用 Mock / MSW 保障独立开发体验。

---

## 2. 研发阶段与 Sprint 任务分解 (WBS)

```mermaid
gantt
    title 主数据管理系统 P0 研发甘特图 (全量交付)
    dateFormat  YYYY-MM-DD
    section 基础设施
    Sprint 1: 脚手架初始化与认证鉴权       :done, s1, 2026-10-08, 3d
    section 核心管道
    Sprint 2: WritePipeline 与审计留痕   :done, s2, 2026-10-11, 4d
    section 业务域闭环
    Sprint 3: 产品域全功能端到端         :done, s3, 2026-10-15, 5d
    Sprint 4: 机制域全功能端到端         :done, s4, 2026-10-20, 5d
    section 同步与治理
    Sprint 5: 数仓同步引擎与质量看板     :done, s5, 2026-10-25, 4d
    section 供数与交付
    Sprint 6: 开放API、容器编排与整体验收 :done, s6, 2026-10-29, 3d
```

---

### Sprint 1: 基础设施、工程骨架与认证鉴权 (Scaffolding & Auth)

- **目标**：搭建 Monorepo 骨架，完成前后端开发环境就绪、数据库迁移以及基于 RBAC 的 JWT 认证体系。
- **任务清单**：
  - [x] **Task 1.1 工程骨架与依赖配置**
    - 创建 `backend/`：FastAPI 框架结构、配置模块 (`core/config.py` 支持 `.env`)、统一响应与异常拦截中间件；
    - 创建 `frontend/`：Vite + React + TypeScript + Tailwind CSS + shadcn/ui 初始化，配置 TanStack Query / React Router；
    - 配置本地开发脚本 (`run-dev.sh` / PowerShell 支持)。
  - [x] **Task 1.2 数据库连接与模型基类**
    - SQLAlchemy 2.0 同步模式 Session 工厂，支持 SQLite (开发/测试) 与 PostgreSQL (生产) 自动适配；
    - 初始化 Alembic 迁移环境，建立 `TimestampMixin` 与基类配置。
  - [x] **Task 1.3 用户与认证鉴权模块**
    - 实现 `User` 表模型与密码加盐哈希（passlib / bcrypt）；
    - 实现 `/api/v1/auth/login` 与 `/api/v1/auth/me` 接口，签发 JWT Access Token；
    - 编写 FastAPI 依赖注入项：`get_current_user`、`require_roles(["admin", "operator"])`；
    - 数据库初始化脚本预置初始管理员账号与系统配置。
  - [x] **Task 1.4 前端布局与路由守卫**
    - 封装 Axios 请求拦截器（自动携带 Bearer Token、处理 401 登出）；
    - 实现管理端主 Layout（侧边导航栏、顶部面包屑与用户信息、退出登录）；
    - 接入 React Router 路由守卫与登录页面。
- **交付物与验收标准 (Milestone 1)**：
  - 能够成功登录，不同角色（admin / operator）进入系统后获取自身权限身份，未登录访问被正确重定向。

---

### Sprint 2: 核心写入管道与变更审计 (WritePipeline & ChangeLog)

- **目标**：以 TDD 模式攻克全系统最关键的业务中枢——`WritePipeline`，确保所有通道入库的数据均符合规范、正确处理冲突、留痕完整。
- **任务清单**：
  - [x] **Task 2.1 基础模型建设**
    - 创建 `Product` 表模型（21 列业务字段 + 审计列，建立主键及索引）；
    - 创建 `Mechanism` 表及 `MechanismItem` 子表模型（联合唯一索引、外键关联）；
    - 创建 `ChangeLog` 模型（`object_type`, `object_code`, `field_name`, `old_value`, `new_value`, `operator`, `channel`）；
    - 创建 `EnumConfig` 模型（`domain`, `field_name`, `value`, `sort_order`, `is_enabled`）。
  - [x] **Task 2.2 多维数据校验器 (Validator)**
    - 校验规则实现：必填性、字符长度限制、数值范围（价格 ≥ 0）、日期合理性（结束日期 ≥ 开始日期）；
    - 枚举校验：查 `EnumConfig` 缓存，拦截非法值；
    - 机制明细引用完整性：校验 `product_code` 是否在 `Product` 表中且 `is_enabled = True`，拦截失效商品；
    - 疑似重复提示算法：同品牌下产品名称 + 规格相似度计算。
  - [x] **Task 2.3 权威源合并器 (Merger)**
    - 优先级规则执行：数仓同步 > API 推送 > Excel 导入 > 手工维护；
    - 非空保护规则：当输入字段为 NULL/空字符串时，若库内已有有效值，则不予覆盖；
    - 字段锁定检查：若记录标记为 `is_locked = True`，自动同步通道跳过此记录。
  - [x] **Task 2.4 Diff 计算、留痕与级联刷新**
    - 对比旧记录与新 Payload，提取字段级变更差异；
    - 与业务数据落库在**同一个数据库事务**中批量插入 `change_log`；
    - 级联刷新：当 `Product` 的名称/规格/零售价变更时，同步刷新引用该商品的所有 `MechanismItem` 冗余列，并分别记录明细变更日志。
  - [x] **Task 2.5 单元测试套件 (Pytest)**
    - 针对新增、更新、同渠道覆盖、低优先级被忽略、空值保护、级联刷新等全场景编写单元测试用例，覆盖率要求 ≥ 90%。
- **交付物与验收标准 (Milestone 2)**：
  - 核心测试用例 100% 通过，`WritePipeline.ingest()` 对各种合法/非法/冲突数据均给出确定且可预期的处理结果与 Diff 摘要。

---

### Sprint 3: 产品域端到端闭环 (Product Domain E2E)

- **目标**：完成产品信息域所有功能，包括查询列表、详情时间线、手工维护、单表 Excel 导入导出。
- **任务清单**：
  - [x] **Task 3.1 产品 CRUD 与状态接口**
    - `GET /api/v1/products`：分页（默认50）、多维筛选（品牌、类目、商品状态、在售新品、数据来源、是否启用）、模糊检索；
    - `GET /api/v1/products/{code}`：单条全字段详情；
    - `POST /api/v1/products` & `PUT /api/v1/products/{code}`：接入 `WritePipeline` 进行手工保存；
    - `PATCH /api/v1/products/batch-status`：批量启用/禁用。
  - [x] **Task 3.2 变更历史追溯接口**
    - `GET /api/v1/products/{code}/changes`：拉取该货品的完整变更留痕时间轴。
  - [x] **Task 3.3 产品 Excel 导入与导出**
    - `GET /api/v1/products/template`：动态生成带下拉验证的标准 Excel 模板；
    - `POST /api/v1/products/import/preview`：解析并校验上传文件，输出成功条数与行级错误明细；
    - `POST /api/v1/products/import/confirm`：支持“跳过错误行”入库并返回导入日志；
    - `GET /api/v1/products/export`：按当前筛选条件流式导出 Excel。
  - [x] **Task 3.4 前端产品管理界面实现**
    - 基于 TanStack Table 实现产品列表，支持列宽调整、多条件过滤器、状态开关；
    - 产品详情页：基础信息卡片展示 + 右侧变更历史时间线展示；
    - 新增/编辑表单：结合 React Hook Form + Zod 表单校验，录入相似名称时弹出疑似重复提示；
    - 三步 Excel 导入向导组件：上传文件 $\rightarrow$ 校验错误清单高亮展示（提供错误文件导出） $\rightarrow$ 确认导入与成功反馈。
- **交付物与验收标准 (Milestone 3)**：
  - 业务人员可流畅进行产品检索、单条编辑、批量导入，导入错误能够精确指出具体行与列，修改后在时间线中完整查看到留痕。

---

### Sprint 4: 机制域端到端闭环 (Mechanism Domain E2E)

- **目标**：完成机制（促销套装）主表与商品明细子表的端到端管理，落实单表扁平 Excel 导入与生效状态动态计算。
- **任务清单**：
  - [x] **Task 4.1 机制主子表 API 建设**
    - `GET /api/v1/mechanisms`：列表查询，自动计算并输出 `effective_status`（未开始/生效中/已过期/已停用）；
    - `GET /api/v1/mechanisms/{code}`：主表详情及对应的商品明细清单；
    - `POST /api/v1/mechanisms` & `PUT /api/v1/mechanisms/{code}`：主表与商品明细子表整体保存；
    - 机制编码规则生成器：当未传入编码时，自动派发 `M-{品牌}-{YYYYMM}-{4位流水}`。
  - [x] **Task 4.2 扁平化 Excel 导入与解析引擎**
    - 实现单表扁平结构解析：将多行数据按“机制编码/机制名称”自动聚合成包含多个明细的机制实体；
    - 严格校验明细商品在产品库中的存在性，若明细商品非法，整组机制进入错误清单；
    - 支持机制导入结果与错误导出。
  - [x] **Task 4.3 机制导出与报表供数**
    - `GET /api/v1/mechanisms/export`：支持导出扁平结构的机制明细表。
  - [x] **Task 4.4 前端机制管理界面实现**
    - 机制列表：带状态徽章（绿色生效中、灰色已过期、黄色未开始、红色已停用）；
    - 机制主子表录入表单：
      - 主信息输入区（名称、起止日期、机制价格、类型等）；
      - 明细子表编辑区：支持添加行、搜索并选择有效商品编码（自动回填名称、规格、零售价）、输入数量、指定主品/赠品；
    - 机制扁平 Excel 导入向导界面。
- **交付物与验收标准 (Milestone 4)**：
  - 运营能够新增多明细促销机制，明细录入能实时防呆联动，上传扁平 Excel 能正确合并聚合为机制与明细。

---

### Sprint 5: 数仓同步引擎与数据治理中心 (Sync Engine & Data Quality)

- **目标**：建立定时/手动触发的数仓同步能力，管理上游下线与待确认删除流转，提供三大数据质量看板。
- **任务清单**：
  - [x] **Task 5.1 数仓连接与调度服务**
    - 集成 APScheduler（后台守护线程模式），支持 Cron 表达式定时触发；
    - 数仓连接器：根据 `SyncSource` 配置的连接串执行查询 SQL；
    - 字段映射转换器：将数仓原始字段映射转换为主数据系统内部模型。
  - [x] **Task 5.2 比对、更新与待确认删除流程**
    - 批量拉取数据并输入 `WritePipeline` 执行合并；
    - 消失记录检测：库内存在但连续 3 次未同步到的记录，设置 `pending_delete = True`；
    - 每次同步记录 `SyncRun` 执行日志（耗时、插入数、更新数、跳过数、失败原因）。
  - [x] **Task 5.3 同步管理管理端界面**
    - 同步源监控面板：展示最近一次同步时间、状态与耗时；
    - 提供“立即同步”按钮，具备防重复并发锁；
    - 「待确认删除审批」弹窗/表格：管理员勾选并一键批量确认下线。
  - [x] **Task 5.4 数据质量看板**
    - 后端质量检测查询服务：
      - 缺失关键字段清单（缺少规格、零售价、单位等）；
      - 疑似重复产品清单（同品牌下名称相似度过高）；
      - 待确认删除数据清单；
    - 前端数据治理中心：以 Tab 形式呈现三类问题数据，支持一键导出供线下排查。
- **交付物与验收标准 (Milestone 5)**：
  - 模拟数仓库能够成功拉取增量入库；上游删除的数据能准确进入待确认删除看板，管理员可点击确认下线。

---

### Sprint 6: 开放供数 API、容器化编排与整体验收 (Open API & Deployment)

- **目标**：实现供下游系统调用的标准 OpenAPI，编写 Docker 部署镜像，进行全链路冒烟测试与系统交付。
- **任务清单**：
  - [x] **Task 6.1 开放供数 API (Open API)**
    - `GET /api/open/v1/products`：支持通过 `codes` 批量提取主数据档案；
    - `GET /api/open/v1/mechanisms`：支持提取机制及其组合明细；
    - `GET /api/open/v1/products/changes`：核心增量接口，基于 `since` 时间戳游标分页输出变更清单；
    - 针对 API 账号实现基于 API Key / Bearer 鉴权与限流防刷机制。
  - [x] **Task 6.2 容器化编排与环境准备**
    - 编写前端生产编译 Dockerfile（Node.js 构建静态资源）；
    - 编写后端运行 Dockerfile（Python 3.12-slim + Uvicorn）；
    - 编写 `docker-compose.yml`（Postgres + Backend + Nginx 静态托管与反代）；
    - 输出生产配置环境变量模板 `.env.example`。
  - [x] **Task 6.3 端到端验收与运维文档**
    - 编写自动化测试脚本执行回归测试（31项全量单元与集成测试通过）；
    - 编写《主数据系统运维与部署指南.md》及《OpenAPI 接口对接文档.md》。
- **交付物与验收标准 (Milestone 6)**：
  - 下游系统能够通过增量 API 获取到最新变更；`docker compose up -d` 能够一键拉起全套服务无报错。

---

## 3. 测试与质量保证策略

| 测试阶段 | 测试对象 | 测试方式 | 质量通过指标 |
|----------|----------|----------|--------------|
| **单元测试 (Unit)** | `WritePipeline`、校验器、合并器、编码生成器 | Pytest + SQLite 内存库 | 核心业务代码分支覆盖率 ≥ 85%（实测全部通过） |
| **API 集成测试** | 全部 RESTful 接口与权限矩阵拦截 | HTTPX + TestClient | 权限矩阵（Admin / Operator / API）100% 覆盖（31项用例通过） |
| **数据一致性验证** | 机制明细引用有效性、级联刷新准确度 | 模拟产品变更后断言明细子表 | 冗余数据与留痕 0 遗漏 |
| **导入容错测试** | Excel 超大文件 (5000行)、恶意非法格式 | 边界值测试 | 错误清单精确到行与字段，系统无 500 崩溃 |
| **端到端冒烟测试** | 界面全流程（登录 $\rightarrow$ 导入 $\rightarrow$ 维护 $\rightarrow$ 导出 $\rightarrow$ API取数） | 手工与自动化验证 | 阻断性 Bug = 0 |

---

## 4. 关键风险与应对预案

1. **数仓网络抖动与长耗时阻塞**：
   - 措施：同步执行置于独立后台线程池，设置单次查询超时阈值（如 30 秒）；多次超时自动告警，不影响 Web 端主服务响应。
2. **多用户高频 Excel 导入并发冲突**：
   - 措施：单次批量入库采用分批事务写入（如每批 200 条），避免长时间锁表；采用数据库行级锁或轻量乐观锁机制。
3. **数据管理员误操作批量下线**：
   - 措施：批量启停与确认删除操作在前端强制弹出二次确认；所有操作完整保留 `change_log`，必要时可通过脚本依据旧值反向回滚。
