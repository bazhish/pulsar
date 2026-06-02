# Open Finance Future

This directory is intentionally a placeholder for a future Open Finance or banking aggregator integration.

Current data sources are:

- `manual`: user-entered transactions.
- `csv_import`: transactions imported from user-provided CSV files.
- `open_finance_future`: reserved architecture value. No real bank connection is implemented yet.

Future integrations should implement `FinancialDataSource`, normalize data into `ImportedTransaction`, pass imported items through `TransactionNormalizer`, then persist with duplicate detection and user-scoped authorization.
