# Incident Response

## Severidades

- P0: vazamento de senha, JWT secret, banco ou dados financeiros de varios usuarios.
- P1: acesso indevido a dados de um usuario, bypass de autenticacao ou IDOR confirmado.
- P2: XSS, CSV injection, brute force ativo ou falha de exportacao com dados indevidos.
- P3: alerta preventivo sem exploracao confirmada.

## Primeira hora

1. Preservar evidencias: logs, request IDs, deploy SHA, horarios e usuarios afetados.
2. Conter: pausar deploy, bloquear origem abusiva, revogar tokens ou rotacionar secrets.
3. Avaliar impacto: quais dados, quais usuarios, janela temporal e vetor provavel.
4. Registrar linha do tempo do incidente.

## Contencao tecnica

- JWT comprometido: rotacionar `JWT_SECRET_KEY` e forcar novo login.
- Token individual: inserir hash em `revoked_tokens`.
- Senha comprometida: trocar senha, gravar `password_changed_at` e avisar usuario.
- OAuth: revogar client secret no provedor, atualizar variaveis e validar callback/state.
- CSV/arquivo: remover arquivo temporario, invalidar sessao de importacao e revisar logs.
- IDOR: desabilitar rota vulneravel, corrigir filtro por `user_id`, adicionar teste regressivo.

## Comunicacao

- Informar usuarios afetados com linguagem clara: o que ocorreu, dados envolvidos, medidas tomadas e acoes recomendadas.
- Para incidentes LGPD relevantes, avaliar notificacao a ANPD e titulares conforme risco.
- Evitar especulacao; atualizar conforme fatos confirmados.

## Pos-incidente

- Criar teste automatizado para o vetor.
- Revisar logs para ausencia de dados sensiveis.
- Atualizar [checklist.md](checklist.md).
- Documentar causa raiz, correcao, dono e prazo.
