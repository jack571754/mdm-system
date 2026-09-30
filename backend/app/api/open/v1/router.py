from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.core.database import get_db
from app.models.product import Product
from app.models.mechanism import Mechanism, MechanismItem
from app.models.change_log import ChangeLog
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.common import ApiResponse
from app.schemas.open import (
    OpenProductResponse,
    OpenMechanismResponse,
    OpenMechanismItemResponse,
    OpenChangeItem,
    OpenIncrementalChangesResponse,
)
from app.services.mechanism_service import compute_mechanism_status

open_router = APIRouter(prefix="/open/v1", tags=["Open API (Downstream Integration)"])


def require_open_api_access(current_user: User = Depends(get_current_user)) -> User:
    """Validate that the caller is an authorized downstream API account or Admin."""
    if current_user.role not in ("api", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号无权访问开放供数 API (要求角色为 api 或 admin)",
        )
    return current_user


@open_router.get("/products", response_model=ApiResponse[List[OpenProductResponse]])
def get_products_open_archive(
    codes: Optional[str] = Query(None, description="多个货品编码以逗号分隔，如: PRO-001,PRO-002"),
    brand: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    is_enabled: Optional[bool] = Query(True),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    api_user: User = Depends(require_open_api_access),
):
    """Batch retrieve standardized master product archives for downstream systems."""
    query = db.query(Product)
    if is_enabled is not None:
        query = query.filter(Product.is_enabled == is_enabled)
    if codes:
        code_list = [c.strip() for c in codes.split(",") if c.strip()]
        query = query.filter(Product.code.in_(code_list))
    if brand:
        query = query.filter(Product.brand == brand)
    if keyword:
        kw = f"%{keyword.strip()}%"
        query = query.filter(Product.name.like(kw) | Product.code.like(kw))

    products = query.order_by(Product.code).limit(limit).all()
    return ApiResponse(
        code=200,
        message="success",
        data=[OpenProductResponse.model_validate(p) for p in products]
    )


@open_router.get("/mechanisms", response_model=ApiResponse[List[OpenMechanismResponse]])
def get_mechanisms_open_archive(
    codes: Optional[str] = Query(None, description="多个机制编码以逗号分隔"),
    brand: Optional[str] = Query(None),
    kit_type: Optional[str] = Query(None),
    is_enabled: Optional[bool] = Query(True),
    limit: int = Query(100, ge=1, le=300),
    db: Session = Depends(get_db),
    api_user: User = Depends(require_open_api_access),
):
    """Retrieve promotional kit mechanism master archives with combination items."""
    query = db.query(Mechanism)
    if is_enabled is not None:
        query = query.filter(Mechanism.is_enabled == is_enabled)
    if codes:
        code_list = [c.strip() for c in codes.split(",") if c.strip()]
        query = query.filter(Mechanism.code.in_(code_list))
    if brand:
        query = query.filter(Mechanism.brand == brand)
    if kit_type:
        query = query.filter(Mechanism.kit_type == kit_type)

    mechanisms = query.order_by(Mechanism.code).limit(limit).all()
    results = []
    for m in mechanisms:
        calc_st = compute_mechanism_status(m.is_enabled, m.start_date, m.end_date)
        items_resp = [OpenMechanismItemResponse.model_validate(it) for it in m.items]
        results.append(
            OpenMechanismResponse(
                code=m.code,
                name=m.name,
                short_name=m.short_name,
                brand=m.brand,
                kit_type=m.kit_type,
                mechanism_type=m.mechanism_type,
                start_date=m.start_date,
                end_date=m.end_date,
                mechanism_price=m.mechanism_price,
                is_enabled=m.is_enabled,
                status=calc_st,
                items=items_resp,
            )
        )

    return ApiResponse(code=200, message="success", data=results)


@open_router.get("/products/changes", response_model=ApiResponse[OpenIncrementalChangesResponse])
def get_incremental_product_changes(
    since: str = Query(..., description="ISO 8601 起始时间戳，如: 2026-09-30T00:00:00Z"),
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    api_user: User = Depends(require_open_api_access),
):
    """Incremental product feed endpoint based on since timestamp cursor for low-latency synchronization."""
    try:
        norm_ts = since.strip().replace(" ", "+")
        if norm_ts.endswith("Z"):
            norm_ts = norm_ts[:-1] + "+00:00"
        since_dt = datetime.fromisoformat(norm_ts)
        if since_dt.tzinfo is not None:
            since_dt = since_dt.astimezone(timezone.utc).replace(tzinfo=None)
    except Exception:
        raise HTTPException(status_code=400, detail="since 参数必须为合法的 ISO 8601 时间戳，例如: 2026-09-30T00:00:00Z")

    query = db.query(Product).filter(Product.source_updated_at >= since_dt)
    total = query.count()

    offset = (page - 1) * size
    products = query.order_by(asc(Product.source_updated_at)).offset(offset).limit(size).all()


    items: List[OpenChangeItem] = []
    for p in products:
        # Retrieve recent logs since cursor to extract changed field names
        recent_logs = db.query(ChangeLog).filter(
            ChangeLog.object_type == "product",
            ChangeLog.object_code == p.code,
            ChangeLog.created_at >= since,
        ).all()

        change_type = "update"
        changed_fields = []
        for l in recent_logs:
            if l.field_name == "_created":
                change_type = "create"
            else:
                if l.field_name not in changed_fields:
                    changed_fields.append(l.field_name)

        if not changed_fields and change_type == "update":
            changed_fields.append("all")

        items.append(
            OpenChangeItem(
                code=p.code,
                name=p.name,
                retail_price=p.retail_price,
                is_enabled=p.is_enabled,
                change_type=change_type,
                changed_fields=changed_fields,
                source_updated_at=p.source_updated_at,
            )
        )

    has_more = (offset + len(products)) < total
    return ApiResponse(
        code=200,
        message="success",
        data=OpenIncrementalChangesResponse(
            total=total,
            page=page,
            size=size,
            has_more=has_more,
            items=items,
        )
    )
