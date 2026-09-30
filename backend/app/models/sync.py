import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import String, Boolean, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class SyncSource(Base, TimestampMixin):
    """Data warehouse sync source configuration."""
    __tablename__ = "sync_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    domain: Mapped[str] = mapped_column(String(30), default="product", nullable=False, index=True) # product / mechanism
    name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "数仓主商品底表 (ODS_PRODUCT_INFO)"
    db_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # Connection string, null for internal mock DW
    fetch_sql: Mapped[str] = mapped_column(Text, nullable=False) # Query SQL
    field_mapping_raw: Mapped[str] = mapped_column(Text, default="{}", nullable=False) # JSON: upstream col -> local field
    cron_expr: Mapped[str] = mapped_column(String(50), default="0 2 * * *", nullable=False) # Cron expression
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    miss_threshold: Mapped[int] = mapped_column(Integer, default=3, nullable=False) # Continuous miss count before pending_delete

    # Relationships
    runs: Mapped[List["SyncRun"]] = relationship("SyncRun", back_populates="source", cascade="all, delete-orphan", order_by="desc(SyncRun.started_at)")

    @property
    def field_mapping(self) -> Dict[str, str]:
        try:
            return json.loads(self.field_mapping_raw or "{}")
        except Exception:
            return {}

    @field_mapping.setter
    def field_mapping(self, value: Dict[str, str]) -> None:
        self.field_mapping_raw = json.dumps(value, ensure_ascii=False)


class SyncRun(Base):
    """Sync execution run record."""
    __tablename__ = "sync_run"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    domain: Mapped[str] = mapped_column(String(30), default="product", nullable=False, index=True)
    source_id: Mapped[int] = mapped_column(Integer, ForeignKey("sync_source.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="running", nullable=False) # running / success / failed / warning
    operator: Mapped[str] = mapped_column(String(50), default="scheduler", nullable=False)
    inserted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    skipped: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pending_deleted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    source: Mapped["SyncSource"] = relationship("SyncSource", back_populates="runs")


class AppConfig(Base):
    """Global system key-value configuration."""
    __tablename__ = "app_config"

    key: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False) # String or JSON serialized string
    description: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class MockOdsProduct(Base):
    """Mock external DW product ODS table for testing and offline demo execution."""
    __tablename__ = "mock_ods_products"

    dw_code: Mapped[str] = mapped_column(String(50), primary_key=True)
    dw_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dw_brand: Mapped[str] = mapped_column(String(50), nullable=False)
    dw_price: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    dw_spec: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    dw_unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    dw_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    dw_sale_stage: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

