from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, Boolean, Integer, Numeric, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Mechanism(Base, TimestampMixin):
    """Mechanism (Promotion Kit) master model."""
    __tablename__ = "mechanism"

    code: Mapped[str] = mapped_column(String(50), primary_key=True, index=True) # 机制编码
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)   # 机制名称
    kit_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)   # 套装类型: 单件/多件组合/买赠套装/加价购
    mechanism_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # 机制类型: 日常/S促/大促/超头
    source: Mapped[str] = mapped_column(String(30), default="手工维护", nullable=False) # 来源渠道
    audit_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # 审核状态 (透传)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True) # 开始日期
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)   # 结束日期
    mechanism_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True) # 机制价格
    short_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    creator: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    upstream_created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    upstream_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # System columns
    data_source: Mapped[str] = mapped_column(String(30), default="手工维护", nullable=False)
    source_updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    pending_delete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    items: Mapped[List["MechanismItem"]] = relationship(
        "MechanismItem",
        back_populates="mechanism",
        cascade="all, delete-orphan",
        order_by="MechanismItem.id"
    )

    def __repr__(self) -> str:
        return f"<Mechanism code={self.code} name={self.name}>"


class MechanismItem(Base):
    """Mechanism product combination detail item."""
    __tablename__ = "mechanism_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mechanism_code: Mapped[str] = mapped_column(
        String(50), ForeignKey("mechanism.code", ondelete="CASCADE"), nullable=False, index=True
    )
    product_code: Mapped[str] = mapped_column(
        String(50), ForeignKey("product.code"), nullable=False, index=True
    )

    # Redundant product archive snapshot for fast aggregation & export
    product_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    product_short_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    product_spec: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    retail_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False) # 数量 > 0
    item_type: Mapped[str] = mapped_column(String(20), default="主品", nullable=False) # 主品 / 赠品

    # Relationship
    mechanism: Mapped["Mechanism"] = relationship("Mechanism", back_populates="items")

    __table_args__ = (
        UniqueConstraint("mechanism_code", "product_code", name="uq_mechanism_product"),
    )

    def __repr__(self) -> str:
        return f"<MechanismItem mech={self.mechanism_code} prod={self.product_code} qty={self.quantity}>"
