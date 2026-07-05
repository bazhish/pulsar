# Privacy

## Dados tratados

O Pulsa trata dados de conta e dados financeiros informados pelo usuario:

- nome, e-mail, foto de perfil e preferencias;
- salario/base mensal, metas, orcamentos e reserva;
- movimentacoes, categorias, forma de pagamento, parcelas e observacoes;
- arquivos CSV apenas durante o fluxo de importacao.

## Finalidade

Os dados sao usados para organizar o mes financeiro, calcular resumo, metas, orcamento, alertas, importacao e relatorios.

## Fotos de perfil

Armazenadas em bucket privado do Supabase Storage (ou disco local em desenvolvimento), servidas
por URL assinada de curta duracao — nunca publicas. Removidas na exclusao de conta.

## CSV

- O arquivo enviado nao deve ser salvo permanentemente.
- O backend cria uma sessao temporaria de importacao para previa, mapeamento e confirmacao.
- Movimentacoes so sao gravadas depois de confirmacao explicita.
- O usuario revisa duplicatas e erros antes de importar.

## Direitos LGPD (Art. 18) — implementados

- **Acesso e portabilidade:** `GET /api/privacy/export` retorna todos os dados do titular em JSON
  (perfil, settings, transacoes, cartoes, orcamentos, metas, regras, consentimentos). UI em Perfil.
- **Correcao:** edicao de perfil e dados financeiros a qualquer momento.
- **Eliminacao (Art. 18, IV):** `DELETE /api/auth/me` — exige reautenticacao por senha; as FKs
  `ON DELETE CASCADE` removem todos os dados vinculados; a foto e removida do storage e os tokens
  sao revogados. UI em Perfil.
- **Consentimento (Arts. 7/8):** aceite obrigatorio da politica no cadastro (tabela `consents`,
  ledger append-only com versao da politica e hash de IP); revogacao de recursos opcionais
  (resumo mensal) via `POST /api/privacy/consent`.
- **Exportacao de relatorios:** CSV/PDF por mes (alem do export completo acima).

## Encarregado (DPO)

Contato do titular para exercicio de direitos: **privacidade@pulsa.app**. Versao vigente da
politica exposta em `/privacidade` (frontend) e em `app/privacy/service.py` (`POLICY_VERSION`).

## Retencao

- Movimentacoes permanecem ate o usuario excluir ou solicitar remocao.
- Sessoes temporarias de importacao devem ser limpas periodicamente.
- Logs tecnicos devem ser retidos pelo menor periodo compativel com operacao e auditoria.

## Boas praticas operacionais

- Nao registrar tokens, senhas, CSV bruto ou dados financeiros detalhados em logs.
- Usar hash para identificadores em eventos de auditoria.
- Manter secrets fora do repositorio.
- Em producao, revisar subprocessadores: provedor de banco, hospedagem, e-mail e storage.
