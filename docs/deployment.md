# Deployment

Docker:

```bash
docker compose build
docker compose up
```

Python:

```bash
python migrate.py
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm run build
```

Variaveis obrigatorias:

- `DATABASE_URL`
- `JWT_SECRET_KEY`

Variaveis recomendadas:

- `ALLOWED_ORIGINS`
- `ENVIRONMENT=production`
- `LOG_FORMAT=json`

Workers:

- Estado critico foi movido para PostgreSQL quando disponivel.
- O app esta preparado para voltar a multiplos workers.
- Mantenha healthcheck em `/api/health`.
