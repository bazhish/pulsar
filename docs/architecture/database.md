# Database

Banco: PostgreSQL.

Migrations:

- `migrate.py` aplica o schema legado idempotente.
- Depois aplica arquivos em `migrations/*.sql`.
- `schema_migrations` registra versoes aplicadas.

Novas tabelas:

- `budgets`
- `categorization_rules`
- `revoked_tokens`
- `card_pin_failures_state`
- `card_unlock_sessions_state`
- `csv_import_sessions_state`

Supabase:

- Em schemas expostos, habilite RLS nas tabelas.
- Policies devem combinar `TO authenticated` com predicado de dono, como `user_id = auth.uid()`.
- Nunca use `user_metadata` para autorizacao.
- Nao exponha `service_role` no frontend.

Money:

- Valores financeiros usam `NUMERIC(14, 2)` no banco.
- Calculos no backend usam `Decimal`.
- Parcelas distribuem centavos para preservar soma exata.
