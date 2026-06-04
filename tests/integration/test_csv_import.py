from __future__ import annotations

import pytest

from tests.conftest import TEST_DB_URL

pytestmark = pytest.mark.skipif(not TEST_DB_URL, reason="TEST_DATABASE_URL is not configured")


CSV_CONTENT = "data;descricao;valor;tipo\n2024-05-01;Salario;3000;entrada\n02/05/2024;Mercado;-125,50;saida\n"


async def upload_preview_confirm(client, auth_headers):
    upload_response = await client.post(
        "/api/imports/csv/upload",
        headers=auth_headers,
        files={"file": ("extrato.csv", CSV_CONTENT.encode("utf-8"), "text/csv")},
    )
    assert upload_response.status_code == 200, upload_response.text
    upload = upload_response.json()
    assert upload["columns"] == ["data", "descricao", "valor", "tipo"]

    payload = {
        "importToken": upload["importToken"],
        "mapping": {"date": "data", "description": "descricao", "value": "valor", "type": "tipo"},
    }
    preview_response = await client.post("/api/imports/csv/preview", headers=auth_headers, json=payload)
    assert preview_response.status_code == 200, preview_response.text
    preview = preview_response.json()
    assert preview["validRows"] == 2
    assert preview["invalidRows"] == 0
    assert preview["duplicateRows"] == 0
    assert preview["preview"][1]["amount"] == 125.5
    assert preview["preview"][1]["type"] == "expense"

    confirm_response = await client.post("/api/imports/csv/confirm", headers=auth_headers, json=payload)
    assert confirm_response.status_code == 200, confirm_response.text
    return confirm_response.json()


@pytest.mark.asyncio
async def test_csv_import_creates_transactions_and_skips_duplicates(client, auth_headers):
    first_result = await upload_preview_confirm(client, auth_headers)
    assert first_result["imported"] == 2
    assert first_result["duplicates"] == 0
    assert {row["source"] for row in first_result["transactions"]} == {"csv_import"}
    assert all(row["duplicate_hash"] for row in first_result["transactions"])

    second_result = await upload_preview_confirm(client, auth_headers)
    assert second_result["imported"] == 0
    assert second_result["duplicates"] == 2


@pytest.mark.asyncio
async def test_csv_preview_reports_existing_duplicates_before_confirm(client, auth_headers):
    await upload_preview_confirm(client, auth_headers)

    upload_response = await client.post(
        "/api/imports/csv/upload",
        headers=auth_headers,
        files={"file": ("extrato.csv", CSV_CONTENT.encode("utf-8"), "text/csv")},
    )
    assert upload_response.status_code == 200, upload_response.text
    upload = upload_response.json()

    payload = {
        "importToken": upload["importToken"],
        "mapping": {"date": "data", "description": "descricao", "value": "valor", "type": "tipo"},
    }
    preview_response = await client.post("/api/imports/csv/preview", headers=auth_headers, json=payload)
    assert preview_response.status_code == 200, preview_response.text
    preview = preview_response.json()

    assert preview["validRows"] == 2
    assert preview["duplicateRows"] == 2
    assert len(preview["duplicates"]) == 2


@pytest.mark.asyncio
async def test_csv_import_rejects_wrong_extension(client, auth_headers):
    response = await client.post(
        "/api/imports/csv/upload",
        headers=auth_headers,
        files={"file": ("extrato.txt", CSV_CONTENT.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 400
