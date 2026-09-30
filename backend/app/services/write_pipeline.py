from datetime import datetime, date, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.mechanism import Mechanism, MechanismItem
from app.models.change_log import ChangeLog


CHANNEL_PRIORITIES = {
    "数仓同步": 40,
    "API推送": 30,
    "Excel导入": 20,
    "手工维护": 10,
}


class IngestResult:
    def __init__(self):
        self.inserted: int = 0
        self.updated: int = 0
        self.skipped: int = 0
        self.errors: List[Dict[str, Any]] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "inserted": self.inserted,
            "updated": self.updated,
            "skipped": self.skipped,
            "errors": self.errors,
            "total_processed": self.inserted + self.updated + self.skipped + len(self.errors)
        }


class WritePipeline:
    """Core data ingestion pipeline ensuring validation, authority merge, audit trail and cascade refresh."""

    @classmethod
    def ingest_products(
        cls,
        db: Session,
        records: List[Dict[str, Any]],
        channel: str = "手工维护",
        operator: str = "system",
        skip_errors: bool = True
    ) -> IngestResult:
        result = IngestResult()
        incoming_priority = CHANNEL_PRIORITIES.get(channel, 10)
        now = datetime.now(timezone.utc)

        for index, item in enumerate(records, start=1):
            row_num = item.get("_row_num", index)
            code = str(item.get("code") or "").strip()
            name = str(item.get("name") or "").strip()
            brand = str(item.get("brand") or "").strip()

            # 1. Validation
            if not code:
                result.errors.append({
                    "row": row_num,
                    "code": code,
                    "field": "code",
                    "value": code,
                    "message": "货品编号必填且不能为空"
                })
                continue

            existing: Optional[Product] = db.query(Product).filter(Product.code == code).first()

            if not existing and not name:
                result.errors.append({
                    "row": row_num,
                    "code": code,
                    "field": "name",
                    "value": name,
                    "message": "新增货品时，货品名称必填且不能为空"
                })
                continue

            if not existing and not brand:
                result.errors.append({
                    "row": row_num,
                    "code": code,
                    "field": "brand",
                    "value": brand,
                    "message": "新增货品时，品牌必填且不能为空"
                })
                continue

            # Validate price
            raw_price = item.get("retail_price")
            retail_price: Optional[Decimal] = None
            if raw_price is not None and str(raw_price).strip() != "":
                try:
                    retail_price = Decimal(str(raw_price).strip())
                    if retail_price < 0:
                        raise ValueError("价格必须大于等于0")
                except Exception:
                    result.errors.append({
                        "row": row_num,
                        "code": code,
                        "field": "retail_price",
                        "value": raw_price,
                        "message": "零售价必须为合法且大于等于0的数值"
                    })
                    continue

            # 2. Check Existing Record & Merge Strategy
            if existing:
                if "name" not in item or item.get("name") is None:
                    name = existing.name
                if "brand" not in item or item.get("brand") is None:
                    brand = existing.brand

                # Rule: Is Locked Check
                if existing.is_locked and channel in ("数仓同步", "API推送"):
                    result.skipped += 1
                    continue

                # Rule: Authority Channel Priority
                existing_priority = CHANNEL_PRIORITIES.get(existing.data_source, 10)
                if incoming_priority < existing_priority:
                    result.skipped += 1
                    continue

                # 3. Diff & Non-null protection
                diff_logs: List[ChangeLog] = []
                fields_to_update = [
                    ("name", name),
                    ("brand", brand),
                    ("spec", item.get("spec")),
                    ("base_unit", item.get("base_unit")),
                    ("short_name", item.get("short_name")),
                    ("product_category", item.get("product_category")),
                    ("category_sub", item.get("category_sub")),
                    ("retail_price", retail_price),
                    ("nickname", item.get("nickname")),
                    ("version", item.get("version")),
                    ("series", item.get("series")),
                    ("sample_type", item.get("sample_type")),
                    ("status", item.get("status")),
                    ("carton_spec", item.get("carton_spec")),
                    ("sale_stage", item.get("sale_stage")),
                    ("needs_maintenance", item.get("needs_maintenance")),
                ]

                has_changes = False
                for field_name, new_val in fields_to_update:
                    # Non-null protection: if new value is empty/None but existing value is non-empty, preserve existing
                    if (new_val is None or (isinstance(new_val, str) and new_val.strip() == "")) and getattr(existing, field_name) is not None:
                        continue

                    old_val = getattr(existing, field_name)
                    # Normalize comparison
                    old_str = "" if old_val is None else str(old_val).strip()
                    new_str = "" if new_val is None else str(new_val).strip()

                    if old_str != new_str:
                        has_changes = True
                        setattr(existing, field_name, new_val)
                        diff_logs.append(
                            ChangeLog(
                                object_type="product",
                                object_code=code,
                                field_name=field_name,
                                old_value=old_str,
                                new_value=new_str,
                                operator=operator,
                                channel=channel,
                                created_at=now,
                            )
                        )

                if has_changes:
                    existing.data_source = channel
                    existing.source_updated_at = now
                    existing.pending_delete = False
                    db.add_all(diff_logs)
                    result.updated += 1

                    # 4. Cascade Refresh mechanism_item snapshots
                    cls._cascade_refresh_mechanism_items(db, code, existing, operator, channel, now)
                else:
                    result.skipped += 1

            else:
                # Create New Product
                new_product = Product(
                    code=code,
                    name=name,
                    brand=brand,
                    spec=item.get("spec"),
                    base_unit=item.get("base_unit"),
                    short_name=item.get("short_name"),
                    product_category=item.get("product_category"),
                    category_sub=item.get("category_sub"),
                    retail_price=retail_price,
                    nickname=item.get("nickname"),
                    version=item.get("version"),
                    series=item.get("series"),
                    sample_type=item.get("sample_type"),
                    status=item.get("status") or "正常",
                    carton_spec=item.get("carton_spec"),
                    sale_stage=item.get("sale_stage") or "在售",
                    needs_maintenance=item.get("needs_maintenance") or "否",
                    data_source=channel,
                    source_updated_at=now,
                    is_enabled=True,
                    pending_delete=False,
                    is_locked=False,
                )
                db.add(new_product)

                # Record creation log
                creation_log = ChangeLog(
                    object_type="product",
                    object_code=code,
                    field_name="_created",
                    old_value=None,
                    new_value=f"创建货品: {name} ({brand})",
                    operator=operator,
                    channel=channel,
                    created_at=now,
                )
                db.add(creation_log)
                result.inserted += 1

        db.commit()
        return result

    @classmethod
    def _cascade_refresh_mechanism_items(
        cls,
        db: Session,
        product_code: str,
        product: Product,
        operator: str,
        channel: str,
        now: datetime
    ) -> None:
        """Cascade update redundant item snapshot fields when product master changes."""
        items: List[MechanismItem] = db.query(MechanismItem).filter(MechanismItem.product_code == product_code).all()
        for item in items:
            item.product_name = product.name
            item.product_short_name = product.short_name
            item.product_spec = product.spec
            item.retail_price = product.retail_price

            db.add(
                ChangeLog(
                    object_type="mechanism_item",
                    object_code=item.mechanism_code,
                    sub_key=product_code,
                    field_name="cascade_refresh",
                    old_value=None,
                    new_value=f"级联同步货品[{product_code}]最新档案",
                    operator=operator,
                    channel=channel,
                    created_at=now,
                )
            )
