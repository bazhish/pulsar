# Ritmo Financeiro Pro

Sistema full stack de controle financeiro pessoal com backend em FastAPI, frontend em Next.js + TypeScript e banco PostgreSQL. O projeto foi preparado para rodar localmente com Docker ou com Python direto, e pode usar PostgreSQL gerenciado no Supabase em producao.

## Stack

- Backend: FastAPI + Uvicorn.
- Banco de dados: PostgreSQL, incluindo Supabase via `DATABASE_URL`.
- Autenticacao: JWT Bearer com senhas e PINs protegidos por bcrypt.
- Frontend: Next.js + TypeScript + Tailwind CSS em `frontend/`.
- Deploy: Docker, Railway ou Render.
- Qualidade: pytest, ruff, bandit e cobertura via pytest-cov.

## Funcionalidades

- Dashboard mensal com salario base, entradas, saidas e saldo.
- Cadastro de lancamentos, categorias e formas de pagamento.
- Cartoes de credito com limite, fatura, PIN, parcelas e simulacao futura.
- Metas diarias por mes.
- Ritmo Score, alertas financeiros e graficos.
- Exportacao CSV/PDF.
- Perfil, troca de senha e preferencia de resumo mensal.

## Estrutura

- `main.py`: entrada do app para `uvicorn main:app`.
- `app/main.py`: aplicacao FastAPI atual, incluindo rotas, regras e acesso ao banco.
- `frontend/`: frontend Next.js + TypeScript.
- `migrate.py`: cria/atualiza o schema PostgreSQL usado pelo app.
- `tests/`: testes unitarios e de integracao.
- `Dockerfile` e `docker-compose.yml`: execucao containerizada.

## Variaveis de ambiente

Crie um `.env` local a partir de `.env.example`:

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET_KEY=sua-chave-secreta-com-pelo-menos-32-caracteres
ALLOWED_ORIGINS=http://localhost:8000
ENVIRONMENT=development
```

Em producao, use uma `JWT_SECRET_KEY` forte e mantenha `DATABASE_URL` fora do codigo.
Quando o frontend e a API rodam no mesmo dominio, `ALLOWED_ORIGINS` pode ficar vazio.
Configure `ALLOWED_ORIGINS` apenas se precisar permitir chamadas de outro dominio HTTPS.

## Como rodar localmente com Docker

```bash
docker compose up
```

A API fica em:

```bash
http://localhost:8000
```

O `docker-compose.yml` sobe um PostgreSQL local e aponta `DATABASE_URL` para esse banco.

## Como rodar localmente com Python

Instale as dependencias:

```bash
python -m pip install -r requirements.txt
```

Configure `DATABASE_URL` para um PostgreSQL local ou Supabase. Depois rode:

```bash
python migrate.py
python -m uvicorn main:app --reload --port 8000
```

Abra a API:

```bash
http://127.0.0.1:8000
```

## Como rodar o frontend Next.js

```bash
cd frontend
npm install
npm run dev
```

Configure `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` quando o backend estiver em outra origem. Sem essa variavel, o frontend usa a mesma origem da pagina, que e o modo usado no Docker/Railway.

```bash
http://localhost:3000
```

No deploy Docker, o build gera `frontend/out` e o FastAPI serve o frontend exportado na rota `/`.

## Como rodar testes

Unitarios e smoke tests sem banco externo:

```bash
python -m pytest -q
```

Integracao com PostgreSQL:

```bash
$env:TEST_DATABASE_URL="postgresql://ritmo:ritmo_test@localhost:5432/ritmo_test"
python -m pytest tests/integration -q
```

Sem `TEST_DATABASE_URL`, os testes de integracao sao pulados de proposito para nao usar banco de desenvolvimento ou producao por acidente.

Qualidade e seguranca:

```bash
python -m ruff check .
python -m bandit -r app
```

Mais detalhes estao em `docs/quality.md`.

## Rotas principais da API

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/bootstrap?month=2026-03`
- `GET /api/goals?month=2026-03`
- `POST /api/settings`
- `POST /api/categories`
- `POST /api/transactions`
- `POST /api/cards`
- `POST /api/cards/{id}/installments`
- `DELETE /api/transactions/{id}`

## Observacao operacional

O container de producao roda temporariamente com apenas 1 worker. O app ainda usa estado em memoria para logout, tentativas de PIN e desbloqueio temporario de cartao; multiplos workers podem causar inconsistencia enquanto esse estado nao for movido para Redis, banco ou outro armazenamento compartilhado.
