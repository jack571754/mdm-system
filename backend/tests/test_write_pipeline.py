from decimal import Decimal
from datetime import datetime, timezone
import pytest
from app.models.product import Product
from app.models.mechanism import Mechanism, MechanismItem
from app.models.change_log import ChangeLog
from app.services.write_pipeline import WritePipeline


def test_write_pipeline_insert_product(db_session):
    records = [
        {
            "code": "PRO-TEST-001",
            "name": "测试红宝石精华 30ml",
            "brand": "珀莱雅",
            "retail_price": "329.00",
            "product_category": "护肤",
        }
    ]
    res = WritePipeline.ingest_products(
        db=db_session,
        records=records,
        channel="手工维护",
        operator="test_user"
    )
    assert res.inserted == 1
    assert res.updated == 0
    assert len(res.errors) == 0

    p = db_session.query(Product).filter(Product.code == "PRO-TEST-001").first()
    assert p is not None
    assert p.name == "测试红宝石精华 30ml"
    assert p.retail_price == Decimal("329.00")
    assert p.data_source == "手工维护"

    # Check creation log
    log = db_session.query(ChangeLog).filter(
        ChangeLog.object_type == "product",
        ChangeLog.object_code == "PRO-TEST-001",
        ChangeLog.field_name == "_created"
    ).first()
    assert log is not None
    assert "测试红宝石精华 30ml" in log.new_value


def test_write_pipeline_update_product_and_diff(db_session):
    # Insert first
    WritePipeline.ingest_products(
        db=db_session,
        records=[{
            "code": "PRO-TEST-002",
            "name": "原名称",
            "brand": "珀莱雅",
            "retail_price": "100.00",
        }],
        channel="手工维护",
        operator="user1"
    )

    # Update with new price and name
    res = WritePipeline.ingest_products(
        db=db_session,
        records=[{
            "code": "PRO-TEST-002",
            "name": "新名称",
            "brand": "珀莱雅",
            "retail_price": "120.00",
        }],
        channel="手工维护",
        operator="user2"
    )
    assert res.updated == 1

    p = db_session.query(Product).filter(Product.code == "PRO-TEST-002").first()
    assert p.name == "新名称"
    assert p.retail_price == Decimal("120.00")

    # Check diff logs
    name_log = db_session.query(ChangeLog).filter(
        ChangeLog.object_code == "PRO-TEST-002",
        ChangeLog.field_name == "name"
    ).first()
    assert name_log is not None
    assert name_log.old_value == "原名称"
    assert name_log.new_value == "新名称"
    assert name_log.operator == "user2"


def test_write_pipeline_authority_channel_priority(db_session):
    # Higher priority: 数仓同步 (priority 40)
    WritePipeline.ingest_products(
        db=db_session,
        records=[{
            "code": "PRO-PRIORITY",
            "name": "数仓权威名称",
            "brand": "珀莱雅",
        }],
        channel="数仓同步",
        operator="dw_sync"
    )

    # Lower priority: Excel导入 (priority 20) attempting to overwrite
    res = WritePipeline.ingest_products(
        db=db_session,
        records=[{
            "code": "PRO-PRIORITY",
            "name": "试图冲掉权威源的Excel名称",
            "brand": "珀莱雅",
        }],
        channel="Excel导入",
        operator="operator"
    )
    assert res.skipped == 1
    assert res.updated == 0

    p = db_session.query(Product).filter(Product.code == "PRO-PRIORITY").first()
    assert p.name == "数仓权威名称"  # Protected!


def test_write_pipeline_non_null_protection(db_session):
    # Existing has nickname
    WritePipeline.ingest_products(
        db=db_session,
        records=[{
            "code": "PRO-PROTECT",
            "name": "测试商品",
            "brand": "珀莱雅",
            "nickname": "运营手工补录的昵称",
        }],
        channel="手工维护",
        operator="operator"
    )

    # Upstream sync comes in with empty nickname
    WritePipeline.ingest_products(
        db=db_session,
        records=[{
            "code": "PRO-PROTECT",
            "name": "数仓更新后商品名",
            "brand": "珀莱雅",
            "nickname": None,  # Upstream is empty
        }],
        channel="数仓同步",
        operator="dw_sync"
    )

    p = db_session.query(Product).filter(Product.code == "PRO-PROTECT").first()
    assert p.name == "数仓更新后商品名"
    assert p.nickname == "运营手工补录的昵称"  # Non-null value preserved!


def test_write_pipeline_cascade_refresh_mechanism_items(db_session):
    # 1. Create product
    WritePipeline.ingest_products(
        db=db_session,
        records=[{
            "code": "PRO-MECH-REF",
            "name": "红宝石精华",
            "brand": "珀莱雅",
            "spec": "30ml",
            "retail_price": "300.00",
        }],
        channel="手工维护",
        operator="op"
    )

    # 2. Create mechanism and item referencing this product
    now = datetime.now(timezone.utc)
    mech = Mechanism(
        code="M-TEST-001",
        name="双支买赠套装",
        source="手工维护",
        is_enabled=True,
    )
    item = MechanismItem(
        mechanism_code="M-TEST-001",
        product_code="PRO-MECH-REF",
        product_name="旧商品名快照",
        product_spec="30ml",
        retail_price=Decimal("300.00"),
        quantity=2,
        item_type="主品"
    )
    db_session.add(mech)
    db_session.add(item)
    db_session.commit()

    # 3. Update product master
    WritePipeline.ingest_products(
        db=db_session,
        records=[{
            "code": "PRO-MECH-REF",
            "name": "红宝石精华(升级3.0版)",
            "brand": "珀莱雅",
            "spec": "50ml",
            "retail_price": "369.00",
        }],
        channel="手工维护",
        operator="op"
    )

    # 4. Check mechanism item snapshot is automatically refreshed
    db_session.refresh(item)
    assert item.product_name == "红宝石精华(升级3.0版)"
    assert item.product_spec == "50ml"
    assert item.retail_price == Decimal("369.00")
