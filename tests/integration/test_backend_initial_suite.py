from __future__ import annotations

import pytest

from tests.conftest import TEST_DB_URL, register_user

pytestmark = pytest.mark.skipif(not TEST_DB_URL, reason="TEST_DATABASE_URL is not configured")


@pytest.mark.asyncio
async def test_initial_backend_flow_and_user_isolation(client):
    user_a = await register_user(client)
    headers_a = {"Authorization": f"Bearer {user_a['token']}"}

    login_response = await client.post("/api/auth/login", data={"email": user_a["email"], "password": "Senha123"})
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()

    wrong_password_response = await client.post("/api/auth/login", data={"email": user_a["email"], "password": "errada"})
    assert wrong_password_response.status_code == 401

    category_response = await client.post(
        "/api/categories",
        headers=headers_a,
        json={"name": "Teste Fluxo", "type": "expense", "color": "#9be768", "icon": "T"},
    )
    assert category_response.status_code == 200, category_response.text
    category_id = category_response.json()["id"]

    income_response = await client.post(
        "/api/transactions",
        headers=headers_a,
        json={
            "title": "Entrada teste",
            "amount": 2500,
            "type": "income",
            "categoryId": None,
            "paymentMethod": "pix",
            "transactionDate": "2024-05-02",
            "notes": "",
            "cardId": None,
            "billingMonth": None,
            "isRecurring": False,
        },
    )
    assert income_response.status_code == 200, income_response.text
    assert income_response.json()["source"] == "manual"

    expense_response = await client.post(
        "/api/transactions",
        headers=headers_a,
        json={
            "title": "Saida teste",
            "amount": 120,
            "type": "expense",
            "categoryId": category_id,
            "paymentMethod": "pix",
            "transactionDate": "2024-05-03",
            "notes": "",
            "cardId": None,
            "billingMonth": None,
            "isRecurring": False,
        },
    )
    assert expense_response.status_code == 200, expense_response.text

    bootstrap_response = await client.get("/api/bootstrap?month=2024-05", headers=headers_a)
    assert bootstrap_response.status_code == 200, bootstrap_response.text
    bootstrap = bootstrap_response.json()
    assert bootstrap["dashboard"]["inflow"] == 2500
    assert bootstrap["dashboard"]["outflow"] == 120

    settings_response = await client.post(
        "/api/settings",
        headers=headers_a,
        json={"monthlyIncome": 6000, "dailyGoal": 150, "reserveAmount": 500},
    )
    assert settings_response.status_code == 200, settings_response.text
    assert settings_response.json()["monthly_income"] == 6000

    card_response = await client.post(
        "/api/cards",
        headers=headers_a,
        json={
            "name": "Cartao Teste",
            "brand": "Visa",
            "lastFour": "1234",
            "creditLimit": 2000,
            "closingDay": 7,
            "dueDay": 14,
            "color": "#111111",
        },
    )
    assert card_response.status_code == 200, card_response.text
    card_id = card_response.json()["id"]

    installments_response = await client.post(
        f"/api/cards/{card_id}/installments",
        headers=headers_a,
        json={
            "title": "Notebook",
            "categoryId": category_id,
            "totalAmount": 100,
            "totalInstallments": 3,
            "purchaseDate": "2024-05-10",
            "notes": "",
        },
    )
    assert installments_response.status_code == 200, installments_response.text
    rows = installments_response.json()["rows"]
    assert len(rows) == 3
    assert sum(row["amount"] for row in rows) == 100

    user_b = await register_user(client)
    headers_b = {"Authorization": f"Bearer {user_b['token']}"}
    isolated_response = await client.get("/api/bootstrap?month=2024-05", headers=headers_b)
    assert isolated_response.status_code == 200
    assert isolated_response.json()["transactions"] == []

    protected_response = await client.get("/api/bootstrap?month=2024-05")
    assert protected_response.status_code == 401
