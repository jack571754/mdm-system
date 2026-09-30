from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ChangeLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    object_type: str
    object_code: str
    sub_key: Optional[str] = None
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    operator: str
    channel: str
    created_at: datetime
