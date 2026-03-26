from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.core.logging import get_logger
from app.db.session import get_db
from app.models.models import User, UserRole
from app.schemas.schemas import AdminUpdateUserRequest, PaginatedUserResponse, UserResponse

router = APIRouter()
log    = get_logger(__name__)


@router.get("/users", response_model=PaginatedUserResponse)
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * size

    total = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    items = (
        await db.execute(select(User).order_by(User.created_at.desc()).offset(offset).limit(size))
    ).scalars().all()

    return PaginatedUserResponse(total=total, page=page, size=size, items=items)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: AdminUpdateUserRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    # Kendi admin hesabını değiştirme koruması
    if user.id == admin.id and (
        body.role == UserRole.user or body.is_active is False
    ):
        raise HTTPException(status_code=400, detail="Kendi admin hesabınızı değiştiremezsiniz")

    if body.is_active is not None:
        if not body.is_active and user.role == UserRole.admin:
            other_admins = (
                await db.execute(
                    select(func.count()).where(
                        User.role == UserRole.admin,
                        User.is_active == True,
                        User.id != user_id,
                    )
                )
            ).scalar_one()
            if other_admins == 0:
                raise HTTPException(status_code=400, detail="Son aktif admin devre dışı bırakılamaz")
        user.is_active = body.is_active
        log.info(
            "user.deactivated" if not body.is_active else "user.activated",
            user_id=str(user_id), by_admin_id=str(admin.id)
        )

    if body.role is not None and body.role != user.role:
        old_role = user.role
        user.role = body.role
        log.info("user.role_changed", user_id=str(user_id),
                 old_role=old_role.value, new_role=body.role.value, by_admin_id=str(admin.id))

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı silemezsiniz")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    if user.role == UserRole.admin:
        other_admins = (
            await db.execute(
                select(func.count()).where(
                    User.role == UserRole.admin, User.is_active == True, User.id != user_id
                )
            )
        ).scalar_one()
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="Son admin silinemez")

    await db.delete(user)
    await db.commit()
    log.info("user.deleted", user_id=str(user_id), by_admin_id=str(admin.id))
