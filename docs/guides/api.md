# API

Todas as rotas privadas usam JWT Bearer.

Rotas principais:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `POST /api/auth/change-password`
- `POST /api/auth/logout`
- `GET /api/bootstrap?month=YYYY-MM`
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/{id}`
- `DELETE /api/transactions/{id}`
- `GET /api/goals`
- `GET /api/budgets`
- `POST /api/budgets`
- `POST /api/budgets/copy`
- `POST /api/installments/simulate`
- `POST /api/installments`
- `GET /api/installments/future`
- `POST /api/imports/csv/upload`
- `POST /api/imports/csv/preview`
- `POST /api/imports/csv/confirm`
- `GET /api/reports`
- `GET /api/export/csv`
- `GET /api/export/pdf`

Filtros de transacao:

- `month`
- `type`
- `categoryId`
- `paymentMethod`
- `source`
- `cardId`
- `search`

## Endpoints legados de cartão

Os endpoints abaixo permanecem por compatibilidade técnica e testes históricos, mas não fazem parte da experiência do usuário:

- `GET /api/cards`
- `POST /api/cards`
- `PUT /api/cards/{id}`
- `DELETE /api/cards/{id}`
- `POST /api/cards/{id}/installments`
- `POST /api/cards/{id}/purchase-simulation`

Novas telas devem usar `Parcelas` e os endpoints sem cadastro de cartão.
