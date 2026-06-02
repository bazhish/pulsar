# Frontend Next.js

O frontend atual fica em `frontend/`. A estrutura antiga em `public/` foi removida depois que a primeira versão Next.js ficou disponível.

Stack:

- Next.js
- TypeScript
- Tailwind CSS
- componentes reutilizáveis
- `lib/api.ts` para comunicação tipada com o FastAPI

## Rodar backend e frontend

Backend:

```powershell
$env:DATABASE_URL="postgresql://usuario:senha@localhost:5432/ritmo"
$env:JWT_SECRET_KEY="uma-chave-com-pelo-menos-32-caracteres"
python -m uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm install
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
npm run dev
```

Abrir:

```text
http://localhost:3000
```

## Migração gradual

1. Evoluir telas equivalentes em `frontend/app`.
2. Validar contratos em `frontend/lib/api.ts`.
3. Configurar deploy do frontend separado do backend FastAPI.
4. Remover rotas antigas apenas quando todas as telas Next.js cobrirem o fluxo equivalente.
5. Manter o FastAPI como API e evitar recriar regras financeiras no frontend.
