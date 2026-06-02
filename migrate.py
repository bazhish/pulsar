from __future__ import annotations

import os
import logging

import psycopg2
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("ritmo_financeiro_migrate")

SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  hashed_password TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT DEFAULT NULL,
  send_monthly_summary BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER NOT NULL DEFAULT 1 CHECK (id = 1),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monthly_income NUMERIC(14, 2) NOT NULL DEFAULT 0,
  daily_goal NUMERIC(14, 2) NOT NULL DEFAULT 120,
  reserve_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT NOT NULL DEFAULT '#9be768',
  icon TEXT DEFAULT U&'\\25CF',
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  UNIQUE (user_id, name),
  UNIQUE (user_id, id)
);

CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  last_four TEXT NOT NULL,
  credit_limit NUMERIC(14, 2) NOT NULL CHECK (credit_limit >= 0),
  closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color TEXT NOT NULL DEFAULT '#171717',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id INTEGER,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  transaction_date TEXT NOT NULL,
  notes TEXT DEFAULT '',
  card_id INTEGER,
  billing_month TEXT,
  installment_group TEXT,
  installment_number INTEGER,
  total_installments INTEGER,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_type TEXT CHECK (recurrence_type IS NULL OR recurrence_type IN ('monthly', 'weekly')),
  recurrence_day INTEGER,
  source TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  imported_at TIMESTAMPTZ,
  raw_description TEXT,
  duplicate_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id, category_id) REFERENCES categories(user_id, id),
  FOREIGN KEY (user_id, card_id) REFERENCES cards(user_id, id)
);

CREATE TABLE IF NOT EXISTS card_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_month ON transactions(user_id, billing_month, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_card ON transactions(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_card_pins_user_card ON card_pins(user_id, card_id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS send_monthly_summary BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT,
  ADD COLUMN IF NOT EXISTS recurrence_day INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_description TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_hash TEXT;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS reserve_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_recurrence_type_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_recurrence_type_check
  CHECK (recurrence_type IS NULL OR recurrence_type IN ('monthly', 'weekly'));

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_source_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('manual', 'csv_import', 'open_finance_future'));

CREATE INDEX IF NOT EXISTS idx_transactions_user_recurring ON transactions(user_id, is_recurring, recurrence_type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_source ON transactions(user_id, source);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_duplicate_hash
  ON transactions(user_id, duplicate_hash)
  WHERE duplicate_hash IS NOT NULL;
"""


def run_migrations(conn) -> None:
    with conn.cursor() as cursor:
        cursor.execute(SCHEMA_SQL)
    conn.commit()


def migrate() -> None:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is required.")

    conn = psycopg2.connect(database_url)
    try:
        run_migrations(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
    logger.info("Migra\u00e7\u00f5es aplicadas com sucesso.")
