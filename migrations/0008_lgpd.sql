-- LGPD: registro de consentimento (ledger append-only) e suporte à eliminação/
-- portabilidade. A exclusão de conta usa os ON DELETE CASCADE já existentes em
-- user_id; aqui só garantimos o rastro de consentimento exigido pelos Arts. 7/8.

CREATE TABLE IF NOT EXISTS consents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_version TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'terms_privacy',
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  ip_hash TEXT,
  channel TEXT NOT NULL DEFAULT 'register',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consents_user_scope
  ON consents(user_id, scope, created_at DESC);
