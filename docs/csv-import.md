# CSV Import

Fluxo:

1. Upload em `POST /api/imports/csv/upload`.
2. API valida extensao, content-type e tamanho maximo de 1 MB.
3. API detecta colunas e retorna previa bruta.
4. Usuario mapeia data, descricao, valor e tipo opcional.
5. `POST /api/imports/csv/preview` valida linhas e mostra erros.
6. `POST /api/imports/csv/confirm` salva transacoes com `source = csv_import`.
7. `duplicate_hash` evita duplicatas por usuario, data, descricao normalizada e valor.

Sessoes:

- O arquivo original nao e persistido.
- Linhas parseadas ficam temporariamente em `csv_import_sessions_state`.
- Sessoes antigas sao removidas no cleanup.

Regras:

- `categorization_rules` aplica categoria e forma de pagamento quando o padrao aparece na descricao.
