from __future__ import annotations

import pytest

from tests.conftest import TEST_DB_URL

pytestmark = pytest.mark.skipif(not TEST_DB_URL, reason="TEST_DATABASE_URL is not configured")


@pytest.mark.asyncio
async def test_csv_and_pdf_exports(client, auth_headers):
    csv_response = await client.get("/api/export/csv?month=2024-05", headers=auth_headers)
    assert csv_response.status_code == 200
    assert "text/csv" in csv_response.headers["content-type"]
    pdf_response = await client.get("/api/export/pdf?month=2024-05", headers=auth_headers)
    assert pdf_response.status_code == 200
    assert pdf_response.content.startswith(b"%PDF")
