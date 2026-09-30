from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.common import ApiResponse
from app.schemas.quality import (
    QualityOverviewResponse,
    MissingFieldRecord,
    DuplicateCandidateRecord,
)
from app.services.quality_service import QualityService

router = APIRouter(prefix="/quality", tags=["Data Quality"])


@router.get("/overview", response_model=ApiResponse[QualityOverviewResponse])
def get_quality_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full data governance health score and metrics overview."""
    overview = QualityService.get_overview(db)
    return ApiResponse(code=200, message="success", data=overview)


@router.get("/missing", response_model=ApiResponse[dict])
def list_missing_records(
    domain: Optional[str] = Query(None, description="product 或 mechanism"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List records with critical missing fields."""
    items, total = QualityService.get_missing_records(db=db, domain=domain, page=page, size=size)
    return ApiResponse(
        code=200,
        message="success",
        data={
            "items": [it.model_dump() for it in items],
            "total": total,
            "page": page,
            "size": size,
        }
    )


@router.get("/missing/export")
def export_missing_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export missing fields records to formatted Excel spreadsheet."""
    output = QualityService.export_missing_excel(db)
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=quality_missing_fields_report.xlsx"},
    )


@router.get("/duplicates", response_model=ApiResponse[List[DuplicateCandidateRecord]])
def list_suspected_duplicates(
    brand: Optional[str] = Query(None),
    threshold: float = Query(0.85, ge=0.5, le=1.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List suspected duplicate products based on name and spec similarity."""
    candidates = QualityService.get_duplicate_candidates(db=db, brand=brand, threshold=threshold)
    return ApiResponse(code=200, message="success", data=candidates)


@router.get("/pending-deletes/export")
def export_pending_deletes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export pending delete records to formatted Excel spreadsheet."""
    output = QualityService.export_pending_excel(db)
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=quality_pending_deletes_report.xlsx"},
    )
