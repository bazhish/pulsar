# Política de segurança

## Reportar vulnerabilidades

**Não abra issue pública** para falhas de segurança.

1. Abra um [Security Advisory](https://github.com/bazhish/finance-dashboard/security/advisories/new) no GitHub, ou
2. Entre em contato com os mantenedores por canal privado acordado no repositório.

Inclua: descrição, passos para reproduzir, impacto estimado e versão/commit afetado.

Responderemos em até **72 horas** com confirmação de recebimento. Correções críticas têm prioridade.

## O que o Pulsar não coleta

- Número completo de cartão, CVV ou senha bancária
- Credenciais de internet banking
- Open Finance real (apenas preparação arquitetural futura)

## Boas práticas para contribuidores

- Nunca commitar `.env`, chaves, tokens ou dumps reais
- Usar `.env.example` apenas com valores fictícios
- Rodar `bandit` e revisar dependências antes do PR
- Rotacionar qualquer segredo que tenha sido exposto acidentalmente

Documentação detalhada: [docs/security/security.md](docs/security/security.md)
