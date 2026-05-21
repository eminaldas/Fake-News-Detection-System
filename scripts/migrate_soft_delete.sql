-- Soft delete için deleted_at kolonu ekle
-- Çalıştırmak için: docker exec <db-container> psql -U postgres -d fnds -f /migrate_soft_delete.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
