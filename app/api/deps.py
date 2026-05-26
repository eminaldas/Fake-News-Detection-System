import hashlib
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenData, verify_token
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.models import User, UserRole

oauth2_scheme          = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def _get_user_by_id(user_id: str, db: AsyncSession) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    return result.scalar_one_or_none()


async def _is_blacklisted(token: str, redis) -> bool:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return bool(await redis.get(f"blacklist:{token_hash}"))


async def _is_user_blacklisted(user_id: str, redis) -> bool:
    return bool(await redis.get(f"blacklist:user:{user_id}"))


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> User:
    token_data: TokenData = verify_token(token)
    if await _is_blacklisted(token, redis):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token geçersiz kılındı",
            headers={"WWW-Authenticate": "Bearer", "X-Auth-Error": "token_revoked"},
        )
    if await _is_user_blacklisted(token_data.user_id, redis):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Oturum sonlandırıldı",
            headers={"WWW-Authenticate": "Bearer", "X-Auth-Error": "token_revoked"},
        )
    user = await _get_user_by_id(token_data.user_id, db)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı bulunamadı")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hesap devre dışı")
    return user


async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> Optional[User]:
    if token is None:
        return None
    try:
        token_data: TokenData = verify_token(token)
        if await _is_blacklisted(token, redis):
            return None
        user = await _get_user_by_id(token_data.user_id, db)
        if user is None or not user.is_active:
            return None
        return user
    except Exception:
        return None


_ADMIN_ROLES    = {UserRole.admin, UserRole.superadmin}
_MOD_ROLES      = {UserRole.admin, UserRole.superadmin, UserRole.moderator}
_ANALYST_ROLES  = {UserRole.admin, UserRole.superadmin, UserRole.analyst}
_PANEL_ROLES    = {UserRole.admin, UserRole.superadmin, UserRole.moderator, UserRole.analyst}


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in _ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin yetkisi gerekli")
    return current_user


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in _ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekli")
    return current_user


async def require_superadmin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in _ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Süper admin yetkisi gerekli")
    return current_user


async def require_moderator(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in _MOD_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Moderatör yetkisi gerekli")
    return current_user


async def require_analyst(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in _ANALYST_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analist yetkisi gerekli")
    return current_user


async def require_panel(
    current_user: User = Depends(get_current_user),
) -> User:
    """Admin paneline erişim — tüm yetkili roller."""
    if current_user.role not in _PANEL_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yönetim paneli yetkisi gerekli")
    return current_user
