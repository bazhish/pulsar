# Security

## Escopo

Este documento descreve os controles defensivos atuais do Pulsar e o que precisa ser revisado antes de producao.

## Autenticacao

- Senhas usam bcrypt com custo configurado no backend.
- Senhas precisam ter no minimo 8 caracteres, letra maiuscula e numero.
- Senhas com mais de 72 bytes sao recusadas para evitar truncamento silencioso do bcrypt.
- Login por e-mail/senha tem limite por IP e por identificador de e-mail normalizado/hash.
- Mensagens de falha de login sao genericas e nao revelam se o e-mail existe.
- OAuth usa `state` com TTL e cookie HttpOnly para protecao contra login CSRF.
- Provedores sociais sem credenciais ficam desabilitados; secrets nunca sao hardcoded.

## JWT e sessoes

- Tokens tem `exp` e `iat`.
- Logout revoga o token no servidor usando hash SHA-256 do token, nunca o token puro.
- Troca de senha grava `password_changed_at` e invalida tokens emitidos antes dela.
- `JWT_SECRET_KEY` e obrigatoria e deve ter pelo menos 32 caracteres.

Limitacao atual: o frontend ainda usa `sessionStorage` para o JWT. Isso reduz persistencia entre abas/sessoes, mas continua exposto a XSS. A evolucao recomendada e migrar para cookie HttpOnly/Secure com estrategia CSRF explicita.

## Autorizacao e IDOR

- Rotas autenticadas usam o usuario extraido do token.
- Consultas e mutacoes filtram por `user_id`; IDs recebidos do cliente nao sao tratados como prova de propriedade.
- Recursos compostos, como cartao/categoria/transacao, sao buscados com `user_id` antes de atualizar/excluir.

## Headers, CORS e CSP

- API aplica `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` e `Content-Security-Policy`.
- Em producao, HSTS e aplicado.
- Respostas `/api/*` usam `Cache-Control: no-store`.
- `ALLOWED_ORIGINS` e validado em producao para evitar localhost.

## CSV e arquivos

- Upload CSV aceita apenas tipos esperados, limite de 1 MB e limite de 5000 linhas.
- CSV precisa ter cabecalho e linhas validas.
- Importacao gera previa e exige confirmacao antes de criar movimentacoes.
- Exportacao CSV usa separador `;`, BOM UTF-8 e neutraliza celulas iniciadas por `=`, `+`, `-` ou `@`.
- Foto de perfil aceita JPG, PNG e WebP com assinatura valida e tamanho maximo de 512 KB.

## Logs e dados sensiveis

- Logs de auditoria usam `email_hash`; nao registrar senha, token, CSV bruto ou secrets.
- Cada request recebe `X-Request-Id`.
- Erros internos sao logados no servidor, sem expor stack trace ao usuario.

## Configuracao e secrets

- **Nunca** commitar `.env`, `DATABASE_URL` real, `JWT_SECRET_KEY`, chaves OAuth ou `service_role` do Supabase.
- Use `.env.example` apenas com placeholders fictícios.
- Em produção, configure secrets no provedor (Railway, Render) ou **GitHub Actions Secrets** / **GitHub Environments** para CI — nunca no código.
- Antes de cada PR: `git diff` e busca por padrões `postgresql://`, `sk-`, `Bearer ey`, arquivos `.pem`/`.key`.
- Se um secret vazar no Git: remova do histórico, **rotacione imediatamente** no provedor e force novo login dos usuários se for `JWT_SECRET_KEY`.

### Rotação de secrets

| Secret | Efeito da rotação |
|--------|-------------------|
| `JWT_SECRET_KEY` | Todos os tokens atuais invalidam; usuários precisam entrar de novo |
| `DATABASE_URL` | Atualizar connection string no deploy; sem mudança de schema |
| OAuth client secret | Atualizar no console do provedor e nas env vars do backend |

### GitHub

- Ative **Dependabot alerts** e **secret scanning** (se disponível no repositório).
- Use branch protection com status checks obrigatórios (`test`, `security-scan`).
- Artefatos de CI (coverage, relatórios) ficam nos **Actions artifacts**, não no repositório.

## Pendencias recomendadas

- Migrar JWT do frontend para cookie HttpOnly/Secure com CSRF token ou double-submit.
- Adicionar MFA opcional.
- Usar Redis ou Postgres para estado OAuth em multi-replica.
- Criar rotina de limpeza de `revoked_tokens`, `login_failures_state` e sessoes CSV expiradas.
- Executar SAST/dependency audit no CI.
