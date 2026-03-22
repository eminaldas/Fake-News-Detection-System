from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

from app.core.security import TokenData, verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    return verify_token(token)
