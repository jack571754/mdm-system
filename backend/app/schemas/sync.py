from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class SyncSourceBase(BaseModel):
    domain: str = "product"
    name: str
    db_url: Optional[str] = None
    fetch_sql: str
    field_mapping: Dict[str, str] = {}
    cron_expr: str = "0 2 * * *"
    is_enabled: bool = True
    miss_threshold: int = 3


class SyncSourceCreate(SyncSourceBase):
    pass


class SyncSourceUpdate(BaseModel):
    name: Optional[str] = None
    db_url: Optional[str] = None
    fetch_sql: Optional[str] = None
    field_mapping: Optional[Dict[str, str]] = None
    cron_expr: Optional[str] = None
    is_enabled: Optional[bool] = None
    miss_threshold: Optional[int] = None


class SyncRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    domain: str
    source_id: int
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: str
    operator: str
    inserted: int
    updated: int
    skipped: int
    pending_deleted: int
    failed: int
    error_summary: Optional[str] = None


class SyncSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    domain: str
    name: str
    db_url: Optional[str] = None
    fetch_sql: str
    field_mapping: Dict[str, str]
    cron_expr: str
    is_enabled: bool
    miss_threshold: int
    created_at: datetime
    updated_at: datetime
    latest_run: Optional[SyncRunResponse] = None


class PendingDeleteRecord(BaseModel):
    code: str
    name: str
    domain: str # product / mechanism
    brand: Optional[str] = None
    data_source: str
    source_updated_at: Optional[datetime] = None
    miss_count: int = 3
    is_locked: bool = False


class PendingDeleteConfirmRequest(BaseModel):
    action: str # "confirm_offline" (disable is_enabled=False) or "keep" (reset pending_delete=False)
    domain: str # "product" or "mechanism"
    codes: List[str]
