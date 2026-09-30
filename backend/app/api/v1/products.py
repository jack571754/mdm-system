import io
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, timezone
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.api.deps import get_db, get_current_user, require_roles
from app.models.user import User
from app.models.product import Product
from app.models.change_log import ChangeLog
from app.schemas.common import ApiResponse, PaginatedData
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductBatchStatusRequest
from app.schemas.change_log import ChangeLogOut
from app.services.write_pipeline import WritePipeline

router = APIRouter(prefix="/products", tags=["货品主数据"])


@router.get("", response_model=ApiResponse[PaginatedData[ProductOut]], summary="货品列表多维筛选查询")
def list_products(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(50, ge=1, le=200, description="每页条数，默认50"),
    keyword: Optional[str] = Query(None, description="关键词模糊查询(编码/名称/简称/昵称)"),
    brand: Optional[str] = Query(None, description="品牌筛选"),
    product_category: Optional[str] = Query(None, description="产品类目筛选"),
    status: Optional[str] = Query(None, description="商品状态(正常/停售/淘汰)"),
    sale_stage: Optional[str] = Query(None, description="在售新品阶段"),
    data_source: Optional[str] = Query(None, description="来源渠道"),
    is_enabled: Optional[bool] = Query(None, description="是否启用"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Product)

    if keyword and keyword.strip():
        k = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                Product.code.ilike(k),
                Product.name.ilike(k),
                Product.short_name.ilike(k),
                Product.nickname.ilike(k),
            )
        )

    if brand:
        query = query.filter(Product.brand == brand)
    if product_category:
        query = query.filter(Product.product_category == product_category)
    if status:
        query = query.filter(Product.status == status)
    if sale_stage:
        query = query.filter(Product.sale_stage == sale_stage)
    if data_source:
        query = query.filter(Product.data_source == data_source)
    if is_enabled is not None:
        query = query.filter(Product.is_enabled == is_enabled)

    total = query.count()
    items = (
        query.order_by(desc(Product.source_updated_at))
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return ApiResponse(
        code=200,
        message="success",
        data=PaginatedData(
            total=total,
            page=page,
            size=size,
            items=[ProductOut.model_validate(p) for p in items]
        )
    )


@router.get("/template", summary="下载货品标准 Excel 导入模板")
def download_product_template():
    """Generates and downloads the standard Excel import template."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "货品导入模板"

    headers = [
        "货品编号(*)", "货品名称(*)", "品牌(*)", "型号规格/净含量", "基本单位",
        "货品简称", "产品类目", "产品分类", "零售价", "昵称",
        "版本", "系列", "正品/小样", "商品状态", "箱规",
        "在售/新品", "是否需要维护"
    ]
    ws.append(headers)

    # Style header row
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="微软雅黑", size=10, bold=True, color="FFFFFF")
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    # Example rows
    examples = [
        ["PRO-PER-001", "珀莱雅红宝石精华2.0 30ml", "珀莱雅", "30ml", "瓶", "红宝石精华", "护肤", "精华", 329.00, "红宝石", "2.0版", "红宝石系列", "正品", "正常", "24瓶/箱", "在售", "否"],
        ["PRO-CT-002", "彩棠三色修容高光盘", "彩棠", "17g", "盒", "三色修容", "彩妆", "修容", 199.00, "修容盘", "经典版", "大师系列", "正品", "正常", "36盒/箱", "在售", "否"]
    ]
    for row in examples:
        ws.append(row)

    # Auto column width
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    filename = f"product_import_template_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/import/preview", summary="预览并校验上传的货品 Excel")
async def preview_import_products(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Parses uploaded Excel file, validates row-by-row and returns preview with row-level error manifest."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="仅支持上传 .xlsx 或 .xls 格式的 Excel 文件")

    contents = await file.read()
    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        ws = wb.active
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"无法解析该 Excel 文件: {str(e)}")

    rows = list(ws.iter_rows(values_only=True))
    if not rows or len(rows) < 2:
        raise HTTPException(status_code=400, detail="Excel 文件为空或无有效数据行")

    header_row = [str(c or "").strip() for c in rows[0]]
    field_mapping = {
        "货品编号(*)": "code", "货品编号": "code",
        "货品名称(*)": "name", "货品名称": "name",
        "品牌(*)": "brand", "品牌": "brand",
        "型号规格/净含量": "spec", "规格": "spec",
        "基本单位": "base_unit", "单位": "base_unit",
        "货品简称": "short_name", "简称": "short_name",
        "产品类目": "product_category", "类目": "product_category",
        "产品分类": "category_sub", "分类": "category_sub",
        "零售价": "retail_price",
        "昵称": "nickname",
        "版本": "version",
        "系列": "series",
        "正品/小样": "sample_type",
        "商品状态": "status",
        "箱规": "carton_spec",
        "在售/新品": "sale_stage",
        "是否需要维护": "needs_maintenance",
    }

    parsed_records = []
    errors = []

    for r_idx, row in enumerate(rows[1:], start=2):
        if not any(row):  # Skip completely empty rows
            continue

        item_dict = {"_row_num": r_idx}
        for c_idx, val in enumerate(row):
            if c_idx < len(header_row):
                header_title = header_row[c_idx]
                field_key = field_mapping.get(header_title)
                if field_key:
                    item_dict[field_key] = val

        # Validate
        code = str(item_dict.get("code") or "").strip()
        name = str(item_dict.get("name") or "").strip()
        brand = str(item_dict.get("brand") or "").strip()

        row_errors = []
        if not code:
            row_errors.append("货品编号必填")
        if not name:
            row_errors.append("货品名称必填")
        if not brand:
            row_errors.append("品牌必填")

        if row_errors:
            errors.append({
                "row": r_idx,
                "code": code or "—",
                "field": "必填校验",
                "value": "",
                "message": "；".join(row_errors)
            })
        else:
            parsed_records.append(item_dict)

    return ApiResponse(
        code=200,
        message="校验预览完成",
        data={
            "total_rows": len(parsed_records) + len(errors),
            "valid_count": len(parsed_records),
            "error_count": len(errors),
            "valid_records": parsed_records[:50], # Sample 50
            "errors": errors
        }
    )


@router.post("/import/confirm", summary="确认导入货品数据")
def confirm_import_products(
    records: List[dict],
    skip_errors: bool = Query(True, description="是否跳过错误行继续导入"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Executes WritePipeline to commit valid records into the master database."""
    res = WritePipeline.ingest_products(
        db=db,
        records=records,
        channel="Excel导入",
        operator=current_user.username,
        skip_errors=skip_errors
    )
    return ApiResponse(
        code=200,
        message="导入完成",
        data=res.to_dict()
    )


@router.get("/export", summary="按当前筛选条件导出货品 Excel")
def export_products(
    keyword: Optional[str] = None,
    brand: Optional[str] = None,
    product_category: Optional[str] = None,
    status: Optional[str] = None,
    sale_stage: Optional[str] = None,
    is_enabled: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exports full filtered dataset into standard Excel spreadsheet."""
    query = db.query(Product)
    if keyword and keyword.strip():
        k = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                Product.code.ilike(k),
                Product.name.ilike(k),
                Product.short_name.ilike(k),
                Product.nickname.ilike(k),
            )
        )
    if brand:
        query = query.filter(Product.brand == brand)
    if product_category:
        query = query.filter(Product.product_category == product_category)
    if status:
        query = query.filter(Product.status == status)
    if sale_stage:
        query = query.filter(Product.sale_stage == sale_stage)
    if is_enabled is not None:
        query = query.filter(Product.is_enabled == is_enabled)

    items = query.order_by(desc(Product.source_updated_at)).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "货品主数据导出"

    headers = [
        "货品编号", "货品名称", "品牌", "型号规格/净含量", "基本单位",
        "货品简称", "产品类目", "产品分类", "零售价", "昵称",
        "版本", "系列", "正品/小样", "商品状态", "箱规",
        "在售/新品", "是否需要维护", "数据来源", "来源更新时间", "是否启用"
    ]
    ws.append(headers)

    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="微软雅黑", size=10, bold=True, color="FFFFFF")
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for p in items:
        ws.append([
            p.code, p.name, p.brand, p.spec, p.base_unit,
            p.short_name, p.product_category, p.category_sub,
            float(p.retail_price) if p.retail_price is not None else None,
            p.nickname, p.version, p.series, p.sample_type, p.status, p.carton_spec,
            p.sale_stage, p.needs_maintenance, p.data_source,
            p.source_updated_at.strftime("%Y-%m-%d %H:%M:%S") if p.source_updated_at else "",
            "启用" if p.is_enabled else "禁用"
        ])

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 11)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    filename = f"products_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{code}", response_model=ApiResponse[ProductOut], summary="单条货品详情查询")
def get_product(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Product).filter(Product.code == code).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"未找到货品编号为 {code} 的档案")
    return ApiResponse(code=200, message="success", data=ProductOut.model_validate(p))


@router.post("", response_model=ApiResponse[ProductOut], summary="手工新增单条货品")
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = WritePipeline.ingest_products(
        db=db,
        records=[payload.model_dump()],
        channel="手工维护",
        operator=current_user.username
    )
    if res.errors:
        raise HTTPException(status_code=400, detail=res.errors[0]["message"])

    p = db.query(Product).filter(Product.code == payload.code).first()
    return ApiResponse(code=200, message="货品新增成功", data=ProductOut.model_validate(p))


@router.put("/{code}", response_model=ApiResponse[ProductOut], summary="手工更新单条货品")
def update_product(
    code: str,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Product).filter(Product.code == code).first()
    if not existing:
        raise HTTPException(status_code=404, detail="货品不存在")

    update_dict = payload.model_dump(exclude_unset=True)
    update_dict["code"] = code

    res = WritePipeline.ingest_products(
        db=db,
        records=[update_dict],
        channel="手工维护",
        operator=current_user.username
    )
    if res.errors:
        raise HTTPException(status_code=400, detail=res.errors[0]["message"])

    db.refresh(existing)
    return ApiResponse(code=200, message="货品修改成功", data=ProductOut.model_validate(existing))


@router.patch("/batch-status", summary="批量启用/禁用货品")
def batch_update_status(
    payload: ProductBatchStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    now = datetime.now(timezone.utc)
    products = db.query(Product).filter(Product.code.in_(payload.codes)).all()

    logs = []
    for p in products:
        if p.is_enabled != payload.is_enabled:
            old_val = "启用" if p.is_enabled else "禁用"
            new_val = "启用" if payload.is_enabled else "禁用"
            p.is_enabled = payload.is_enabled
            p.source_updated_at = now
            logs.append(
                ChangeLog(
                    object_type="product",
                    object_code=p.code,
                    field_name="is_enabled",
                    old_value=old_val,
                    new_value=new_val,
                    operator=current_user.username,
                    channel="手工维护",
                    created_at=now
                )
            )

    db.add_all(logs)
    db.commit()
    return ApiResponse(code=200, message=f"已成功更新 {len(products)} 条货品状态")


@router.get("/{code}/changes", response_model=ApiResponse[List[ChangeLogOut]], summary="查询单条货品变更历史时间线")
def get_product_changes(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = (
        db.query(ChangeLog)
        .filter(ChangeLog.object_type == "product", ChangeLog.object_code == code)
        .order_by(desc(ChangeLog.created_at))
        .all()
    )
    return ApiResponse(
        code=200,
        message="success",
        data=[ChangeLogOut.model_validate(log) for log in logs]
    )
