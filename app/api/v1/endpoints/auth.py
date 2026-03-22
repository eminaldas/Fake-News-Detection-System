from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

from app.core.config import settings
from app.core.security import create_access_token, verify_password, get_password_hash

router = APIRouter()

# Admin şifre hash'i uygulama başladığında bir kez hesaplanır.
# Kullanıcı adı ve şifresi .env'den gelir, kaynak kodda hardcode yoktur.
# Üretim ortamında gerçek DB tablosuna geçilmeli.
_ADMIN_HASHED_PASSWORD = get_password_hash(settings.ADMIN_PASSWORD)


@router.post("/login", description="Get JWT access token for authentication")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    username_match = form_data.username == settings.ADMIN_USERNAME
    password_match = verify_password(form_data.password, _ADMIN_HASHED_PASSWORD)

    if not username_match or not password_match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        data={"sub": form_data.username},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer"}
