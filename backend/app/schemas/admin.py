from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class EnumConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    domain: str
    field_name: str
    value: str
    sort_order: int
    is_enabled: bool


class EnumConfigCreate(BaseModel):
    domain: str
    field_name: str
    value: str
    sort_order: int = 0
    is_enabled: bool = True


class EnumConfigUpdate(BaseModel):
    value: Optional[str] = None
    sort_order: Optional[int] = None
    is_enabled: Optional[bool] = None


class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str
    is_enabled: bool
    created_at: datetime
    updated_at: datetime


class UserAdminCreate(BaseModel):
    username: str
    password: str
    role: str # admin / operator / api
    is_enabled: bool = True


class UserAdminUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None
    is_enabled: Optional[bool] = None


class AppConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    value: Any
    description: Optional[str] = None
    updated_at: datetime


class AppConfigUpdate(BaseModel):
    value: Any
    description: Optional[str] = None
