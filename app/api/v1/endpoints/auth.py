from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.audit import audit_log, check_credential_stuffing, update_ip_history
from app.core.rate_limit import check_login_limit, clear_login_limit, record_failed_login
from app.core.security import (
    create_access_token,
    get_password_hash,
    hash_ip,
    verify_password,
)
from app.db.redis import get_redis
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.models import User, UserRole
from app.schemas.schemas import (
    RegisterRequest,
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

    if user is None or not verify_password(form_data.password, user.hashed_password):
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
    if remember_me_param:
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


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else "unknown"

    # Çakışma kontrolü — aynı hata mesajı (enumeration önlemi)
    existing = await db.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bu bilgilerle kayıt yapılamadı.",
        )

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=get_password_hash(body.password),
        role=UserRole.user,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    log.info("user.register", username=body.username, ip_hash=hash_ip(ip))

    return user


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
