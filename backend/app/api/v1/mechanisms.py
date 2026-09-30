import os
import uuid
import tempfile
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.database import get_db
from app.models.mechanism import Mechanism, MechanismItem
from app.models.change_log import ChangeLog
from app.models.user import User
from app.api.deps import get_current_user, require_roles
from app.schemas.common import ApiResponse
from app.schemas.mechanism import (
    MechanismCreate,
    MechanismUpdate,
    MechanismResponse,
    MechanismListResponse,
    MechanismItemResponse,
    BatchMechanismStatusRequest,
    MechanismImportPreviewResult,
    MechanismImportPreviewGroup,
    MechanismImportRowError,
    MechanismImportConfirmRequest,
)
from app.services.mechanism_service import (
    MechanismService,
    compute_mechanism_status,
    generate_mechanism_code,
)


router = APIRouter(prefix="/mechanisms", tags=["Mechanisms"])

TEMP_IMPORT_DIR = os.path.join(tempfile.gettempdir(), "mdm_mechanism_imports")
os.makedirs(TEMP_IMPORT_DIR, exist_ok=True)


def format_mechanism_response(m: Mechanism) -> MechanismResponse:
    calc_st = compute_mechanism_status(m.is_enabled, m.start_date, m.end_date)
    items_resp = []
    total_val = Decimal("0.00")
    for it in m.items:
        items_resp.append(MechanismItemResponse.model_validate(it))
        if it.retail_price:
            total_val += (Decimal(str(it.retail_price)) * it.quantity)

    return MechanismResponse(
        code=m.code,
        name=m.name,
        kit_type=m.kit_type,
        mechanism_type=m.mechanism_type,
        start_date=m.start_date,
        end_date=m.end_date,
        mechanism_price=m.mechanism_price,
        short_name=m.short_name,
        brand=m.brand,
        creator=m.creator,
        source=m.source,
        audit_status=m.audit_status,
        data_source=m.data_source,
        source_updated_at=m.source_updated_at,
        is_enabled=m.is_enabled,
        pending_delete=m.pending_delete,
        is_locked=m.is_locked,
        status=calc_st,
        items=items_resp,
        items_count=len(items_resp),
        total_retail_value=total_val,
    )


@router.get("", response_model=ApiResponse[MechanismListResponse])
def list_mechanisms(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    keyword: Optional[str] = Query(None, description="搜索编码或机制名称"),
    brand: Optional[str] = Query(None),
    kit_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, description="生效中/待生效/已过期/已停用"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Mechanism)

    if keyword:
        kw = f"%{keyword.strip()}%"
        query = query.filter(Mechanism.name.like(kw) | Mechanism.code.like(kw))
    if brand:
        query = query.filter(Mechanism.brand == brand)
    if kit_type:
        query = query.filter(Mechanism.kit_type == kit_type)

    all_matches = query.order_by(desc(Mechanism.created_at)).all()

    # Filter by dynamic status if provided
    if status_filter and status_filter != "all":
        filtered = [
            m for m in all_matches
            if compute_mechanism_status(m.is_enabled, m.start_date, m.end_date) == status_filter
        ]
    else:
        filtered = all_matches

    total = len(filtered)
    start_idx = (page - 1) * size
    end_idx = start_idx + size
    page_items = filtered[start_idx:end_idx]

    return ApiResponse(
        code=200,
        message="success",
        data=MechanismListResponse(
            items=[format_mechanism_response(m) for m in page_items],
            total=total,
            page=page,
            size=size,
        )
    )


@router.get("/generate-code", response_model=ApiResponse[dict])
def preview_generated_code(
    brand: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview next sequential mechanism code for brand."""
    code = generate_mechanism_code(db, brand)
    return ApiResponse(code=200, message="success", data={"code": code})


@router.get("/template")
def download_flat_template(
    current_user: User = Depends(get_current_user),
):
    """Download flat mechanism Excel template."""
    output = MechanismService.generate_flat_template()
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=promotion_mechanisms_template.xlsx"},
    )


@router.get("/export")
def export_mechanisms(
    keyword: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    kit_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export mechanisms with details in flat structure."""
    output = MechanismService.export_mechanisms_excel(
        db=db,
        keyword=keyword,
        brand=brand,
        status_filter=status_filter,
        kit_type=kit_type,
    )
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=mechanisms_export.xlsx"},
    )


@router.post("/import/preview", response_model=ApiResponse[MechanismImportPreviewResult])
async def preview_flat_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "operator"])),
):
    """Upload flat mechanism spreadsheet, validate rows and group into preview mechanisms."""
    if not (file.filename.endswith(".xlsx") or file.filename.endswith(".xls")):
        raise HTTPException(status_code=400, detail="只支持上传 .xlsx 或 .xls 格式文件")

    content = await file.read()
    try:
        valid_groups, errors = MechanismService.parse_flat_excel(db, content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析异常: {str(e)}")

    # Save to temp file for confirmation step
    file_token = f"{uuid.uuid4().hex}.xlsx"
    temp_path = os.path.join(TEMP_IMPORT_DIR, file_token)
    with open(temp_path, "wb") as f:
        f.write(content)

    preview_items: List[MechanismImportPreviewGroup] = []
    for g in valid_groups:
        is_auto = False
        m_code = g.get("code")
        if not m_code:
            is_auto = True
            m_code = generate_mechanism_code(db, g.get("brand"))

        preview_items.append(
            MechanismImportPreviewGroup(
                mechanism_code=m_code,
                mechanism_name=g["name"],
                brand=g["brand"],
                kit_type=g.get("kit_type"),
                start_date=str(g["start_date"]) if g.get("start_date") else None,
                end_date=str(g["end_date"]) if g.get("end_date") else None,
                mechanism_price=float(g["mechanism_price"]) if g.get("mechanism_price") else None,
                items_count=len(g["items"]),
                is_auto_generated_code=is_auto,
            )
        )

    return ApiResponse(
        code=200,
        message="success",
        data=MechanismImportPreviewResult(
            total_rows=len(valid_groups) + len(errors),
            total_mechanisms=len(valid_groups),
            valid_count=len(valid_groups),
            error_count=len(errors),
            errors=[MechanismImportRowError(**err) for err in errors],
            preview_groups=preview_items,
        )
    )


@router.post("/import/confirm", response_model=ApiResponse[dict])
def confirm_flat_import(
    payload: MechanismImportConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "operator"])),
):
    """Confirm and ingest mechanisms from uploaded temp file."""
    temp_path = os.path.join(TEMP_IMPORT_DIR, payload.file_token)
    if not os.path.exists(temp_path):
        raise HTTPException(status_code=404, detail="导入文件已过期或不存在，请重新上传")

    with open(temp_path, "rb") as f:
        content = f.read()

    valid_groups, errors = MechanismService.parse_flat_excel(db, content)
    if not valid_groups:
        raise HTTPException(status_code=400, detail="文件中无合法机制数据可供导入")

    inserted = 0
    updated = 0
    for g in valid_groups:
        try:
            mech, is_new = MechanismService.create_or_update_mechanism(
                db=db,
                data=g,
                operator=current_user.username,
                channel="Excel导入"
            )
            if is_new:
                inserted += 1
            else:
                updated += 1
        except Exception as e:
            # Skip or record
            continue

    # Cleanup temp file
    try:
        os.remove(temp_path)
    except Exception:
        pass

    return ApiResponse(
        code=200,
        message=f"成功导入 {inserted + updated} 组促销机制 (新增 {inserted}，更新 {updated})",
        data={
            "success": True,
            "message": f"成功导入 {inserted + updated} 组促销机制 (新增 {inserted}，更新 {updated})",
            "inserted": inserted,
            "updated": updated,
        }
    )


@router.get("/{code}", response_model=ApiResponse[MechanismResponse])
def get_mechanism(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = db.query(Mechanism).filter(Mechanism.code == code).first()
    if not m:
        raise HTTPException(status_code=404, detail="未找到对应促销机制")
    return ApiResponse(code=200, message="success", data=format_mechanism_response(m))


@router.post("", response_model=ApiResponse[MechanismResponse], status_code=status.HTTP_201_CREATED)
def create_mechanism(
    payload: MechanismCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "operator"])),
):
    try:
        mech, is_new = MechanismService.create_or_update_mechanism(
            db=db,
            data=payload.model_dump(),
            operator=current_user.username,
            channel="手工维护"
        )
        return ApiResponse(code=201, message="促销机制创建成功", data=format_mechanism_response(mech))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{code}", response_model=ApiResponse[MechanismResponse])
def update_mechanism(
    code: str,
    payload: MechanismUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "operator"])),
):
    mech = db.query(Mechanism).filter(Mechanism.code == code).first()
    if not mech:
        raise HTTPException(status_code=404, detail="未找到对应促销机制")

    data = payload.model_dump(exclude_unset=True)
    data["code"] = code
    if not data.get("brand"):
        data["brand"] = mech.brand
    if not data.get("name"):
        data["name"] = mech.name

    if "items" not in data or data["items"] is None:
        # Keep existing items
        data["items"] = [
            {"product_code": it.product_code, "quantity": it.quantity, "item_type": it.item_type}
            for it in mech.items
        ]

    try:
        updated_mech, _ = MechanismService.create_or_update_mechanism(
            db=db,
            data=data,
            operator=current_user.username,
            channel="手工维护"
        )
        return ApiResponse(code=200, message="促销机制更新成功", data=format_mechanism_response(updated_mech))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{code}/status", response_model=ApiResponse[dict])
def toggle_mechanism_status(
    code: str,
    is_enabled: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    mech = db.query(Mechanism).filter(Mechanism.code == code).first()
    if not mech:
        raise HTTPException(status_code=404, detail="未找到对应促销机制")

    old_status = mech.is_enabled
    mech.is_enabled = is_enabled
    now = datetime.now(timezone.utc)

    db.add(ChangeLog(
        object_type="mechanism",
        object_code=code,
        field_name="is_enabled",
        old_value=str(old_status),
        new_value=str(is_enabled),
        operator=current_user.username,
        channel="手工维护",
        created_at=now,
    ))
    db.commit()
    return ApiResponse(code=200, message="状态已更新", data={"code": code, "is_enabled": is_enabled})


@router.post("/batch-status", response_model=ApiResponse[dict])
def batch_update_mechanism_status(
    payload: BatchMechanismStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    now = datetime.now(timezone.utc)
    mechanisms = db.query(Mechanism).filter(Mechanism.code.in_(payload.codes)).all()

    for m in mechanisms:
        if m.is_enabled != payload.is_enabled:
            old_val = m.is_enabled
            m.is_enabled = payload.is_enabled
            db.add(ChangeLog(
                object_type="mechanism",
                object_code=m.code,
                field_name="is_enabled",
                old_value=str(old_val),
                new_value=str(payload.is_enabled),
                operator=current_user.username,
                channel="手工维护",
                created_at=now,
            ))

    db.commit()
    return ApiResponse(code=200, message="批量状态已更新", data={"updated_count": len(mechanisms)})


@router.get("/{code}/changes", response_model=ApiResponse[List[dict]])
def get_mechanism_change_logs(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = (
        db.query(ChangeLog)
        .filter(
            ChangeLog.object_type.in_(["mechanism", "mechanism_item"]),
            ChangeLog.object_code == code
        )
        .order_by(desc(ChangeLog.created_at))
        .limit(100)
        .all()
    )
    return ApiResponse(
        code=200,
        message="success",
        data=[
            {
                "id": log.id,
                "object_type": log.object_type,
                "object_code": log.object_code,
                "sub_key": log.sub_key,
                "field_name": log.field_name,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "operator": log.operator,
                "channel": log.channel,
                "created_at": log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else None,
            }
            for log in logs
        ]
    )
