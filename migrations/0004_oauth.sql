ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider TEXT,
  ADD COLUMN IF NOT EXISTS oauth_subject TEXT;

ALTER TABLE users
  ALTER COLUMN hashed_password DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_identity
  ON users (auth_provider, oauth_subject)
  WHERE auth_provider IS NOT NULL AND oauth_subject IS NOT NULL;
