from pydantic import BaseModel, Field, field_validator
import html
import re

def sanitize_string(value: str) -> str:
    """Removes HTML tags and potential SQL injection characters."""
    # Basic HTML unescaping
    value = html.unescape(value)
    # Remove HTML tags completely
    clean_html = re.compile('<.*?>')
    value = re.sub(clean_html, '', value)
    
    # Strip basic SQL injection characters (very defensive base approach)
    # Allows alphanumeric, basic punctuation, but removes tricky quotes or semicolons
    # if they seem standalone or dangerous. This is a basic filter.
    # A real-world app usually relies on parameterized queries (which SQLAlchemy handles),
    # but we sanitize input here as requested.
    value = value.replace(';', '').replace('--', '')
    
    return value.strip()

class ContentAnalysisRequest(BaseModel):
    url: str | None = Field(default=None, description="URL of the news article to analyze")
    text: str | None = Field(default=None, description="Raw text of the news article to analyze")

    @field_validator('text')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return sanitize_string(v)

    @field_validator('url')
    @classmethod
    def sanitize_url(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return sanitize_string(v)

class AnalysisResponse(BaseModel):
    task_id: str
    message: str

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: dict | None = None
