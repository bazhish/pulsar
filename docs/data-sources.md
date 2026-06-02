# Data Sources

Fontes validas:

- `manual`: lancamentos criados pelo usuario.
- `csv_import`: importados de CSV revisado pelo usuario.
- `open_finance_future`: reservado para integracao futura.

Regras:

- Toda transacao tem `source`.
- Dashboard, transacoes e relatorios podem filtrar por origem.
- CSV usa deduplicacao.
- Integracoes futuras devem passar por normalizacao antes de persistir.
