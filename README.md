<h1 align="center">Pulsa</h1>

<p align="center">
  <strong>finanças no ritmo certo</strong>
</p>

<p align="center">
  Assistente financeiro pessoal mobile first para acompanhar o pulso do seu mês: salário, despesas, metas, orçamento, parcelas, importação CSV e relatórios.
</p>

<p align="center">
  <a href=".github/workflows/ci.yml"><img src="https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" /></a>
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/Security-policy-blue?style=flat-square" alt="Security" /></a>
</p>

---

## Prévia

| Resumo do mês | Mobile |
|---------------|--------|
| *Adicione* `docs/assets/screenshots/summary.png` | *Adicione* `docs/assets/screenshots/mobile.png` |

Instruções para gerar screenshots: [docs/assets/README.md](docs/assets/README.md).

## Funcionalidades

- **Gasto diário** — “Quanto posso gastar hoje” com meta e ritmo do mês
- **Transações** — criar, editar, filtrar por categoria, forma de pagamento e origem
- **Metas diárias** — calendário visual e projeção
- **Orçamento** — por categoria, alertas e cópia do mês anterior
- **Parcelas** — simulação e projeção de compras parceladas
- **Reserva** — meta e saldo de emergência
- **Importação CSV** — mapeamento, prévia e deduplicação
- **Relatórios** — exportação CSV/PDF e resumo mensal
- **Autenticação** — e-mail/senha e OAuth opcional (Google, GitHub, Facebook)

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Backend | FastAPI, PostgreSQL, JWT, bcrypt, slowapi |
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Recharts |
| Infra | Docker, GitHub Actions, Railway / Render |
| Qualidade | pytest, ruff, bandit, ESLint, tsc |

## Arquitetura (resumo)

```text
pulsar/
├── app/              # API FastAPI (main.py + módulos core/shared/…)
├── frontend/         # Next.js App Router
├── migrations/       # SQL versionado
├── tests/            # unit/ + integration/
├── docs/             # documentação
└── main.py           # entrypoint uvicorn
```

Detalhes: [docs/architecture/overview.md](docs/architecture/overview.md).

## Quick start

```bash
cp .env.example .env
python -m pip install -r requirements.txt
python migrate.py
python -m uvicorn main:app --reload --port 8000
```

```bash
cd frontend && npm ci && npm run dev
```

Guia completo: [docs/guides/setup.md](docs/guides/setup.md).

### Variáveis principais

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET_KEY=sua-chave-secreta-com-pelo-menos-32-caracteres
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

OAuth (opcional): [docs/guides/oauth.md](docs/guides/oauth.md).

## Docker

```bash
docker compose build
docker compose up
```

Deploy: [docs/guides/deployment.md](docs/guides/deployment.md).

## Testes

```bash
python -m ruff check .
python -m bandit -r app
python -m pytest -q

cd frontend
npm ci
npm run typecheck
npm run lint
npm run build
```

Integração com Postgres: [tests/README.md](tests/README.md).

## Segurança e privacidade

- Senhas com bcrypt; rate limit em login; tokens revogáveis no servidor
- **Não** coletamos número completo de cartão, CVV ou senha bancária
- **Open Finance** — apenas preparação futura; sem conexão bancária real hoje
- Políticas: [SECURITY.md](SECURITY.md), [docs/security/security.md](docs/security/security.md), [docs/security/privacy.md](docs/security/privacy.md)

## Roadmap

- [x] Cookie HttpOnly para JWT e persistencia de sessao
- [ ] Modularização completa de rotas em `app/*`
- [ ] Screenshots oficiais no README
- [ ] Open Finance (quando houver provedor e compliance)

Roadmap visual: [docs/assets/roadmap.svg](docs/assets/roadmap.svg).

## Contribuir

Leia [CONTRIBUTING.md](CONTRIBUTING.md) e [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licença

[MIT](LICENSE) — Copyright (c) 2025 Pulsa Contributors.

## Limites atuais

- PDF gerado por utilitário simples interno
- `app/main.py` ainda concentra rotas legadas para compatibilidade
- Login social exige configuração de env vars e apps nos provedores

Documentação completa: **[docs/README.md](docs/README.md)**.
