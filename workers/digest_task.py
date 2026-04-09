"""
workers/digest_task.py
========================
Her Pazartesi sabah 08:00'de çalışır.
Kullanıcılara haftalık kişisel özet emaili gönderir.
SMTP_HOST boşsa sessizce atlar.
"""
import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import ContentInteraction, User, UserNotificationPrefs

logger = logging.getLogger(__name__)


def _send_email(to_addr: str, subject: str, html_body: str) -> None:
    """Senkron SMTP gönderim — Celery task içinden çağrılır."""
    if not settings.SMTP_HOST:
        logger.debug("SMTP_HOST tanımlı değil, email atlandı: %s", to_addr)
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = settings.SMTP_FROM
    msg["To"]      = to_addr
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            smtp.ehlo()
            if settings.SMTP_PORT == 587:
                smtp.starttls()
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.sendmail(settings.SMTP_FROM, to_addr, msg.as_string())
        logger.info("Digest email gönderildi: %s", to_addr)
    except Exception as exc:
        logger.error("Email gönderilemedi (%s): %s", to_addr, exc)


def _build_html(username: str, total: int, high_risk: int, top_cats: list[str]) -> str:
    cats_html = "".join(f"<li>{c}</li>" for c in top_cats[:5])
    high_risk_html = (
        f"<p style='color:#ef4444'>⚠️ Bunların <strong>{high_risk}</strong> tanesi yüksek riskli (%60+) çıktı.</p>"
        if high_risk > 0 else ""
    )
    return f"""
    <html><body style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#1a1a2e">📰 Haftalık Haber Özeti — {username}</h2>
      <p>Geçen hafta <strong>{total}</strong> haber okudun.</p>
      {high_risk_html}
      <p>En çok ilgilendiğin konular:</p>
      <ul>{cats_html}</ul>
      <p>Daha fazlası için <a href="http://localhost:5173/gundem">Gündem</a>'i ziyaret et.</p>
      <hr>
      <p style="font-size:11px;color:#888">
        Bu emaili almak istemiyorsan
        <a href="http://localhost:5173/profile">profil ayarlarından</a> kapatabilirsin.
      </p>
    </body></html>
    """


async def _run_digest_async() -> int:
    engine  = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    sent    = 0
    cutoff  = datetime.now(timezone.utc) - timedelta(days=7)

    try:
        async with Session() as db:
            prefs_rows = (await db.execute(
                select(UserNotificationPrefs).where(
                    UserNotificationPrefs.email_digest == True  # noqa: E712
                )
            )).scalars().all()

            for prefs in prefs_rows:
                user = (await db.execute(
                    select(User).where(User.id == prefs.user_id)
                )).scalar_one_or_none()
                if not user or not user.email or not user.is_active:
                    continue

                rows = (await db.execute(
                    select(
                        ContentInteraction.category,
                        ContentInteraction.nlp_score_at_time,
                        ContentInteraction.interaction_type,
                    ).where(
                        ContentInteraction.user_id == user.id,
                        ContentInteraction.created_at >= cutoff,
                        ContentInteraction.interaction_type.in_(["click", "feedback_positive"]),
                    )
                )).all()

                if not rows:
                    continue

                total     = len(rows)
                high_risk = sum(1 for r in rows if (r.nlp_score_at_time or 0) >= 0.6)
                cat_count: dict = {}
                for r in rows:
                    if r.category:
                        cat_count[r.category] = cat_count.get(r.category, 0) + 1
                top_cats = sorted(cat_count, key=lambda c: cat_count[c], reverse=True)

                html = _build_html(user.username, total, high_risk, top_cats)
                _send_email(user.email, "📰 Haftalık Haber Özetin Hazır", html)
                sent += 1

    except Exception as exc:
        logger.error("digest_task hata: %s", exc)
    finally:
        await engine.dispose()

    return sent


def run_weekly_digest() -> int:
    return asyncio.run(_run_digest_async())
