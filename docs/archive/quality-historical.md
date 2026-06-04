# Qualidade e Testes

Este projeto usa ferramentas simples de qualidade para manter a Fase 0 estavel sem alterar regra de negocio.

## Ruff

Rode a analise estatica:

```bash
python -m ruff check .
```

Para formatar arquivos Python quando necessario:

```bash
python -m ruff format app tests
```

## Bandit

Rode a varredura de seguranca do backend:

```bash
python -m bandit -r app
```

O CI tambem executa Bandit para detectar problemas comuns em codigo Python.

## Pytest

Rode todos os testes disponiveis:

```bash
python -m pytest -q
```

Para separar por tipo:

```bash
python -m pytest tests/unit -q
python -m pytest tests/integration -q
```

## TEST_DATABASE_URL

Os testes de integracao precisam de um PostgreSQL dedicado. Configure `TEST_DATABASE_URL` apontando para um banco de teste, nunca para producao:

```powershell
$env:TEST_DATABASE_URL="postgresql://ritmo:ritmo_test@localhost:5432/ritmo_test"
python -m pytest tests/integration -q
```

Com Docker Compose, voce pode usar um banco local e criar um database separado para testes, ou apontar para o Postgres de teste provisionado no CI.

## Por Que Testes Pulam Sem Banco

Quando `TEST_DATABASE_URL` nao esta configurado, os testes de integracao sao pulados de proposito. Isso evita que a suite apague ou altere dados de desenvolvimento, homologacao ou producao. Os testes unitarios continuam rodando sem banco externo.

## Guias Relacionados

- `docs/testing.md`: detalhes da suite automatizada do backend.
- `docs/csv-import.md`: formato aceito e fluxo da importacao CSV.
- `docs/data-sources.md`: arquitetura de origem de transacoes.
- `docs/frontend-next.md`: como rodar o frontend Next.js junto com o FastAPI.
