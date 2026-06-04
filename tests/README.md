# Testes

## Estrutura

```
tests/
  conftest.py          # Fixtures compartilhadas (cliente HTTP, auth, DB)
  unit/                # Sem banco obrigatório
  integration/         # Requer TEST_DATABASE_URL
```

## Comandos

```bash
# Todos (integração pulada sem TEST_DATABASE_URL)
python -m pytest -q

# Apenas unitários
python -m pytest tests/unit -q

# Integração
$env:TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/pulsar_test"
python -m pytest tests/integration -q
```

Makefile: `make test`, `make test-unit`, `make test-integration`.

## Variáveis

| Variável | Uso |
|----------|-----|
| `TEST_DATABASE_URL` | Postgres dedicado para testes de integração |
| `JWT_SECRET_KEY` | Definida automaticamente em `conftest.py` para testes |

Sem `TEST_DATABASE_URL`, testes em `tests/integration/` são **ignorados** (`pytestmark` skip).

## Qualidade adicional

```bash
python -m ruff check .
python -m bandit -r app
```

Frontend: `cd frontend && npm run typecheck && npm run lint && npm run build`.
