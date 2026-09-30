from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator


class MechanismItemBase(BaseModel):
    product_code: str = Field(..., description="货品主数据编码")
    quantity: int = Field(1, ge=1, description="数量，必须 >= 1")
    item_type: str = Field("主品", description="明细类型: 主品 / 赠品")


class MechanismItemCreate(MechanismItemBase):
    pass


class MechanismItemResponse(MechanismItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    mechanism_code: Optional[str] = None
    product_name: Optional[str] = None
    product_short_name: Optional[str] = None
    product_spec: Optional[str] = None
    retail_price: Optional[Decimal] = None


class MechanismBase(BaseModel):
    name: str = Field(..., max_length=200, description="促销机制名称")
    kit_type: Optional[str] = Field("单件", description="套装类型: 单件/多件组合/买赠套装/加价购")
    mechanism_type: Optional[str] = Field("日常", description="机制类型: 日常/S促/大促/超头")
    start_date: Optional[date] = Field(None, description="生效起始日期")
    end_date: Optional[date] = Field(None, description="生效结束日期")
    mechanism_price: Optional[Decimal] = Field(None, description="机制供盘/售卖价")
    short_name: Optional[str] = Field(None, max_length=100, description="简称")
    brand: Optional[str] = Field(None, max_length=50, description="品牌")
    creator: Optional[str] = Field(None, max_length=50, description="创建人")
    is_locked: Optional[bool] = Field(False, description="手工锁定保护")

    @field_validator("start_date", "end_date", "mechanism_price", mode="before")
    @classmethod
    def empty_str_to_none_base(cls, v):
        if v == "" or v is None:
            return None
        return v


class MechanismCreate(MechanismBase):
    code: Optional[str] = Field(None, max_length=50, description="机制编码，留空时根据品牌规则自动派发")
    items: List[MechanismItemCreate] = Field(..., min_length=1, description="组合明细货品清单，至少包含1项")


class MechanismUpdate(BaseModel):
    name: Optional[str] = None
    kit_type: Optional[str] = None
    mechanism_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    mechanism_price: Optional[Decimal] = None
    short_name: Optional[str] = None
    brand: Optional[str] = None
    is_locked: Optional[bool] = None
    items: Optional[List[MechanismItemCreate]] = None

    @field_validator("start_date", "end_date", "mechanism_price", mode="before")
    @classmethod
    def empty_str_to_none_update(cls, v):
        if v == "" or v is None:
            return None
        return v


class MechanismResponse(MechanismBase):
    model_config = ConfigDict(from_attributes=True)

    code: str
    source: str
    audit_status: Optional[str] = None
    data_source: str
    source_updated_at: datetime
    is_enabled: bool
    pending_delete: bool
    status: str = Field("生效中", description="起止日期动态计算的状态: 生效中/待生效/已过期/已停用")
    items: List[MechanismItemResponse] = []
    items_count: int = 0
    total_retail_value: Optional[Decimal] = None



class MechanismListResponse(BaseModel):
    items: List[MechanismResponse]
    total: int
    page: int
    size: int


class BatchMechanismStatusRequest(BaseModel):
    codes: List[str]
    is_enabled: bool


class FlatMechanismExcelRow(BaseModel):
    """Represents a row in the flat mechanism spreadsheet."""
    row_num: int
    mechanism_code: Optional[str] = None
    mechanism_name: str
    brand: str
    kit_type: Optional[str] = "单件"
    mechanism_type: Optional[str] = "日常"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    mechanism_price: Optional[Decimal] = None
    product_code: str
    item_type: str = "主品"
    quantity: int = 1


class MechanismImportRowError(BaseModel):
    row: int
    code: Optional[str] = None
    name: Optional[str] = None
    message: str


class MechanismImportPreviewGroup(BaseModel):
    mechanism_code: str
    mechanism_name: str
    brand: str
    kit_type: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    mechanism_price: Optional[float]
    items_count: int
    is_auto_generated_code: bool = False


class MechanismImportPreviewResult(BaseModel):
    total_rows: int
    total_mechanisms: int
    valid_count: int
    error_count: int
    errors: List[MechanismImportRowError] = []
    preview_groups: List[MechanismImportPreviewGroup] = []


class MechanismImportConfirmRequest(BaseModel):
    file_token: str
