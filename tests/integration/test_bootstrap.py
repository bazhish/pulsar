from __future__ import annotations

import pytest

from tests.conftest import TEST_DB_URL

pytestmark = pytest.mark.skipif(not TEST_DB_URL, reason="TEST_DATABASE_URL is not configured")


@pytest.mark.asyncio
async def test_bootstrap_returns_complete_shape(client, auth_headers):
    response = await client.get("/api/bootstrap?month=2024-05", headers=auth_headers)
    assert response.status_code == 200, response.text
    data = response.json()
    for key in ["settings", "categories", "cards", "transactions", "dashboard", "score", "alerts", "user"]:
        assert key in data
