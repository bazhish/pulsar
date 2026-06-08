ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_categories_user_active ON categories(user_id, is_active);
