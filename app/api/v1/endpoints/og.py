# app/api/v1/endpoints/og.py
"""
Open Graph preview endpoint'leri — WhatsApp/Telegram/Snapchat gibi botlar için
dinamik OG meta tag'li HTML üretir.
"""
import re
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.db.session import get_db
from app.models.models import Article, AnalysisResult, ForumThread

router = APIRouter()

SITE_URL  = "https://www.nehaber.dev"
SITE_NAME = "Ne Haber"
OG_IMAGE  = f"{SITE_URL}/og-image.png"

BOT_RE = re.compile(
    r"whatsapp|telegram|snapchat|slack|discord|twitterbot|"
    r"facebookexternalhit|linkedinbot|googlebot|bingbot",
    re.I,
)

VERDICT_TR = {
    "DOĞRU":                "✓ Doğru",
    "BÜYÜK_ÖLÇÜDE_DOĞRU":   "✓ Büyük Ölçüde Doğru",
    "KISMEN_DOĞRU":         "~ Kısmen Doğru",
    "KANIT_YETERSİZ":       "? Kanıt Yetersiz",
    "YANILTICI":            "⚠ Yanıltıcı",
    "BAĞLAMDAN_KOPARILMIŞ": "⚠ Bağlamdan Koparılmış",
    "SAHTE":                "✗ Sahte",
}


def _html(title: str, description: str, page_url: str) -> str:
    def esc(s: str) -> str:
        return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")

    t, d, u = esc(title), esc(description), esc(page_url)
    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"/>
  <title>{t}</title>
  <meta name="description" content="{d}"/>
  <meta property="og:type"         content="article"/>
  <meta property="og:site_name"    content="{SITE_NAME}"/>
  <meta property="og:url"          content="{u}"/>
  <meta property="og:title"        content="{t}"/>
  <meta property="og:description"  content="{d}"/>
  <meta property="og:image"        content="{OG_IMAGE}"/>
  <meta property="og:image:width"  content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:title"       content="{t}"/>
  <meta name="twitter:description" content="{d}"/>
  <meta name="twitter:image"       content="{OG_IMAGE}"/>
</head>
<body><p><a href="{u}">{t}</a></p></body>
</html>"""


def _is_bot(request: Request) -> bool:
    ua = request.headers.get("user-agent", "")
    return bool(BOT_RE.search(ua))


@router.get("/og/report/{task_id}", response_class=HTMLResponse)
async def og_report(task_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    page_url = f"{SITE_URL}/analysis/report/{task_id}"
    if not _is_bot(request):
        return RedirectResponse(page_url, status_code=302)

    row = await db.execute(
        select(Article.title, AnalysisResult.full_report, AnalysisResult.status, AnalysisResult.confidence)
        .join(AnalysisResult, AnalysisResult.article_id == Article.id)
        .where(Article.metadata_info.op("->>")(  "task_id") == task_id)
        .limit(1)
    )
    data = row.first()

    title       = "Ne Haber — Tam Rapor"
    description = "Yapay zeka destekli derin haber doğrulama raporu."

    if data:
        if data.title:
            title = f"{data.title} — Tam Rapor | {SITE_NAME}"
        report = data.full_report or {}
        decision = (report.get("verdict") or {}).get("decision")
        if decision:
            label = VERDICT_TR.get(decision, decision)
            score = (report.get("credibility_score") or {}).get("overall")
            description = f"Karar: {label}" + (f" · Güvenilirlik: {score}/100" if score is not None else "") + f" — {SITE_NAME} AI analizi"
        elif report.get("overall_assessment"):
            description = report["overall_assessment"][:200]

    return HTMLResponse(
        content=_html(title, description, page_url),
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/og/forum/{thread_id}", response_class=HTMLResponse)
async def og_forum(thread_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    page_url = f"{SITE_URL}/forum/{thread_id}"
    if not _is_bot(request):
        return RedirectResponse(page_url, status_code=302)

    try:
        import uuid as _uuid
        tid = _uuid.UUID(thread_id)
    except ValueError:
        return RedirectResponse(page_url, status_code=302)

    row = await db.execute(
        select(ForumThread.title, ForumThread.body).where(ForumThread.id == tid).limit(1)
    )
    data = row.first()

    title       = f"{SITE_NAME} Forum — Tartışma"
    description = f"{SITE_NAME} topluluk forumunda bu haberi tartışın."

    if data:
        if data.title: title = f"{data.title} | {SITE_NAME} Forum"
        if data.body:
            clean = re.sub(r"\*\*|__|\[.*?\]\(.*?\)", "", data.body)
            description = clean[:200]

    return HTMLResponse(
        content=_html(title, description, page_url),
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/og/share/{article_id}", response_class=HTMLResponse)
async def og_share(article_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    page_url = f"{SITE_URL}/analysis/share/{article_id}"
    if not _is_bot(request):
        return RedirectResponse(page_url, status_code=302)

    try:
        import uuid as _uuid
        aid = _uuid.UUID(article_id)
    except ValueError:
        return RedirectResponse(page_url, status_code=302)

    row = await db.execute(
        select(Article.title, AnalysisResult.status, AnalysisResult.confidence)
        .join(AnalysisResult, AnalysisResult.article_id == Article.id)
        .where(Article.id == aid)
        .limit(1)
    )
    data = row.first()

    title       = f"{SITE_NAME} — Analiz Sonucu"
    description = "Bu haberin AI analiz sonucunu görüntüle."

    if data:
        if data.title: title = f"{data.title} — Analiz | {SITE_NAME}"
        if data.status:
            conf = f" (%{round((data.confidence or 0) * 100)} güven)" if data.confidence else ""
            label = "✓ Güvenilir" if data.status == "AUTHENTIC" else "✗ Şüpheli"
            description = f"Sonuç: {label}{conf} — {SITE_NAME} AI analizi"

    return HTMLResponse(
        content=_html(title, description, page_url),
        headers={"Cache-Control": "public, max-age=600"},
    )
