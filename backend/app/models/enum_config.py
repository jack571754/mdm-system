from sqlalchemy import String, Integer, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class EnumConfig(Base):
    """Dynamic configurable business dictionary & enums."""
    __tablename__ = "enum_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    domain: Mapped[str] = mapped_column(String(30), nullable=False, index=True) # product / mechanism / mechanism_item
    field_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # 如 status, sample_type, kit_type
    value: Mapped[str] = mapped_column(String(100), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("domain", "field_name", "value", name="uq_domain_field_value"),
    )

    def __repr__(self) -> str:
        return f"<EnumConfig {self.domain}.{self.field_name}={self.value}>"
