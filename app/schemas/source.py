import uuid
from typing import Optional

from pydantic import BaseModel, Field


class SourceCreate(BaseModel):
    domain: str = Field(..., max_length=255)
    trust_score: int = Field(50, ge=0, le=100)
    is_official: bool = False
    description: Optional[str] = None


class SourceUpdate(BaseModel):
    trust_score: Optional[int] = Field(None, ge=0, le=100)
    is_official: Optional[bool] = None
    description: Optional[str] = None


class SourceRead(BaseModel):
    id: uuid.UUID
    domain: str
    trust_score: int
    is_official: bool
    description: Optional[str]

    model_config = {"from_attributes": True}
