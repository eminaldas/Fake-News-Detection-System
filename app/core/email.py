"""
app/core/email.py
=================
Async SMTP mail gönderici. SMTP_HOST boşsa sessizce atlar.
"""
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import aiosmtplib

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

_ENABLED = bool(settings.SMTP_HOST)


async def send_mail(
    to_email: str,
    subject: str,
    html_body: str,
) -> None:
    if not _ENABLED:
        log.info("email.skipped", to=to_email, subject=subject)
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = settings.SMTP_FROM
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        log.info("email.sent", to=to_email, subject=subject)
    except Exception as exc:
        log.warning("email.failed", to=to_email, error=str(exc))


# ─── Şablon yardımcıları ───────────────────────────────────────────────────

_BASE = """
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px">
  <div style="background:#0f1419;border-radius:8px;padding:24px;color:#eef2f7">
    <h2 style="margin:0 0 8px;color:#10b981">NeHaber — Hesap Bildirimi</h2>
    {content}
    <hr style="border:none;border-top:1px solid #2d343d;margin:24px 0">
    <p style="font-size:12px;color:#7d8896;margin:0">
      Bu mail otomatik olarak gönderilmiştir. Sorularınız için destek ekibimizle iletişime geçin.
    </p>
  </div>
</div>
"""


def _wrap(content: str) -> str:
    return _BASE.replace("{content}", content)


async def send_warning_mail(
    to_email: str,
    username: str,
    reason: str,
    action: str,
    restrictions: Optional[dict] = None,
) -> None:
    ACTION_LABELS = {
        "warn":        ("Hesap Uyarısı",      "#f59e0b"),
        "restrict":    ("İçerik Kısıtlaması", "#f59e0b"),
        "shadow_ban":  ("Gölge Yasak",        "#ef4444"),
        "ban":         ("Hesap Askıya Alındı","#ef4444"),
    }
    label, color = ACTION_LABELS.get(action, ("Bildirim", "#3b82f6"))

    restr_html = ""
    if restrictions:
        items = []
        if not restrictions.get("can_comment",       True): items.append("Yorum yapma")
        if not restrictions.get("can_post_analysis",  True): items.append("Analiz gönderme")
        if not restrictions.get("can_create_thread",  True): items.append("Başlık açma")
        if items:
            restr_html = "<ul style='margin:8px 0;padding-left:20px;color:#c9d1d9'>" \
                         + "".join(f"<li>{i}</li>" for i in items) \
                         + "</ul>"

    body = _wrap(f"""
<p style="color:#c9d1d9">Merhaba <strong>{username}</strong>,</p>
<div style="background:rgba(239,68,68,0.1);border-left:3px solid {color};padding:12px 16px;border-radius:4px;margin:16px 0">
  <p style="margin:0;font-size:15px;font-weight:700;color:{color}">{label}</p>
</div>
<p style="color:#c9d1d9"><strong>Sebep:</strong> {reason}</p>
{restr_html}
<p style="color:#7d8896;font-size:13px">
  {'Hesabınız kalıcı olarak askıya alınmıştır.' if action == 'ban'
   else 'Kurallara uygun davranmaya devam etmenizi öneririz.'}
</p>
""")

    await send_mail(to_email, f"NeHaber — {label}", body)


async def send_ban_lift_mail(to_email: str, username: str) -> None:
    body = _wrap(f"""
<p style="color:#c9d1d9">Merhaba <strong>{username}</strong>,</p>
<div style="background:rgba(16,185,129,0.1);border-left:3px solid #10b981;padding:12px 16px;border-radius:4px;margin:16px 0">
  <p style="margin:0;font-size:15px;font-weight:700;color:#10b981">Kısıtlama Kaldırıldı</p>
</div>
<p style="color:#c9d1d9">Hesabınızdaki kısıtlama kaldırılmıştır. Platformu tekrar kullanabilirsiniz.</p>
""")
    await send_mail(to_email, "NeHaber — Kısıtlama Kaldırıldı", body)
