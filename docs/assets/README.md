# Assets de documentação

## Logo

- Marca no app: `frontend/public/logo.svg`, `frontend/public/logo-mark.svg`
- Não duplicar logos antigas nesta pasta sem necessidade

## Screenshots (placeholders)

Adicione capturas reais do produto para o README:

| Arquivo sugerido | Conteúdo |
|------------------|----------|
| `screenshots/summary.png` | Dashboard / resumo do mês |
| `screenshots/mobile.png` | Visão mobile (metas ou gasto diário) |

**Como gerar:** rode `npm run dev` no frontend e `uvicorn main:app` no backend, faça login com dados fictícios e exporte PNG (ferramenta do SO ou extensão). Não use dados financeiros reais.

## Roadmap

- `roadmap.svg` — diagrama de evolução do produto (legado renomeado de `ritmo_financeiro_roadmap.svg`)
