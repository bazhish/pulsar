from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_csrf_rejects_cookie_post_without_token():
    # Cookie-authenticated state change with no X-CSRF-Token is rejected by the
    # middleware before reaching the handler (so no DB is needed).
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/transactions",
            json={},
            cookies={"pulsa_access_token": "fake-session"},
        )
    assert response.status_code == 403
    assert "CSRF" in response.json()["detail"]


@pytest.mark.asyncio
async def test_csrf_rejects_on_mismatch():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/transactions",
            json={},
            headers={"X-CSRF-Token": "header-value"},
            cookies={"pulsa_access_token": "fake-session", "pulsa_csrf": "cookie-value"},
        )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_csrf_exempts_bearer_requests():
    # Bearer (API) clients cannot be driven cross-site, so CSRF does not apply.
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/transactions",
            json={},
            headers={"Authorization": "Bearer invalid-token"},
            cookies={"pulsa_access_token": "fake-session"},
        )
    # Passes CSRF (not 403); fails later at auth instead.
    assert response.status_code != 403
