# Privacy

## Dados tratados

O Pulsar trata dados de conta e dados financeiros informados pelo usuario:

- nome, e-mail, foto de perfil e preferencias;
- salario/base mensal, metas, orcamentos e reserva;
- movimentacoes, categorias, forma de pagamento, parcelas e observacoes;
- arquivos CSV apenas durante o fluxo de importacao.

## Finalidade

Os dados sao usados para organizar o mes financeiro, calcular resumo, metas, orcamento, alertas, importacao e relatorios.

## CSV

- O arquivo enviado nao deve ser salvo permanentemente.
- O backend cria uma sessao temporaria de importacao para previa, mapeamento e confirmacao.
- Movimentacoes so sao gravadas depois de confirmacao explicita.
- O usuario revisa duplicatas e erros antes de importar.

## Direitos LGPD

O produto deve permitir, no minimo:

- acesso aos dados da conta e movimentacoes;
- correcao de perfil e dados financeiros;
- exportacao de relatorios CSV/PDF;
- exclusao de dados mediante rotina administrativa ou endpoint futuro dedicado;
- revogacao de consentimento para recursos opcionais, como resumo mensal.

## Retencao

- Movimentacoes permanecem ate o usuario excluir ou solicitar remocao.
- Sessoes temporarias de importacao devem ser limpas periodicamente.
- Logs tecnicos devem ser retidos pelo menor periodo compativel com operacao e auditoria.

## Boas praticas operacionais

- Nao registrar tokens, senhas, CSV bruto ou dados financeiros detalhados em logs.
- Usar hash para identificadores em eventos de auditoria.
- Manter secrets fora do repositorio.
- Em producao, revisar subprocessadores: provedor de banco, hospedagem, e-mail e storage.
