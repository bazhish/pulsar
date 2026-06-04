-- Supabase RLS reference for Pulsar.
-- Apply only after mapping app users to Supabase auth.uid() or storing the
-- application user id in a trusted JWT claim. Review before production.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_import_sessions_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_unlock_sessions_state ENABLE ROW LEVEL SECURITY;

-- Helper idea:
-- Replace auth.uid() with the trusted claim if Pulsar user ids are not equal
-- to Supabase auth user ids.

CREATE POLICY users_self_select ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_self_update ON users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY settings_owner_all ON settings
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY categories_owner_all ON categories
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY cards_owner_all ON cards
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY card_pins_owner_all ON card_pins
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY transactions_owner_all ON transactions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY budgets_owner_all ON budgets
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY categorization_rules_owner_all ON categorization_rules
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY csv_import_sessions_owner_all ON csv_import_sessions_state
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY card_unlock_sessions_owner_all ON card_unlock_sessions_state
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Server-only tables. Prefer no public policies. Access them only through
-- service role/backend credentials.
ALTER TABLE revoked_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_failures_state ENABLE ROW LEVEL SECURITY;

-- Suggested indexes for RLS-heavy workloads.
CREATE INDEX IF NOT EXISTS idx_settings_rls_user ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_rls_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_rls_user ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_rls_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_rls_user ON budgets(user_id);
