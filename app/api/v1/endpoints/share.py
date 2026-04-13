"""
app/api/v1/endpoints/share.py
==============================
GET /s/analysis/{article_id}  — OG meta tag HTML + redirect
GET /s/forum/{thread_id}       — OG meta tag HTML + redirect
"""
import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.models import Article, AnalysisResult, ForumThread

router = APIRouter()

_BASE_URL = "http://localhost:8000"

_OG_TEMPLATE = """\
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="{og_title}">
  <meta property="og:description" content="{og_desc}">
  <meta property="og:image" content="{base_url}/static/og-default.png">
  <meta property="og:url" content="{og_url}">
  <meta name="twitter:card" content="summary">
  <meta http-equiv="refresh" content="0;url={redirect}">
</head>
<body>
  <script>window.location.href="{redirect}";</script>
  <p>Yönlendiriliyorsunuz... <a href="{redirect}">Tıklayın</a></p>
</body>
</html>"""


@router.get("/analysis/{article_id}", response_class=HTMLResponse)
async def share_analysis(article_id: str, db: AsyncSession = Depends(get_db)):
    redirect = f"{settings.FRONTEND_URL}/analysis/share/{article_id}"
    og_title = "Sahte Haber Dedektifi — Analiz Sonucu"
    og_desc  = "Bu haberin analizini inceleyin."

    try:
        uid = uuid.UUID(article_id)
        row = await db.execute(
            select(Article, AnalysisResult)
            .join(AnalysisResult, AnalysisResult.article_id == Article.id)
            .where(Article.id == uid)
        )
        pair = row.first()
        if pair:
            article, result = pair
            label    = "SAHTE" if result.status == "FAKE" else "GÜVENİLİR"
            conf_pct = round((result.confidence or 0) * 100)
            og_title = f"Sahte Haber Dedektifi — {label} (%{conf_pct})"
            og_desc  = f"'{article.title[:100]}' başlıklı içerik analiz edildi."
    except Exception:
        pass

    html = _OG_TEMPLATE.format(
        og_title=og_title,
        og_desc=og_desc,
        base_url=_BASE_URL,
        og_url=f"{_BASE_URL}/s/analysis/{article_id}",
        redirect=redirect,
    )
    return HTMLResponse(content=html)


@router.get("/forum/{thread_id}", response_class=HTMLResponse)
async def share_forum(thread_id: str, db: AsyncSession = Depends(get_db)):
    redirect = f"{settings.FRONTEND_URL}/forum/thread/{thread_id}"
    og_title = "Sahte Haber Dedektifi — Forum"
    og_desc  = "Forum tartışmasını inceleyin."

    try:
        uid = uuid.UUID(thread_id)
        row = await db.execute(
            select(ForumThread).where(ForumThread.id == uid)
        )
        thread = row.scalar_one_or_none()
        if thread:
            og_title = f"Forum — {thread.title[:80]}"
            body_preview = (thread.body or "")[:150]
            og_desc = body_preview if body_preview else "Forum tartışmasını inceleyin."
    except Exception:
        pass

    html = _OG_TEMPLATE.format(
        og_title=og_title,
        og_desc=og_desc,
        base_url=_BASE_URL,
        og_url=f"{_BASE_URL}/s/forum/{thread_id}",
        redirect=redirect,
    )
    return HTMLResponse(content=html)
