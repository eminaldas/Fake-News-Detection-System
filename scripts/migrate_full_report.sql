-- full_report kolonu ekleme
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS full_report JSONB;
