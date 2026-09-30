from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class ChangeLog(Base):
    """Universal audit trail table for all data modifications."""
    __tablename__ = "change_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    object_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True) # product / mechanism / mechanism_item
    object_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # 货品编号 或 机制编码
    sub_key: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)        # 子键 (如商品编码)
    field_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # 变更字段名，新增记 _created，删除记 _deleted
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)           # 旧值
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)           # 新值
    operator: Mapped[str] = mapped_column(String(50), default="system", nullable=False, index=True) # 操作人 / 渠道
    channel: Mapped[str] = mapped_column(String(30), nullable=False, index=True)     # 数仓同步/Excel导入/API推送/手工维护
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    def __repr__(self) -> str:
        return f"<ChangeLog {self.object_type}:{self.object_code} field={self.field_name}>"
