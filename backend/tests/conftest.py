import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User
from app.main import app

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed test admin & test operator
        admin = User(
            username="admin",
            password_hash=hash_password("Admin@123456"),
            role="admin",
            is_enabled=True,
        )
        operator = User(
            username="operator",
            password_hash=hash_password("Operator@123456"),
            role="operator",
            is_enabled=True,
        )
        disabled_user = User(
            username="disabled",
            password_hash=hash_password("Disabled@123"),
            role="operator",
            is_enabled=False,
        )
        api_user = User(
            username="api_client",
            password_hash=hash_password("Api@SecretKey2026"),
            role="api",
            is_enabled=True,
        )
        # Seed sample products for mechanism tests
        from app.models.product import Product
        from decimal import Decimal
        p1 = Product(code="PRO-PER-001", name="珀莱雅红宝石精华2.0 30ml", brand="珀莱雅", spec="30ml", base_unit="瓶", retail_price=Decimal("329.00"), data_source="手工维护")
        p2 = Product(code="PRO-PER-002", name="珀莱雅双抗精华3.0 30ml", brand="珀莱雅", spec="30ml", base_unit="瓶", retail_price=Decimal("289.00"), data_source="手工维护")
        p3 = Product(code="PRO-PER-003", name="珀莱雅双抗精华3.0 7.5ml", brand="珀莱雅", spec="7.5ml", base_unit="支", retail_price=Decimal("0.00"), data_source="手工维护")
        db.add_all([admin, operator, disabled_user, api_user, p1, p2, p3])

        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
