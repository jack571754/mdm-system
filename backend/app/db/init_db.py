import logging
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    """Initialize database tables and seed required initial admin users."""
    Base.metadata.create_all(bind=engine)

    # 1. Seed Initial Administrator
    admin = db.query(User).filter(User.username == settings.INITIAL_ADMIN_USERNAME).first()
    if not admin:
        logger.info(f"Creating default admin user: {settings.INITIAL_ADMIN_USERNAME}")
        admin = User(
            username=settings.INITIAL_ADMIN_USERNAME,
            password_hash=hash_password(settings.INITIAL_ADMIN_PASSWORD),
            role="admin",
            is_enabled=True,
        )
        db.add(admin)
        db.commit()
        logger.info("Default admin user created successfully.")
    else:
        logger.info("Admin user already exists.")

    # 2. Seed Initial Operator User for Testing
    operator = db.query(User).filter(User.username == "operator").first()
    if not operator:
        logger.info("Creating default operator user: operator")
        operator = User(
            username="operator",
            password_hash=hash_password("Operator@123456"),
            role="operator",
            is_enabled=True,
        )
        db.add(operator)
        db.commit()
        logger.info("Default operator user created successfully.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
