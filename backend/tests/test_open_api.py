from datetime import datetime, timezone, timedelta
from app.models.product import Product


def get_token(client, username="api_client", password="Api@SecretKey2026"):
    res = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    return res.json()["data"]["access_token"]



def test_open_api_products_and_changes(client, db_session):
    api_token = get_token(client, "api_client", "Api@SecretKey2026")
    headers = {"Authorization": f"Bearer {api_token}"}

    # 1. Batch products query
    res = client.get("/api/open/v1/products?codes=PRO-PER-001,PRO-PER-002", headers=headers)
    assert res.status_code == 200
    products = res.json()["data"]
    assert len(products) == 2
    codes = [p["code"] for p in products]
    assert "PRO-PER-001" in codes
    assert "PRO-PER-002" in codes

    # 2. Incremental changes query
    since_ts = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    changes_res = client.get(f"/api/open/v1/products/changes?since={since_ts}", headers=headers)
    assert changes_res.status_code == 200
    changes_data = changes_res.json()["data"]
    assert "items" in changes_data
    assert "total" in changes_data


def test_open_api_forbidden_for_regular_operator(client):
    # Operator cannot access Open API
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Operator@123456"},
    )
    op_token = res.json()["data"]["access_token"]

    forbidden_res = client.get(
        "/api/open/v1/products",
        headers={"Authorization": f"Bearer {op_token}"},
    )
    assert forbidden_res.status_code == 403
