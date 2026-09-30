def get_auth_token(client, username="admin", password="Admin@123456"):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    return login_resp.json()["data"]["access_token"]


def test_create_and_get_product(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Product
    create_resp = client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "code": "PRO-API-001",
            "name": "珀莱雅红宝石面霜 50g",
            "brand": "珀莱雅",
            "spec": "50g",
            "base_unit": "罐",
            "product_category": "护肤",
            "retail_price": 319.00,
            "status": "正常",
            "sale_stage": "在售",
        },
    )
    assert create_resp.status_code == 200
    assert create_resp.json()["code"] == 200
    assert create_resp.json()["data"]["code"] == "PRO-API-001"

    # 2. Get Product Detail
    get_resp = client.get("/api/v1/products/PRO-API-001", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["name"] == "珀莱雅红宝石面霜 50g"


def test_list_products_with_filters(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Seed 2 products
    client.post(
        "/api/v1/products",
        headers=headers,
        json={"code": "PRO-LIST-A", "name": "彩棠三色修容", "brand": "彩棠", "product_category": "彩妆"},
    )
    client.post(
        "/api/v1/products",
        headers=headers,
        json={"code": "PRO-LIST-B", "name": "珀莱雅双抗精华", "brand": "珀莱雅", "product_category": "护肤"},
    )

    # Filter by brand
    resp = client.get("/api/v1/products?brand=彩棠", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert any(p["code"] == "PRO-LIST-A" for p in items)
    assert not any(p["code"] == "PRO-LIST-B" for p in items)


def test_update_product_and_audit_timeline(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create
    client.post(
        "/api/v1/products",
        headers=headers,
        json={"code": "PRO-UPDATE-01", "name": "原名称", "brand": "珀莱雅", "retail_price": 100},
    )

    # 2. Update
    put_resp = client.put(
        "/api/v1/products/PRO-UPDATE-01",
        headers=headers,
        json={"name": "新修改名称", "retail_price": 150},
    )
    assert put_resp.status_code == 200
    assert float(put_resp.json()["data"]["retail_price"]) == 150.0

    # 3. Check Changes Timeline
    changes_resp = client.get("/api/v1/products/PRO-UPDATE-01/changes", headers=headers)
    assert changes_resp.status_code == 200
    logs = changes_resp.json()["data"]
    assert len(logs) >= 2  # _created + updates
    field_names = [l["field_name"] for l in logs]
    assert "name" in field_names
    assert "retail_price" in field_names


def test_batch_status_toggle(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/products",
        headers=headers,
        json={"code": "PRO-BATCH-1", "name": "待下架商品", "brand": "珀莱雅"},
    )

    # Disable
    patch_resp = client.patch(
        "/api/v1/products/batch-status",
        headers=headers,
        json={"codes": ["PRO-BATCH-1"], "is_enabled": False},
    )
    assert patch_resp.status_code == 200

    # Verify
    get_resp = client.get("/api/v1/products/PRO-BATCH-1", headers=headers)
    assert get_resp.json()["data"]["is_enabled"] is False


def test_download_template_and_export_excel(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Template
    template_resp = client.get("/api/v1/products/template")
    assert template_resp.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in template_resp.headers["content-type"]

    # Export
    export_resp = client.get("/api/v1/products/export", headers=headers)
    assert export_resp.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in export_resp.headers["content-type"]
