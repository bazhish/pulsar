# Login social (OAuth) - Pulsa

## Fluxo

1. O frontend chama `GET /api/auth/oauth/providers` para saber quais provedores estao habilitados.
2. O usuario clica em um provedor e e redirecionado para `GET /api/auth/oauth/{provider}/authorize`.
3. O backend gera um `state` anti-CSRF com TTL de 10 minutos, grava o mesmo valor em cookie HttpOnly `pulsar_oauth_state` e redireciona para o provedor.
4. O provedor retorna para `GET /api/auth/oauth/{provider}/callback?code=...&state=...`.
5. O backend troca o `code` por token do provedor, valida e-mail verificado, cria ou vincula o usuario e emite o JWT do Pulsa.
6. O backend grava o JWT em cookie HttpOnly `pulsa_access_token`, limpa o cookie de `state` e redireciona para `OAUTH_FRONTEND_CALLBACK_URL?session=1`.
7. A pagina `/oauth/callback` reconhece a sessao, grava apenas um indicativo local de sessao ativa e envia o usuario ao dashboard.

## Variaveis de ambiente

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `OAUTH_REDIRECT_BASE_URL` | Sim, para OAuth ativo | URL publica do backend. Ex.: `https://api.seudominio.com` |
| `OAUTH_FRONTEND_CALLBACK_URL` | Nao | URL de retorno no frontend. Ex.: `https://app.seudominio.com/oauth/callback` |
| `GOOGLE_CLIENT_ID` | Por provedor | Client ID do Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Por provedor | Client secret do Google |
| `GITHUB_CLIENT_ID` | Por provedor | OAuth App do GitHub |
| `GITHUB_CLIENT_SECRET` | Por provedor | Secret do GitHub |
| `FACEBOOK_CLIENT_ID` | Por provedor | App do Meta for Developers |
| `FACEBOOK_CLIENT_SECRET` | Por provedor | App secret do Facebook |

## Redirect URIs nos consoles dos provedores

Registrar exatamente:

- `{OAUTH_REDIRECT_BASE_URL}/api/auth/oauth/google/callback`
- `{OAUTH_REDIRECT_BASE_URL}/api/auth/oauth/github/callback`
- `{OAUTH_REDIRECT_BASE_URL}/api/auth/oauth/facebook/callback`

## Comportamento sem credenciais

- Login por e-mail/senha continua funcionando.
- Botoes sociais aparecem desabilitados quando o provedor nao esta configurado.
- `GET /api/auth/oauth/providers` retorna `enabled: false` para provedores incompletos.

## Facebook

O Facebook exige app em modo de desenvolvimento/testadores ou revisao para acesso amplo ao e-mail. Se o e-mail nao vier na resposta, o callback retorna erro claro. A estrutura do backend e frontend ja esta preparada.

## Seguranca

- Senhas de provedores sociais nao sao armazenadas.
- Usuarios OAuth recebem hash interno aleatorio, nao utilizavel para login manual.
- Contas existentes sao vinculadas por e-mail verificado.
- `state` invalida callbacks fora da janela ou com valor incorreto e precisa bater com cookie HttpOnly.
- O JWT nao volta para o frontend em URL; ele fica em cookie HttpOnly/SameSite.
- O armazenamento de `state` e em memoria; para multiplas replicas, usar sessao/cache compartilhado ou sticky sessions.
