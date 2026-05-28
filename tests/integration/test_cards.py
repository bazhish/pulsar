from __future__ import annotations

import pytest

from tests.conftest import TEST_DB_URL, register_user

pytestmark = pytest.mark.skipif(not TEST_DB_URL, reason="TEST_DATABASE_URL is not configured")


@pytest.mark.asyncio
async def test_idor_card_isolation(client):
    user_a = await register_user(client)
    user_b = await register_user(client)
    headers_a = {"Authorization": f"Bearer {user_a['token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['token']}"}
    response = await client.post(
        "/api/cards",
        headers=headers_a,
        json={
            "name": "Teste",
            "brand": "Visa",
            "lastFour": "1234",
            "creditLimit": 1000,
            "closingDay": 7,
            "dueDay": 14,
            "color": "#111111",
        },
    )
    assert response.status_code == 200, response.text
    card_id = response.json()["id"]
    response = await client.get(
        f"/api/cards/{card_id}/simulate-invoices",
        headers={**headers_b, "X-Card-Unlock-Token": "invalid"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_pin_rate_limiting(client):
    user = await register_user(client)
    headers = {"Authorization": f"Bearer {user['token']}"}
    response = await client.post(
        "/api/cards",
        headers=headers,
        json={
            "name": "Teste",
            "brand": "Visa",
            "lastFour": "1234",
            "creditLimit": 1000,
            "closingDay": 7,
            "dueDay": 14,
            "color": "#111111",
        },
    )
    card_id = response.json()["id"]
    response = await client.post(f"/api/cards/{card_id}/set-pin", headers=headers, json={"pin": "1234"})
    assert response.status_code == 200
    statuses = []
    for _ in range(5):
        response = await client.post(f"/api/cards/{card_id}/unlock", headers=headers, json={"pin": "9999"})
        statuses.append(response.status_code)
    assert 429 in statuses
