import asyncio

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal, engine
from app.models.models import Base, User, UserRole
from sqlalchemy import select, text


async def init_db():
    print("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")

    # audit_logs tablosu için ek index'ler
    async with engine.begin() as conn:
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_audit_event_type_created "
            "ON audit_logs (event_type, created_at DESC)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_audit_severity_created "
            "ON audit_logs (severity, created_at DESC)"
        ))
    print("audit_logs index'leri oluşturuldu.")

    async with AsyncSessionLocal() as session:
        # Admin kullanıcı zaten var mı kontrol et
        result = await session.execute(
            select(User).where(User.username == settings.ADMIN_USERNAME)
        )
        if result.scalar_one_or_none() is None:
            admin = User(
                email=settings.ADMIN_EMAIL,
                username=settings.ADMIN_USERNAME,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role=UserRole.admin,
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            print(f"Admin kullanıcı oluşturuldu: {settings.ADMIN_USERNAME}")
        else:
            print(f"Admin kullanıcı zaten mevcut: {settings.ADMIN_USERNAME}")


if __name__ == "__main__":
    asyncio.run(init_db())
