# Configuração manual do repositório GitHub

Aplique no GitHub (Settings) após o push desta reorganização.

## About

- **Description:** Pulsar — assistente financeiro pessoal mobile first para salário, gastos, metas, orçamento, parcelas, importação CSV e relatórios.
- **Website:** URL de produção ou demo (se houver)
- **Topics:** `personal-finance`, `finance-dashboard`, `budgeting`, `fastapi`, `nextjs`, `typescript`, `postgresql`, `tailwindcss`, `fintech`, `open-source`

## Social preview

Settings → General → Social preview → upload imagem 1280×640 (logo + slogan).

## Branch protection (`main`)

- Require pull request before merging
- Require status checks: `test`, `security-scan`
- Require branches to be up to date
- Do not allow bypassing (exceto admins, se desejado)

## Merge

- Allow squash merge (recomendado)
- Automatically delete head branches

## Security

- Enable **Dependabot alerts** e **security updates**
- Enable **private vulnerability reporting** (se disponível)
- Adicionar `SECURITY.md` como policy (já na raiz)

## Secrets (Actions / deploy)

Nunca no código. Exemplos para CI/produção:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `TEST_DATABASE_URL` (CI — já injetado no workflow)
- OAuth: `GOOGLE_CLIENT_*`, `GITHUB_CLIENT_*`, `FACEBOOK_CLIENT_*`, `OAUTH_REDIRECT_BASE_URL`

## Labels sugeridos

`bug`, `enhancement`, `documentation`, `good first issue`, `security`, `dependencies`
