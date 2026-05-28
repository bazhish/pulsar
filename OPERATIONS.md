# Operations

## Deploy

Railway:
1. Configure `DATABASE_URL`, `JWT_SECRET_KEY`, `ENVIRONMENT=production` e `ALLOWED_ORIGINS` com a URL HTTPS publica.
2. Rode `python migrate.py` uma vez ou deixe o startup aplicar migrations.
3. Use o comando `uvicorn main:app --host 0.0.0.0 --port $PORT`.

Render:
1. Crie um Web Service Python ou Docker.
2. Configure as mesmas variaveis obrigatorias.
3. Health check: `/api/health`.

## Desenvolvimento Local Com Docker

```bash
docker compose up
```

A API fica em `http://localhost:8000`.

## Testes

```bash
make test
make test-unit
make test-integration
```

Para integracao, defina `TEST_DATABASE_URL`.

## Migrations

```bash
python migrate.py
```

## Variaveis Obrigatorias

- `DATABASE_URL`: Postgres/Supabase connection string.
- `JWT_SECRET_KEY`: segredo com pelo menos 32 caracteres.
- `ALLOWED_ORIGINS`: origens permitidas para CORS em producao.
- `ENVIRONMENT`: `development`, `testing` ou `production`.
- `LOG_FORMAT`: `text` ou `json`.

## Logs JSON

Em producao:

```bash
LOG_FORMAT=json uvicorn main:app --host 0.0.0.0 --port 8000
```

Os logs incluem `timestamp`, `level`, `service`, `request_id` e `message`.

## Runbook

DB fora do ar:
- Verifique `/api/health`.
- Confirme `DATABASE_URL` e conectividade com o Postgres.
- O pool reconecta no proximo startup; reinicie o servico se o provedor derrubou conexoes antigas.

429 Too Many Requests:
- Login: 5 tentativas a cada 15 minutos.
- Cadastro: 3 tentativas por hora.
- Troca de senha: 3 tentativas por hora.
- Export CSV/PDF: 20 requisicoes por hora.
- PIN de cartao: bloqueio apos tentativas erradas dentro da janela configurada.

Token invalido:
- Peça para o usuario sair e entrar novamente.
- Em multiplos workers, use Redis para compartilhar a blocklist de tokens revogados.

## Monitoramento

Monitore `GET /api/health`. SLA sugerido: 99,5% mensal para o app e latencia de health check abaixo de 500 ms em condicoes normais.
