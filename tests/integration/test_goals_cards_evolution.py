from __future__ import annotations

import pytest

from tests.conftest import TEST_DB_URL

pytestmark = pytest.mark.skipif(not TEST_DB_URL, reason="TEST_DATABASE_URL is not configured")


@pytest.mark.asyncio
async def test_goals_return_budget_projection_and_risk_status(client, auth_headers):
    settings_response = await client.post(
        "/api/settings",
        headers=auth_headers,
        json={"monthlyIncome": 3000, "dailyGoal": 100, "reserveAmount": 300},
    )
    assert settings_response.status_code == 200, settings_response.text

    expense_response = await client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "title": "Mercado",
            "amount": 900,
            "type": "expense",
            "categoryId": None,
            "paymentMethod": "pix",
            "transactionDate": "2024-05-10",
            "notes": "",
            "cardId": None,
            "billingMonth": None,
            "isRecurring": False,
        },
    )
    assert expense_response.status_code == 200, expense_response.text

    response = await client.get("/api/goals?month=2024-05", headers=auth_headers)
    assert response.status_code == 200, response.text
    goals = response.json()
    assert goals["dailyGoal"] == 100
    assert goals["reserveAmount"] == 300
    assert goals["availableBudget"] == 2700
    assert goals["recommendedDailyGoal"] == 87.1
    assert goals["daysAboveGoal"] == 1
    assert goals["projectedClosing"] == 900
    assert goals["goalStatus"] == "green"


@pytest.mark.asyncio
async def test_cards_return_commitment_grouped_installments_and_purchase_simulation(client, auth_headers):
    category_response = await client.post(
        "/api/categories",
        headers=auth_headers,
        json={"name": "Eletronicos", "type": "expense", "color": "#90caf9", "icon": "E"},
    )
    assert category_response.status_code == 200, category_response.text
    category_id = category_response.json()["id"]

    card_response = await client.post(
        "/api/cards",
        headers=auth_headers,
        json={
            "name": "Controle",
            "brand": "Mastercard",
            "lastFour": "4321",
            "creditLimit": 1000,
            "closingDay": 5,
            "dueDay": 12,
            "color": "#222222",
        },
    )
    assert card_response.status_code == 200, card_response.text
    card_id = card_response.json()["id"]

    installments_response = await client.post(
        f"/api/cards/{card_id}/installments",
        headers=auth_headers,
        json={
            "title": "Celular",
            "categoryId": category_id,
            "totalAmount": 600,
            "totalInstallments": 6,
            "purchaseDate": "2024-05-01",
            "notes": "",
        },
    )
    assert installments_response.status_code == 200, installments_response.text

    cards_response = await client.get("/api/cards?month=2024-05", headers=auth_headers)
    assert cards_response.status_code == 200, cards_response.text
    card_summary = cards_response.json()[0]
    assert card_summary["invoice"] == 100
    assert card_summary["committedLimit"] == 600
    assert card_summary["remainingInstallments"] == 6

    simulation_response = await client.post(
        f"/api/cards/{card_id}/purchase-simulation",
        headers=auth_headers,
        json={"totalAmount": 100, "totalInstallments": 3, "purchaseDate": "2024-05-15", "months": 4},
    )
    assert simulation_response.status_code == 200, simulation_response.text
    simulation = simulation_response.json()
    assert simulation["installments"] == [33.33, 33.33, 33.34]
    assert simulation["projection"][0]["projectedTotal"] == 133.33
    assert simulation["projection"][2]["projectedTotal"] == 133.34
