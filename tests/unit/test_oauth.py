from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_oauth_providers_without_credentials(monkeypatch):
    for name in (
        "OAUTH_REDIRECT_BASE_URL",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GITHUB_CLIENT_ID",
        "GITHUB_CLIENT_SECRET",
        "FACEBOOK_CLIENT_ID",
        "FACEBOOK_CLIENT_SECRET",
    ):
        monkeypatch.delenv(name, raising=False)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/auth/oauth/providers")
    assert response.status_code == 200
    payload = response.json()["providers"]
    for provider in ("google", "github", "facebook"):
        assert provider in payload
        assert payload[provider]["enabled"] is False


@pytest.mark.asyncio
async def test_oauth_authorize_unconfigured_returns_503(monkeypatch):
    for name in ("OAUTH_REDIRECT_BASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"):
        monkeypatch.delenv(name, raising=False)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/auth/oauth/google/authorize", follow_redirects=False)
    assert response.status_code == 503


@pytest.mark.asyncio
async def test_oauth_authorize_configured_sets_state_cookie(monkeypatch):
    monkeypatch.setenv("OAUTH_REDIRECT_BASE_URL", "http://test")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "google-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "google-secret")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/auth/oauth/google/authorize", follow_redirects=False)

    assert response.status_code == 302
    assert "https://accounts.google.com/o/oauth2/v2/auth" in response.headers["location"]
    assert "pulsar_oauth_state=" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]


@pytest.mark.asyncio
async def test_oauth_callback_invalid_state_redirects(monkeypatch):
    monkeypatch.setenv("OAUTH_FRONTEND_CALLBACK_URL", "http://frontend.test/oauth/callback")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/auth/oauth/google/callback?code=fake&state=invalid",
            follow_redirects=False,
        )
    assert response.status_code == 302
    assert "error=" in response.headers["location"]
    assert "pulsar_oauth_state=" in response.headers["set-cookie"]
