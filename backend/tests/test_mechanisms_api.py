import io
import pytest
from datetime import date, timedelta
from decimal import Decimal
import openpyxl
from fastapi.testclient import TestClient

from app.services.mechanism_service import (
    generate_mechanism_code,
    compute_mechanism_status,
    MechanismService,
)
from app.models.mechanism import Mechanism


def get_auth_token(client, username="admin", password="Admin@123456"):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    return login_resp.json()["data"]["access_token"]


def test_compute_mechanism_status():
    today = date.today()
    # 1. Disabled
    assert compute_mechanism_status(False, today, today) == "已停用"

    # 2. Future
    future = today + timedelta(days=10)
    assert compute_mechanism_status(True, future, future + timedelta(days=10)) == "待生效"

    # 3. Expired
    past = today - timedelta(days=10)
    assert compute_mechanism_status(True, past - timedelta(days=10), past) == "已过期"

    # 4. Active
    assert compute_mechanism_status(True, past, future) == "生效中"


def test_generate_mechanism_code(db_session):
    code1 = generate_mechanism_code(db_session, "珀莱雅")
    assert code1.startswith("M-PROYA-")
    code2 = generate_mechanism_code(db_session, "彩棠")
    assert code2.startswith("M-TIMAGE-")


def test_mechanisms_api_list(client: TestClient):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    # Create one first to test list
    payload = {
        "name": "列表测试机制",
        "brand": "珀莱雅",
        "items": [{"product_code": "PRO-PER-001", "quantity": 1, "item_type": "主品"}]
    }
    client.post("/api/v1/mechanisms", json=payload, headers=headers)

    res = client.get("/api/v1/mechanisms", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"] if "data" in res.json() else res.json()
    assert "items" in data
    assert data["total"] >= 1
    # Check item structure
    first = data["items"][0]
    assert "code" in first
    assert "items" in first
    assert "status" in first



def test_mechanisms_api_create_and_get(client: TestClient):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "name": "自动化测试修护礼包",
        "brand": "珀莱雅",
        "kit_type": "买赠套装",
        "mechanism_type": "日常",
        "start_date": str(date.today()),
        "end_date": str(date.today() + timedelta(days=30)),
        "mechanism_price": 399.00,
        "items": [
            {"product_code": "PRO-PER-001", "quantity": 1, "item_type": "主品"},
            {"product_code": "PRO-PER-002", "quantity": 1, "item_type": "主品"},
            {"product_code": "PRO-PER-003", "quantity": 2, "item_type": "赠品"},
        ]
    }
    create_res = client.post("/api/v1/mechanisms", json=payload, headers=headers)
    assert create_res.status_code == 201
    created = create_res.json()["data"] if "data" in create_res.json() else create_res.json()
    code = created["code"]
    assert code.startswith("M-PROYA-")
    assert created["items_count"] == 3
    assert created["status"] == "生效中"

    # Query single
    get_res = client.get(f"/api/v1/mechanisms/{code}", headers=headers)
    assert get_res.status_code == 200
    get_data = get_res.json()["data"] if "data" in get_res.json() else get_res.json()
    assert get_data["name"] == "自动化测试修护礼包"
    # Check redundant item snapshots
    items = get_data["items"]
    assert any(it["product_name"] == "珀莱雅红宝石精华2.0 30ml" for it in items)

    # Check change log
    log_res = client.get(f"/api/v1/mechanisms/{code}/changes", headers=headers)
    assert log_res.status_code == 200
    log_data = log_res.json()["data"] if "data" in log_res.json() else log_res.json()
    assert len(log_data) >= 1


def test_mechanisms_api_create_nonexistent_product_fails(client: TestClient):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "name": "非法商品机制",
        "brand": "珀莱雅",
        "items": [
            {"product_code": "PRO-NONEXISTENT-999", "quantity": 1, "item_type": "主品"}
        ]
    }
    res = client.post("/api/v1/mechanisms", json=payload, headers=headers)
    assert res.status_code == 400
    res_json = res.json()
    msg = res_json.get("message") or res_json.get("detail", "")
    assert "不存在" in msg


def test_mechanisms_export_and_template(client: TestClient):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    # Template
    res_tpl = client.get("/api/v1/mechanisms/template", headers=headers)
    assert res_tpl.status_code == 200
    assert "spreadsheetml" in res_tpl.headers["content-type"]

    # Export
    res_exp = client.get("/api/v1/mechanisms/export", headers=headers)
    assert res_exp.status_code == 200
    assert "spreadsheetml" in res_exp.headers["content-type"]


def test_flat_mechanism_import_preview(client: TestClient):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    # Generate in-memory Excel
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append([
        "机制编码", "机制名称", "品牌", "套装类型", "机制类型",
        "生效起始日期", "生效结束日期", "机制价格", "货品编码", "明细类型", "数量"
    ])
    # 1 Valid mechanism with 2 items
    ws.append(["", "新导入早秋特惠组", "珀莱雅", "多件组合", "日常", "2026-09-01", "2026-10-31", 299, "PRO-PER-001", "主品", 1])
    ws.append(["", "新导入早秋特惠组", "珀莱雅", "多件组合", "日常", "2026-09-01", "2026-10-31", 299, "PRO-PER-002", "主品", 1])
    # 1 Invalid row with unknown product
    ws.append(["", "新导入早秋特惠组2", "珀莱雅", "多件组合", "日常", "2026-09-01", "2026-10-31", 299, "UNKNOWN-PROD", "主品", 1])

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)

    files = {"file": ("mechanisms_import.xlsx", out, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    res = client.post("/api/v1/mechanisms/import/preview", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()["data"] if "data" in res.json() else res.json()
    assert data["valid_count"] == 1
    assert data["error_count"] >= 1
    assert any("UNKNOWN-PROD" in err["message"] for err in data["errors"])

