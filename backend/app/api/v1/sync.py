import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.sync import SyncSource, SyncRun
from app.models.product import Product
from app.models.mechanism import Mechanism
from app.models.user import User
from app.api.deps import require_roles
from app.schemas.common import ApiResponse
from app.schemas.sync import (
    SyncSourceCreate,
    SyncSourceUpdate,
    SyncSourceResponse,
    SyncRunResponse,
    PendingDeleteRecord,
    PendingDeleteConfirmRequest,
)
from app.services.sync_engine import SyncEngine
from app.core.scheduler import refresh_scheduler_jobs

router = APIRouter(prefix="/sync", tags=["Sync Engine"])


@router.get("/sources", response_model=ApiResponse[List[SyncSourceResponse]])
def list_sync_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    sources = db.query(SyncSource).order_by(SyncSource.id).all()
    results = []
    for s in sources:
        latest = db.query(SyncRun).filter(SyncRun.source_id == s.id).order_by(desc(SyncRun.started_at)).first()
        res = SyncSourceResponse(
            id=s.id,
            domain=s.domain,
            name=s.name,
            db_url=s.db_url,
            fetch_sql=s.fetch_sql,
            field_mapping=s.field_mapping,
            cron_expr=s.cron_expr,
            is_enabled=s.is_enabled,
            miss_threshold=s.miss_threshold,
            created_at=s.created_at,
            updated_at=s.updated_at,
            latest_run=SyncRunResponse.model_validate(latest) if latest else None,
        )
        results.append(res)
    return ApiResponse(code=200, message="success", data=results)


@router.post("/sources", response_model=ApiResponse[SyncSourceResponse])
def create_sync_source(
    payload: SyncSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    src = SyncSource(
        domain=payload.domain,
        name=payload.name,
        db_url=payload.db_url,
        fetch_sql=payload.fetch_sql,
        field_mapping_raw=json.dumps(payload.field_mapping, ensure_ascii=False),
        cron_expr=payload.cron_expr,
        is_enabled=payload.is_enabled,
        miss_threshold=payload.miss_threshold,
    )
    db.add(src)
    db.commit()
    db.refresh(src)
    refresh_scheduler_jobs()
    return ApiResponse(
        code=200,
        message="创建同步源成功",
        data=SyncSourceResponse(
            id=src.id,
            domain=src.domain,
            name=src.name,
            db_url=src.db_url,
            fetch_sql=src.fetch_sql,
            field_mapping=src.field_mapping,
            cron_expr=src.cron_expr,
            is_enabled=src.is_enabled,
            miss_threshold=src.miss_threshold,
            created_at=src.created_at,
            updated_at=src.updated_at,
            latest_run=None,
        )
    )


@router.put("/sources/{id}", response_model=ApiResponse[SyncSourceResponse])
def update_sync_source(
    id: int,
    payload: SyncSourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    src = db.query(SyncSource).filter(SyncSource.id == id).first()
    if not src:
        raise HTTPException(status_code=404, detail="未找到指定同步源")

    if payload.name is not None:
        src.name = payload.name
    if payload.db_url is not None:
        src.db_url = payload.db_url
    if payload.fetch_sql is not None:
        src.fetch_sql = payload.fetch_sql
    if payload.field_mapping is not None:
        src.field_mapping_raw = json.dumps(payload.field_mapping, ensure_ascii=False)
    if payload.cron_expr is not None:
        src.cron_expr = payload.cron_expr
    if payload.is_enabled is not None:
        src.is_enabled = payload.is_enabled
    if payload.miss_threshold is not None:
        src.miss_threshold = payload.miss_threshold

    db.commit()
    db.refresh(src)
    refresh_scheduler_jobs()
    latest = db.query(SyncRun).filter(SyncRun.source_id == src.id).order_by(desc(SyncRun.started_at)).first()
    return ApiResponse(
        code=200,
        message="更新同步源成功",
        data=SyncSourceResponse(
            id=src.id,
            domain=src.domain,
            name=src.name,
            db_url=src.db_url,
            fetch_sql=src.fetch_sql,
            field_mapping=src.field_mapping,
            cron_expr=src.cron_expr,
            is_enabled=src.is_enabled,
            miss_threshold=src.miss_threshold,
            created_at=src.created_at,
            updated_at=src.updated_at,
            latest_run=SyncRunResponse.model_validate(latest) if latest else None,
        )
    )


@router.post("/sources/{id}/run", response_model=ApiResponse[SyncRunResponse])
def trigger_immediate_sync(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """Trigger manual execution of sync source immediately with concurrency protection."""
    try:
        run = SyncEngine.run_source_sync(db=db, source_id=id, operator=current_user.username)
        return ApiResponse(code=200, message="同步完成", data=SyncRunResponse.model_validate(run))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"同步执行异常: {str(e)}")


@router.get("/runs", response_model=ApiResponse[List[SyncRunResponse]])
def list_sync_runs(
    source_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    query = db.query(SyncRun)
    if source_id:
        query = query.filter(SyncRun.source_id == source_id)
    runs = query.order_by(desc(SyncRun.started_at)).limit(limit).all()
    return ApiResponse(code=200, message="success", data=[SyncRunResponse.model_validate(r) for r in runs])


@router.get("/pending-deletes", response_model=ApiResponse[List[PendingDeleteRecord]])
def list_pending_deletes(
    domain: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """List records with pending_delete == True waiting for administrator decision."""
    results: List[PendingDeleteRecord] = []
    if domain in (None, "product"):
        products = db.query(Product).filter(Product.pending_delete == True).all()
        for p in products:
            results.append(
                PendingDeleteRecord(
                    code=p.code,
                    name=p.name,
                    domain="product",
                    brand=p.brand,
                    data_source=p.data_source,
                    source_updated_at=p.source_updated_at,
                    miss_count=3,
                    is_locked=p.is_locked,
                )
            )
    if domain in (None, "mechanism"):
        mechanisms = db.query(Mechanism).filter(Mechanism.pending_delete == True).all()
        for m in mechanisms:
            results.append(
                PendingDeleteRecord(
                    code=m.code,
                    name=m.name,
                    domain="mechanism",
                    brand=m.brand,
                    data_source=m.data_source,
                    source_updated_at=m.source_updated_at,
                    miss_count=3,
                    is_locked=m.is_locked,
                )
            )

    return ApiResponse(code=200, message="success", data=results)


@router.post("/pending-deletes/confirm", response_model=ApiResponse[dict])
def confirm_pending_delete(
    payload: PendingDeleteConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """Admin confirms offline (is_enabled=False) or keep (pending_delete=False)."""
    res = SyncEngine.confirm_pending_delete(
        db=db,
        codes=payload.codes,
        domain=payload.domain,
        action=payload.action,
        operator=current_user.username,
    )
    return ApiResponse(code=200, message="处理成功", data=res)
