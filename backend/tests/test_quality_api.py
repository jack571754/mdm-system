from decimal import Decimal
from app.models.product import Product


def get_token(client, username="admin", password="Admin@123456"):
    res = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    return res.json()["data"]["access_token"]



def test_quality_overview_and_missing(client, db_session):
    token = get_token(client, "admin", "Admin@123456")
    headers = {"Authorization": f"Bearer {token}"}

    # Add product with missing fields
    p = Product(
        code="PRO-MISS-001",
        name="缺失规格与价格的货品",
        brand="珀莱雅",
        spec=None,
        retail_price=None,
        base_unit=None,
        data_source="手工维护",
    )
    db_session.add(p)
    db_session.commit()

    # Overview
    res = client.get("/api/v1/quality/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total_products"] >= 4
    assert data["missing_fields_count"] >= 1
    assert 60.0 <= data["health_score"] <= 100.0

    # Missing list
    miss_res = client.get("/api/v1/quality/missing", headers=headers)
    assert miss_res.status_code == 200
    items = miss_res.json()["data"]["items"]
    assert any(x["code"] == "PRO-MISS-001" for x in items)


def test_quality_duplicate_candidates(client, db_session):
    token = get_token(client, "admin", "Admin@123456")
    headers = {"Authorization": f"Bearer {token}"}

    # Add two similar products under same brand
    p1 = Product(code="PRO-DUP-1", name="珀莱雅红宝石面霜 50g 滋润版", brand="珀莱雅", spec="50g", retail_price=Decimal("289.00"))
    p2 = Product(code="PRO-DUP-2", name="珀莱雅红宝石面霜 50g 清爽版", brand="珀莱雅", spec="50g", retail_price=Decimal("289.00"))
    db_session.add_all([p1, p2])
    db_session.commit()

    dup_res = client.get("/api/v1/quality/duplicates?threshold=0.8", headers=headers)
    assert dup_res.status_code == 200
    candidates = dup_res.json()["data"]
    assert len(candidates) >= 1
    assert any(c["code_a"] in ("PRO-DUP-1", "PRO-DUP-2") for c in candidates)
