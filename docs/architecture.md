# Architecture

O backend preserva `app/main.py` como adaptador de compatibilidade, mas a estrutura profissional foi iniciada:

- `app/core`: config, logging, security, errors, database contracts.
- `app/shared`: dinheiro e datas.
- `app/integrations`: contratos de fontes financeiras futuras.
- `migrations`: migrations SQL versionadas.

Regras:

- Rotas devem continuar filtrando por `user_id`.
- Dinheiro usa `Decimal` no backend.
- Parcelas usam distribuicao por centavos para preservar soma exata.
- Estado critico usa PostgreSQL quando disponivel.
- `manual`, `csv_import` e `open_finance_future` permanecem como fontes validas.

Transicao:

- A separacao completa de `routes.py`, `service.py` e `repository.py` ainda e proximo passo.
- O adaptador monolitico evita quebrar contratos enquanto os modulos amadurecem.
