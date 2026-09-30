from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from decimal import Decimal


class QualityOverviewResponse(BaseModel):
    total_products: int
    total_mechanisms: int
    missing_fields_count: int
    duplicates_count: int
    pending_deletes_count: int
    health_score: float # 0 - 100 percentage


class MissingFieldRecord(BaseModel):
    domain: str # product / mechanism
    code: str
    name: str
    brand: Optional[str] = None
    missing_fields: List[str] # e.g. ["规格/净含量", "零售指导价", "基本单位"]
    data_source: str
    needs_maintenance: str


class DuplicateCandidateRecord(BaseModel):
    brand: str
    code_a: str
    name_a: str
    spec_a: Optional[str] = None
    price_a: Optional[Decimal] = None
    status_a: str

    code_b: str
    name_b: str
    spec_b: Optional[str] = None
    price_b: Optional[Decimal] = None
    status_b: str

    similarity_score: float # e.g. 0.92
