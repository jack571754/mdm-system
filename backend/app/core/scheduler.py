import logging
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.sync import SyncSource
from app.services.sync_engine import SyncEngine

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def _run_scheduled_job(source_id: int):
    """Job function executed by scheduler in background worker thread."""
    logger.info(f"[Scheduler] Executing scheduled sync job for source ID {source_id}...")
    db: Session = SessionLocal()
    try:
        SyncEngine.run_source_sync(db=db, source_id=source_id, operator="apscheduler")
        logger.info(f"[Scheduler] Successfully finished sync job for source ID {source_id}")
    except Exception as e:
        logger.error(f"[Scheduler] Sync job for source ID {source_id} failed: {e}")
    finally:
        db.close()


def refresh_scheduler_jobs():
    """Reload all active sync sources and register cron jobs into the scheduler."""
    if not scheduler.running:
        return

    # Clear existing sync jobs
    for job in scheduler.get_jobs():
        if job.id.startswith("sync_source_"):
            scheduler.remove_job(job.id)

    db: Session = SessionLocal()
    try:
        sources = db.query(SyncSource).filter(SyncSource.is_enabled == True).all()
        for src in sources:
            job_id = f"sync_source_{src.id}"
            try:
                # e.g. "0 2 * * *" -> parse 5 parts
                parts = src.cron_expr.strip().split()
                if len(parts) == 5:
                    minute, hour, day, month, day_of_week = parts
                    trigger = CronTrigger(
                        minute=minute,
                        hour=hour,
                        day=day,
                        month=month,
                        day_of_week=day_of_week,
                    )
                    scheduler.add_job(
                        _run_scheduled_job,
                        trigger=trigger,
                        id=job_id,
                        args=[src.id],
                        replace_existing=True,
                    )
                    logger.info(f"[Scheduler] Registered cron job '{job_id}' ({src.name}) with cron: {src.cron_expr}")
            except Exception as e:
                logger.error(f"[Scheduler] Failed to parse cron '{src.cron_expr}' for source {src.id}: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start APScheduler daemon."""
    if not scheduler.running:
        try:
            scheduler.start()
            logger.info("[Scheduler] APScheduler background engine started.")
            refresh_scheduler_jobs()
        except Exception as e:
            logger.error(f"[Scheduler] Error starting scheduler: {e}")


def shutdown_scheduler():
    """Graceful shutdown of APScheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] APScheduler background engine shut down.")
