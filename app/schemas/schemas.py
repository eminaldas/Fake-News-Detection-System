from pydantic import BaseModel, Field, field_validator
import html
import re

def sanitize_string(value: str) -> str:
    """Removes HTML tags to prevent XSS. SQL Injection is handled by SQLAlchemy."""
    # Basic HTML unescaping
    value = html.unescape(value)
    # Remove HTML tags completely
    clean_html = re.compile('<.*?>')
    value = re.sub(clean_html, '', value)
    
    return value.strip()

class ContentAnalysisRequest(BaseModel):
    text: str = Field(..., description="Raw text of the news article to analyze")

    @field_validator('text')
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        return sanitize_string(v)

class AnalysisResponse(BaseModel):
    task_id: str
    message: str

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: dict | None = None
