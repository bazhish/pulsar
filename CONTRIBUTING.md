# Contribuindo com o Pulsar

Obrigado por considerar contribuir. Este projeto é mobile first, com backend FastAPI e frontend Next.js.

## Antes de começar

1. Leia o [README](README.md) e [docs/guides/setup.md](docs/guides/setup.md) (via [índice de docs](docs/README.md)).
2. Configure `.env` a partir de `.env.example` — **nunca** commite secrets.
3. Rode testes e lint localmente.

## Fluxo de trabalho

1. Faça fork e clone o repositório.
2. Crie branch a partir de `main`: `feat/descricao-curta` ou `fix/descricao-curta`.
3. Commits em português ou inglês, no imperativo: `feat: adiciona filtro por cartão`.
4. Abra Pull Request com descrição, screenshots se UI, e checklist abaixo.

## Checklist do PR

- [ ] `python -m ruff check .` sem erros
- [ ] `python -m bandit -r app` sem achados críticos novos
- [ ] `python -m pytest -q` passando (integração se `TEST_DATABASE_URL` configurado)
- [ ] `cd frontend && npm run typecheck && npm run lint && npm run build`
- [ ] Documentação atualizada se mudar API, env vars ou fluxos
- [ ] Nenhum arquivo gerado (coverage, logs, `node_modules`, `.env`) incluído

## Testes

```bash
# Unitários (sem banco)
python -m pytest tests/unit -q

# Integração (requer Postgres de teste)
$env:TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/pulsar_test"
python -m pytest tests/integration -q
```

Detalhes: [tests/README.md](tests/README.md) e [docs/guides/testing.md](docs/guides/testing.md).

## Padrões de código

- Backend: `Decimal` para dinheiro, filtro por `user_id` em todas as mutações.
- Frontend: TypeScript estrito, componentes em `frontend/components/`, hooks em `frontend/lib/`.
- Não alterar contratos de API sem necessidade e sem atualizar testes/docs.

## Código de conduta

Este projeto segue o [Contributor Covenant](CODE_OF_CONDUCT.md). Comportamento inadequado pode ser reportado aos mantenedores.
