# DataSource de transações

Cada transação agora pode declarar a origem dos dados.

Fontes suportadas:

- `manual`: lançamento criado diretamente pelo usuário
- `csv_import`: lançamento criado pela importação de extrato CSV
- `open_finance_future`: reservado para futura integração bancária

Campos novos em `transactions`:

- `source`
- `external_id`
- `imported_at`
- `raw_description`
- `duplicate_hash`

## Uso atual

Lançamentos manuais usam `source = "manual"`.

Importações CSV usam:

- `source = "csv_import"`
- `external_id = duplicate_hash`
- `imported_at = NOW()`
- `raw_description` com a descrição original do extrato
- `duplicate_hash` para deduplicação por usuário

## Caminho para Open Finance

A futura integração bancária pode inserir transações com:

- `source = "open_finance_future"`
- `external_id` vindo do provedor bancário
- `raw_description` preservando o texto original
- `duplicate_hash` para evitar colisão com importações anteriores

Essa camada evita acoplar regras financeiras ao canal de entrada dos dados.
