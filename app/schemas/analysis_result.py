import uuid
from typing import Any, Optional

from pydantic import BaseModel, Field


class AnalysisResultCreate(BaseModel):
    article_id: uuid.UUID
    overall_score: float = Field(..., ge=0.0, le=1.0)
    sentiment_score: float = Field(..., ge=-1.0, le=1.0)
    linguistic_flags: Optional[dict[str, Any]] = Field(
        default_factory=dict,
        description=(
            "Arbitrary linguistic indicators, e.g. "
            "{'exclamation_ratio': 0.12, 'uppercase_ratio': 0.08}"
        ),
    )


class AnalysisResultRead(BaseModel):
    id: uuid.UUID
    article_id: uuid.UUID
    overall_score: float
    sentiment_score: float
    linguistic_flags: Optional[dict[str, Any]]

    model_config = {"from_attributes": True}
