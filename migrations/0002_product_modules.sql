CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  planned_amount NUMERIC(14, 2) NOT NULL CHECK (planned_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, month),
  FOREIGN KEY (user_id, category_id) REFERENCES categories(user_id, id)
);

CREATE TABLE IF NOT EXISTS categorization_rules (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, pattern),
  FOREIGN KEY (user_id, category_id) REFERENCES categories(user_id, id)
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS card_pin_failures_state (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  PRIMARY KEY (user_id, card_id),
  FOREIGN KEY (user_id, card_id) REFERENCES cards(user_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS card_unlock_sessions_state (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id, card_id) REFERENCES cards(user_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS csv_import_sessions_state (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  columns_json JSONB NOT NULL,
  rows_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS reserve_goal_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserve_current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

DROP TRIGGER IF EXISTS budgets_set_updated_at ON budgets;
CREATE TRIGGER budgets_set_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_rules_user_pattern ON categorization_rules(user_id, pattern);
CREATE INDEX IF NOT EXISTS idx_csv_import_sessions_user ON csv_import_sessions_state(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_card_unlock_sessions_user_card ON card_unlock_sessions_state(user_id, card_id, expires_at);
