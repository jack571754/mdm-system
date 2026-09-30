# 主数据管理系统 开放供数 API 对接文档 (Open API v1)

> 版本：v1.0 ｜ 更新时间：2026-09-30 ｜ 适用对象：销售计划、经营分析、下游仓储及业务中台研发团队

---

## 1. 认证与调用规范

### 1.1 基础说明
- **服务网关地址**：`http://{mdm_host}:{port}/api/open/v1`
- **通信协议**：HTTPS / HTTP RESTful JSON
- **字符编码**：UTF-8
- **认证机制**：所有接口均需通过 HTTP Header 携带 JWT Bearer Token 进行身份认证（账号角色须为 `api` 或 `admin`）。

```http
Authorization: Bearer <your_access_token>
```

### 1.2 认证凭据获取
对接系统需使用分配的系统账号与密钥换取 Access Token：

- **端点**：`POST /api/v1/auth/login`
- **请求体** (JSON)：
  ```json
  {
    "username": "api_client",
    "password": "<your_secret_password>"
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "登录成功",
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
      "token_type": "bearer",
      "user": {
        "username": "api_client",
        "role": "api"
      }
    }
  }
  ```

---

## 2. 接口详细定义

### 2.1 批量拉取货品主档案

按指定货品编号集合或过滤条件，批量获取标准化主数据档案。

- **URL**：`GET /api/open/v1/products`
- **Query 参数**：

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|:----:|:------:|------|
| `codes` | String | 否 | - | 多个货品编码以英文逗号分隔，如: `PRO-001,PRO-002` |
| `brand` | String | 否 | - | 品牌筛选（例如: `珀莱雅`、`彩棠`） |
| `keyword` | String | 否 | - | 名称或编码模糊匹配 |
| `is_enabled` | Boolean| 否 | `true` | 是否启用（默认仅返回有效商品） |
| `limit` | Integer | 否 | `200` | 单次提取条数上限 (1 ~ 500) |

- **响应数据示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "code": "PRO-PER-001",
      "name": "珀莱雅红宝石精华2.0 30ml",
      "short_name": "红宝石精华",
      "spec": "30ml",
      "base_unit": "瓶",
      "brand": "珀莱雅",
      "product_category": "护肤",
      "category_sub": "精华",
      "retail_price": 329.00,
      "nickname": "红宝石",
      "version": "2.0",
      "series": "红宝石系列",
      "sample_type": "正品",
      "status": "正常",
      "sale_stage": "在售",
      "needs_maintenance": "否",
      "is_enabled": true,
      "data_source": "数仓同步",
      "source_updated_at": "2026-09-30T10:15:00"
    }
  ]
}
```

---

### 2.2 增量拉取变更接口 (增量供数核心)

下游系统通过本地持久化最后一次成功同步的时间戳（`since`），利用增量接口游标拉取自上次变更以来的变动清单。

- **URL**：`GET /api/open/v1/products/changes`
- **Query 参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| `since` | String | ✅ 是 | ISO 8601 起始时间戳，如 `2026-09-30T00:00:00Z` |
| `page` | Integer| 否 | 当前分页页码（默认 1） |
| `size` | Integer| 否 | 每页条数（默认 100，上限 500） |

- **响应数据示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 3,
    "page": 1,
    "size": 100,
    "has_more": false,
    "items": [
      {
        "code": "PRO-PER-001",
        "name": "珀莱雅红宝石精华2.0 30ml",
        "retail_price": 339.00,
        "is_enabled": true,
        "change_type": "update",
        "changed_fields": ["retail_price"],
        "source_updated_at": "2026-09-30T10:30:15"
      }
    ]
  }
}
```

---

### 2.3 提取促销机制及其组合明细

获取促销套装主信息及其包含的主品、赠品商品明细组合清单。

- **URL**：`GET /api/open/v1/mechanisms`
- **Query 参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| `codes` | String | 否 | 机制编码集合，以逗号分隔 |
| `brand` | String | 否 | 品牌名称 |
| `kit_type` | String | 否 | 套装形态（单件 / 多件组合 / 买赠套装 / 加价购） |
| `is_enabled` | Boolean | 否 | 默认为 `true` |
| `limit` | Integer | 否 | 默认 `100` |

- **响应数据示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "code": "M-PER-202609-0001",
      "name": "珀莱雅双抗红宝石早C晚A强效组",
      "short_name": "早C晚A经典组",
      "brand": "珀莱雅",
      "kit_type": "买赠套装",
      "mechanism_type": "日常",
      "start_date": "2026-09-01",
      "end_date": "2026-12-31",
      "mechanism_price": 549.00,
      "is_enabled": true,
      "status": "生效中",
      "items": [
        {
          "product_code": "PRO-PER-001",
          "product_name": "珀莱雅红宝石精华2.0 30ml",
          "product_short_name": null,
          "product_spec": "30ml",
          "retail_price": 329.00,
          "quantity": 1,
          "item_type": "主品"
        },
        {
          "product_code": "PRO-PER-003",
          "product_name": "珀莱雅双抗精华3.0 7.5ml",
          "product_short_name": null,
          "product_spec": "7.5ml",
          "retail_price": 0.00,
          "quantity": 4,
          "item_type": "赠品"
        }
      ]
    }
  ]
}
```

---

## 3. 全局返回码约定

| 状态码 | 含义 | 处理建议 |
|:------:|------|----------|
| `200` | 请求成功 | 正常解析 `data` 数据 |
| `400` | 参数错误 | 核实入参格式是否符合 ISO 8601 或枚举范围 |
| `401` | 未授权 / Token 失效 | 重新调用 `/api/v1/auth/login` 刷新凭据 |
| `403` | 权限不足 | 当前账号不是 `api` 或 `admin` 角色，联系管理员授权 |
| `500` | 服务器异常 | 记录请求 Request ID 并联系主数据团队排查 |
