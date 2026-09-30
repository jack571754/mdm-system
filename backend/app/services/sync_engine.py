import logging
import threading
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.sync import SyncSource, SyncRun
from app.models.product import Product
from app.models.mechanism import Mechanism
from app.models.change_log import ChangeLog
from app.services.write_pipeline import WritePipeline

logger = logging.getLogger(__name__)

# Mutex set to prevent concurrent runs on the same sync source
_running_sources_lock = threading.Lock()
_running_source_ids = set()


class SyncEngine:
    """Core synchronization engine connecting to data warehouse sources, mapping schemas, and running ingestion."""

    @classmethod
    def is_source_running(cls, source_id: int) -> bool:
        with _running_sources_lock:
            return source_id in _running_source_ids

    @classmethod
    def run_source_sync(
        cls,
        db: Session,
        source_id: int,
        operator: str = "scheduler",
    ) -> SyncRun:
        """Execute synchronization run for a configured SyncSource."""
        with _running_sources_lock:
            if source_id in _running_source_ids:
                raise ValueError(f"同步源 (ID: {source_id}) 当前正在运行中，请勿重复触发！")
            _running_source_ids.add(source_id)

        source: Optional[SyncSource] = db.query(SyncSource).filter(SyncSource.id == source_id).first()
        if not source:
            with _running_sources_lock:
                _running_source_ids.discard(source_id)
            raise ValueError(f"未找到指定的同步源 (ID: {source_id})")

        now = datetime.now(timezone.utc)
        sync_run = SyncRun(
            domain=source.domain,
            source_id=source.id,
            started_at=now,
            status="running",
            operator=operator,
            inserted=0,
            updated=0,
            skipped=0,
            pending_deleted=0,
            failed=0,
        )
        db.add(sync_run)
        db.commit()
        db.refresh(sync_run)

        try:
            # 1. Fetch raw records from warehouse
            raw_records = cls._fetch_raw_records(db, source)

            # 2. Schema / Field mapping
            mapping = source.field_mapping
            mapped_records: List[Dict[str, Any]] = []
            pulled_codes = set()

            for item in raw_records:
                mapped_item: Dict[str, Any] = {}
                for upstream_col, val in item.items():
                    target_field = mapping.get(upstream_col, upstream_col)
                    mapped_item[target_field] = val

                code_val = str(mapped_item.get("code") or "").strip()
                if code_val:
                    pulled_codes.add(code_val)
                mapped_records.append(mapped_item)

            # 3. Pipeline Ingestion
            if source.domain == "product":
                ingest_res = WritePipeline.ingest_products(
                    db=db,
                    records=mapped_records,
                    channel="数仓同步",
                    operator=f"dw_sync_{operator}",
                    skip_errors=True,
                )
                sync_run.inserted = ingest_res.inserted
                sync_run.updated = ingest_res.updated
                sync_run.skipped = ingest_res.skipped
                sync_run.failed = len(ingest_res.errors)

                # 4. Check Missing Records for Pending Delete
                pending_count = cls._evaluate_missing_products(
                    db=db,
                    pulled_codes=pulled_codes,
                    operator=operator,
                    now=datetime.now(timezone.utc),
                )
                sync_run.pending_deleted = pending_count

                if ingest_res.errors:
                    sync_run.status = "warning"
                    sync_run.error_summary = json.dumps(ingest_res.errors[:10], ensure_ascii=False)
                else:
                    sync_run.status = "success"

            sync_run.finished_at = datetime.now(timezone.utc)
            db.commit()
            return sync_run

        except Exception as e:
            logger.exception(f"Sync failed for source {source.name}: {str(e)}")
            sync_run.status = "failed"
            sync_run.error_summary = str(e)
            sync_run.finished_at = datetime.now(timezone.utc)
            db.commit()
            raise e
        finally:
            with _running_sources_lock:
                _running_source_ids.discard(source_id)

    @classmethod
    def _fetch_raw_records(cls, db: Session, source: SyncSource) -> List[Dict[str, Any]]:
        """Fetch raw records executing SQL against internal or external DW connection."""
        if source.db_url:
            from sqlalchemy import create_engine
            ext_engine = create_engine(source.db_url)
            with ext_engine.connect() as conn:
                res = conn.execute(text(source.fetch_sql))
                return [dict(row._mapping) for row in res]
        else:
            # Internal mock DW mode
            res = db.execute(text(source.fetch_sql))
            return [dict(row._mapping) for row in res]

    @classmethod
    def _evaluate_missing_products(
        cls,
        db: Session,
        pulled_codes: set,
        operator: str,
        now: datetime,
    ) -> int:
        """Mark products missing from DW sync as pending_delete."""
        pending_count = 0
        existing_dw_products = db.query(Product).filter(
            Product.data_source == "数仓同步",
            Product.is_enabled == True,
        ).all()

        for p in existing_dw_products:
            if p.code in pulled_codes:
                if p.pending_delete:
                    p.pending_delete = False
                    db.add(
                        ChangeLog(
                            object_type="product",
                            object_code=p.code,
                            field_name="pending_delete",
                            old_value="True",
                            new_value="False",
                            operator=f"dw_sync_{operator}",
                            channel="数仓同步",
                            created_at=now,
                        )
                    )
            else:
                # Disappeared in current DW pull
                if not p.pending_delete and not p.is_locked:
                    p.pending_delete = True
                    pending_count += 1
                    db.add(
                        ChangeLog(
                            object_type="product",
                            object_code=p.code,
                            field_name="pending_delete",
                            old_value="False",
                            new_value="True",
                            operator=f"dw_sync_{operator}",
                            channel="数仓同步",
                            created_at=now,
                        )
                    )

        db.flush()
        return pending_count

    @classmethod
    def confirm_pending_delete(
        cls,
        db: Session,
        codes: List[str],
        domain: str,
        action: str,
        operator: str,
    ) -> Dict[str, Any]:
        """Confirm offline (is_enabled=False) or keep (pending_delete=False) for pending items."""
        now = datetime.now(timezone.utc)
        processed = 0

        if domain == "product":
            items = db.query(Product).filter(Product.code.in_(codes)).all()
            for it in items:
                if action == "confirm_offline":
                    it.is_enabled = False
                    it.pending_delete = False
                    db.add(
                        ChangeLog(
                            object_type="product",
                            object_code=it.code,
                            field_name="is_enabled",
                            old_value="True",
                            new_value="False",
                            operator=operator,
                            channel="手工维护",
                            created_at=now,
                        )
                    )
                    processed += 1
                elif action == "keep":
                    it.pending_delete = False
                    db.add(
                        ChangeLog(
                            object_type="product",
                            object_code=it.code,
                            field_name="pending_delete",
                            old_value="True",
                            new_value="False",
                            operator=operator,
                            channel="手工维护",
                            created_at=now,
                        )
                    )
                    processed += 1

        elif domain == "mechanism":
            mechanisms = db.query(Mechanism).filter(Mechanism.code.in_(codes)).all()
            for m in mechanisms:
                if action == "confirm_offline":
                    m.is_enabled = False
                    m.pending_delete = False
                    db.add(
                        ChangeLog(
                            object_type="mechanism",
                            object_code=m.code,
                            field_name="is_enabled",
                            old_value="True",
                            new_value="False",
                            operator=operator,
                            channel="手工维护",
                            created_at=now,
                        )
                    )
                    processed += 1
                elif action == "keep":
                    m.pending_delete = False
                    db.add(
                        ChangeLog(
                            object_type="mechanism",
                            object_code=m.code,
                            field_name="pending_delete",
                            old_value="True",
                            new_value="False",
                            operator=operator,
                            channel="手工维护",
                            created_at=now,
                        )
                    )
                    processed += 1

        db.commit()
        return {"processed": processed, "action": action, "domain": domain}
