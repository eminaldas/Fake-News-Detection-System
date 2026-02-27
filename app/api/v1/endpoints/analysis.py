from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.schemas import ContentAnalysisRequest, AnalysisResponse, TaskStatusResponse
from app.core.security import verify_token
from celery.result import AsyncResult
from workers.tasks import analyze_article
from fastapi.security import OAuth2PasswordBearer
import uuid

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    return verify_token(token)

@router.post("/analyze", response_model=AnalysisResponse, status_code=status.HTTP_202_ACCEPTED)
async def analyze_content(
    request: ContentAnalysisRequest,
    current_user=Depends(get_current_user)
):
    """
    Submit an article or URL for fake news analysis.
    Returns a task ID that can be used to poll for the result.
    """
    if not request.url and not request.text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'url' or 'text' must be provided."
        )

    # Generate a unique ID for this analysis request
    content_id = str(uuid.uuid4())
    
    # Offload the heavy work to Celery
    task = analyze_article.delay(content_id, text=request.text, url=request.url)

    return AnalysisResponse(
        task_id=task.id,
        message="Analysis task registered successfully. Use the task_id to check the status."
    )

@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_analysis_status(
    task_id: str,
    current_user=Depends(get_current_user)
):
    """
    Check the status of an ongoing analysis task.
    """
    task_result = AsyncResult(task_id)
    
    response = TaskStatusResponse(
        task_id=task_id,
        status=task_result.status,
    )

    if task_result.ready():
        if task_result.successful():
            response.result = task_result.result
        else:
            response.status = "FAILED"
            response.result = {"error": str(task_result.info)}

    return response
