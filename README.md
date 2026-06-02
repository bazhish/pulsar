# Ritmo Financeiro Pro

Assistente financeiro pessoal mobile first com backend FastAPI, frontend Next.js + TypeScript e PostgreSQL/Supabase.

O produto organiza salario, entradas, saidas, cartoes, parcelas, metas diarias, orcamento mensal, reserva de emergencia, importacao CSV, relatórios e alertas.

## Stack

- Backend: FastAPI, psycopg2, JWT, bcrypt.
- Frontend: Next.js, TypeScript, Tailwind CSS, Recharts, lucide-react.
- Banco: PostgreSQL, compativel com Supabase via `DATABASE_URL`.
- Qualidade: pytest, ruff, bandit, typecheck, lint e build Next.
- Deploy: Docker, Railway ou Render.

## Funcionalidades

- Dashboard com "voce pode gastar hoje", ritmo do mes, previsao de fechamento e comparacao com mes anterior.
- Transacoes com criar, editar, excluir, buscar e filtrar por mes, tipo, categoria, forma de pagamento, origem e cartao.
- Metas diarias com calendario visual, media atual, permitido restante e projecao.
- Orcamento por categoria com progresso, alertas e copia do mes anterior.
- Reserva de emergencia mensal, meta total e saldo atual.
- Cartoes com limite, fatura, parcelas, simulacao futura e protecao de PIN.
- Importacao CSV com upload, mapeamento, previa, erros, duplicatas e source `csv_import`.
- Regras de categorizacao para importacoes futuras.
- Relatorios CSV/PDF e pagina de resumo mensal.
- Identidade visual propria com `frontend/public/logo.svg` e `frontend/public/logo-mark.svg`.

## Estrutura

- `app/main.py`: adaptador FastAPI atual, preservando rotas existentes.
- `app/core/`: configuracao, logging, seguranca e contratos de infraestrutura.
- `app/shared/`: utilitarios de dinheiro e datas.
- `app/integrations/`: contratos para fontes futuras, incluindo `open_finance_future`.
- `migrations/`: migrations versionadas idempotentes.
- `frontend/app/`: paginas Next.js.
- `frontend/components/`: layout e componentes reutilizaveis.
- `docs/`: documentacao de arquitetura, produto, API, banco, testes e deploy.

## Ambiente

Crie `.env` a partir de `.env.example`:

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET_KEY=sua-chave-secreta-com-pelo-menos-32-caracteres
ALLOWED_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

## Rodar backend

```bash
python -m pip install -r requirements.txt
python migrate.py
python -m uvicorn main:app --reload --port 8000
```

## Rodar frontend

```bash
cd frontend
npm install
npm run dev
```

Use `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` quando frontend e backend estiverem em origens diferentes.

## Docker

```bash
docker compose build
docker compose up
```

## Testes e qualidade

```bash
python -m ruff check .
python -m bandit -r app
python -m pytest -q

cd frontend
npm install
npm run typecheck
npm run lint
npm run build
```

Para testes de integracao com banco:

```bash
$env:TEST_DATABASE_URL="postgresql://ritmo:ritmo_test@localhost:5432/ritmo_test"
python -m pytest tests/integration -q
```

Sem `TEST_DATABASE_URL`, os testes de integracao sao pulados.

## Estado compartilhado

Logout, tentativas de PIN, sessoes de desbloqueio de cartao e sessoes de importacao CSV agora usam tabelas PostgreSQL quando o banco esta disponivel. O fallback em memoria existe apenas para testes/unitarios sem banco.

## Limites atuais

- `open_finance_future` e apenas preparacao arquitetural; nao ha conexao bancaria real.
- PDF usa gerador simples interno.
- A modularizacao esta em fase de compatibilidade: novas pastas existem, mas `app/main.py` ainda preserva rotas e contratos historicos.
