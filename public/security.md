# Security Policy

## Medidas Implementadas

- Pydantic request models usam `extra = "forbid"` para reduzir mass assignment.
- Endpoints sensiveis validam posse por `user_id` antes de operar em cartoes, transacoes e dados financeiros.
- Login, cadastro, troca de senha e exportacoes possuem rate limiting.
- JWTs podem ser revogados em logout por blocklist em memoria.
- Middleware rejeita `Content-Type` inesperado em endpoints JSON.
- Headers de seguranca incluem CSP, `Permissions-Policy`, COOP, CORP, `nosniff`, `DENY` frame policy e referrer policy.
- Logs de auditoria registram eventos criticos em JSON sem senha, token, PIN ou e-mail em texto claro.
- Frontend centraliza escaping, formatacao monetaria, toast e fetch autenticado em `public/utils.js`.

## Threat Model Simplificado (STRIDE)

- Spoofing: autenticacao por JWT, senha com bcrypt e revogacao server-side no logout.
- Tampering: payloads rejeitam campos extras; queries usam parametros SQL.
- Repudiation: eventos criticos geram audit log com timestamp UTC e `user_id`.
- Information Disclosure: PINs e senhas nunca sao logados; e-mail em log usa hash truncado.
- Denial of Service: rate limits nos fluxos de login, cadastro, senha e exportacao.
- Elevation of Privilege: endpoints filtram dados por `user_id`; simulacao de faturas revalida posse do cartao.

## Responsible Disclosure

Reporte vulnerabilidades de forma privada ao mantenedor do repositorio. Inclua impacto, passos de reproducao e, quando possivel, payloads de teste sem dados reais. Nao exponha dados de terceiros nem publique detalhes antes da correcao estar disponivel.

## Observacoes Operacionais

A blocklist de JWT em memoria atende ao ambiente atual, mas deve ser movida para Redis ou outro armazenamento compartilhado em producao com multiplos workers. Logs de auditoria devem ir para uma ferramenta centralizada com retencao e controle de acesso.
