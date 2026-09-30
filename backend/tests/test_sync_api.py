import json
from decimal import Decimal
from app.models.sync import SyncSource, MockOdsProduct
from app.models.product import Product


def get_token(client, username="admin", password="Admin@123456"):
    res = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    return res.json()["data"]["access_token"]



def test_sync_sources_and_manual_run(client, db_session):
    admin_token = get_token(client, "admin", "Admin@123456")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create a SyncSource
    mapping = {
        "dw_code": "code",
        "dw_name": "name",
        "dw_brand": "brand",
        "dw_price": "retail_price",
        "dw_spec": "spec",
        "dw_unit": "base_unit",
    }
    src_res = client.post(
        "/api/v1/sync/sources",
        json={
            "domain": "product",
            "name": "测试数仓源",
            "fetch_sql": "SELECT dw_code, dw_name, dw_brand, dw_price, dw_spec, dw_unit FROM mock_ods_products",
            "field_mapping": mapping,
            "cron_expr": "0 3 * * *",
            "is_enabled": True,
            "miss_threshold": 3,
        },
        headers=headers,
    )
    assert src_res.status_code == 200
    src_data = src_res.json()["data"]
    source_id = src_data["id"]

    # Seed mock DW records
    m1 = MockOdsProduct(
        dw_code="PRO-DW-TEST-1",
        dw_name="数仓测试货品一",
        dw_brand="珀莱雅",
        dw_price="199.00",
        dw_spec="50ml",
        dw_unit="瓶",
    )
    db_session.add(m1)
    db_session.commit()

    # 2. Trigger Sync Run
    run_res = client.post(f"/api/v1/sync/sources/{source_id}/run", headers=headers)
    assert run_res.status_code == 200
    run_data = run_res.json()["data"]
    assert run_data["status"] == "success"
    assert run_data["inserted"] >= 1

    # Verify product was ingested
    synced_p = db_session.query(Product).filter(Product.code == "PRO-DW-TEST-1").first()
    assert synced_p is not None
    assert synced_p.data_source == "数仓同步"
    assert synced_p.retail_price == Decimal("199.00")

    # 3. Check Runs History
    history_res = client.get("/api/v1/sync/runs", headers=headers)
    assert history_res.status_code == 200
    runs = history_res.json()["data"]
    assert len(runs) >= 1


def test_pending_delete_and_confirm(client, db_session):
    admin_token = get_token(client, "admin", "Admin@123456")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Mark a product as pending delete
    p = db_session.query(Product).filter(Product.code == "PRO-PER-001").first()
    p.pending_delete = True
    p.data_source = "数仓同步"
    db_session.commit()

    # Query pending deletes
    res = client.get("/api/v1/sync/pending-deletes", headers=headers)
    assert res.status_code == 200
    pending_list = res.json()["data"]
    assert any(x["code"] == "PRO-PER-001" for x in pending_list)

    # Confirm offline
    confirm_res = client.post(
        "/api/v1/sync/pending-deletes/confirm",
        json={
            "action": "confirm_offline",
            "domain": "product",
            "codes": ["PRO-PER-001"],
        },
        headers=headers,
    )
    assert confirm_res.status_code == 200
    db_session.refresh(p)
    assert p.is_enabled is False
    assert p.pending_delete is False
