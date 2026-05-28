from __future__ import annotations

import uuid

import pytest

from tests.conftest import TEST_DB_URL, register_user

pytestmark = pytest.mark.skipif(not TEST_DB_URL, reason="TEST_DATABASE_URL is not configured")


@pytest.mark.asyncio
async def test_register_creates_user(client):
    email = f"new-{uuid.uuid4().hex}@example.test"
    response = await client.post("/api/auth/register", json={"name": "Teste", "email": email, "password": "Senha123"})
    assert response.status_code == 201
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    email = f"dupe-{uuid.uuid4().hex}@example.test"
    await register_user(client, email)
    response = await client.post("/api/auth/register", json={"name": "Teste", "email": email, "password": "Senha123"})
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_correct_credentials(client):
    user = await register_user(client)
    response = await client.post("/api/auth/login", data={"email": user["email"], "password": "Senha123"})
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    user = await register_user(client)
    response = await client.post("/api/auth/login", data={"email": user["email"], "password": "errada"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_rate_limit(client):
    user = await register_user(client)
    statuses = []
    for _ in range(6):
        response = await client.post("/api/auth/login", data={"email": user["email"], "password": "errada"})
        statuses.append(response.status_code)
    assert statuses[-1] == 429


@pytest.mark.asyncio
async def test_get_me_authenticated(client, auth_headers):
    response = await client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert "hashed_password" not in response.json()


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_invalidates_token(client, auth_headers):
    response = await client.post("/api/auth/logout", headers=auth_headers)
    assert response.status_code == 200
    response = await client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 401
