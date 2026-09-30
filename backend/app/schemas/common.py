from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 200
    message: str = "success"
    data: Optional[T] = None


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    code: int = 400
    message: str = "操作失败"
    details: Optional[List[ErrorDetail]] = None


class PaginatedData(BaseModel, Generic[T]):
    total: int
    page: int
    size: int
    items: List[T]
