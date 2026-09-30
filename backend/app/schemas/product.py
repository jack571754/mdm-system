from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class ProductBase(BaseModel):
    name: str = Field(..., max_length=200, description="货品名称")
    brand: str = Field(..., max_length=50, description="品牌")
    spec: Optional[str] = Field(None, max_length=100, description="型号规格/净含量")
    base_unit: Optional[str] = Field(None, max_length=20, description="基本单位")
    short_name: Optional[str] = Field(None, max_length=100, description="货品简称")
    product_category: Optional[str] = Field(None, max_length=50, description="产品类目")
    category_sub: Optional[str] = Field(None, max_length=50, description="产品分类")
    retail_price: Optional[Decimal] = Field(None, ge=0, description="零售价")
    nickname: Optional[str] = Field(None, max_length=100, description="昵称")
    version: Optional[str] = Field(None, max_length=50, description="版本")
    series: Optional[str] = Field(None, max_length=50, description="系列")
    sample_type: Optional[str] = Field(None, max_length=20, description="正品/小样")
    status: str = Field("正常", max_length=20, description="商品状态")
    carton_spec: Optional[str] = Field(None, max_length=50, description="箱规")
    sale_stage: Optional[str] = Field("在售", max_length=20, description="在售/新品/预售/清尾")
    needs_maintenance: str = Field("否", max_length=10, description="是否需要维护")


class ProductCreate(ProductBase):
    code: str = Field(..., min_length=1, max_length=50, description="货品编号")


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    brand: Optional[str] = Field(None, max_length=50)
    spec: Optional[str] = Field(None, max_length=100)
    base_unit: Optional[str] = Field(None, max_length=20)
    short_name: Optional[str] = Field(None, max_length=100)
    product_category: Optional[str] = Field(None, max_length=50)
    category_sub: Optional[str] = Field(None, max_length=50)
    retail_price: Optional[Decimal] = Field(None, ge=0)
    nickname: Optional[str] = Field(None, max_length=100)
    version: Optional[str] = Field(None, max_length=50)
    series: Optional[str] = Field(None, max_length=50)
    sample_type: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)
    carton_spec: Optional[str] = Field(None, max_length=50)
    sale_stage: Optional[str] = Field(None, max_length=20)
    needs_maintenance: Optional[str] = Field(None, max_length=10)
    is_locked: Optional[bool] = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    code: str
    category_old: Optional[str] = None
    data_source: str
    source_updated_at: datetime
    is_enabled: bool
    pending_delete: bool
    is_locked: bool
    created_at: datetime
    updated_at: datetime


class ProductBatchStatusRequest(BaseModel):
    codes: List[str] = Field(..., min_length=1, description="待操作货品编号列表")
    is_enabled: bool = Field(..., description="启用状态: True 启用，False 禁用")
