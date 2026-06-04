# Scripts utilitários

Esta pasta é reservada para automações de manutenção (migrations auxiliares, seeds de desenvolvimento, export de schema).

Hoje os entrypoints principais ficam na raiz:

| Comando | Descrição |
|---------|-----------|
| `python migrate.py` | Aplica migrations SQL |
| `make run-dev` | Sobe API com reload |
| `docker compose up` | Stack API + Postgres |

Ao adicionar scripts aqui, documente uso e dependências no cabeçalho do arquivo e em [docs/guides/setup.md](../docs/guides/setup.md).
