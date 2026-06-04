ALTER TABLE tables
  ADD COLUMN qr_token VARCHAR(36) NULL AFTER reserved_at;

UPDATE tables
SET qr_token = UUID()
WHERE qr_token IS NULL OR qr_token = '';

ALTER TABLE tables
  MODIFY qr_token VARCHAR(36) NOT NULL;

ALTER TABLE tables
  ADD UNIQUE KEY uq_tables_qr_token (qr_token);
