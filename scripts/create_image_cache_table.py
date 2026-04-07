"""
scripts/create_image_cache_table.py
====================================
image_cache tablosunu oluşturur ve AnalysisType enum'u günceller.
Çalıştırma: python scripts/create_image_cache_table.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

CREATE_SQL = """
-- image_cache tablosu
CREATE TABLE IF NOT EXISTS image_cache (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phash       VARCHAR(64) NOT NULL,
    exif_flags  JSONB,
    gemini_result JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_image_cache_phash ON image_cache(phash);

-- AnalysisType enum'a image ekle (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'image'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'analysistype')
    ) THEN
        ALTER TYPE analysistype ADD VALUE 'image';
    END IF;
END$$;
"""

async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        for stmt in CREATE_SQL.strip().split(";\n\n"):
            stmt = stmt.strip()
            if stmt:
                await conn.execute(text(stmt + ";"))
    await engine.dispose()
    print("✅ image_cache tablosu ve enum güncellendi.")

if __name__ == "__main__":
    asyncio.run(main())
