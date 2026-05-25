
from __future__ import annotations

import csv
import io
import os
import re
import secrets
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Literal, Optional
from uuid import UUID

import psycopg2
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Form, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from passlib.context import CryptContext
from psycopg2 import errors
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import Response

from migrate import run_migrations

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
CARD_UNLOCK_SECONDS = 15 * 60
PIN_FAILURE_WINDOW_SECONDS = 5 * 60
PIN_MAX_ATTEMPTS = 3
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

password_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
    bcrypt__truncate_error=True,
)
pin_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=10,
    bcrypt__truncate_error=True,
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
limiter = Limiter(key_func=get_remote_address)
db_pool: Optional[ThreadedConnectionPool] = None
card_pin_failures: dict[str, dict[str, Any]] = {}
card_unlock_sessions: dict[str, dict[str, Any]] = {}

# Used so login performs a bcrypt verification even when the email does not exist.
DUMMY_PASSWORD_HASH = password_context.hash("DummyPassword1")

DEFAULT_CATEGORIES: list[tuple[str, str, str, str, int]] = [
    ("Sal\u00e1rio", "income", "#9be768", "\U0001f4bc", 1),
    ("Freelance", "income", "#b8b8ff", "\U0001f9e0", 1),
    ("Investimentos", "income", "#7cd992", "\U0001f4c8", 1),
    ("Moradia", "expense", "#ff8a80", "\U0001f3e0", 1),
    ("Alimenta\u00e7\u00e3o", "expense", "#ffd54f", "\U0001f37d\ufe0f", 1),
    ("Mercado", "expense", "#ffcc80", "\U0001f6d2", 1),
    ("Transporte", "expense", "#90caf9", "\U0001f68c", 1),
    ("Sa\u00fade", "expense", "#ef9a9a", "\U0001f48a", 1),
    ("Educa\u00e7\u00e3o", "expense", "#ce93d8", "\U0001f4da", 1),
    ("Assinaturas", "expense", "#80cbc4", "\U0001f4fa", 1),
    ("Lazer", "expense", "#f48fb1", "\U0001f3ae", 1),
    ("Contas", "expense", "#b0bec5", "\U0001f4a1", 1),
    ("Reserva", "expense", "#aed581", "\U0001f4b0", 1),
    ("Pets", "expense", "#bcaaa4", "\U0001f436", 1),
    ("Presentes", "expense", "#ffab91", "\U0001f381", 1),
    ("Outros", "expense", "#cfd8dc", "\U0001f4cc", 1),
]


def parse_allowed_origins() -> list[str]:
    raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:8000")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip() and origin.strip() != "*"]
    return origins or ["http://localhost:8000"]


app = FastAPI(title="Ritmo Financeiro Pro", version="2.0.0")
app.state.limiter = limiter


def rate_limit_handler(request: Request, exc: Exception) -> Response:
    if isinstance(exc, RateLimitExceeded):
        return _rate_limit_exceeded_handler(request, exc)
    raise exc


app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Card-Unlock-Token"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'"
    )
    return response


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL precisa estar definida.")
    return database_url


def get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY", "")
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET_KEY precisa ter pelo menos 32 caracteres.")
    return secret


def validate_runtime_config() -> None:
    get_database_url()
    get_jwt_secret()
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        origins = parse_allowed_origins()
        if any("localhost" in origin or "127.0.0.1" in origin for origin in origins):
            raise RuntimeError("ALLOWED_ORIGINS de produ\u00e7\u00e3o n\u00e3o deve apontar para localhost.")


def init_db_pool() -> None:
    global db_pool
    if db_pool is not None:
        return
    db_pool = ThreadedConnectionPool(minconn=2, maxconn=10, dsn=get_database_url())


def close_db_pool() -> None:
    global db_pool
    if db_pool is not None:
        db_pool.closeall()
        db_pool = None


def get_connection():
    if db_pool is None:
        raise HTTPException(status_code=503, detail="Banco de dados ainda n\u00e3o inicializado.")
    return db_pool.getconn()


def release_connection(conn) -> None:
    if db_pool is not None:
        db_pool.putconn(conn)


@contextmanager
def db_cursor(commit: bool = False):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            yield cursor
        if commit:
            conn.commit()
    except Exception:
        if commit:
            conn.rollback()
        raise
    finally:
        release_connection(conn)


@app.on_event("startup")
def startup() -> None:
    validate_runtime_config()
    init_db_pool()
    conn = get_connection()
    try:
        run_migrations(conn)
    finally:
        release_connection(conn)


@app.on_event("shutdown")
def shutdown() -> None:
    close_db_pool()


def pad(value: int) -> str:
    return str(value).zfill(2)


def month_key_from_date(date_str: str) -> str:
    return date_str[:7]


def add_months(month_key: str, offset: int) -> str:
    year, month = [int(part) for part in month_key.split("-")]
    total_month = (year * 12 + (month - 1)) + offset
    new_year = total_month // 12
    new_month = total_month % 12 + 1
    return f"{new_year}-{pad(new_month)}"


def format_month_label(month_key: str) -> str:
    names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    year, month = [int(part) for part in month_key.split("-")]
    return f"{names[month - 1]}/{str(year)[2:]}"


def get_current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def get_month_range(month_key: str) -> tuple[str, str]:
    year, month = [int(part) for part in month_key.split("-")]
    if month == 12:
        next_year, next_month = year + 1, 1
    else:
        next_year, next_month = year, month + 1

    start = date(year, month, 1)
    end = date(next_year, next_month, 1) - timedelta(days=1)
    return start.isoformat(), end.isoformat()


def serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def normalize_row(row: Any | None) -> Optional[dict]:
    if row is None:
        return None
    return {key: serialize_value(value) for key, value in dict(row).items()}


def normalize_rows(rows: list[Any]) -> list[dict]:
    return [normalize_row(row) or {} for row in rows]


def require_row(row: Optional[dict], detail: str = "Registro n\u00e3o encontrado.") -> dict:
    if row is None:
        raise HTTPException(status_code=500, detail=detail)
    return row


def clean_text(value: str, field_name: str, max_length: int, required: bool = True) -> str:
    cleaned = value.strip()
    if required and not cleaned:
        raise HTTPException(status_code=400, detail=f"{field_name} \u00e9 obrigat\u00f3rio.")
    if len(cleaned) > max_length:
        raise HTTPException(status_code=400, detail=f"{field_name} excede o tamanho permitido.")
    return cleaned


def validate_date_text(value: str, field_name: str) -> str:
    cleaned = clean_text(value, field_name, 10)
    try:
        datetime.strptime(cleaned, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail=f"{field_name} inv\u00e1lida.")
    return cleaned


def validate_month_text(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = clean_text(value, "M\u00eas", 7)
    try:
        datetime.strptime(cleaned, "%Y-%m")
    except ValueError:
        raise HTTPException(status_code=400, detail="M\u00eas inv\u00e1lido.")
    return cleaned


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if len(email) > 255 or not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="E-mail inv\u00e1lido.")
    return email


def validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 8 caracteres.")
    if len(password) > 72:
        raise HTTPException(status_code=400, detail="A senha excede o tamanho permitido.")
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="A senha n\u00e3o pode exceder 72 bytes.")
    if not any(char.isdigit() for char in password):
        raise HTTPException(status_code=400, detail="A senha deve conter pelo menos 1 n\u00famero.")
    if not any(char.isupper() for char in password):
        raise HTTPException(status_code=400, detail="A senha deve conter pelo menos 1 letra mai\u00fascula.")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return bool(password_context.verify(password, hashed_password))


def validate_pin(pin: str) -> str:
    cleaned = pin.strip()
    if not cleaned.isdigit() or not 4 <= len(cleaned) <= 6:
        raise HTTPException(status_code=400, detail="PIN deve conter de 4 a 6 d\u00edgitos num\u00e9ricos.")
    return cleaned


def hash_pin(pin: str) -> str:
    return pin_context.hash(pin)


def verify_pin(pin: str, pin_hash: str) -> bool:
    return bool(pin_context.verify(pin, pin_hash))


def create_access_token(user_id: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "exp": int(expires_at.timestamp())}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def public_user(user: dict) -> dict:
    return {
        "id": str(user["id"]),
        "email": user["email"],
        "name": user["name"],
        "avatar_url": user.get("avatar_url"),
        "send_monthly_summary": bool(user.get("send_monthly_summary", False)),
        "is_active": bool(user["is_active"]),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
    }


def get_user_by_email(email: str) -> Optional[dict]:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, email, hashed_password, name, avatar_url, send_monthly_summary, is_active, created_at, updated_at
            FROM users
            WHERE email = %s
            """,
            (email,),
        )
        return normalize_row(cursor.fetchone())


def get_user_by_id(user_id: str) -> Optional[dict]:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, email, hashed_password, name, avatar_url, send_monthly_summary, is_active, created_at, updated_at
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        )
        return normalize_row(cursor.fetchone())


def ensure_user_defaults_for_cursor(cursor, user_id: str) -> None:
    cursor.execute(
        """
        INSERT INTO settings (id, user_id, monthly_income, daily_goal, currency)
        VALUES (1, %s, 5500, 120, 'BRL')
        ON CONFLICT (user_id, id) DO NOTHING
        """,
        (user_id,),
    )
    cursor.executemany(
        """
        INSERT INTO categories (user_id, name, type, color, icon, is_default)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id, name) DO NOTHING
        """,
        [(user_id, name, type_name, color, icon, is_default) for name, type_name, color, icon, is_default in DEFAULT_CATEGORIES],
    )


def ensure_user_defaults(user_id: str) -> None:
    with db_cursor(commit=True) as cursor:
        ensure_user_defaults_for_cursor(cursor, user_id)


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inv\u00e1lido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        subject = payload.get("sub")
        if not subject:
            raise credentials_error
        user_uuid = UUID(str(subject))
    except (JWTError, ValueError):
        raise credentials_error

    user = get_user_by_id(str(user_uuid))
    if not user or not user["is_active"]:
        raise credentials_error
    return public_user(user)


def get_settings(user_id: str) -> dict:
    with db_cursor() as cursor:
        cursor.execute("SELECT * FROM settings WHERE user_id = %s AND id = 1", (user_id,))
        row = normalize_row(cursor.fetchone())
    if row:
        return row

    ensure_user_defaults(user_id)
    with db_cursor() as cursor:
        cursor.execute("SELECT * FROM settings WHERE user_id = %s AND id = 1", (user_id,))
        row = normalize_row(cursor.fetchone())
    if not row:
        raise HTTPException(status_code=500, detail="Configura\u00e7\u00f5es n\u00e3o encontradas.")
    return row


def list_categories(user_id: str) -> list[dict]:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT *
            FROM categories
            WHERE user_id = %s
            ORDER BY type ASC, name ASC
            """,
            (user_id,),
        )
        return normalize_rows(cursor.fetchall())


def list_cards(user_id: str) -> list[dict]:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT *
            FROM cards
            WHERE user_id = %s
            ORDER BY created_at ASC, id ASC
            """,
            (user_id,),
        )
        return normalize_rows(cursor.fetchall())


def list_transactions(user_id: str, month: Optional[str] = None) -> list[dict]:
    if month:
        query = """
            SELECT t.*, c.name AS category_name, c.color AS category_color, cards.name AS card_name
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
            LEFT JOIN cards ON cards.id = t.card_id AND cards.user_id = t.user_id
            WHERE t.user_id = %s
              AND COALESCE(t.billing_month, substring(t.transaction_date from 1 for 7)) = %s
            ORDER BY t.transaction_date DESC, t.id DESC
            LIMIT 100
        """
        params = (user_id, month)
    else:
        query = """
            SELECT t.*, c.name AS category_name, c.color AS category_color, cards.name AS card_name
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
            LEFT JOIN cards ON cards.id = t.card_id AND cards.user_id = t.user_id
            WHERE t.user_id = %s
            ORDER BY t.transaction_date DESC, t.id DESC
            LIMIT 100
        """
        params = (user_id,)

    with db_cursor() as cursor:
        cursor.execute(query, params)
        return normalize_rows(cursor.fetchall())


def get_cards_summary(user_id: str, month: str) -> list[dict]:
    cards = list_cards(user_id)
    result: list[dict] = []

    with db_cursor() as cursor:
        for card in cards:
            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM transactions
                WHERE user_id = %s
                  AND type = 'expense'
                  AND card_id = %s
                  AND COALESCE(billing_month, substring(transaction_date from 1 for 7)) = %s
                """,
                (user_id, card["id"], month),
            )
            invoice_row = require_row(normalize_row(cursor.fetchone()), "Resumo do cart\u00e3o n\u00e3o encontrado.")
            invoice = float(invoice_row["total"])

            cursor.execute(
                """
                SELECT installment_group
                FROM transactions
                WHERE user_id = %s
                  AND card_id = %s
                  AND installment_group IS NOT NULL
                GROUP BY installment_group
                """,
                (user_id, card["id"]),
            )
            groups = normalize_rows(cursor.fetchall())

            active_installments: list[dict] = []
            for group in groups:
                cursor.execute(
                    """
                    SELECT installment_number, total_installments, title, amount, billing_month
                    FROM transactions
                    WHERE user_id = %s
                      AND card_id = %s
                      AND installment_group = %s
                      AND billing_month = %s
                    LIMIT 1
                    """,
                    (user_id, card["id"], group["installment_group"], month),
                )
                current_row = normalize_row(cursor.fetchone())

                if current_row:
                    active_installments.append(
                        {
                            "title": current_row["title"],
                            "installmentLabel": f'{current_row["installment_number"]}/{current_row["total_installments"]}',
                            "remaining": current_row["total_installments"] - current_row["installment_number"],
                            "amount": round(float(current_row["amount"]), 2),
                        }
                    )
                    continue

                cursor.execute(
                    """
                    SELECT COUNT(*) AS total
                    FROM transactions
                    WHERE user_id = %s
                      AND card_id = %s
                      AND installment_group = %s
                      AND billing_month >= %s
                    """,
                    (user_id, card["id"], group["installment_group"], month),
                )
                future_row = require_row(normalize_row(cursor.fetchone()), "Resumo de parcelas n\u00e3o encontrado.")
                future_count = int(future_row["total"])

                if future_count == 0:
                    continue

                cursor.execute(
                    """
                    SELECT title, amount
                    FROM transactions
                    WHERE user_id = %s
                      AND card_id = %s
                      AND installment_group = %s
                    ORDER BY billing_month ASC
                    LIMIT 1
                    """,
                    (user_id, card["id"], group["installment_group"]),
                )
                sample = normalize_row(cursor.fetchone())
                if sample:
                    active_installments.append(
                        {
                            "title": sample["title"],
                            "installmentLabel": "\u00c0 frente",
                            "remaining": future_count,
                            "amount": round(float(sample["amount"]), 2),
                        }
                    )

            card["invoice"] = round(invoice, 2)
            card["availableCredit"] = round(float(card["credit_limit"]) - invoice, 2)
            card["activeInstallmentsCount"] = len(active_installments)
            card["activeInstallments"] = active_installments
            result.append(card)

    return result


def get_card_for_user(user_id: str, card_id: int) -> dict:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT *
            FROM cards
            WHERE user_id = %s AND id = %s
            """,
            (user_id, card_id),
        )
        card = normalize_row(cursor.fetchone())

    if not card:
        raise HTTPException(status_code=404, detail="Cart\u00e3o n\u00e3o encontrado.")
    return card


def get_card_pin_row(user_id: str, card_id: int) -> Optional[dict]:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, card_id, user_id, pin_hash, created_at
            FROM card_pins
            WHERE user_id = %s AND card_id = %s
            """,
            (user_id, card_id),
        )
        return normalize_row(cursor.fetchone())


def get_invoice_total(user_id: str, card_id: int, month: str) -> float:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM transactions
            WHERE user_id = %s
              AND type = 'expense'
              AND card_id = %s
              AND COALESCE(billing_month, substring(transaction_date from 1 for 7)) = %s
            """,
            (user_id, card_id, month),
        )
        row = require_row(normalize_row(cursor.fetchone()), "Fatura n\u00e3o encontrada.")
    return round(float(row["total"]), 2)


def get_active_installments(user_id: str, card_id: int, month: str) -> list[dict]:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT title, amount, billing_month, installment_number, total_installments
            FROM transactions
            WHERE user_id = %s
              AND card_id = %s
              AND installment_group IS NOT NULL
              AND billing_month = %s
            ORDER BY transaction_date DESC, id DESC
            """,
            (user_id, card_id, month),
        )
        rows = normalize_rows(cursor.fetchall())

    installments: list[dict] = []
    for row in rows:
        total = int(row["total_installments"] or 0)
        current = int(row["installment_number"] or 0)
        remaining = max(total - current, 0) if total else 0
        progress = round((current / total) * 100, 2) if total else 0
        installments.append(
            {
                "title": row["title"],
                "amount": round(float(row["amount"]), 2),
                "billing_month": row["billing_month"],
                "installment_number": current,
                "total_installments": total,
                "installment_label": f"{current}/{total}" if total else "-",
                "remaining": remaining,
                "progress": progress,
            }
        )
    return installments


def simulate_card_invoices(user_id: str, card_id: int, start_month: str, months: int) -> list[dict]:
    result: list[dict] = []
    with db_cursor() as cursor:
        for offset in range(months):
            month_key = add_months(start_month, offset)
            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS installments_count
                FROM transactions
                WHERE user_id = %s
                  AND card_id = %s
                  AND type = 'expense'
                  AND installment_group IS NOT NULL
                  AND billing_month = %s
                """,
                (user_id, card_id, month_key),
            )
            row = require_row(normalize_row(cursor.fetchone()), "Simula\u00e7\u00e3o de fatura n\u00e3o encontrada.")
            result.append(
                {
                    "month": month_key,
                    "projected_total": round(float(row["total"]), 2),
                    "installments_count": int(row["installments_count"]),
                }
            )
    return result


def get_recent_card_transactions(user_id: str, card_id: int) -> list[dict]:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT t.id, t.title, t.amount, t.type, t.payment_method, t.transaction_date, t.notes,
                   t.billing_month, t.installment_number, t.total_installments, t.created_at,
                   c.name AS category_name, c.color AS category_color
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
            WHERE t.user_id = %s AND t.card_id = %s
            ORDER BY t.transaction_date DESC, t.id DESC
            LIMIT 20
            """,
            (user_id, card_id),
        )
        return normalize_rows(cursor.fetchall())


def get_unlocked_card_details(user_id: str, card_id: int, month: str, include_token: bool = False) -> dict:
    card = get_card_for_user(user_id, card_id)
    invoice = get_invoice_total(user_id, card_id, month)
    details = {
        "id": card["id"],
        "name": card["name"],
        "brand": card["brand"],
        "last_four": card["last_four"],
        "credit_limit": round(float(card["credit_limit"]), 2),
        "invoice": invoice,
        "available_credit": round(float(card["credit_limit"]) - invoice, 2),
        "closing_day": card["closing_day"],
        "due_day": card["due_day"],
        "active_installments": get_active_installments(user_id, card_id, month),
        "upcoming_invoices": simulate_card_invoices(user_id, card_id, month, 12),
        "recent_transactions": get_recent_card_transactions(user_id, card_id),
        "is_unlocked": True,
    }
    if include_token:
        token, expires_at = create_card_unlock_session(user_id, card_id)
        details["unlock_token"] = token
        details["unlock_expires_at"] = expires_at.isoformat()
    return details


def card_pin_failure_key(user_id: str, card_id: int) -> str:
    return f"{user_id}:{card_id}"


def enforce_card_pin_rate_limit(user_id: str, card_id: int) -> None:
    key = card_pin_failure_key(user_id, card_id)
    now = datetime.now(timezone.utc).timestamp()
    entry = card_pin_failures.get(key)
    if not entry:
        return

    blocked_until = float(entry.get("blocked_until") or 0)
    if blocked_until > now:
        raise HTTPException(status_code=429, detail="Muitas tentativas. Tente novamente em 5 minutos.")

    first_attempt = float(entry.get("first_attempt") or 0)
    if now - first_attempt > PIN_FAILURE_WINDOW_SECONDS:
        card_pin_failures.pop(key, None)


def record_card_pin_failure(user_id: str, card_id: int) -> int:
    key = card_pin_failure_key(user_id, card_id)
    now = datetime.now(timezone.utc).timestamp()
    entry = card_pin_failures.get(key)
    if not entry or now - float(entry.get("first_attempt") or 0) > PIN_FAILURE_WINDOW_SECONDS:
        entry = {"count": 0, "first_attempt": now, "blocked_until": 0}

    entry["count"] = int(entry["count"]) + 1
    attempts_remaining = max(PIN_MAX_ATTEMPTS - int(entry["count"]), 0)
    if int(entry["count"]) >= PIN_MAX_ATTEMPTS:
        entry["blocked_until"] = now + PIN_FAILURE_WINDOW_SECONDS
    card_pin_failures[key] = entry
    return attempts_remaining


def clear_card_pin_failures(user_id: str, card_id: int) -> None:
    card_pin_failures.pop(card_pin_failure_key(user_id, card_id), None)


def invalidate_card_unlock_sessions(user_id: str, card_id: int) -> None:
    for token, session in list(card_unlock_sessions.items()):
        if session["user_id"] == user_id and int(session["card_id"]) == card_id:
            card_unlock_sessions.pop(token, None)


def create_card_unlock_session(user_id: str, card_id: int) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=CARD_UNLOCK_SECONDS)
    card_unlock_sessions[token] = {
        "user_id": user_id,
        "card_id": card_id,
        "expires_at": expires_at,
    }
    return token, expires_at


def verify_card_unlock_session(user_id: str, card_id: int, token: str) -> None:
    session = card_unlock_sessions.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Desbloqueio do cart\u00e3o expirado.")

    expires_at = session["expires_at"]
    if not isinstance(expires_at, datetime) or expires_at <= datetime.now(timezone.utc):
        card_unlock_sessions.pop(token, None)
        raise HTTPException(status_code=401, detail="Desbloqueio do cart\u00e3o expirado.")

    if session["user_id"] != user_id or int(session["card_id"]) != card_id:
        raise HTTPException(status_code=401, detail="Desbloqueio do cart\u00e3o inv\u00e1lido.")


def get_dashboard(user_id: str, month: str) -> dict:
    settings = get_settings(user_id)

    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS inflow,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS outflow
            FROM transactions
            WHERE user_id = %s
              AND COALESCE(billing_month, substring(transaction_date from 1 for 7)) = %s
            """,
            (user_id, month),
        )
        totals = require_row(normalize_row(cursor.fetchone()), "Totais do dashboard n\u00e3o encontrados.")

        cursor.execute(
            """
            SELECT c.name, c.color, COALESCE(SUM(t.amount), 0) AS total
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
            WHERE t.user_id = %s
              AND t.type = 'expense'
              AND COALESCE(t.billing_month, substring(t.transaction_date from 1 for 7)) = %s
            GROUP BY c.name, c.color
            HAVING COALESCE(SUM(t.amount), 0) > 0
            ORDER BY total DESC
            """,
            (user_id, month),
        )
        category_breakdown = normalize_rows(cursor.fetchall())

        months = [add_months(month, idx - 11) for idx in range(12)]
        monthly_trend: list[dict] = []
        for month_key in months:
            cursor.execute(
                """
                SELECT
                  COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS inflow,
                  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS outflow
                FROM transactions
                WHERE user_id = %s
                  AND COALESCE(billing_month, substring(transaction_date from 1 for 7)) = %s
                """,
                (user_id, month_key),
            )
            row = require_row(normalize_row(cursor.fetchone()), "Totais mensais n\u00e3o encontrados.")
            inflow = round(float(row["inflow"]), 2)
            outflow = round(float(row["outflow"]), 2)
            monthly_trend.append(
                {
                    "month": month_key,
                    "label": format_month_label(month_key),
                    "inflow": inflow,
                    "outflow": outflow,
                    "net": round(inflow - outflow, 2),
                }
            )

        cursor.execute(
            """
            SELECT t.*, c.name AS category_name, c.color AS category_color, cards.name AS card_name
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
            LEFT JOIN cards ON cards.id = t.card_id AND cards.user_id = t.user_id
            WHERE t.user_id = %s
            ORDER BY t.transaction_date DESC, t.id DESC
            LIMIT 12
            """,
            (user_id,),
        )
        recent_transactions = normalize_rows(cursor.fetchall())

    inflow = round(float(totals["inflow"]), 2)
    outflow = round(float(totals["outflow"]), 2)

    return {
        "month": month,
        "monthlyIncome": settings["monthly_income"],
        "inflow": inflow,
        "outflow": outflow,
        "balance": round(float(settings["monthly_income"]) + inflow - outflow, 2),
        "categoryBreakdown": category_breakdown,
        "monthlyTrend": monthly_trend,
        "recentTransactions": recent_transactions,
    }


def get_goals(user_id: str, month: str) -> dict:
    settings = get_settings(user_id)
    start, end = get_month_range(month)
    year, month_num = [int(part) for part in month.split("-")]

    from calendar import monthrange

    total_days = monthrange(year, month_num)[1]

    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT substring(transaction_date from 9 for 2) AS day, COALESCE(SUM(amount), 0) AS total
            FROM transactions
            WHERE user_id = %s
              AND type = 'expense'
              AND transaction_date BETWEEN %s AND %s
              AND (billing_month IS NULL OR billing_month = %s)
            GROUP BY day
            """,
            (user_id, start, end, month),
        )
        rows = normalize_rows(cursor.fetchall())

    day_map = {int(row["day"]): float(row["total"]) for row in rows}
    days: list[dict] = []
    for day_number in range(1, total_days + 1):
        spent = round(day_map.get(day_number, 0.0), 2)
        remaining = round(float(settings["daily_goal"]) - spent, 2)
        progress = min(100.0, (spent / float(settings["daily_goal"])) * 100) if settings["daily_goal"] > 0 else 0.0
        status_name = "over" if spent > settings["daily_goal"] else ("empty" if spent == 0 else "ok")
        days.append(
            {
                "day": day_number,
                "spent": spent,
                "remaining": remaining,
                "progress": progress,
                "status": status_name,
            }
        )

    return {
        "month": month,
        "dailyGoal": float(settings["daily_goal"]),
        "days": days,
    }


def format_brl(value: float) -> str:
    formatted = f"{float(value):,.2f}"
    return "R$ " + formatted.replace(",", "X").replace(".", ",").replace("X", ".")


def get_month_totals(user_id: str, month: str) -> dict:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS inflow,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS outflow
            FROM transactions
            WHERE user_id = %s
              AND COALESCE(billing_month, substring(transaction_date from 1 for 7)) = %s
            """,
            (user_id, month),
        )
        row = require_row(normalize_row(cursor.fetchone()), "Totais do m\u00eas n\u00e3o encontrados.")
    return {"inflow": round(float(row["inflow"]), 2), "outflow": round(float(row["outflow"]), 2)}


def get_score_label(score: int) -> dict:
    if score <= 300:
        return {"label": "Cr\u00edtico", "color": "#eb4d43"}
    if score <= 500:
        return {"label": "Regular", "color": "#ff9800"}
    if score <= 700:
        return {"label": "Razo\u00e1vel", "color": "#ffd54f"}
    if score <= 850:
        return {"label": "Bom", "color": "#9be768"}
    return {"label": "Excelente", "color": "#2f7d32"}


def calculate_score(user_id: str, month: str) -> dict:
    settings = get_settings(user_id)
    monthly_income = float(settings["monthly_income"] or 0)
    totals = get_month_totals(user_id, month)
    inflow = totals["inflow"]
    outflow = totals["outflow"]
    base = 1000
    breakdown = {"gastos": 0, "consistencia": 0, "reservas": 0, "cartoes": 0}

    denominator = monthly_income + inflow
    ratio_gastos = (outflow / denominator) if denominator > 0 else (1 if outflow > 0 else 0)
    if ratio_gastos > 0.9:
        breakdown["gastos"] = -200
    elif ratio_gastos > 0.75:
        breakdown["gastos"] = -120
    elif ratio_gastos > 0.6:
        breakdown["gastos"] = -60
    elif ratio_gastos > 0.4:
        breakdown["gastos"] = -20

    recent_months = [add_months(month, offset) for offset in (-2, -1, 0)]
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM transactions
            WHERE user_id = %s
              AND COALESCE(billing_month, substring(transaction_date from 1 for 7)) = ANY(%s)
            """,
            (user_id, recent_months),
        )
        consistency_row = require_row(normalize_row(cursor.fetchone()), "Consist\u00eancia n\u00e3o encontrada.")
        total_recent = int(consistency_row["total"])
        if total_recent >= 20:
            breakdown["consistencia"] = 50
        elif total_recent >= 10:
            breakdown["consistencia"] = 25

        cursor.execute(
            """
            SELECT COALESCE(SUM(t.amount), 0) AS total
            FROM transactions t
            JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
            WHERE t.user_id = %s
              AND lower(c.name) IN ('reserva', 'investimentos')
              AND COALESCE(t.billing_month, substring(t.transaction_date from 1 for 7)) = %s
            """,
            (user_id, month),
        )
        reserve_row = require_row(normalize_row(cursor.fetchone()), "Reservas n\u00e3o encontradas.")

    total_reserva = float(reserve_row["total"] or 0)
    if total_reserva > 0 and monthly_income > 0:
        breakdown["reservas"] = min(100, int((total_reserva / monthly_income) * 200))

    for card in list_cards(user_id):
        credit_limit = float(card["credit_limit"] or 0)
        if credit_limit <= 0:
            continue
        uso_pct = get_invoice_total(user_id, int(card["id"]), month) / credit_limit
        if uso_pct > 0.9:
            breakdown["cartoes"] -= 80
        elif uso_pct > 0.7:
            breakdown["cartoes"] -= 40

    base += sum(breakdown.values())
    score = max(0, min(1000, int(base)))
    label = get_score_label(score)
    return {"score": score, "label": label["label"], "color": label["color"], "breakdown": breakdown}


def get_alerts_for_month(user_id: str, month: str) -> list[dict]:
    settings = get_settings(user_id)
    monthly_income = float(settings["monthly_income"] or 0)
    totals = get_month_totals(user_id, month)
    alerts: list[dict] = []

    for card in list_cards(user_id):
        credit_limit = float(card["credit_limit"] or 0)
        if credit_limit <= 0:
            continue
        invoice = get_invoice_total(user_id, int(card["id"]), month)
        usage = invoice / credit_limit
        if usage > 0.8:
            alerts.append(
                {
                    "type": "danger",
                    "category": "cart\u00e3o",
                    "message": f"Cart\u00e3o {card['name']} est\u00e1 com {round(usage * 100)}% do limite",
                }
            )

    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT c.id, c.name, COALESCE(SUM(t.amount), 0) AS total
            FROM transactions t
            JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
            WHERE t.user_id = %s
              AND t.type = 'expense'
              AND COALESCE(t.billing_month, substring(t.transaction_date from 1 for 7)) = %s
            GROUP BY c.id, c.name
            HAVING COALESCE(SUM(t.amount), 0) > 0
            """,
            (user_id, month),
        )
        current_categories = normalize_rows(cursor.fetchall())
        previous_months = [add_months(month, offset) for offset in (-3, -2, -1)]
        for category in current_categories:
            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM transactions
                WHERE user_id = %s
                  AND type = 'expense'
                  AND category_id = %s
                  AND COALESCE(billing_month, substring(transaction_date from 1 for 7)) = ANY(%s)
                """,
                (user_id, category["id"], previous_months),
            )
            previous_row = require_row(normalize_row(cursor.fetchone()), "M\u00e9dia de categoria n\u00e3o encontrada.")
            average = float(previous_row["total"] or 0) / 3
            current_total = float(category["total"] or 0)
            if average > 0 and current_total > average * 1.3:
                percent = round(((current_total / average) - 1) * 100)
                alerts.append(
                    {
                        "type": "warning",
                        "category": "gastos",
                        "message": f"Gastos com {category['name']} {percent}% acima da m\u00e9dia",
                    }
                )

        next_month = add_months(month, 1)
        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM transactions
            WHERE user_id = %s
              AND type = 'expense'
              AND installment_group IS NOT NULL
              AND billing_month = %s
            """,
            (user_id, next_month),
        )
        next_invoice_row = require_row(normalize_row(cursor.fetchone()), "Fatura estimada n\u00e3o encontrada.")

    if totals["inflow"] <= 0:
        alerts.append(
            {
                "type": "warning",
                "category": "gastos",
                "message": f"Nenhuma entrada lan\u00e7ada para {format_month_label(month)}",
            }
        )

    projected_balance = monthly_income + totals["inflow"] - totals["outflow"]
    if projected_balance < 0:
        alerts.append(
            {
                "type": "danger",
                "category": "gastos",
                "message": f"Saldo projetado negativo em {format_brl(abs(projected_balance))}",
            }
        )

    next_invoice = float(next_invoice_row["total"] or 0)
    if next_invoice > 500:
        alerts.append(
            {
                "type": "info",
                "category": "cart\u00e3o",
                "message": f"Fatura estimada em {format_brl(next_invoice)} para o pr\u00f3ximo m\u00eas",
            }
        )

    goals = get_goals(user_id, month)
    days = goals["days"]
    exceeded_days = [day for day in days if float(day["spent"]) > float(goals["dailyGoal"])]
    if days and len(exceeded_days) / len(days) > 0.5:
        alerts.append(
            {
                "type": "warning",
                "category": "meta",
                "message": "Meta di\u00e1ria estourada em mais da metade dos dias",
            }
        )

    return alerts


def normalize_recurrence(
    is_recurring: bool,
    recurrence_type: Optional[str],
    recurrence_day: Optional[int],
    transaction_date: Optional[str] = None,
) -> tuple[bool, Optional[str], Optional[int]]:
    if not is_recurring:
        return False, None, None

    if recurrence_type not in ("monthly", "weekly"):
        raise HTTPException(status_code=400, detail="Tipo de recorr\u00eancia inv\u00e1lido.")

    if recurrence_day is None and transaction_date:
        parsed = datetime.strptime(transaction_date, "%Y-%m-%d").date()
        recurrence_day = parsed.day if recurrence_type == "monthly" else parsed.weekday()

    if recurrence_day is None:
        raise HTTPException(status_code=400, detail="Dia da recorr\u00eancia \u00e9 obrigat\u00f3rio.")

    if recurrence_type == "monthly" and not 1 <= recurrence_day <= 31:
        raise HTTPException(status_code=400, detail="Dia mensal deve ficar entre 1 e 31.")
    if recurrence_type == "weekly" and not 0 <= recurrence_day <= 6:
        raise HTTPException(status_code=400, detail="Dia semanal deve ficar entre 0 e 6.")

    return True, recurrence_type, recurrence_day


def suggested_dates_for_recurrence(month: str, recurrence_type: str, recurrence_day: int) -> list[str]:
    from calendar import monthrange

    year, month_num = [int(part) for part in month.split("-")]
    total_days = monthrange(year, month_num)[1]
    if recurrence_type == "monthly":
        return [date(year, month_num, min(recurrence_day, total_days)).isoformat()]

    dates: list[str] = []
    for day in range(1, total_days + 1):
        current = date(year, month_num, day)
        if current.weekday() == recurrence_day:
            dates.append(current.isoformat())
    return dates


def get_recurring_suggestions(user_id: str, month: str) -> list[dict]:
    previous_month = add_months(month, -1)
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, title, amount, type, category_id, payment_method, notes, card_id,
                   is_recurring, recurrence_type, recurrence_day
            FROM transactions
            WHERE user_id = %s
              AND is_recurring = TRUE
              AND recurrence_type IS NOT NULL
              AND recurrence_day IS NOT NULL
              AND COALESCE(billing_month, substring(transaction_date from 1 for 7)) = %s
            ORDER BY transaction_date ASC, id ASC
            """,
            (user_id, previous_month),
        )
        recurring_rows = normalize_rows(cursor.fetchall())

        suggestions: list[dict] = []
        seen: set[tuple[Any, ...]] = set()
        for row in recurring_rows:
            dates = suggested_dates_for_recurrence(month, row["recurrence_type"], int(row["recurrence_day"]))
            for suggested_date in dates:
                key = (row["title"], float(row["amount"]), row["category_id"], suggested_date)
                if key in seen:
                    continue
                seen.add(key)

                cursor.execute(
                    """
                    SELECT 1
                    FROM transactions
                    WHERE user_id = %s
                      AND title = %s
                      AND amount = %s
                      AND COALESCE(category_id, 0) = COALESCE(%s, 0)
                      AND transaction_date = %s
                    LIMIT 1
                    """,
                    (user_id, row["title"], row["amount"], row["category_id"], suggested_date),
                )
                if cursor.fetchone():
                    continue

                suggestions.append(
                    {
                        "title": row["title"],
                        "amount": round(float(row["amount"]), 2),
                        "type": row["type"],
                        "category_id": row["category_id"],
                        "payment_method": row["payment_method"],
                        "card_id": row["card_id"],
                        "suggested_date": suggested_date,
                        "notes": row.get("notes") or "",
                        "is_recurring": True,
                        "recurrence_type": row["recurrence_type"],
                        "recurrence_day": row["recurrence_day"],
                    }
                )

    return suggestions


class RegisterPayload(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=72)
    name: str = Field(..., min_length=1, max_length=100)


class SettingsPayload(BaseModel):
    monthlyIncome: Optional[float] = Field(default=None, ge=0, le=999999999)
    dailyGoal: Optional[float] = Field(default=None, gt=0, le=999999999)


class CategoryPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    type: Literal["income", "expense"] = "expense"
    color: str = Field(default="#9be768", min_length=1, max_length=20)
    icon: str = Field(default="\u25cf", min_length=1, max_length=10)


class TransactionPayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0, le=999999999)
    type: Literal["income", "expense"] = "expense"
    categoryId: Optional[int] = Field(default=None, ge=1)
    paymentMethod: str = Field(default="pix", min_length=1, max_length=50)
    transactionDate: str = Field(..., min_length=10, max_length=10)
    notes: str = Field(default="", max_length=1000)
    cardId: Optional[int] = Field(default=None, ge=1)
    billingMonth: Optional[str] = Field(default=None, min_length=7, max_length=7)
    isRecurring: bool = False
    recurrenceType: Optional[Literal["monthly", "weekly"]] = None
    recurrenceDay: Optional[int] = Field(default=None, ge=0, le=31)


class CardPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    brand: str = Field(..., min_length=1, max_length=40)
    lastFour: str = Field(..., min_length=4, max_length=4)
    creditLimit: float = Field(..., ge=0, le=999999999)
    closingDay: int = Field(..., ge=1, le=31)
    dueDay: int = Field(..., ge=1, le=31)
    color: str = Field(default="#171717", min_length=1, max_length=20)


class InstallmentPayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    categoryId: Optional[int] = Field(default=None, ge=1)
    totalAmount: float = Field(..., gt=0, le=999999999)
    totalInstallments: int = Field(..., ge=2, le=24)
    purchaseDate: str = Field(..., min_length=10, max_length=10)
    notes: str = Field(default="", max_length=1000)


class PinPayload(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6)


class ProfilePayload(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    send_monthly_summary: Optional[bool] = None


class ChangePasswordPayload(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=72)
    new_password: str = Field(..., min_length=8, max_length=72)


class RecurringPayload(BaseModel):
    is_recurring: bool
    recurrence_type: Optional[Literal["monthly", "weekly"]] = None
    recurrence_day: Optional[int] = Field(default=None, ge=0, le=31)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterPayload) -> dict:
    email = normalize_email(payload.email)
    name = clean_text(payload.name, "Nome", 100)
    validate_password_strength(payload.password)

    try:
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO users (email, hashed_password, name)
                VALUES (%s, %s, %s)
                RETURNING id, email, name, avatar_url, send_monthly_summary, is_active, created_at, updated_at
                """,
                (email, hash_password(payload.password), name),
            )
            user = require_row(normalize_row(cursor.fetchone()), "Usu\u00e1rio n\u00e3o criado.")
            ensure_user_defaults_for_cursor(cursor, user["id"])
    except errors.UniqueViolation:
        raise HTTPException(status_code=400, detail="E-mail j\u00e1 cadastrado.")

    return {"access_token": create_access_token(user["id"]), "token_type": "bearer"}


@app.post("/api/auth/login")
@limiter.limit("5 per 15 minutes")
def login(
    request: Request,
    email: str = Form(..., max_length=255),
    password: str = Form(..., max_length=72),
) -> dict:
    email_value = email.strip().lower()
    email_is_valid = len(email_value) <= 255 and bool(EMAIL_RE.match(email_value))
    user = get_user_by_email(email_value) if email_is_valid else None
    hash_to_check = user["hashed_password"] if user else DUMMY_PASSWORD_HASH
    password_ok = verify_password(password, hash_to_check)

    if not user or not password_ok or not user["is_active"]:
        raise HTTPException(status_code=401, detail="E-mail ou senha inv\u00e1lidos.")

    return {"access_token": create_access_token(user["id"]), "token_type": "bearer"}


@app.get("/api/auth/me")
def me(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user


@app.put("/api/auth/me")
def update_me(payload: ProfilePayload, current_user: dict = Depends(get_current_user)) -> dict:
    return save_profile_payload(payload, current_user)


@app.post("/api/auth/me")
def save_me(payload: ProfilePayload, current_user: dict = Depends(get_current_user)) -> dict:
    return save_profile_payload(payload, current_user)


def save_profile_payload(payload: ProfilePayload, current_user: dict) -> dict:
    user_id = current_user["id"]
    fields_set = getattr(payload, "model_fields_set", getattr(payload, "__fields_set__", set()))
    name = current_user["name"]
    avatar_url = current_user.get("avatar_url")
    send_monthly_summary = bool(current_user.get("send_monthly_summary", False))

    if "name" in fields_set:
        if payload.name is None:
            raise HTTPException(status_code=400, detail="Nome \u00e9 obrigat\u00f3rio.")
        name = clean_text(payload.name, "Nome", 100)

    if "avatar_url" in fields_set:
        avatar_url = None
    if "avatar_url" in fields_set and payload.avatar_url is not None:
        avatar_url = clean_text(payload.avatar_url, "URL do avatar", 500, required=False) or None

    if "send_monthly_summary" in fields_set and payload.send_monthly_summary is not None:
        send_monthly_summary = bool(payload.send_monthly_summary)

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE users
            SET name = %s, avatar_url = %s, send_monthly_summary = %s
            WHERE id = %s
            RETURNING id, email, hashed_password, name, avatar_url, send_monthly_summary, is_active, created_at, updated_at
            """,
            (name, avatar_url, send_monthly_summary, user_id),
        )
        user = require_row(normalize_row(cursor.fetchone()), "Usu\u00e1rio n\u00e3o atualizado.")
    return public_user(user)


@app.post("/api/auth/change-password")
@limiter.limit("3 per 1 hour")
def change_password(
    request: Request,
    payload: ChangePasswordPayload,
    current_user: dict = Depends(get_current_user),
) -> dict:
    user = get_user_by_id(current_user["id"])
    if not user or not verify_password(payload.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Senha atual incorreta.")

    validate_password_strength(payload.new_password)
    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE users
            SET hashed_password = %s
            WHERE id = %s
            """,
            (hash_password(payload.new_password), current_user["id"]),
        )
    return {"ok": True}


@app.get("/api/auth/stats")
def auth_stats(current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["id"]
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
              (SELECT COUNT(*) FROM transactions WHERE user_id = %s) AS total_transactions,
              (SELECT COUNT(*) FROM categories WHERE user_id = %s) AS total_categories
            """,
            (user_id, user_id),
        )
        row = require_row(normalize_row(cursor.fetchone()), "Estat\u00edsticas n\u00e3o encontradas.")
    return {
        "created_at": current_user["created_at"],
        "total_transactions": int(row["total_transactions"]),
        "total_categories": int(row["total_categories"]),
    }


@app.post("/api/auth/logout")
def logout(current_user: dict = Depends(get_current_user)) -> dict:
    return {"message": "Remova o token rf_token do sessionStorage no cliente."}


@app.get("/api/bootstrap")
def bootstrap(month: Optional[str] = None, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["id"]
    month_key = validate_month_text(month) or get_current_month()
    ensure_user_defaults(user_id)
    score = calculate_score(user_id, month_key)
    previous_score = calculate_score(user_id, add_months(month_key, -1))
    return {
        "settings": get_settings(user_id),
        "categories": list_categories(user_id),
        "cards": get_cards_summary(user_id, month_key),
        "transactions": list_transactions(user_id, month_key),
        "dashboard": get_dashboard(user_id, month_key),
        "score": score,
        "previousScore": previous_score,
        "alerts": get_alerts_for_month(user_id, month_key),
        "recurringSuggestions": get_recurring_suggestions(user_id, month_key),
        "user": current_user,
    }


@app.get("/api/score")
def score(month: Optional[str] = None, current_user: dict = Depends(get_current_user)) -> dict:
    month_key = validate_month_text(month) or get_current_month()
    return calculate_score(current_user["id"], month_key)


@app.get("/api/alerts")
def alerts(month: Optional[str] = None, current_user: dict = Depends(get_current_user)) -> list[dict]:
    month_key = validate_month_text(month) or get_current_month()
    return get_alerts_for_month(current_user["id"], month_key)


@app.get("/api/transactions/suggestions")
def transaction_suggestions(month: Optional[str] = None, current_user: dict = Depends(get_current_user)) -> list[dict]:
    month_key = validate_month_text(month) or get_current_month()
    return get_recurring_suggestions(current_user["id"], month_key)


@app.get("/api/goals")
def goals(month: Optional[str] = None, current_user: dict = Depends(get_current_user)) -> dict:
    month_key = validate_month_text(month) or get_current_month()
    return get_goals(current_user["id"], month_key)


@app.get("/api/cards")
def cards(month: Optional[str] = None, current_user: dict = Depends(get_current_user)) -> list[dict]:
    month_key = validate_month_text(month) or get_current_month()
    return get_cards_summary(current_user["id"], month_key)


@app.get("/api/cards-detail")
def cards_detail(month: Optional[str] = None, current_user: dict = Depends(get_current_user)) -> list[dict]:
    validate_month_text(month) if month else None
    user_id = current_user["id"]
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT c.id, c.name, c.brand, c.last_four,
                   EXISTS (
                     SELECT 1
                     FROM card_pins p
                     WHERE p.card_id = c.id AND p.user_id = c.user_id
                   ) AS has_pin
            FROM cards c
            WHERE c.user_id = %s
            ORDER BY c.created_at ASC, c.id ASC
            """,
            (user_id,),
        )
        rows = normalize_rows(cursor.fetchall())

    return [
        {
            "id": row["id"],
            "name": row["name"],
            "brand": row["brand"],
            "last_four": row["last_four"],
            "credit_limit": None,
            "invoice": None,
            "available_credit": None,
            "closing_day": None,
            "due_day": None,
            "has_pin": bool(row["has_pin"]),
            "is_unlocked": False,
        }
        for row in rows
    ]


@app.post("/api/cards/{card_id}/set-pin")
def set_card_pin(card_id: int, payload: PinPayload, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["id"]
    get_card_for_user(user_id, card_id)
    pin = validate_pin(payload.pin)

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            INSERT INTO card_pins (card_id, user_id, pin_hash)
            VALUES (%s, %s, %s)
            ON CONFLICT (card_id, user_id)
            DO UPDATE SET pin_hash = EXCLUDED.pin_hash, created_at = NOW()
            """,
            (card_id, user_id, hash_pin(pin)),
        )

    clear_card_pin_failures(user_id, card_id)
    invalidate_card_unlock_sessions(user_id, card_id)
    return {"ok": True}


@app.post("/api/cards/{card_id}/unlock")
def unlock_card(
    card_id: int,
    payload: PinPayload,
    month: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
) -> dict:
    user_id = current_user["id"]
    month_key = validate_month_text(month) or get_current_month()
    get_card_for_user(user_id, card_id)
    pin = validate_pin(payload.pin)
    enforce_card_pin_rate_limit(user_id, card_id)

    pin_row = get_card_pin_row(user_id, card_id)
    if not pin_row:
        raise HTTPException(status_code=400, detail="PIN n\u00e3o definido.")

    if not verify_pin(pin, pin_row["pin_hash"]):
        attempts_remaining = record_card_pin_failure(user_id, card_id)
        if attempts_remaining <= 0:
            raise HTTPException(
                status_code=429,
                detail="Muitas tentativas. Tente novamente em 5 minutos.",
                headers={"X-Attempts-Remaining": "0"},
            )
        raise HTTPException(
            status_code=401,
            detail="PIN incorreto",
            headers={"X-Attempts-Remaining": str(attempts_remaining)},
        )

    clear_card_pin_failures(user_id, card_id)
    return get_unlocked_card_details(user_id, card_id, month_key, include_token=True)


@app.get("/api/cards/{card_id}/simulate-invoices")
def simulate_invoices_route(
    card_id: int,
    months: int = Query(12, ge=1, le=24),
    x_card_unlock_token: str = Header(..., alias="X-Card-Unlock-Token"),
    current_user: dict = Depends(get_current_user),
) -> list[dict]:
    user_id = current_user["id"]
    get_card_for_user(user_id, card_id)
    verify_card_unlock_session(user_id, card_id, x_card_unlock_token)
    return simulate_card_invoices(user_id, card_id, get_current_month(), months)


@app.post("/api/settings")
def save_settings(payload: SettingsPayload, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["id"]
    current = get_settings(user_id)
    monthly_income = payload.monthlyIncome if payload.monthlyIncome is not None else current["monthly_income"]
    daily_goal = payload.dailyGoal if payload.dailyGoal is not None else current["daily_goal"]

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE settings
            SET monthly_income = %s, daily_goal = %s
            WHERE user_id = %s AND id = 1
            RETURNING *
            """,
            (monthly_income, daily_goal, user_id),
        )
        row = normalize_row(cursor.fetchone())
    return row or get_settings(user_id)


@app.post("/api/categories")
def create_category(payload: CategoryPayload, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["id"]
    name = clean_text(payload.name, "Nome da categoria", 80)
    color = clean_text(payload.color, "Cor", 20)
    icon = clean_text(payload.icon, "\u00cdcone", 10)

    try:
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO categories (user_id, name, type, color, icon, is_default)
                VALUES (%s, %s, %s, %s, %s, 0)
                RETURNING *
                """,
                (user_id, name, payload.type, color, icon),
            )
            row = require_row(normalize_row(cursor.fetchone()), "Categoria n\u00e3o criada.")
    except errors.UniqueViolation:
        raise HTTPException(status_code=400, detail="Categoria j\u00e1 existe.")

    return row


@app.post("/api/transactions")
def create_transaction(payload: TransactionPayload, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["id"]
    title = clean_text(payload.title, "T\u00edtulo", 200)
    payment_method = clean_text(payload.paymentMethod, "Forma de pagamento", 50)
    notes = clean_text(payload.notes, "Observa\u00e7\u00f5es", 1000, required=False)
    transaction_date = validate_date_text(payload.transactionDate, "Data")
    billing_month = validate_month_text(payload.billingMonth)
    is_recurring, recurrence_type, recurrence_day = normalize_recurrence(
        payload.isRecurring,
        payload.recurrenceType,
        payload.recurrenceDay,
        transaction_date,
    )

    try:
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO transactions
                  (user_id, title, amount, type, category_id, payment_method, transaction_date, notes, card_id, billing_month,
                   installment_group, installment_number, total_installments, is_recurring, recurrence_type, recurrence_day)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, NULL, NULL, %s, %s, %s)
                RETURNING *
                """,
                (
                    user_id,
                    title,
                    payload.amount,
                    payload.type,
                    payload.categoryId,
                    payment_method,
                    transaction_date,
                    notes,
                    payload.cardId,
                    billing_month,
                    is_recurring,
                    recurrence_type,
                    recurrence_day,
                ),
            )
            row = require_row(normalize_row(cursor.fetchone()), "Lan\u00e7amento n\u00e3o criado.")
    except errors.ForeignKeyViolation:
        raise HTTPException(status_code=400, detail="Categoria ou cart\u00e3o inv\u00e1lido.")

    return row


@app.post("/api/transactions/{transaction_id}/set-recurring")
def set_transaction_recurring(
    transaction_id: int,
    payload: RecurringPayload,
    current_user: dict = Depends(get_current_user),
) -> dict:
    user_id = current_user["id"]
    is_recurring, recurrence_type, recurrence_day = normalize_recurrence(
        payload.is_recurring,
        payload.recurrence_type,
        payload.recurrence_day,
    )

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE transactions
            SET is_recurring = %s, recurrence_type = %s, recurrence_day = %s
            WHERE user_id = %s AND id = %s
            RETURNING *
            """,
            (is_recurring, recurrence_type, recurrence_day, user_id, transaction_id),
        )
        row = normalize_row(cursor.fetchone())

    if not row:
        raise HTTPException(status_code=404, detail="Lan\u00e7amento n\u00e3o encontrado.")
    return row


@app.get("/api/export/csv")
def export_csv(month: Optional[str] = None, current_user: dict = Depends(get_current_user)) -> Response:
    user_id = current_user["id"]
    month_key = validate_month_text(month) or get_current_month()
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT t.transaction_date, t.title, c.name AS category_name, t.type, t.amount,
                   t.payment_method, cards.name AS card_name, t.installment_number, t.total_installments
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
            LEFT JOIN cards ON cards.id = t.card_id AND cards.user_id = t.user_id
            WHERE t.user_id = %s
              AND COALESCE(t.billing_month, substring(t.transaction_date from 1 for 7)) = %s
            ORDER BY t.transaction_date ASC, t.id ASC
            """,
            (user_id, month_key),
        )
        rows = normalize_rows(cursor.fetchall())

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["data", "titulo", "categoria", "tipo", "valor", "forma_pagamento", "cart\u00e3o", "parcela"])
    for row in rows:
        installment = ""
        if row.get("total_installments"):
            installment = f"{row.get('installment_number')}/{row.get('total_installments')}"
        writer.writerow(
            [
                row.get("transaction_date") or "",
                row.get("title") or "",
                row.get("category_name") or "",
                row.get("type") or "",
                f"{float(row.get('amount') or 0):.2f}",
                row.get("payment_method") or "",
                row.get("card_name") or "",
                installment,
            ]
        )

    headers = {"Content-Disposition": f'attachment; filename="financeiro-{month_key}.csv"'}
    return Response(content="\ufeff" + output.getvalue(), media_type="text/csv; charset=utf-8", headers=headers)


@app.post("/api/cards")
def create_card(payload: CardPayload, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["id"]
    name = clean_text(payload.name, "Nome do cart\u00e3o", 100)
    brand = clean_text(payload.brand, "Bandeira", 40)
    last_four = clean_text(payload.lastFour, "Final do cart\u00e3o", 4)
    if not last_four.isdigit():
        raise HTTPException(status_code=400, detail="Final do cart\u00e3o deve conter 4 n\u00fameros.")
    color = clean_text(payload.color, "Cor", 20)

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            INSERT INTO cards (user_id, name, brand, last_four, credit_limit, closing_day, due_day, color)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (user_id, name, brand, last_four, payload.creditLimit, payload.closingDay, payload.dueDay, color),
        )
        row = require_row(normalize_row(cursor.fetchone()), "Cart\u00e3o n\u00e3o criado.")
    return row


@app.post("/api/cards/{card_id}/installments")
def create_installments(card_id: int, payload: InstallmentPayload, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["id"]
    title = clean_text(payload.title, "Descri\u00e7\u00e3o da compra", 200)
    notes = clean_text(payload.notes, "Observa\u00e7\u00f5es", 1000, required=False)
    purchase_date = validate_date_text(payload.purchaseDate, "Data da compra")
    base_month = month_key_from_date(purchase_date)
    amount_per = round(payload.totalAmount / payload.totalInstallments, 2)

    try:
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                SELECT *
                FROM cards
                WHERE user_id = %s AND id = %s
                """,
                (user_id, card_id),
            )
            card = normalize_row(cursor.fetchone())
            if not card:
                raise HTTPException(status_code=404, detail="Cart\u00e3o n\u00e3o encontrado.")

            group = f"{user_id}-{card_id}-{title}-{purchase_date}"
            for number in range(1, payload.totalInstallments + 1):
                cursor.execute(
                    """
                    INSERT INTO transactions
                      (user_id, title, amount, type, category_id, payment_method, transaction_date, notes, card_id,
                       billing_month, installment_group, installment_number, total_installments)
                    VALUES (%s, %s, %s, 'expense', %s, 'cr\u00e9dito', %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        user_id,
                        title,
                        amount_per,
                        payload.categoryId,
                        purchase_date,
                        notes,
                        card_id,
                        add_months(base_month, number - 1),
                        group,
                        number,
                        payload.totalInstallments,
                    ),
                )

            cursor.execute(
                """
                SELECT *
                FROM transactions
                WHERE user_id = %s AND installment_group = %s
                ORDER BY installment_number ASC
                """,
                (user_id, group),
            )
            rows = normalize_rows(cursor.fetchall())
    except errors.ForeignKeyViolation:
        raise HTTPException(status_code=400, detail="Categoria ou cart\u00e3o inv\u00e1lido.")

    return {
        "createdInstallments": len(rows),
        "group": group,
        "rows": rows,
    }


@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["id"]

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            SELECT *
            FROM transactions
            WHERE user_id = %s AND id = %s
            """,
            (user_id, transaction_id),
        )
        tx = normalize_row(cursor.fetchone())
        if not tx:
            raise HTTPException(status_code=404, detail="Lan\u00e7amento n\u00e3o encontrado.")

        if tx["installment_group"]:
            cursor.execute(
                """
                DELETE FROM transactions
                WHERE user_id = %s AND installment_group = %s
                """,
                (user_id, tx["installment_group"]),
            )
            return {"deletedGroup": True}

        cursor.execute(
            """
            DELETE FROM transactions
            WHERE user_id = %s AND id = %s
            """,
            (user_id, transaction_id),
        )
    return {"deleted": True}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "index.html")


@app.get("/metas")
def metas() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "metas.html")


@app.get("/cartoes")
def cartoes() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "cartoes.html")


@app.get("/perfil")
def perfil() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "perfil.html")


@app.get("/login")
def login_page() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "login.html")


@app.get("/register")
def register_page() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "register.html")


app.mount("/", StaticFiles(directory=PUBLIC_DIR, html=True), name="public")
