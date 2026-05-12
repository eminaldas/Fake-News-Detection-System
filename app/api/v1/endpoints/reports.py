# app/api/v1/endpoints/reports.py
import smtplib
import threading
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.models import ReportStatus, ReportType, User, UserReport

router = APIRouter()

# ── Pydantic şemaları ─────────────────────────────────────────────

class CreateReportRequest(BaseModel):
    type:        ReportType
    subject:     str        = Field(..., min_length=5,  max_length=200)
    description: str        = Field(..., min_length=20)
    url_or_ref:  Optional[str] = Field(None, max_length=500)


class AdminReplyRequest(BaseModel):
    reply:  str          = Field(default="")
    status: ReportStatus


# ── E-posta yardımcıları ──────────────────────────────────────────

def _smtp_send(msg: MIMEMultipart, to_email: str) -> None:
    if not (settings.SMTP_HOST and settings.SMTP_USER):
        return
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
    except Exception:
        pass


TYPE_LABELS = {
    "fake_news": "Sahte Haber",
    "bug":       "Hata / Sorun",
    "complaint": "Şikayet",
    "other":     "Diğer",
}


def _send_confirmation(to_email: str, username: str, report_id: str, report_type: str, subject: str) -> None:
    short_id = str(report_id).upper()[:8]
    label    = TYPE_LABELS.get(report_type, report_type)
    body     = f"""
      <tr>
        <td style="padding:32px 36px;">
          <p style="color:#10b981;font-family:'Courier New',monospace;font-size:11px;
                    letter-spacing:3px;text-transform:uppercase;margin:0 0 20px;">
            // BİLDİRİM_ALINDI
          </p>
          <p style="color:#e2e8f0;font-size:15px;font-weight:700;margin:0 0 16px;">
            Merhaba {username},
          </p>
          <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin:0 0 24px;">
            Bildiriminiz başarıyla alındı. Ekibimiz en kısa sürede inceleyecektir.
          </p>
          <table style="background:#0f2030;border:1px solid #1c3344;width:100%;
                        border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:12px 16px;color:#64748b;font-size:11px;
                         font-family:'Courier New',monospace;border-bottom:1px solid #1c3344;">
                RAPOR ID
              </td>
              <td style="padding:12px 16px;color:#10b981;font-size:13px;font-weight:700;
                         font-family:'Courier New',monospace;border-bottom:1px solid #1c3344;">
                #{short_id}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#64748b;font-size:11px;
                         font-family:'Courier New',monospace;border-bottom:1px solid #1c3344;">
                TÜR
              </td>
              <td style="padding:12px 16px;color:#e2e8f0;font-size:13px;
                         border-bottom:1px solid #1c3344;">
                {label}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#64748b;font-size:11px;
                         font-family:'Courier New',monospace;">
                KONU
              </td>
              <td style="padding:12px 16px;color:#e2e8f0;font-size:13px;">
                {subject}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    """
    html = _email_base().replace("{{BODY}}", body)
    msg  = MIMEMultipart("alternative")
    msg["Subject"] = f"Bildiriminiz Alındı #{short_id} — Ne Haber"
    msg["From"]    = f"Ne Haber <{settings.SMTP_FROM}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html"))
    threading.Thread(target=_smtp_send, args=(msg, to_email), daemon=True).start()


def _send_reply_notification(to_email: str, username: str, report_id: str, subject: str, reply: str) -> None:
    short_id = str(report_id).upper()[:8]
    body     = f"""
      <tr>
        <td style="padding:32px 36px;">
          <p style="color:#10b981;font-family:'Courier New',monospace;font-size:11px;
                    letter-spacing:3px;text-transform:uppercase;margin:0 0 20px;">
            // BİLDİRİMİNİZ_YANITLANDI
          </p>
          <p style="color:#e2e8f0;font-size:15px;font-weight:700;margin:0 0 16px;">
            Merhaba {username},
          </p>
          <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin:0 0 8px;">
            Bildiriminiz #{short_id} — <strong style="color:#e2e8f0;">{subject}</strong>
          </p>
          <p style="color:#94a3b8;font-size:13px;margin:0 0 20px;">
            ekibimiz tarafından yanıtlandı:
          </p>
          <div style="background:#0f2030;border-left:3px solid #10b981;
                      padding:16px 20px;margin-bottom:24px;">
            <p style="color:#e2e8f0;font-size:14px;line-height:1.7;margin:0;">
              {reply}
            </p>
          </div>
        </td>
      </tr>
    """
    html = _email_base().replace("{{BODY}}", body)
    msg  = MIMEMultipart("alternative")
    msg["Subject"] = f"Bildiriminiz Yanıtlandı #{short_id} — Ne Haber"
    msg["From"]    = f"Ne Haber <{settings.SMTP_FROM}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html"))
    threading.Thread(target=_smtp_send, args=(msg, to_email), daemon=True).start()


def _email_base() -> str:
    return """<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050c0f;font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#050c0f;padding:40px 20px;">
  <tr><td align="center">
  <table width="580" cellpadding="0" cellspacing="0" border="0"
         style="max-width:580px;background:#0b1820;border:1px solid #1c3344;border-top:3px solid #10b981;">
    <tr>
      <td style="padding:28px 36px;border-bottom:1px solid #1c3344;">
        <span style="font-size:22px;font-weight:900;color:#10b981;
                     letter-spacing:4px;text-transform:uppercase;">NE_HABER</span>
      </td>
    </tr>
    {{BODY}}
    <tr>
      <td style="padding:20px 36px;border-top:1px solid #1c3344;">
        <p style="color:#334155;font-size:11px;margin:0;font-family:'Courier New',monospace;">
          Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
        </p>
      </td>
    </tr>
  </table>
  </td></tr>
</table>
</body>
</html>"""


# ── Endpoint'ler ──────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_report(
    body:         CreateReportRequest,
    current_user: User         = Depends(get_current_user),
    db:           AsyncSession = Depends(get_db),
):
    """Yeni bildirim oluştur (giriş zorunlu)."""
    report = UserReport(
        reporter_id = current_user.id,
        type        = body.type,
        subject     = body.subject,
        description = body.description,
        url_or_ref  = body.url_or_ref,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    _send_confirmation(
        to_email    = current_user.email,
        username    = current_user.username,
        report_id   = str(report.id),
        report_type = body.type.value,
        subject     = body.subject,
    )

    return {
        "id":         str(report.id),
        "type":       report.type.value,
        "subject":    report.subject,
        "status":     report.status.value,
        "created_at": report.created_at.isoformat(),
    }


@router.get("/admin")
async def list_reports(
    status:       Optional[str] = None,
    type:         Optional[str] = None,
    page:         int           = 1,
    size:         int           = 20,
    current_user: User          = Depends(get_current_user),
    db:           AsyncSession  = Depends(get_db),
):
    """Tüm raporları listele (admin only)."""
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Yalnızca yöneticiler erişebilir.")

    q = select(UserReport).order_by(UserReport.created_at.desc())
    if status:
        q = q.where(UserReport.status == status)
    if type:
        q = q.where(UserReport.type == type)

    total_q = select(func.count()).select_from(q.subquery())
    total   = (await db.execute(total_q)).scalar_one()

    q = q.offset((page - 1) * size).limit(size)
    rows = (await db.execute(q)).scalars().all()

    items = []
    for r in rows:
        await db.refresh(r, ["reporter"])
        items.append({
            "id":                str(r.id),
            "type":              r.type.value,
            "subject":           r.subject,
            "description":       r.description,
            "url_or_ref":        r.url_or_ref,
            "status":            r.status.value,
            "admin_reply":       r.admin_reply,
            "created_at":        r.created_at.isoformat(),
            "replied_at":        r.replied_at.isoformat() if r.replied_at else None,
            "reporter_username": r.reporter.username,
            "reporter_email":    r.reporter.email,
        })

    return {"items": items, "total": total, "page": page, "size": size}


@router.post("/admin/{report_id}/reply")
async def reply_report(
    report_id:    str,
    body:         AdminReplyRequest,
    current_user: User         = Depends(get_current_user),
    db:           AsyncSession = Depends(get_db),
):
    """Admin yanıtı gönder + durum güncelle (admin only)."""
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Yalnızca yöneticiler erişebilir.")

    from uuid import UUID as _UUID
    result = await db.execute(select(UserReport).where(UserReport.id == _UUID(report_id)))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı.")

    await db.refresh(report, ["reporter"])

    report.status = body.status
    if body.reply.strip():
        report.admin_reply = body.reply.strip()
        report.replied_at  = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(report)

    if body.reply.strip():
        _send_reply_notification(
            to_email  = report.reporter.email,
            username  = report.reporter.username,
            report_id = str(report.id),
            subject   = report.subject,
            reply     = body.reply.strip(),
        )

    return {
        "id":          str(report.id),
        "status":      report.status.value,
        "admin_reply": report.admin_reply,
        "replied_at":  report.replied_at.isoformat() if report.replied_at else None,
    }
