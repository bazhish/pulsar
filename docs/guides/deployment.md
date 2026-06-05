# Deploy e ambientes

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
