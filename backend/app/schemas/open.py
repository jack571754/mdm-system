from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class OpenProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    short_name: Optional[str] = None
    spec: Optional[str] = None
    base_unit: Optional[str] = None
    brand: Optional[str] = None
    product_category: Optional[str] = None
    category_sub: Optional[str] = None
    retail_price: Optional[Decimal] = None
    nickname: Optional[str] = None
    version: Optional[str] = None
    series: Optional[str] = None
    sample_type: Optional[str] = None
    status: Optional[str] = None
    carton_spec: Optional[str] = None
    sale_stage: Optional[str] = None
    needs_maintenance: Optional[str] = None
    is_enabled: bool
    data_source: str
    source_updated_at: datetime


class OpenMechanismItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_code: str
    product_name: Optional[str] = None
    product_short_name: Optional[str] = None
    product_spec: Optional[str] = None
    retail_price: Optional[Decimal] = None
    quantity: int
    item_type: str


class OpenMechanismResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    short_name: Optional[str] = None
    brand: Optional[str] = None
    kit_type: Optional[str] = None
    mechanism_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    mechanism_price: Optional[Decimal] = None
    is_enabled: bool
    status: str
    items: List[OpenMechanismItemResponse]


class OpenChangeItem(BaseModel):
    code: str
    name: str
    retail_price: Optional[Decimal] = None
    is_enabled: bool
    change_type: str # "create" or "update"
    changed_fields: List[str]
    source_updated_at: datetime


class OpenIncrementalChangesResponse(BaseModel):
    total: int
    page: int
    size: int
    has_more: bool
    items: List[OpenChangeItem]
