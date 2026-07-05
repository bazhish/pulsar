# Deploy e ambientes

## Vercel (deploy primário)

Projeto único unificado: o frontend Next é servido como estático pela CDN da
Vercel e o FastAPI roda como **Python Serverless Function** (`api/index.py`), na
**mesma origem** — o cookie de sessão funciona sem CORS. Config em `vercel.json`.

### Pré-requisitos
- Banco no Supabase já provisionado (schema aplicado).
- **Aplicar a migration nova** `0008_lgpd.sql` (tabela `consents`): rode
  `python migrate.py` com `DATABASE_URL` de produção, ou cole o SQL no Supabase
  SQL Editor.
- **Criar bucket privado** `avatars` no Supabase Storage (Storage → New bucket,
  desmarque "Public").

### Import na Vercel
1. Vercel → Add New → Project → importe o repositório do GitHub.
2. Framework Preset: **Other** (o `vercel.json` controla os dois builds).
   Deixe Root Directory na raiz do repo.
3. Environment Variables:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | **Transaction Pooler** do Supabase (porta **6543**) |
| `JWT_SECRET_KEY` | segredo ≥ 32 chars (`python -c "import secrets;print(secrets.token_hex(32))"`) |
| `ENVIRONMENT` | `production` |
| `ALLOWED_ORIGINS` | vazio (mesma origem) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (nunca `PUBLIC_`) |
| `SUPABASE_AVATARS_BUCKET` | `avatars` |
| `NEXT_PUBLIC_API_BASE_URL` | vazio (mesma origem) |
| OAuth (opcional) | `OAUTH_REDIRECT_BASE_URL=https://<seu-dominio>`, `OAUTH_FRONTEND_CALLBACK_URL=https://<seu-dominio>/oauth/callback`, e as chaves dos provedores |

4. Deploy. `VERCEL=1` é definido automaticamente → conexão-por-request no pooler
   e storage no Supabase.

### Pós-deploy
- `GET /api/health/live` → `{"ok": true}` (liveness).
- `GET /api/health` → `{"ok": true, "db": "connected"}` (readiness com DB).
- Cadastro (com aceite) → login → transação → upload de avatar → exportar dados →
  excluir conta.
- Se o roteamento estático do Next apresentar deep-link 404, valide no **Preview**
  antes de promover; fallback: manter o container (Railway/Render/Docker) abaixo.

## Docker (recomendado para desenvolvimento)

```bash
docker compose build
docker compose up
```

- API: `http://localhost:8000`
- Health: `GET /api/health`

## Backend (Python)

```bash
python -m pip install -r requirements.txt
python migrate.py
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Frontend (Next.js)

```bash
cd frontend
npm ci
npm run build
```

Com origens separadas, defina `NEXT_PUBLIC_API_BASE_URL` apontando para a API.

## Variáveis obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL / Supabase |
| `JWT_SECRET_KEY` | Segredo com pelo menos 32 caracteres |

## Variáveis recomendadas

| Variável | Descrição |
|----------|-----------|
| `ALLOWED_ORIGINS` | Origens CORS (HTTPS em produção) |
| `ENVIRONMENT` | `development`, `testing` ou `production` |
| `LOG_FORMAT` | `text` ou `json` |

Consulte também [OAuth](oauth.md) para login social.

## Railway

### Pré-requisitos

- Conta no [Railway](https://railway.app)
- Banco PostgreSQL (Supabase ou Postgres do Railway)
- Repositório no GitHub

### Supabase (opcional)

1. Crie o projeto em [supabase.com](https://supabase.com)
2. Settings → Database → Connection string (URI)
3. Use a URI em `DATABASE_URL`

### Deploy

1. Railway → New Project → Deploy from GitHub repo
2. Variáveis:
   - `DATABASE_URL` — connection string
   - `JWT_SECRET_KEY` — gere com `python -c "import secrets; print(secrets.token_hex(32))"`
   - `ENVIRONMENT=production`
   - `ALLOWED_ORIGINS` — URL HTTPS pública (evite `*` após o primeiro deploy)
3. Comando: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Health check: `/api/health`

### Pós-deploy

- `GET /api/health` → `{"ok": true, "db": "connected"}`
- Criar conta de teste, login, transações, logout
- Confirmar HTTPS no navegador

### Manutenção

- `git push` dispara redeploy
- Logs: Railway → Deployments → View Logs

## Render

Use `render.yaml` como referência ou crie Web Service Docker/Python com as mesmas variáveis e health check `/api/health`.

## Checklist de segurança pré-produção

- [ ] `JWT_SECRET_KEY` com ≥ 32 caracteres, só em secrets do provedor
- [ ] `DATABASE_URL` nunca no repositório
- [ ] `.env` no `.gitignore`
- [ ] `ALLOWED_ORIGINS` restrito às origens reais
- [ ] Rate limit ativo em login e cadastro
- [ ] Senhas com bcrypt; `hashed_password` nunca nas respostas
- [ ] Rotas de dados exigem Bearer token e `user_id`
- [ ] Headers de segurança ativos
- [ ] Logs sem tokens, senhas ou PII desnecessária

## Workers e estado

Estado crítico (tokens revogados, imports CSV e endpoints legados de cartao) usa PostgreSQL quando disponível. O app está preparado para múltiplos workers; em escala, considere Redis para blocklist compartilhada.
