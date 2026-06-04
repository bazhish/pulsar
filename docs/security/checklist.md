# Security Checklist

## Antes de producao

- [ ] `DATABASE_URL` aponta para banco privado, com TLS quando aplicavel.
- [ ] `JWT_SECRET_KEY` tem pelo menos 32 caracteres e esta em secret manager.
- [ ] `ALLOWED_ORIGINS` contem apenas origens HTTPS publicas do app.
- [ ] `ENVIRONMENT=production`.
- [ ] OAuth usa redirect URIs HTTPS exatos nos provedores.
- [ ] Secrets OAuth estao configurados por ambiente, sem commit no repositorio.
- [ ] Backups do banco estao ativos e testados.
- [ ] RLS Supabase revisado se o banco for acessado fora do backend.

## Autenticacao

- [x] Hash bcrypt para senhas.
- [x] Validacao de forca e limite de 72 bytes.
- [x] Rate limit por IP.
- [x] Rate limit por identificador de login.
- [x] Logout com revogacao por hash do token.
- [x] Troca de senha invalida tokens antigos.
- [ ] MFA opcional.
- [ ] Migrar JWT do frontend para cookie HttpOnly/Secure com CSRF.

## Autorizacao

- [x] Rotas usam `current_user`.
- [x] Consultas filtram por `user_id`.
- [x] Testes de IDOR devem cobrir leitura, atualizacao e exclusao.
- [ ] Revisar novas rotas no checklist antes de merge.

## Entrada e arquivos

- [x] JSON/form content type validado.
- [x] CSV com tipo/tamanho/cabecalho/linhas validado.
- [x] Foto de perfil com tipo, assinatura e tamanho validados.
- [ ] Antivirus/storage scan para arquivos se houver storage externo.

## Saida e exports

- [x] CSV com BOM UTF-8 e separador pt-BR.
- [x] CSV neutraliza formula injection.
- [x] PDF/CSV usam `Cache-Control: no-store`.
- [ ] Revisar se observacoes financeiras devem aparecer em exports compartilhados.

## Headers e navegador

- [x] CSP aplicada no backend.
- [x] Anti-clickjacking (`X-Frame-Options` e `frame-ancestors`).
- [x] `Referrer-Policy` e `Permissions-Policy`.
- [x] HSTS em producao.
- [ ] Remover `unsafe-inline` quando o frontend permitir nonce/hash.

## CI

- [ ] `python -m pytest -q`.
- [ ] `python -m ruff check .`.
- [ ] `python -m bandit -r app`.
- [ ] `python -m pip_audit` quando instalado.
- [ ] `python -m safety check` quando instalado.
- [ ] `npm audit`.
- [ ] `cd frontend && npm run typecheck && npm run lint && npm run build`.
