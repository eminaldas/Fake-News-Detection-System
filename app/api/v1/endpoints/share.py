"""
app/api/v1/endpoints/share.py
==============================
GET /s/analysis/{article_id}  — OG meta tag HTML + redirect
GET /s/forum/{thread_id}       — OG meta tag HTML + redirect
"""
import html as _html
import logging
import uuid

from fastapi import APIRouter, Depends

log = logging.getLogger(__name__)
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.models import Article, AnalysisResult, ForumThread

router = APIRouter()

# BASE_URL settings'ten okunur — share.py içinde doğrudan kullanılır

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
    except Exception as e:
        log.warning("share endpoint db hatası: %s", e)

    html = _OG_TEMPLATE.format(
        og_title=_html.escape(og_title),
        og_desc=_html.escape(og_desc),
        base_url=settings.BASE_URL,
        og_url=f"{settings.BASE_URL}/s/analysis/{article_id}",
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
    except Exception as e:
        log.warning("share endpoint db hatası: %s", e)

    html = _OG_TEMPLATE.format(
        og_title=_html.escape(og_title),
        og_desc=_html.escape(og_desc),
        base_url=settings.BASE_URL,
        og_url=f"{settings.BASE_URL}/s/forum/{thread_id}",
        redirect=redirect,
    )
    return HTMLResponse(content=html)
