# Open Finance Future

Nao ha integracao bancaria real neste projeto.

Preparacao atual:

- `app/integrations/base.py`
- `app/integrations/normalizer.py`
- `app/integrations/open_finance/README.md`
- Valor de source `open_finance_future`

Fluxo futuro recomendado:

1. Conectar provedor regulado ou agregador.
2. Buscar transacoes por usuario autorizado.
3. Normalizar para `ImportedTransaction`.
4. Aplicar `TransactionNormalizer`.
5. Deduplicar.
6. Salvar com `source = open_finance_future`.
7. Permitir revisao do usuario antes de misturar com dados manuais.
