import hashlib
import re
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.audit import audit_log, check_credential_stuffing, update_ip_history
from app.core.rate_limit import check_login_limit, clear_login_limit, record_failed_login
from app.core.security import (
    create_access_token,
    get_password_hash,
    get_token_exp,
    hash_ip,
    verify_password,
)
from app.db.redis import get_redis
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.models import User, UserRole
from app.schemas.schemas import (
    EmailVerifyRequest,
    GoogleAuthRequest,
    GoogleAuthResponse,
    OnboardingRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)

router = APIRouter()
log    = get_logger(__name__)

_GENERIC_AUTH_ERROR = "Kullanıcı adı veya şifre hatalı"  # account enumeration önlemi


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    _: None = Depends(check_login_limit),
):
    ip = request.client.host if request.client else "unknown"

    # Kullanıcı adı veya email ile ara
    result = await db.execute(
        select(User).where(
            (User.username == form_data.username) | (User.email == form_data.username)
        )
    )
    user = result.scalar_one_or_none()

    if user is None or user.hashed_password is None or not verify_password(form_data.password, user.hashed_password):
        await record_failed_login(ip, redis)
        log.warning(
            "user.login.failed",
            ip_hash=hash_ip(ip),
            reason="invalid_credentials",
        )
        is_stuffing = await check_credential_stuffing(redis, ip)
        crit_sev    = "CRITICAL" if is_stuffing else "WARNING"
        await audit_log(
            redis, "SECURITY", "auth.login_failed",
            ip=ip,
            severity=crit_sev,
            details={"reason": "invalid_credentials", "credential_stuffing": is_stuffing},
        )
        if is_stuffing:
            await audit_log(
                redis, "SECURITY", "security.credential_stuffing_detected",
                ip=ip, severity="CRITICAL",
                details={"subnet_hash": hash_ip(".".join(ip.split(".")[:3]))},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_GENERIC_AUTH_ERROR,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        log.warning("user.login.failed", ip_hash=hash_ip(ip), reason="inactive_account")
        await audit_log(
            redis, "SECURITY", "auth.login_failed",
            ip=ip, severity="WARNING",
            details={"reason": "inactive_account"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=_GENERIC_AUTH_ERROR,
        )

    # Başarılı login — brute force sayacını sıfırla
    await clear_login_limit(ip, redis)

    # remember_me query param'dan oku
    remember_me_param = request.query_params.get("remember_me", "false").lower() == "true"
    client_param      = request.query_params.get("client", "")

    if client_param == "extension":
        expires_delta = timedelta(days=7)
        expires_in    = 7 * 86400
    elif remember_me_param:
        expires_delta = timedelta(days=settings.REMEMBER_ME_EXPIRE_DAYS)
        expires_in    = settings.REMEMBER_ME_EXPIRE_DAYS * 86400
    else:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_in    = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role.value},
        expires_delta=expires_delta,
    )

    # last_login_at güncelle
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    log.info("user.login.success", user_id=str(user.id), ip_hash=hash_ip(ip), remember_me=remember_me_param)
    is_new_ip = await update_ip_history(redis, str(user.id), ip)
    if is_new_ip:
        await audit_log(
            redis, "SECURITY", "security.geo_anomaly",
            ip=ip, user_id=str(user.id), severity="WARNING",
            details={"first_seen_ip": True},
        )
    await audit_log(
        redis, "SECURITY", "auth.login_success",
        ip=ip, user_id=str(user.id), severity="INFO",
        details={"remember_me": remember_me_param},
    )

    return TokenResponse(access_token=token, token_type="bearer", expires_in=expires_in)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    ip = request.client.host if request.client else "unknown"

    existing = await db.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=422, detail="Bu bilgilerle kayıt yapılamadı.")

    smtp_configured = bool(settings.SMTP_HOST and settings.SMTP_USER)

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=get_password_hash(body.password),
        role=UserRole.user,
        is_active=True,
        is_email_verified=not smtp_configured,  # SMTP yoksa otomatik doğrula
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    if smtp_configured:
        token = secrets.token_urlsafe(32)
        await redis.setex(f"email_verify:{token}", 86400, str(user.id))
        _send_verification_email(user.email, token, username=body.username)

    log.info("user.register", username=body.username, ip_hash=hash_ip(ip))

    expires_delta = timedelta(days=settings.REMEMBER_ME_EXPIRE_DAYS)
    access_token  = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role.value},
        expires_delta=expires_delta,
    )

    return RegisterResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.REMEMBER_ME_EXPIRE_DAYS * 86400,
        user=user,
        needs_verification=smtp_configured,
        needs_onboarding=True,
    )


# ── Google OAuth ─────────────────────────────────────────────────────────────

@router.post("/google", response_model=GoogleAuthResponse)
async def google_auth(
    body: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth yapılandırılmamış")

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {body.credential}"},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Geçersiz Google token")

    payload    = resp.json()
    google_id  = payload.get("sub", "")
    email      = payload.get("email", "")
    name       = payload.get("name", "")
    avatar_url = payload.get("picture", "")

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Google hesabından e-posta alınamadı")

    result = await db.execute(
        select(User).where((User.google_id == google_id) | (User.email == email))
    )
    user     = result.scalar_one_or_none()
    is_new   = user is None

    if is_new:
        username = await _unique_username(name, db)
        user = User(
            email=email,
            username=username,
            hashed_password=None,
            google_id=google_id,
            avatar_url=avatar_url,
            is_email_verified=True,
            is_active=True,
        )
        db.add(user)
    else:
        if not user.google_id:
            user.google_id = google_id
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        user.is_email_verified = True

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    # Yeni kullanıcıya hoş geldin emaili gönder
    if is_new and bool(settings.SMTP_HOST and settings.SMTP_USER):
        _send_welcome_email(user.email, user.username)

    expires_delta = timedelta(days=settings.REMEMBER_ME_EXPIRE_DAYS)
    access_token  = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role.value},
        expires_delta=expires_delta,
    )

    return GoogleAuthResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.REMEMBER_ME_EXPIRE_DAYS * 86400,
        user=user,
        is_new_user=is_new,
        needs_onboarding=is_new or not user.onboarding_completed,
    )


# ── Email verification ────────────────────────────────────────────────────────

@router.post("/send-verification", status_code=200)
async def send_verification(
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
):
    if current_user.is_email_verified:
        return {"detail": "Email zaten doğrulandı"}

    token = secrets.token_urlsafe(32)
    await redis.setex(f"email_verify:{token}", 86400, str(current_user.id))

    if bool(settings.SMTP_HOST and settings.SMTP_USER):
        _send_verification_email(current_user.email, token)
        return {"detail": "Doğrulama emaili gönderildi"}
    else:
        # Dev mode: token'ı döndür
        return {"detail": "dev_mode", "token": token}


@router.post("/verify-email", response_model=UserResponse)
async def verify_email(
    body: EmailVerifyRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    user_id = await redis.get(f"email_verify:{body.token}")
    if not user_id:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş doğrulama bağlantısı")

    user = await db.get(User, user_id.decode() if isinstance(user_id, bytes) else user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    user.is_email_verified = True
    await db.commit()
    await db.refresh(user)
    await redis.delete(f"email_verify:{body.token}")
    return user


# ── Onboarding ────────────────────────────────────────────────────────────────

@router.put("/complete-onboarding", response_model=UserResponse)
async def complete_onboarding(
    body: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    from app.models.models import UserPreferenceProfile

    if body.avatar_url:
        current_user.avatar_url = body.avatar_url
    current_user.onboarding_completed = True
    await db.commit()

    if body.interests:
        existing_profile = await db.execute(
            select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == current_user.id)
        )
        profile = existing_profile.scalar_one_or_none()
        weights = {cat: 1.0 for cat in body.interests}
        if profile:
            profile.declared_interests = weights
            profile.category_weights   = {}
        else:
            db.add(UserPreferenceProfile(
                user_id=current_user.id,
                declared_interests=weights,
                category_weights={},
                interaction_count=0,
            ))
        await db.commit()

    if body.marketing_source:
        await audit_log(
            redis, "USER_ACTION", "onboarding.marketing_source",
            user_id=str(current_user.id),
            details={"source": body.marketing_source},
        )

    await db.refresh(current_user)
    return current_user


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _unique_username(display_name: str, db: AsyncSession) -> str:
    base = re.sub(r"[^a-z0-9_]", "", display_name.lower().replace(" ", "_"))[:20] or "kullanici"
    username = base
    counter  = 0
    while True:
        res = await db.execute(select(User.id).where(User.username == username))
        if not res.scalar_one_or_none():
            return username
        counter += 1
        username = f"{base}{counter}"


def _send_verification_email(to_email: str, token: str, username: str = "") -> None:
    try:
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        msg        = MIMEMultipart("alternative")
        msg["Subject"] = "E-postanızı Doğrulayın — Ne Haber"
        msg["From"]    = f"Ne Haber <{settings.SMTP_FROM}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(_build_verify_html(username or to_email.split("@")[0], verify_url), "html"))
        _smtp_send(msg, to_email)
    except Exception:
        pass


def _send_welcome_email(to_email: str, username: str) -> None:
    try:
        msg            = MIMEMultipart("alternative")
        msg["Subject"] = "Hoş Geldiniz — Ne Haber"
        msg["From"]    = f"Ne Haber <{settings.SMTP_FROM}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(_build_welcome_html(username), "html"))
        _smtp_send(msg, to_email)
    except Exception:
        pass


def _smtp_send(msg: MIMEMultipart, to_email: str) -> None:
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())


def _email_base() -> str:
    return """<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#050c0f;font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#050c0f;padding:40px 20px;">
  <tr><td align="center">
  <table width="580" cellpadding="0" cellspacing="0" border="0"
         style="max-width:580px;background:#0b1820;
                border:1px solid #1c3344;
                border-top:3px solid #10b981;">

    <!-- HEADER -->
    <tr>
      <td style="padding:28px 36px;border-bottom:1px solid #1c3344;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <span style="font-size:22px;font-weight:900;color:#10b981;
                           letter-spacing:4px;text-transform:uppercase;">
                NE_HABER
              </span>
              <span style="font-size:10px;color:#10b981;opacity:0.5;margin-left:10px;">
                v2.4
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- BODY -->
    <tr><td style="padding:40px 36px;">
      {{BODY}}
    </td></tr>

    <!-- FOOTER -->
    <tr>
      <td style="padding:20px 36px;border-top:1px solid #1c3344;background:#070f12;">
        <p style="margin:0;font-size:10px;color:#2a4555;letter-spacing:2px;text-transform:uppercase;">
          © 2026 Ne Haber · Sahte Haber Tespit Platformu
        </p>
        <p style="margin:6px 0 0;font-size:10px;color:#1c3344;">
          Bu e-postayı siz talep etmediyseniz dikkate almayınız.
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body></html>"""


def _build_verify_html(username: str, verify_url: str) -> str:
    body = f"""
      <p style="margin:0 0 6px;font-size:11px;color:#10b981;
                letter-spacing:2px;text-transform:uppercase;">
        &gt; YENİ_KULLANICI_KAYDEDILDI
      </p>

      <h1 style="margin:0 0 8px;font-size:30px;font-weight:900;
                 color:#ffffff;line-height:1.2;">
        Ne Haber'e Hoş Geldin,
      </h1>
      <h1 style="margin:0 0 24px;font-size:34px;font-weight:900;
                 color:#10b981;line-height:1.2;">
        {username}
      </h1>

      <p style="margin:0 0 28px;font-size:15px;color:#ffffff;line-height:1.8;">
        En doğru habere ulaşacağın platform burada.<br>
        Hesabını doğrula ve hemen <strong style="color:#10b981;">ilk analizini</strong> yap.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
        <tr>
          <td style="background:#10b981;">
            <a href="{verify_url}"
               style="display:inline-block;padding:15px 36px;
                      font-size:12px;font-weight:700;color:#070f12;
                      text-decoration:none;letter-spacing:2px;
                      text-transform:uppercase;">
              [ E-POSTAMI DOĞRULA ]
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 6px;font-size:11px;color:#3a5566;">
        // Buton çalışmıyorsa bu bağlantıyı kopyalayın:
      </p>
      <p style="margin:0 0 36px;font-size:11px;color:#10b981;word-break:break-all;
                line-height:1.6;">
        {verify_url}
      </p>

      <div style="border-top:1px solid #1c3344;margin:0 0 28px;"></div>

      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding:18px 20px;border-left:3px solid #10b981;
                     background:rgba(16,185,129,0.04);">
            <p style="margin:0;font-size:13px;color:#a8bfcc;
                      line-height:1.7;font-style:italic;">
              "Bilgi kirliliğinin ötesine geçin. Şüpheli haberleri yapay zeka ile
               saniyeler içinde analiz edin."
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0;font-size:11px;color:#3a5566;line-height:1.6;">
        // Bağlantı 24 saat geçerlidir.
      </p>
    """
    return _email_base().replace("{{BODY}}", body)


def _build_welcome_html(username: str) -> str:
    home_url = settings.FRONTEND_URL
    body = f"""
      <p style="margin:0 0 6px;font-size:11px;color:#10b981;
                letter-spacing:2px;text-transform:uppercase;">
        &gt; GOOGLE_AUTH_BAŞARILI
      </p>

      <h1 style="margin:0 0 8px;font-size:30px;font-weight:900;
                 color:#ffffff;line-height:1.2;">
        Ne Haber'e Hoş Geldin,
      </h1>
      <h1 style="margin:0 0 24px;font-size:34px;font-weight:900;
                 color:#10b981;line-height:1.2;">
        {username}
      </h1>

      <p style="margin:0 0 28px;font-size:15px;color:#ffffff;line-height:1.8;">
        En doğru habere ulaşacağın platform burada.<br>
        Hemen <strong style="color:#10b981;">ilk analizini</strong> yap.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 36px;">
        <tr>
          <td style="background:#10b981;">
            <a href="{home_url}"
               style="display:inline-block;padding:15px 36px;
                      font-size:12px;font-weight:700;color:#070f12;
                      text-decoration:none;letter-spacing:2px;
                      text-transform:uppercase;">
              [ PLATFORMA GİT ]
            </a>
          </td>
        </tr>
      </table>

      <div style="border-top:1px solid #1c3344;margin:0 0 28px;"></div>

      <table cellpadding="0" cellspacing="0" border="0" width="100%"
             style="margin:0 0 28px;">
        <tr>
          <td style="padding:16px 18px;background:rgba(16,185,129,0.05);
                     border:1px solid #1c3344;border-left:2px solid #10b981;">
            <p style="margin:0 0 4px;font-size:11px;color:#10b981;
                      letter-spacing:1px;text-transform:uppercase;">
              GÜNLÜK KOTA
            </p>
            <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">
              20 <span style="font-size:13px;color:#a8bfcc;font-weight:400;">
                analiz / gün
              </span>
            </p>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding:18px 20px;border-left:3px solid #10b981;
                     background:rgba(16,185,129,0.04);">
            <p style="margin:0;font-size:13px;color:#a8bfcc;
                      line-height:1.7;font-style:italic;">
              "Bilgi kirliliğinin ötesine geçin. Şüpheli haberleri yapay zeka ile
               saniyeler içinde analiz edin."
            </p>
          </td>
        </tr>
      </table>
    """
    return _email_base().replace("{{BODY}}", body)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    request: Request,
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else "unknown"

    if body.new_password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Mevcut şifre gerekli")
        if not verify_password(body.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Mevcut şifre hatalı")
        current_user.hashed_password = get_password_hash(body.new_password)
        log.info("user.password_changed", user_id=str(current_user.id), ip_hash=hash_ip(ip))

    if body.username and body.username != current_user.username:
        conflict = await db.execute(select(User).where(User.username == body.username))
        if conflict.scalar_one_or_none():
            raise HTTPException(status_code=422, detail="Bu kullanıcı adı kullanımda")
        current_user.username = body.username

    await db.commit()
    await db.refresh(current_user)
    return current_user


_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    current_user: User = Depends(get_current_user),
):
    """Mevcut geçerli token ile yeni 30 dakikalık token üretir (proaktif yenileme)."""
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expires_in    = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    token = create_access_token(
        data={
            "sub": str(current_user.id),
            "username": current_user.username,
            "role": current_user.role.value,
        },
        expires_delta=expires_delta,
    )
    return TokenResponse(access_token=token, token_type="bearer", expires_in=expires_in)


@router.post("/logout", status_code=200)
async def logout(
    token: str = Depends(_oauth2_scheme),
    redis=Depends(get_redis),
):
    """Token'ı Redis blacklist'e ekleyerek sunucu tarafında geçersiz kılar."""
    exp = get_token_exp(token)
    if exp:
        ttl = max(0, exp - int(datetime.now(timezone.utc).timestamp()))
        if ttl > 0:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            await redis.setex(f"blacklist:{token_hash}", ttl, "1")
    return {"detail": "Çıkış yapıldı"}
