from __future__ import annotations

import os
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-local-tests-32chars")
os.environ.setdefault("ENVIRONMENT", "testing")

from app.main import app, limiter  # noqa: E402
from app.core.database import close_db_pool, db_cursor, init_db_pool  # noqa: E402

TEST_DB_URL = os.getenv("TEST_DATABASE_URL")
requires_db = pytest.mark.skipif(not TEST_DB_URL, reason="TEST_DATABASE_URL is not configured")


def reset_rate_limits() -> None:
    storage = getattr(getattr(limiter, "_limiter", None), "storage", None)
    if storage and hasattr(storage, "reset"):
        storage.reset()


@pytest_asyncio.fixture(scope="session")
async def test_app():
    if not TEST_DB_URL:
        pytest.skip("TEST_DATABASE_URL is not configured")
    os.environ["DATABASE_URL"] = TEST_DB_URL
    await app.router.startup()
    yield app
    await app.router.shutdown()
    close_db_pool()


@pytest_asyncio.fixture(scope="session")
async def client(test_app):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client


@pytest_asyncio.fixture(autouse=True)
async def clean_db():
    if not TEST_DB_URL:
        yield
        return
    os.environ["DATABASE_URL"] = TEST_DB_URL
    init_db_pool()
    reset_rate_limits()
    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s);
            DELETE FROM card_pins WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s);
            DELETE FROM cards WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s);
            DELETE FROM categories WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s);
            DELETE FROM settings WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s);
            DELETE FROM users WHERE email LIKE %s;
            """,
            ("%@example.test", "%@example.test", "%@example.test", "%@example.test", "%@example.test", "%@example.test"),
        )
    yield
    reset_rate_limits()
    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s);
            DELETE FROM card_pins WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s);
            DELETE FROM cards WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s);
            DELETE FROM categories WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s);
            DELETE FROM settings WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s);
            DELETE FROM users WHERE email LIKE %s;
            """,
            ("%@example.test", "%@example.test", "%@example.test", "%@example.test", "%@example.test", "%@example.test"),
        )


@pytest_asyncio.fixture
async def auth_headers(client):
    email = f"user-{uuid.uuid4().hex}@example.test"
    payload = {"name": "Teste", "email": email, "password": "Senha123"}
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 201, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def register_user(client, email: str | None = None) -> dict:
    email = email or f"user-{uuid.uuid4().hex}@example.test"
    payload = {"name": "Teste", "email": email, "password": "Senha123"}
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return {"email": email, "token": response.json()["access_token"]}
