import logging
from decimal import Decimal
from datetime import datetime, timezone, date
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.product import Product
from app.models.mechanism import Mechanism, MechanismItem
from app.models.enum_config import EnumConfig
from app.models.change_log import ChangeLog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    """Initialize database tables and seed required initial admin users, enums, and realistic master products."""
    Base.metadata.create_all(bind=engine)
    now = datetime.now(timezone.utc)

    # 1. Seed Initial Administrator
    admin = db.query(User).filter(User.username == settings.INITIAL_ADMIN_USERNAME).first()
    if not admin:
        logger.info(f"Creating default admin user: {settings.INITIAL_ADMIN_USERNAME}")
        admin = User(
            username=settings.INITIAL_ADMIN_USERNAME,
            password_hash=hash_password(settings.INITIAL_ADMIN_PASSWORD),
            role="admin",
            is_enabled=True,
        )
        db.add(admin)
        db.commit()

    # 2. Seed Initial Operator User
    operator = db.query(User).filter(User.username == "operator").first()
    if not operator:
        logger.info("Creating default operator user: operator")
        operator = User(
            username="operator",
            password_hash=hash_password("Operator@123456"),
            role="operator",
            is_enabled=True,
        )
        db.add(operator)
        db.commit()

    # 3. Seed Initial Enum Dictionaries (PRD v1.0 §5.3)
    preset_enums = [
        # Product Enums
        ("product", "base_unit", ["瓶", "盒", "支", "套", "罐", "袋", "片", "件"]),
        ("product", "sample_type", ["正品", "小样"]),
        ("product", "status", ["正常", "停售", "淘汰"]),
        ("product", "sale_stage", ["在售", "新品", "预售", "清尾"]),
        ("product", "needs_maintenance", ["是", "否"]),
        # Mechanism Enums
        ("mechanism", "kit_type", ["单件", "多件组合", "买赠套装", "加价购", "体验包"]),
        ("mechanism", "mechanism_type", ["日常促销", "S促", "D11/618大促", "超头直播", "头部主播", "自播专属"]),
        ("mechanism_item", "item_type", ["主品", "赠品"]),
    ]

    for domain, field_name, values in preset_enums:
        for idx, val in enumerate(values):
            exists = (
                db.query(EnumConfig)
                .filter(
                    EnumConfig.domain == domain,
                    EnumConfig.field_name == field_name,
                    EnumConfig.value == val
                )
                .first()
            )
            if not exists:
                db.add(
                    EnumConfig(
                        domain=domain,
                        field_name=field_name,
                        value=val,
                        sort_order=idx + 1,
                        is_enabled=True
                    )
                )
    db.commit()

    # 4. Seed Realistic Master Products (if empty)
    existing_count = db.query(Product).count()
    if existing_count == 0:
        logger.info("Seeding initial master products...")
        sample_products = [
            Product(
                code="PRO-PER-001",
                name="珀莱雅红宝石精华2.0 30ml",
                brand="珀莱雅",
                spec="30ml",
                base_unit="瓶",
                short_name="红宝石精华30ml",
                product_category="护肤",
                category_sub="精华",
                retail_price=Decimal("329.00"),
                nickname="红宝石",
                version="2.0版",
                series="红宝石紧致系列",
                sample_type="正品",
                status="正常",
                carton_spec="24瓶/箱",
                sale_stage="在售",
                needs_maintenance="否",
                data_source="数仓同步",
                source_updated_at=now,
                is_enabled=True,
                pending_delete=False,
                is_locked=False,
            ),
            Product(
                code="PRO-PER-002",
                name="珀莱雅双抗精华3.0 50ml",
                brand="珀莱雅",
                spec="50ml",
                base_unit="瓶",
                short_name="双抗精华50ml",
                product_category="护肤",
                category_sub="精华",
                retail_price=Decimal("379.00"),
                nickname="双抗精华",
                version="3.0版",
                series="双抗焕亮系列",
                sample_type="正品",
                status="正常",
                carton_spec="24瓶/箱",
                sale_stage="在售",
                needs_maintenance="否",
                data_source="数仓同步",
                source_updated_at=now,
                is_enabled=True,
                pending_delete=False,
                is_locked=False,
            ),
            Product(
                code="PRO-PER-003",
                name="珀莱雅源力修护精华2.0 30ml",
                brand="珀莱雅",
                spec="30ml",
                base_unit="瓶",
                short_name="源力精华30ml",
                product_category="护肤",
                category_sub="精华",
                retail_price=Decimal("289.00"),
                nickname="源力精华",
                version="2.0版",
                series="源力修护系列",
                sample_type="正品",
                status="正常",
                carton_spec="24瓶/箱",
                sale_stage="新品",
                needs_maintenance="否",
                data_source="数仓同步",
                source_updated_at=now,
                is_enabled=True,
                pending_delete=False,
                is_locked=False,
            ),
            Product(
                code="PRO-PER-004",
                name="珀莱雅红宝石面霜 50g(轻盈型)",
                brand="珀莱雅",
                spec="50g",
                base_unit="罐",
                short_name="红宝石轻盈面霜",
                product_category="护肤",
                category_sub="面霜",
                retail_price=Decimal("319.00"),
                nickname="红宝石面霜",
                version="经典版",
                series="红宝石紧致系列",
                sample_type="正品",
                status="正常",
                carton_spec="18罐/箱",
                sale_stage="在售",
                needs_maintenance="否",
                data_source="手工维护",
                source_updated_at=now,
                is_enabled=True,
                pending_delete=False,
                is_locked=True,
            ),
            Product(
                code="PRO-PER-005",
                name="珀莱雅红宝石精华 7.5ml 中样",
                brand="珀莱雅",
                spec="7.5ml",
                base_unit="支",
                short_name="红宝石中样",
                product_category="护肤",
                category_sub="精华",
                retail_price=Decimal("69.00"),
                nickname="红宝石小样",
                version="2.0版",
                series="红宝石紧致系列",
                sample_type="小样",
                status="正常",
                carton_spec="120支/箱",
                sale_stage="在售",
                needs_maintenance="否",
                data_source="数仓同步",
                source_updated_at=now,
                is_enabled=True,
                pending_delete=False,
                is_locked=False,
            ),
            Product(
                code="PRO-CT-001",
                name="彩棠大师三色修容高光盘 17g",
                brand="彩棠",
                spec="17g",
                base_unit="盒",
                short_name="彩棠三色修容",
                product_category="彩妆",
                category_sub="高光修容",
                retail_price=Decimal("199.00"),
                nickname="大师修容盘",
                version="经典版",
                series="大师系列",
                sample_type="正品",
                status="正常",
                carton_spec="36盒/箱",
                sale_stage="在售",
                needs_maintenance="否",
                data_source="数仓同步",
                source_updated_at=now,
                is_enabled=True,
                pending_delete=False,
                is_locked=False,
            ),
            Product(
                code="PRO-CT-002",
                name="彩棠润玉无瑕三色遮瑕膏 8.4g",
                brand="彩棠",
                spec="8.4g",
                base_unit="盒",
                short_name="彩棠三色遮瑕",
                product_category="彩妆",
                category_sub="遮瑕",
                retail_price=Decimal("169.00"),
                nickname="润玉遮瑕",
                version="2.0版",
                series="润玉系列",
                sample_type="正品",
                status="正常",
                carton_spec="48盒/箱",
                sale_stage="在售",
                needs_maintenance="否",
                data_source="数仓同步",
                source_updated_at=now,
                is_enabled=True,
                pending_delete=False,
                is_locked=False,
            ),
            Product(
                code="PRO-OR-001",
                name="Off&Relax 清爽控油洗发水 260ml",
                brand="Off&Relax",
                spec="260ml",
                base_unit="瓶",
                short_name="OR控油洗发水",
                product_category="洗护",
                category_sub="洗发水",
                retail_price=Decimal("138.00"),
                nickname="OR洗发水",
                version="1.0版",
                series="温泉水系列",
                sample_type="正品",
                status="正常",
                carton_spec="20瓶/箱",
                sale_stage="在售",
                needs_maintenance="否",
                data_source="数仓同步",
                source_updated_at=now,
                is_enabled=True,
                pending_delete=False,
                is_locked=False,
            ),
            Product(
                code="PRO-OR-002",
                name="Off&Relax 温泉修护发膜 150g",
                brand="Off&Relax",
                spec="150g",
                base_unit="支",
                short_name="OR修护发膜",
                product_category="洗护",
                category_sub="护发",
                retail_price=Decimal("158.00"),
                nickname="OR发膜",
                version="1.0版",
                series="温泉水系列",
                sample_type="正品",
                status="正常",
                carton_spec="24支/箱",
                sale_stage="在售",
                needs_maintenance="否",
                data_source="手工维护",
                source_updated_at=now,
                is_enabled=True,
                pending_delete=False,
                is_locked=False,
            ),
        ]
        db.add_all(sample_products)

        for p in sample_products:
            db.add(
                ChangeLog(
                    object_type="product",
                    object_code=p.code,
                    field_name="_created",
                    old_value=None,
                    new_value=f"系统初始化导入: {p.name}",
                    operator="system",
                    channel=p.data_source,
                    created_at=now,
                )
            )
        db.commit()
        logger.info(f"Successfully seeded {len(sample_products)} sample products.")

    # 5. Seed Realistic Promotion Mechanisms (if empty)
    existing_mech_count = db.query(Mechanism).count()
    if existing_mech_count == 0:
        logger.info("Seeding initial promotion mechanisms...")
        m1 = Mechanism(
            code="M-PROYA-202609-0001",
            name="珀莱雅早C晚A经典护肤套装",
            kit_type="买赠套装",
            mechanism_type="大促",
            source="手工维护",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 12, 31),
            mechanism_price=Decimal("499.00"),
            short_name="早C晚A套组",
            brand="珀莱雅",
            creator="admin",
            data_source="手工维护",
            source_updated_at=now,
            is_enabled=True,
            pending_delete=False,
            is_locked=False,
        )
        m2 = Mechanism(
            code="M-TIMAGE-202609-0001",
            name="彩棠大师底妆立体修容组",
            kit_type="多件组合",
            mechanism_type="日常",
            source="手工维护",
            start_date=date(2026, 9, 15),
            end_date=date(2026, 11, 30),
            mechanism_price=Decimal("349.00"),
            short_name="大师立体底妆套",
            brand="彩棠",
            creator="admin",
            data_source="手工维护",
            source_updated_at=now,
            is_enabled=True,
            pending_delete=False,
            is_locked=False,
        )
        m3 = Mechanism(
            code="M-OR-202609-0001",
            name="Off&Relax 温泉洗护奢享礼盒",
            kit_type="多件组合",
            mechanism_type="S促",
            source="手工维护",
            start_date=date(2026, 10, 1),
            end_date=date(2026, 10, 31),
            mechanism_price=Decimal("269.00"),
            short_name="OR温泉洗护礼盒",
            brand="Off&Relax",
            creator="admin",
            data_source="手工维护",
            source_updated_at=now,
            is_enabled=True,
            pending_delete=False,
            is_locked=False,
        )
        db.add_all([m1, m2, m3])
        db.flush()

        # Seed items
        items = [
            MechanismItem(mechanism_code=m1.code, product_code="PRO-PER-001", product_name="珀莱雅红宝石精华2.0 30ml", product_spec="30ml", retail_price=Decimal("329.00"), quantity=1, item_type="主品"),
            MechanismItem(mechanism_code=m1.code, product_code="PRO-PER-002", product_name="珀莱雅双抗精华3.0 30ml", product_spec="30ml", retail_price=Decimal("289.00"), quantity=1, item_type="主品"),
            MechanismItem(mechanism_code=m1.code, product_code="PRO-PER-003", product_name="珀莱雅双抗精华3.0 7.5ml", product_spec="7.5ml", retail_price=Decimal("0.00"), quantity=4, item_type="赠品"),
            MechanismItem(mechanism_code=m2.code, product_code="PRO-CT-001", product_name="彩棠大师三色修容高光盘 17g", product_spec="17g", retail_price=Decimal("199.00"), quantity=1, item_type="主品"),
            MechanismItem(mechanism_code=m2.code, product_code="PRO-CT-002", product_name="彩棠润玉无瑕三色遮瑕膏 8.4g", product_spec="8.4g", retail_price=Decimal("169.00"), quantity=1, item_type="主品"),
            MechanismItem(mechanism_code=m3.code, product_code="PRO-OR-001", product_name="Off&Relax 清爽控油洗发水 260ml", product_spec="260ml", retail_price=Decimal("138.00"), quantity=1, item_type="主品"),
            MechanismItem(mechanism_code=m3.code, product_code="PRO-OR-002", product_name="Off&Relax 温泉修护发膜 150g", product_spec="150g", retail_price=Decimal("158.00"), quantity=1, item_type="主品"),
        ]
        db.add_all(items)
        db.commit()
        db.commit()
        logger.info("Successfully seeded sample promotion mechanisms and combination items.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()

