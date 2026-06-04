# Login social (OAuth) — Pulsar

## Fluxo

1. O frontend chama `GET /api/auth/oauth/providers` para saber quais provedores estão habilitados.
2. O usuário clica em um provedor e é redirecionado para `GET /api/auth/oauth/{provider}/authorize`.
3. O backend gera um `state` (anti-CSRF, TTL 10 min), grava o mesmo valor em cookie HttpOnly `pulsar_oauth_state` e redireciona para o provedor.
4. O provedor retorna para `GET /api/auth/oauth/{provider}/callback?code=...&state=...`.
5. O backend troca o `code` por token, valida e-mail verificado, cria ou vincula usuário e emite JWT do Pulsar.
6. O backend redireciona para `OAUTH_FRONTEND_CALLBACK_URL` (padrão: primeira origem de `ALLOWED_ORIGINS` + `/oauth/callback`) com o JWT no fragmento da URL.
7. A página `/oauth/callback` grava o token e envia o usuário ao dashboard.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `OAUTH_REDIRECT_BASE_URL` | Sim (para OAuth ativo) | URL pública do backend. Ex.: `https://api.seudominio.com` |
| `OAUTH_FRONTEND_CALLBACK_URL` | Não | URL de retorno no frontend. Ex.: `https://app.seudominio.com/oauth/callback` |
| `GOOGLE_CLIENT_ID` | Por provedor | Client ID do Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Por provedor | Client secret do Google |
| `GITHUB_CLIENT_ID` | Por provedor | OAuth App do GitHub |
| `GITHUB_CLIENT_SECRET` | Por provedor | Secret do GitHub |
| `FACEBOOK_CLIENT_ID` | Por provedor | App do Meta for Developers |
| `FACEBOOK_CLIENT_SECRET` | Por provedor | App secret do Facebook |

### Redirect URIs nos consoles dos provedores

Registrar exatamente:

- `{OAUTH_REDIRECT_BASE_URL}/api/auth/oauth/google/callback`
- `{OAUTH_REDIRECT_BASE_URL}/api/auth/oauth/github/callback`
- `{OAUTH_REDIRECT_BASE_URL}/api/auth/oauth/facebook/callback`

## Comportamento sem credenciais

- Login por e-mail/senha continua funcionando.
- Botões sociais aparecem desabilitados quando o provedor não está configurado.
- `GET /api/auth/oauth/providers` retorna `enabled: false` para provedores incompletos.

## Facebook

O Facebook exige app em modo de desenvolvimento/testadores ou revisão para acesso amplo ao e-mail. Se o e-mail não vier na resposta, o callback retorna erro claro. A estrutura do backend e frontend já está preparada.

## Segurança

- Senhas de provedores sociais **não** são armazenadas.
- Usuários OAuth recebem hash interno aleatório (não utilizável para login manual).
- Contas existentes são vinculadas por e-mail verificado.
- `state` invalida callbacks fora da janela ou com valor incorreto e precisa bater com cookie HttpOnly (proteção CSRF/login CSRF).
- O JWT volta para o frontend no fragmento `#access_token=...`, evitando query string em logs/referrers.
- O armazenamento de `state` é em memória; para múltiplas réplicas, usar sessão/cache compartilhado ou sticky sessions.
