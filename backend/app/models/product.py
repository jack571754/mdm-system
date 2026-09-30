from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Boolean, Integer, Numeric, DateTime, Date, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin


class Product(Base, TimestampMixin):
    """Product master data model aligning with 21 business fields + system management columns."""
    __tablename__ = "product"

    # Business Fields
    code: Mapped[str] = mapped_column(String(50), primary_key=True, index=True) # 货品编号 (PK)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)   # 货品名称
    spec: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)     # 型号规格/净含量
    base_unit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True) # 基本单位
    short_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # 货品简称
    brand: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # 品牌
    product_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True) # 产品类目 (主口径)
    category_sub: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # 产品分类
    retail_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True) # 零售价
    nickname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True) # 昵称
    version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)   # 版本
    series: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)    # 系列
    category_old: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # 类目 (旧口径，已废弃)
    sample_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True) # 正品/小样
    status: Mapped[str] = mapped_column(String(20), default="正常", nullable=False, index=True) # 商品状态: 正常/停售/淘汰
    carton_spec: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # 箱规
    sale_stage: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True) # 在售/新品/预售/清尾
    auxiliary: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True) # 辅助标记
    needs_maintenance: Mapped[str] = mapped_column(String(10), default="否", nullable=False) # 是否需要维护: 是/否
    upstream_created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True) # 上游创建时间
    upstream_write_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True) # 上游写入日期

    # System Columns
    data_source: Mapped[str] = mapped_column(String(30), default="手工维护", nullable=False, index=True) # 数仓同步/Excel导入/API推送/手工维护
    source_updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True) # 是否启用
    pending_delete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True) # 待确认删除
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False) # 关键字段手工锁定标记

    def __repr__(self) -> str:
        return f"<Product code={self.code} name={self.name} brand={self.brand}>"
