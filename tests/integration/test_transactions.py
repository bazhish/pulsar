from __future__ import annotations

import pytest

from tests.conftest import TEST_DB_URL

pytestmark = pytest.mark.skipif(not TEST_DB_URL, reason="TEST_DATABASE_URL is not configured")


@pytest.mark.asyncio
async def test_create_and_delete_transaction(client, auth_headers):
    payload = {
        "title": "Mercado",
        "amount": 120.5,
        "type": "expense",
        "categoryId": None,
        "paymentMethod": "pix",
        "transactionDate": "2024-05-10",
        "notes": "",
        "cardId": None,
        "billingMonth": None,
        "isRecurring": False,
    }
    response = await client.post("/api/transactions", headers=auth_headers, json=payload)
    assert response.status_code == 200, response.text
    transaction_id = response.json()["id"]
    response = await client.delete(f"/api/transactions/{transaction_id}", headers=auth_headers)
    assert response.status_code == 200
