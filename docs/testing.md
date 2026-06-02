# Testing

Backend:

```bash
python -m ruff check .
python -m bandit -r app
python -m pytest -q
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run lint
npm run build
```

Integracao com PostgreSQL:

```bash
$env:TEST_DATABASE_URL="postgresql://user:password@localhost:5432/ritmo_test"
python -m pytest tests/integration -q
```

Coberturas importantes existentes:

- Money e parcelas.
- Seguranca e senha.
- Cartoes.
- CSV import e deduplicacao.
- Auth e isolamento basico por usuario.
- Exportacao.

Proximos testes recomendados:

- Playwright completo.
- Componentes React.
- Orcamento por categoria.
- Regras de categorizacao.
