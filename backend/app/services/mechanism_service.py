import io
import re
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.mechanism import Mechanism, MechanismItem
from app.models.product import Product
from app.models.change_log import ChangeLog
from app.services.write_pipeline import IngestResult, CHANNEL_PRIORITIES


BRAND_TAG_MAPPING = {
    "珀莱雅": "PROYA",
    "彩棠": "TIMAGE",
    "Off&Relax": "OR",
    "悦芙媞": "HAPSODE",
    "原色波塔": "BOYA",
}


def get_brand_tag(brand: Optional[str]) -> str:
    if not brand:
        return "GEN"
    clean_brand = brand.strip()
    if clean_brand in BRAND_TAG_MAPPING:
        return BRAND_TAG_MAPPING[clean_brand]
    # Check if latin
    latin = re.sub(r"[^A-Za-z0-9]", "", clean_brand).upper()
    if latin:
        return latin[:6]
    return "GEN"


def compute_mechanism_status(
    is_enabled: bool,
    start_date: Optional[date],
    end_date: Optional[date]
) -> str:
    if not is_enabled:
        return "已停用"
    today = date.today()
    if start_date and today < start_date:
        return "待生效"
    if end_date and today > end_date:
        return "已过期"
    return "生效中"


def generate_mechanism_code(db: Session, brand: Optional[str] = None) -> str:
    """Generate sequential mechanism code: M-{BRAND_TAG}-{YYYYMM}-{0001}."""
    brand_tag = get_brand_tag(brand)
    ym = datetime.now().strftime("%Y%m")
    prefix = f"M-{brand_tag}-{ym}-"

    # Query existing codes starting with prefix
    existing_codes = (
        db.query(Mechanism.code)
        .filter(Mechanism.code.like(f"{prefix}%"))
        .all()
    )

    max_seq = 0
    for (c,) in existing_codes:
        suffix = c[len(prefix):]
        if suffix.isdigit():
            val = int(suffix)
            if val > max_seq:
                max_seq = val

    next_seq = max_seq + 1
    return f"{prefix}{next_seq:04d}"


class MechanismService:

    @classmethod
    def create_or_update_mechanism(
        cls,
        db: Session,
        data: Dict[str, Any],
        operator: str = "system",
        channel: str = "手工维护"
    ) -> Tuple[Mechanism, bool]:
        """Create or update a mechanism with items and redundant product snapshot fields."""
        code = (data.get("code") or "").strip()
        brand = data.get("brand") or "珀莱雅"
        if not code:
            code = generate_mechanism_code(db, brand)

        name = (data.get("name") or "").strip()
        if not name:
            raise ValueError("机制名称必填且不能为空")

        now = datetime.now(timezone.utc)
        mech: Optional[Mechanism] = db.query(Mechanism).filter(Mechanism.code == code).first()
        is_new = mech is None

        raw_items = data.get("items") or []
        if not raw_items:
            raise ValueError(f"促销机制 [{code}] 必须至少包含一个货品明细")

        # Validate products exist
        prod_codes = [it.get("product_code") for it in raw_items if it.get("product_code")]
        if not prod_codes:
            raise ValueError("货品明细中缺少货品编码")

        existing_prods: Dict[str, Product] = {
            p.code: p
            for p in db.query(Product).filter(Product.code.in_(prod_codes)).all()
        }

        # Check unique constraint within kit
        seen_prods = set()
        for it in raw_items:
            p_code = it.get("product_code")
            if not p_code or p_code not in existing_prods:
                raise ValueError(f"明细货品编码 [{p_code}] 在货品主数据中不存在，请先维护货品档案")
            if p_code in seen_prods:
                raise ValueError(f"机制内不能重复添加相同货品编码 [{p_code}]")
            seen_prods.add(p_code)

        if is_new:
            mech = Mechanism(
                code=code,
                name=name,
                kit_type=data.get("kit_type") or "单件",
                mechanism_type=data.get("mechanism_type") or "日常",
                source=channel,
                start_date=data.get("start_date"),
                end_date=data.get("end_date"),
                mechanism_price=data.get("mechanism_price"),
                short_name=data.get("short_name"),
                brand=brand,
                creator=operator,
                data_source=channel,
                source_updated_at=now,
                is_enabled=True,
                pending_delete=False,
                is_locked=data.get("is_locked") or False,
            )
            db.add(mech)
            db.flush()

            # Record creation log
            db.add(ChangeLog(
                object_type="mechanism",
                object_code=code,
                field_name="_created",
                old_value=None,
                new_value=f"创建促销机制: {name} (共{len(raw_items)}件明细)",
                operator=operator,
                channel=channel,
                created_at=now,
            ))
        else:
            # Check lock
            if mech.is_locked and channel in ["数仓同步", "Excel导入"]:
                # Locked protection
                return mech, False

            # Update header fields
            fields_to_check = [
                ("name", data.get("name")),
                ("kit_type", data.get("kit_type")),
                ("mechanism_type", data.get("mechanism_type")),
                ("start_date", data.get("start_date")),
                ("end_date", data.get("end_date")),
                ("mechanism_price", data.get("mechanism_price")),
                ("short_name", data.get("short_name")),
                ("brand", data.get("brand")),
            ]
            for f_name, f_val in fields_to_check:
                if f_val is not None:
                    old_v = getattr(mech, f_name)
                    if old_v != f_val:
                        setattr(mech, f_name, f_val)
                        db.add(ChangeLog(
                            object_type="mechanism",
                            object_code=code,
                            field_name=f_name,
                            old_value=str(old_v) if old_v is not None else None,
                            new_value=str(f_val),
                            operator=operator,
                            channel=channel,
                            created_at=now,
                        ))

            if "is_locked" in data and data["is_locked"] is not None:
                mech.is_locked = data["is_locked"]

            mech.source_updated_at = now
            mech.data_source = channel

            # Clear existing items for clean reload
            db.query(MechanismItem).filter(MechanismItem.mechanism_code == code).delete()

        # Add items with redundant cache
        for it in raw_items:
            p_code = it.get("product_code")
            prod = existing_prods[p_code]
            qty = int(it.get("quantity") or 1)
            item_type = it.get("item_type") or "主品"

            m_item = MechanismItem(
                mechanism_code=code,
                product_code=p_code,
                product_name=prod.name,
                product_short_name=prod.short_name,
                product_spec=prod.spec,
                retail_price=prod.retail_price,
                quantity=qty,
                item_type=item_type,
            )
            db.add(m_item)

        db.commit()
        db.refresh(mech)
        return mech, is_new

    @classmethod
    def generate_flat_template(cls) -> io.BytesIO:
        """Generate flat mechanism Excel template."""
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "促销机制导入模板"

        headers = [
            "机制编码(选填)",
            "机制名称*",
            "品牌*",
            "套装类型",
            "机制类型",
            "生效起始日期",
            "生效结束日期",
            "机制价格",
            "货品编码*",
            "明细类型*",
            "数量*",
        ]
        ws.append(headers)

        # Style header
        header_font = Font(name="微软雅黑", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
        border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )
        for col in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = border

        # Sample rows for 1 mechanism with 2 items
        sample_rows = [
            [
                "", # 机制编码留空自动派发
                "珀莱雅双抗精华买1赠3体验套",
                "珀莱雅",
                "买赠套装",
                "大促",
                "2026-10-01",
                "2026-10-31",
                259.00,
                "PRO-PER-001",
                "主品",
                1,
            ],
            [
                "", # 相同机制名称自动聚合
                "珀莱雅双抗精华买1赠3体验套",
                "珀莱雅",
                "买赠套装",
                "大促",
                "2026-10-01",
                "2026-10-31",
                259.00,
                "PRO-PER-003",
                "赠品",
                3,
            ],
            [
                "M-TIMAGE-202610-0001",
                "彩棠高光修容双色盘搭配装",
                "彩棠",
                "多件组合",
                "日常",
                "2026-10-01",
                "2026-12-31",
                199.00,
                "PRO-PER-005",
                "主品",
                1,
            ],
        ]

        data_font = Font(name="微软雅黑", size=10)
        for r_idx, r_data in enumerate(sample_rows, start=2):
            ws.append(r_data)
            for c_idx in range(1, len(r_data) + 1):
                cell = ws.cell(row=r_idx, column=c_idx)
                cell.font = data_font
                cell.border = border
                if c_idx in [6, 7, 8, 11]:
                    cell.alignment = Alignment(horizontal="center")

        # Auto width
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = col[0].column_letter
            ws.column_dimensions[col_letter].width = max(max_len * 2, 14)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    @classmethod
    def parse_flat_excel(
        cls,
        db: Session,
        file_content: bytes
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Parse flat spreadsheet rows and group into mechanism objects.
        Returns (grouped_mechanisms, row_errors).
        """
        wb = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))

        errors: List[Dict[str, Any]] = []
        if not rows or len(rows) < 2:
            errors.append({"row": 1, "code": "", "name": "", "message": "上传文件无有效数据行"})
            return [], errors

        # Load all valid product codes in memory for fast validation
        all_product_codes = {p.code for p in db.query(Product.code).all()}

        # Group rows by key: code if present, else (name, brand)
        grouped: Dict[str, Dict[str, Any]] = {}

        for row_idx, r in enumerate(rows[1:], start=2):
            if not any(r):
                continue

            mech_code = str(r[0] or "").strip() if len(r) > 0 and r[0] is not None else ""
            mech_name = str(r[1] or "").strip() if len(r) > 1 and r[1] is not None else ""
            brand = str(r[2] or "").strip() if len(r) > 2 and r[2] is not None else ""
            kit_type = str(r[3] or "").strip() if len(r) > 3 and r[3] is not None else "单件"
            mech_type = str(r[4] or "").strip() if len(r) > 4 and r[4] is not None else "日常"
            start_date_val = r[5] if len(r) > 5 else None
            end_date_val = r[6] if len(r) > 6 else None
            mech_price_val = r[7] if len(r) > 7 else None
            prod_code = str(r[8] or "").strip() if len(r) > 8 and r[8] is not None else ""
            item_type = str(r[9] or "").strip() if len(r) > 9 and r[9] is not None else "主品"
            qty_val = r[10] if len(r) > 10 else 1

            # Validate row
            if not mech_name:
                errors.append({"row": row_idx, "code": mech_code, "name": mech_name, "message": "机制名称必填"})
                continue

            if not brand:
                errors.append({"row": row_idx, "code": mech_code, "name": mech_name, "message": "品牌必填"})
                continue

            if not prod_code:
                errors.append({"row": row_idx, "code": mech_code, "name": mech_name, "message": "明细货品编码必填"})
                continue

            if prod_code not in all_product_codes:
                errors.append({
                    "row": row_idx,
                    "code": mech_code,
                    "name": mech_name,
                    "message": f"货品编码 [{prod_code}] 在货品主数据中不存在，请先维护货品档案"
                })
                continue

            # Quantity check
            try:
                quantity = int(qty_val) if qty_val is not None else 1
                if quantity <= 0:
                    errors.append({"row": row_idx, "code": mech_code, "name": mech_name, "message": "数量必须大于0"})
                    continue
            except (ValueError, TypeError):
                errors.append({"row": row_idx, "code": mech_code, "name": mech_name, "message": f"数量格式错误: {qty_val}"})
                continue

            # Parse dates
            def parse_date(v):
                if v is None:
                    return None
                if isinstance(v, datetime):
                    return v.date()
                if isinstance(v, date):
                    return v
                try:
                    return datetime.strptime(str(v).strip(), "%Y-%m-%d").date()
                except Exception:
                    return None

            s_date = parse_date(start_date_val)
            e_date = parse_date(end_date_val)

            # Mechanism Price
            m_price = None
            if mech_price_val is not None and str(mech_price_val).strip() != "":
                try:
                    m_price = Decimal(str(mech_price_val).strip())
                except Exception:
                    pass

            group_key = mech_code if mech_code else f"NEW::{brand}::{mech_name}"

            if group_key not in grouped:
                grouped[group_key] = {
                    "code": mech_code or None,
                    "name": mech_name,
                    "brand": brand,
                    "kit_type": kit_type or "单件",
                    "mechanism_type": mech_type or "日常",
                    "start_date": s_date,
                    "end_date": e_date,
                    "mechanism_price": m_price,
                    "items": [],
                    "seen_prods": set(),
                }

            # Check duplicate product inside same mechanism
            if prod_code in grouped[group_key]["seen_prods"]:
                errors.append({
                    "row": row_idx,
                    "code": mech_code,
                    "name": mech_name,
                    "message": f"机制内不能重复添加相同货品编码 [{prod_code}]"
                })
                continue

            grouped[group_key]["seen_prods"].add(prod_code)
            grouped[group_key]["items"].append({
                "product_code": prod_code,
                "item_type": item_type if item_type in ["主品", "赠品"] else "主品",
                "quantity": quantity,
                "_row": row_idx
            })

        valid_mechanisms = []
        for g in grouped.values():
            if g["items"]:
                valid_mechanisms.append(g)

        return valid_mechanisms, errors

    @classmethod
    def export_mechanisms_excel(
        cls,
        db: Session,
        keyword: Optional[str] = None,
        brand: Optional[str] = None,
        status_filter: Optional[str] = None,
        kit_type: Optional[str] = None,
    ) -> io.BytesIO:
        """Export mechanisms with items in flat structure."""
        query = db.query(Mechanism)
        if keyword:
            kw = f"%{keyword}%"
            query = query.filter(Mechanism.name.like(kw) | Mechanism.code.like(kw))
        if brand:
            query = query.filter(Mechanism.brand == brand)
        if kit_type:
            query = query.filter(Mechanism.kit_type == kit_type)

        mechanisms = query.order_by(Mechanism.created_at.desc()).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "促销机制主数据"

        headers = [
            "机制编码",
            "机制名称",
            "品牌",
            "套装类型",
            "机制类型",
            "生效状态",
            "生效起始日期",
            "生效结束日期",
            "机制价格",
            "货品编码",
            "货品名称",
            "货品规格",
            "官方零售价",
            "明细类型",
            "数量",
            "来源渠道",
            "更新时间",
        ]
        ws.append(headers)

        header_font = Font(name="微软雅黑", size=10, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        border = Border(
            left=Side(style="thin", color="E2E8F0"),
            right=Side(style="thin", color="E2E8F0"),
            top=Side(style="thin", color="E2E8F0"),
            bottom=Side(style="thin", color="E2E8F0"),
        )
        for c in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=c)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = border

        data_font = Font(name="微软雅黑", size=9)
        current_row = 2

        for m in mechanisms:
            calc_st = compute_mechanism_status(m.is_enabled, m.start_date, m.end_date)
            if status_filter and status_filter != "all" and calc_st != status_filter:
                continue

            items = m.items
            if not items:
                # header only
                row_data = [
                    m.code,
                    m.name,
                    m.brand,
                    m.kit_type,
                    m.mechanism_type,
                    calc_st,
                    str(m.start_date or ""),
                    str(m.end_date or ""),
                    float(m.mechanism_price) if m.mechanism_price else "",
                    "", "", "", "", "", "",
                    m.data_source,
                    m.updated_at.strftime("%Y-%m-%d %H:%M:%S") if m.updated_at else "",
                ]
                ws.append(row_data)
                for c in range(1, len(row_data) + 1):
                    ws.cell(row=current_row, column=c).font = data_font
                    ws.cell(row=current_row, column=c).border = border
                current_row += 1
            else:
                for it in items:
                    row_data = [
                        m.code,
                        m.name,
                        m.brand,
                        m.kit_type,
                        m.mechanism_type,
                        calc_st,
                        str(m.start_date or ""),
                        str(m.end_date or ""),
                        float(m.mechanism_price) if m.mechanism_price else "",
                        it.product_code,
                        it.product_name or "",
                        it.product_spec or "",
                        float(it.retail_price) if it.retail_price else "",
                        it.item_type,
                        it.quantity,
                        m.data_source,
                        m.updated_at.strftime("%Y-%m-%d %H:%M:%S") if m.updated_at else "",
                    ]
                    ws.append(row_data)
                    for c in range(1, len(row_data) + 1):
                        ws.cell(row=current_row, column=c).font = data_font
                        ws.cell(row=current_row, column=c).border = border
                    current_row += 1

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = col[0].column_letter
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output
