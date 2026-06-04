from __future__ import annotations

import pytest

from tests.conftest import TEST_DB_URL

pytestmark = pytest.mark.skipif(not TEST_DB_URL, reason="TEST_DATABASE_URL is not configured")


async def _category_id(client, headers, name: str) -> int:
    response = await client.get("/api/bootstrap?month=2024-05", headers=headers)
    assert response.status_code == 200, response.text
    categories = response.json()["categories"]
    return next(category["id"] for category in categories if category["name"] == name)


async def _create_transaction(
    client,
    headers,
    *,
    title: str,
    amount: float,
    type_: str,
    category_id: int,
    payment_method: str,
    transaction_date: str,
    notes: str = "",
) -> None:
    response = await client.post(
        "/api/transactions",
        headers=headers,
        json={
            "title": title,
            "amount": amount,
            "type": type_,
            "categoryId": category_id,
            "paymentMethod": payment_method,
            "transactionDate": transaction_date,
            "notes": notes,
        },
    )
    assert response.status_code == 200, response.text


@pytest.mark.asyncio
async def test_csv_and_pdf_exports(client, auth_headers):
    no_history_response = await client.get("/api/reports?month=2024-05", headers=auth_headers)
    assert no_history_response.status_code == 200
    no_history_growth = no_history_response.json()["categoryGrowth"]
    assert no_history_growth["hasHistory"] is False
    assert no_history_growth["items"] == []

    income_category_id = await _category_id(client, auth_headers, "Sal\u00e1rio")
    food_category_id = await _category_id(client, auth_headers, "Alimenta\u00e7\u00e3o")
    leisure_category_id = await _category_id(client, auth_headers, "Lazer")

    await _create_transaction(
        client,
        auth_headers,
        title="Mercado abril",
        amount=100,
        type_="expense",
        category_id=food_category_id,
        payment_method="pix",
        transaction_date="2024-04-10",
    )
    await _create_transaction(
        client,
        auth_headers,
        title="Lazer abril",
        amount=50,
        type_="expense",
        category_id=leisure_category_id,
        payment_method="debit",
        transaction_date="2024-04-12",
    )
    await _create_transaction(
        client,
        auth_headers,
        title="Sal\u00e1rio maio",
        amount=3000,
        type_="income",
        category_id=income_category_id,
        payment_method="pix",
        transaction_date="2024-05-05",
    )
    await _create_transaction(
        client,
        auth_headers,
        title="Mercado maio",
        amount=150,
        type_="expense",
        category_id=food_category_id,
        payment_method="credit",
        transaction_date="2024-05-10",
        notes="Compra mensal",
    )
    await _create_transaction(
        client,
        auth_headers,
        title="Lazer maio",
        amount=25,
        type_="expense",
        category_id=leisure_category_id,
        payment_method="debit",
        transaction_date="2024-05-12",
    )

    report_response = await client.get("/api/reports?month=2024-05", headers=auth_headers)
    assert report_response.status_code == 200
    growth = report_response.json()["categoryGrowth"]
    assert growth["hasHistory"] is True
    growth_by_name = {item["name"]: item for item in growth["items"]}
    assert growth_by_name["Alimenta\u00e7\u00e3o"]["delta"] == 50
    assert growth_by_name["Alimenta\u00e7\u00e3o"]["percentChange"] == 50
    assert growth_by_name["Lazer"]["delta"] == -25
    assert growth_by_name["Lazer"]["percentChange"] == -50
    await _create_transaction(
        client,
        auth_headers,
        title="=Formula maio",
        amount=10,
        type_="expense",
        category_id=food_category_id,
        payment_method="pix",
        transaction_date="2024-05-20",
        notes="@nota sensivel",
    )

    csv_response = await client.get("/api/export/csv?month=2024-05", headers=auth_headers)
    assert csv_response.status_code == 200
    assert "text/csv" in csv_response.headers["content-type"]
    assert csv_response.headers["cache-control"] == "no-store"
    assert csv_response.content.startswith("\ufeff".encode())
    assert 'filename="pulsar-relatorio-2024-05.csv"' in csv_response.headers["content-disposition"]
    csv_text = csv_response.content.decode("utf-8-sig")
    assert csv_text.splitlines()[0] == (
        "Data;Tipo;Nome;Categoria;Forma de pagamento;Valor;Origem;Observa\u00e7\u00f5es;Parcela"
    )
    assert "2024-05-10;Despesa;Mercado maio;Alimenta\u00e7\u00e3o;Cr\u00e9dito;150,00;Manual;Compra mensal;" in csv_text
    assert "2024-05-20;Despesa;'=Formula maio;Alimenta\u00e7\u00e3o;PIX;10,00;Manual;'@nota sensivel;" in csv_text

    pdf_response = await client.get("/api/export/pdf?month=2024-05", headers=auth_headers)
    assert pdf_response.status_code == 200
    assert pdf_response.headers["cache-control"] == "no-store"
    assert 'filename="pulsar-relatorio-2024-05.pdf"' in pdf_response.headers["content-disposition"]
    assert pdf_response.content.startswith(b"%PDF")
    assert len(pdf_response.content) > 3000
    pdf_text = pdf_response.content.decode("latin-1", errors="ignore")
    for section in [
        "Pulsar",
        "Relat\u00f3rio dashboard",
        "Resumo mensal",
        "Categorias",
        "Crescimento por categoria",
        "Formas de pagamento",
        "Movimenta\u00e7\u00f5es",
        "Mercado maio",
    ]:
        assert section in pdf_text
