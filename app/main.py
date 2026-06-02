
from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
import os
import re
import secrets
import time
import uuid
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Literal, Optional
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
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

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_OUT_DIR = BASE_DIR / "frontend" / "out"

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
CARD_UNLOCK_SECONDS = 15 * 60
PIN_FAILURE_WINDOW_SECONDS = 5 * 60
PIN_MAX_ATTEMPTS = 3
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CSV_IMPORT_MAX_BYTES = 1024 * 1024
CSV_IMPORT_PREVIEW_LIMIT = 10
CSV_IMPORT_ALLOWED_CONTENT_TYPES = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
}

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.getenv("LOG_FORMAT", "text")


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "service": record.name,
            "request_id": getattr(record, "request_id", None),
            "message": record.getMessage(),
        }
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry)


if LOG_FORMAT == "json":
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter())
    logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO), handlers=[handler], force=True)
else:
    logging.basicConfig(
        level=getattr(logging, LOG_LEVEL, logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
    )
logger = logging.getLogger("ritmo_financeiro")


def email_hash(email: str) -> str:
    return hashlib.sha256(email.encode()).hexdigest()[:16]


def audit_log(event: str, user_id: str | None, details: dict | None = None) -> None:
    entry = {
        "audit": True,
        "event": event,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **(details or {}),
    }
    logger.info(json.dumps(entry))


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
csv_import_sessions: dict[str, dict[str, Any]] = {}
revoked_tokens: set[str] = set()
startup_time = time.time()

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


def is_production() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() == "production"


def parse_allowed_origins() -> list[str]:
    raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    if origins:
        return origins
    if is_production():
        raise RuntimeError("ALLOWED_ORIGINS environment variable is required in production.")
    return ["http://localhost:8000", "http://127.0.0.1:8000"]


ALLOWED_ORIGINS = parse_allowed_origins()


app = FastAPI(title="Ritmo Financeiro Pro", version="2.0.0")
app.state.limiter = limiter


def rate_limit_handler(request: Request, exc: Exception) -> Response:
    if isinstance(exc, RateLimitExceeded):
        return _rate_limit_exceeded_handler(request, exc)
    raise exc


app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials="*" not in ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Card-Unlock-Token"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response


@app.middleware("http")
async def validate_content_type(request: Request, call_next):
    content_type = request.headers.get("content-type", "").split(";")[0].strip()
    if (
        request.method in ("POST", "PUT", "PATCH")
        and request.url.path.startswith("/api/")
        and request.url.path != "/api/auth/login"
        and content_type not in ("application/json", "")
    ):
        return JSONResponse(
            {"detail": "Content-Type invalido."},
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )
    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    started_at = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "Request failed method=%s path=%s",
            request.method,
            request.url.path,
            extra={"request_id": getattr(request.state, "request_id", None)},
        )
        raise

    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
    logger.info(
        "Request completed method=%s path=%s status=%s duration_ms=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        extra={"request_id": getattr(request.state, "request_id", None)},
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "geolocation=(), microphone=(), camera=(), payment=(), usb=()"
    )
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "upgrade-insecure-requests"
    )
    return response


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is required.")
    return database_url


def get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY", "")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY environment variable is required.")
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET_KEY must have at least 32 characters.")
    return secret


def validate_runtime_config() -> None:
    get_database_url()
    get_jwt_secret()
    if is_production():
        origins = ALLOWED_ORIGINS
        if any("localhost" in origin or "127.0.0.1" in origin for origin in origins):
            raise RuntimeError("ALLOWED_ORIGINS de produ\u00e7\u00e3o n\u00e3o deve apontar para localhost.")
        if "*" in origins:
            logger.warning("ALLOWED_ORIGINS is '*' in production. Use only during the first deploy and replace it with the public HTTPS URL.")


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
    global startup_time
    startup_time = time.time()
    logger.info("Starting Ritmo Financeiro Pro")
    validate_runtime_config()
    init_db_pool()
    conn = get_connection()
    try:
        run_migrations(conn)
    finally:
        release_connection(conn)
    logger.info("Startup completed")


@app.on_event("shutdown")
def shutdown() -> None:
    logger.info("Shutting down Ritmo Financeiro Pro")
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


CENT = Decimal("0.01")


def to_decimal(value: Any) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def round_money(value: Any) -> Decimal:
    return to_decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def distribute_installments(total: Any, installments: int) -> list[Decimal]:
    if installments <= 0:
        raise ValueError("Quantidade de parcelas deve ser maior que zero.")

    rounded_total = round_money(total)
    total_cents = int((rounded_total * 100).to_integral_value(rounding=ROUND_HALF_UP))
    if total_cents < installments:
        raise ValueError("Valor total insuficiente para a quantidade de parcelas.")

    base = round_money(Decimal(total_cents // installments) / Decimal("100"))
    parts = [base for _ in range(installments)]
    parts[-1] = round_money(rounded_total - sum(parts[:-1], Decimal("0")))
    return parts


def normalize_duplicate_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def build_duplicate_hash(user_id: str, transaction_date: str, description: str, amount: Any) -> str:
    amount_text = f"{round_money(amount):.2f}"
    raw = "|".join([user_id, transaction_date, normalize_duplicate_text(description), amount_text])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def parse_decimal_text(value: Any) -> Decimal:
    text = str(value or "").strip()
    if not text:
        raise ValueError("Valor vazio.")
    cleaned = re.sub(r"[^\d,.\-+]", "", text)
    if not cleaned:
        raise ValueError("Valor inválido.")
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    return to_decimal(cleaned)


def parse_import_date(value: Any) -> str:
    text = str(value or "").strip()
    for date_format in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, date_format).date().isoformat()
        except ValueError:
            continue
    raise ValueError("Data inválida.")


def parse_import_type(raw_type: Any, amount: Decimal) -> Literal["income", "expense"]:
    if raw_type is None or str(raw_type).strip() == "":
        return "expense" if amount < 0 else "income"

    value = normalize_duplicate_text(str(raw_type))
    if value in {"income", "entrada", "credito", "crédito", "credit", "receita"}:
        return "income"
    if value in {"expense", "saida", "saída", "debito", "débito", "debit", "despesa"}:
        return "expense"
    return "expense" if amount < 0 else "income"


def detect_csv_delimiter(sample: str) -> str:
    first_line = sample.splitlines()[0] if sample.splitlines() else ""
    return ";" if first_line.count(";") >= first_line.count(",") else ","


def parse_csv_rows(content: bytes) -> tuple[list[str], list[dict[str, str]]]:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    delimiter = detect_csv_delimiter(text[:2048])
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    columns = [column.strip() for column in (reader.fieldnames or []) if column and column.strip()]
    if not columns:
        raise HTTPException(status_code=400, detail="CSV sem cabeçalho.")

    rows: list[dict[str, str]] = []
    for row in reader:
        cleaned = {str(key or "").strip(): str(value or "").strip() for key, value in row.items() if key}
        if any(cleaned.values()):
            rows.append(cleaned)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV sem linhas para importar.")
    return columns, rows


def serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return round_money(value)
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


def revoke_token(token: str) -> None:
    revoked_tokens.add(token)


def is_token_revoked(token: str) -> bool:
    return token in revoked_tokens


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
        INSERT INTO settings (id, user_id, monthly_income, daily_goal, reserve_amount, currency)
        VALUES (1, %s, 5500, 120, 0, 'BRL')
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
    if is_token_revoked(token):
        raise credentials_error
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
            invoice = round_money(invoice_row["total"])

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
                            "amount": round_money(current_row["amount"]),
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
                            "amount": round_money(sample["amount"]),
                        }
                    )

            card["invoice"] = invoice
            card["availableCredit"] = round_money(card["credit_limit"] - invoice)
            commitment = get_card_commitment(user_id, int(card["id"]), month)
            card["committedLimit"] = commitment["committedLimit"]
            card["remainingInstallments"] = commitment["remainingInstallments"]
            usage = (invoice / round_money(card["credit_limit"])) if round_money(card["credit_limit"]) > 0 else Decimal("0")
            card["invoiceAlert"] = usage > Decimal("0.8")
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


def get_invoice_total(user_id: str, card_id: int, month: str) -> Decimal:
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
    return round_money(row["total"])


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
                "amount": round_money(row["amount"]),
                "billing_month": row["billing_month"],
                "installment_number": current,
                "total_installments": total,
                "installment_label": f"{current}/{total}" if total else "-",
                "remaining": remaining,
                "progress": progress,
            }
        )
    return installments


def simulate_card_invoices(
    user_id: str,
    card_id: int,
    start_month: str,
    months: int,
    category_id: Optional[int] = None,
) -> list[dict]:
    result: list[dict] = []
    with db_cursor() as cursor:
        for offset in range(months):
            month_key = add_months(start_month, offset)
            category_filter = "AND category_id = %s" if category_id else ""
            params: tuple[Any, ...] = (user_id, card_id, month_key)
            if category_id:
                params = (*params, category_id)
            cursor.execute(
                f"""
                SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS installments_count
                FROM transactions
                WHERE user_id = %s
                  AND card_id = %s
                  AND type = 'expense'
                  AND COALESCE(billing_month, substring(transaction_date from 1 for 7)) = %s
                  {category_filter}
                """,
                params,
            )
            row = require_row(normalize_row(cursor.fetchone()), "Simula\u00e7\u00e3o de fatura n\u00e3o encontrada.")
            result.append(
                {
                    "month": month_key,
                    "projected_total": round_money(row["total"]),
                    "projectedTotal": round_money(row["total"]),
                    "installments_count": int(row["installments_count"]),
                    "itemsCount": int(row["installments_count"]),
                }
            )
    return result


def get_card_commitment(user_id: str, card_id: int, month: str, category_id: Optional[int] = None) -> dict:
    category_filter = "AND category_id = %s" if category_id else ""
    params: tuple[Any, ...] = (user_id, card_id, month)
    if category_id:
        params = (*params, category_id)
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS remaining_installments
            FROM transactions
            WHERE user_id = %s
              AND card_id = %s
              AND type = 'expense'
              AND installment_group IS NOT NULL
              AND billing_month >= %s
              {category_filter}
            """,
            params,
        )
        row = require_row(normalize_row(cursor.fetchone()), "Comprometimento do cartão não encontrado.")
    return {
        "committedLimit": round_money(row["total"]),
        "remainingInstallments": int(row["remaining_installments"]),
    }


def get_grouped_installment_purchases(user_id: str, card_id: int, month: str, category_id: Optional[int] = None) -> list[dict]:
    category_filter = "AND category_id = %s" if category_id else ""
    params: tuple[Any, ...] = (user_id, card_id, month)
    if category_id:
        params = (*params, category_id)
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
              installment_group,
              MIN(title) AS title,
              MIN(transaction_date) AS purchase_date,
              MIN(billing_month) AS first_open_month,
              MAX(billing_month) AS last_month,
              MAX(total_installments) AS total_installments,
              COUNT(*) AS remaining_installments,
              COALESCE(SUM(amount), 0) AS remaining_amount
            FROM transactions
            WHERE user_id = %s
              AND card_id = %s
              AND type = 'expense'
              AND installment_group IS NOT NULL
              AND billing_month >= %s
              {category_filter}
            GROUP BY installment_group
            ORDER BY first_open_month ASC, title ASC
            """,
            params,
        )
        rows = normalize_rows(cursor.fetchall())

    return [
        {
            "group": row["installment_group"],
            "title": row["title"],
            "purchaseDate": row["purchase_date"],
            "firstOpenMonth": row["first_open_month"],
            "lastMonth": row["last_month"],
            "totalInstallments": int(row["total_installments"] or 0),
            "remainingInstallments": int(row["remaining_installments"] or 0),
            "remainingAmount": round_money(row["remaining_amount"]),
        }
        for row in rows
    ]


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


def get_unlocked_card_details(
    user_id: str,
    card_id: int,
    month: str,
    include_token: bool = False,
    category_id: Optional[int] = None,
) -> dict:
    card = get_card_for_user(user_id, card_id)
    invoice = get_invoice_total(user_id, card_id, month)
    commitment = get_card_commitment(user_id, card_id, month, category_id)
    usage = (invoice / round_money(card["credit_limit"])) if round_money(card["credit_limit"]) > 0 else Decimal("0")
    invoice_alert = None
    if usage > Decimal("0.8"):
        invoice_alert = {
            "type": "danger" if usage > Decimal("0.9") else "warning",
            "message": "Fatura alta para o limite do cartão.",
            "usagePercent": int((usage * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP)),
        }
    details = {
        "id": card["id"],
        "name": card["name"],
        "brand": card["brand"],
        "last_four": card["last_four"],
        "credit_limit": round_money(card["credit_limit"]),
        "invoice": invoice,
        "available_credit": round_money(card["credit_limit"] - invoice),
        "committed_limit": commitment["committedLimit"],
        "committedLimit": commitment["committedLimit"],
        "remainingInstallments": commitment["remainingInstallments"],
        "closing_day": card["closing_day"],
        "due_day": card["due_day"],
        "active_installments": get_active_installments(user_id, card_id, month),
        "groupedInstallments": get_grouped_installment_purchases(user_id, card_id, month, category_id),
        "invoiceAlert": invoice_alert,
        "upcoming_invoices": simulate_card_invoices(user_id, card_id, month, 12, category_id),
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
            inflow = round_money(row["inflow"])
            outflow = round_money(row["outflow"])
            monthly_trend.append(
                {
                    "month": month_key,
                    "label": format_month_label(month_key),
                    "inflow": inflow,
                    "outflow": outflow,
                    "net": round_money(inflow - outflow),
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

    inflow = round_money(totals["inflow"])
    outflow = round_money(totals["outflow"])

    return {
        "month": month,
        "monthlyIncome": settings["monthly_income"],
        "inflow": inflow,
        "outflow": outflow,
        "balance": round_money(settings["monthly_income"] + inflow - outflow),
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
    today = datetime.now(timezone.utc).date()
    current_month = today.strftime("%Y-%m")
    if month < current_month:
        progress_day = total_days
    elif month > current_month:
        progress_day = 1
    else:
        progress_day = min(today.day, total_days)
    cutoff_date = date(year, month_num, progress_day).isoformat()

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
        totals = require_row(normalize_row(cursor.fetchone()), "Totais das metas não encontrados.")
        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS outflow
            FROM transactions
            WHERE user_id = %s
              AND type = 'expense'
              AND COALESCE(billing_month, substring(transaction_date from 1 for 7)) = %s
              AND transaction_date <= %s
            """,
            (user_id, month, cutoff_date),
        )
        current_outflow_row = require_row(normalize_row(cursor.fetchone()), "Gasto atual não encontrado.")

    day_map = {int(row["day"]): round_money(row["total"]) for row in rows}
    days: list[dict] = []
    legacy_daily_goal = round_money(settings["daily_goal"])
    reserve_amount = round_money(settings.get("reserve_amount") or 0)
    monthly_income = round_money(settings["monthly_income"] or 0)
    inflow = round_money(totals["inflow"])
    outflow = round_money(totals["outflow"])
    outflow_to_today = round_money(current_outflow_row["outflow"])
    available_budget = round_money(monthly_income + inflow - reserve_amount)
    recommended_daily_goal = round_money(available_budget / Decimal(total_days)) if available_budget > 0 else Decimal("0.00")
    target_daily_goal = recommended_daily_goal if recommended_daily_goal > 0 else legacy_daily_goal
    current_average_spend = round_money(outflow_to_today / Decimal(progress_day)) if progress_day > 0 else Decimal("0.00")
    projected_closing = round_money(current_average_spend * Decimal(total_days))
    allowed_remaining = round_money(available_budget - outflow_to_today)

    if available_budget <= 0 and projected_closing > 0:
        status_name = "red"
    elif available_budget <= 0 or projected_closing <= available_budget:
        status_name = "green"
    elif projected_closing <= available_budget * Decimal("1.10"):
        status_name = "yellow"
    else:
        status_name = "red"

    for day_number in range(1, total_days + 1):
        spent = round_money(day_map.get(day_number, Decimal("0")))
        remaining = round_money(target_daily_goal - spent)
        progress = float(min(Decimal("100"), (spent / target_daily_goal) * Decimal("100"))) if target_daily_goal > 0 else 0.0
        day_status = "over" if spent > target_daily_goal else ("empty" if spent == 0 else "ok")
        days.append(
            {
                "day": day_number,
                "spent": spent,
                "remaining": remaining,
                "progress": progress,
                "status": day_status,
            }
        )

    days_above_goal = len([day for day in days if to_decimal(day["spent"]) > target_daily_goal])
    days_below_goal = len([day for day in days if Decimal("0") < to_decimal(day["spent"]) <= target_daily_goal])
    risk_alert = {
        "green": "Ritmo dentro do orçamento planejado.",
        "yellow": "A projeção está até 10% acima do orçamento.",
        "red": "A projeção passa de 10% acima do orçamento.",
    }[status_name]

    return {
        "month": month,
        "dailyGoal": legacy_daily_goal,
        "reserveAmount": reserve_amount,
        "monthlyBudget": available_budget,
        "availableBudget": available_budget,
        "recommendedDailyGoal": recommended_daily_goal,
        "targetDailyGoal": target_daily_goal,
        "allowedRemaining": allowed_remaining,
        "daysAboveGoal": days_above_goal,
        "daysBelowGoal": days_below_goal,
        "currentAverageSpend": current_average_spend,
        "projectedClosing": projected_closing,
        "goalStatus": status_name,
        "riskAlert": risk_alert,
        "totalOutflow": outflow,
        "outflowToToday": outflow_to_today,
        "progressDay": progress_day,
        "totalDays": total_days,
        "days": days,
    }


def format_brl(value: Any) -> str:
    formatted = f"{round_money(value):,.2f}"
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
    return {"inflow": round_money(row["inflow"]), "outflow": round_money(row["outflow"])}


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
    monthly_income = round_money(settings["monthly_income"] or 0)
    totals = get_month_totals(user_id, month)
    inflow = totals["inflow"]
    outflow = totals["outflow"]
    base = 1000
    breakdown = {"gastos": 0, "consistencia": 0, "reservas": 0, "cartoes": 0}

    denominator = monthly_income + inflow
    ratio_gastos = (outflow / denominator) if denominator > 0 else (Decimal("1") if outflow > 0 else Decimal("0"))
    if ratio_gastos > Decimal("0.9"):
        breakdown["gastos"] = -200
    elif ratio_gastos > Decimal("0.75"):
        breakdown["gastos"] = -120
    elif ratio_gastos > Decimal("0.6"):
        breakdown["gastos"] = -60
    elif ratio_gastos > Decimal("0.4"):
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

    total_reserva = round_money(reserve_row["total"] or 0)
    if total_reserva > 0 and monthly_income > 0:
        breakdown["reservas"] = min(100, int((total_reserva / monthly_income) * Decimal("200")))

    for card in list_cards(user_id):
        credit_limit = round_money(card["credit_limit"] or 0)
        if credit_limit <= 0:
            continue
        uso_pct = get_invoice_total(user_id, int(card["id"]), month) / credit_limit
        if uso_pct > Decimal("0.9"):
            breakdown["cartoes"] -= 80
        elif uso_pct > Decimal("0.7"):
            breakdown["cartoes"] -= 40

    base += sum(breakdown.values())
    score = max(0, min(1000, int(base)))
    label = get_score_label(score)
    return {"score": score, "label": label["label"], "color": label["color"], "breakdown": breakdown}


def get_alerts_for_month(user_id: str, month: str) -> list[dict]:
    settings = get_settings(user_id)
    monthly_income = round_money(settings["monthly_income"] or 0)
    totals = get_month_totals(user_id, month)
    alerts: list[dict] = []

    for card in list_cards(user_id):
        credit_limit = round_money(card["credit_limit"] or 0)
        if credit_limit <= 0:
            continue
        invoice = get_invoice_total(user_id, int(card["id"]), month)
        usage = invoice / credit_limit
        if usage > Decimal("0.8"):
            usage_percent = int((usage * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP))
            alerts.append(
                {
                    "type": "danger",
                    "category": "cart\u00e3o",
                    "message": f"Cart\u00e3o {card['name']} est\u00e1 com {usage_percent}% do limite",
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
            average = round_money(to_decimal(previous_row["total"] or 0) / Decimal("3"))
            current_total = round_money(category["total"] or 0)
            if average > 0 and current_total > average * Decimal("1.3"):
                percent = int((((current_total / average) - 1) * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP))
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

    next_invoice = round_money(next_invoice_row["total"] or 0)
    if next_invoice > Decimal("500"):
        alerts.append(
            {
                "type": "info",
                "category": "cart\u00e3o",
                "message": f"Fatura estimada em {format_brl(next_invoice)} para o pr\u00f3ximo m\u00eas",
            }
        )

    goals = get_goals(user_id, month)
    days = goals["days"]
    goal_reference = to_decimal(goals.get("targetDailyGoal") or goals["dailyGoal"])
    exceeded_days = [day for day in days if to_decimal(day["spent"]) > goal_reference]
    if days and len(exceeded_days) / len(days) > 0.5:
        alerts.append(
            {
                "type": "warning",
                "category": "meta",
                "message": "Meta di\u00e1ria estourada em mais da metade dos dias",
            }
        )
    if goals.get("goalStatus") in {"yellow", "red"}:
        alerts.append(
            {
                "type": "warning" if goals["goalStatus"] == "yellow" else "danger",
                "category": "meta",
                "message": goals["riskAlert"],
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
                key = (row["title"], round_money(row["amount"]), row["category_id"], suggested_date)
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
                        "amount": round_money(row["amount"]),
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

    class Config:
        extra = "forbid"


class SettingsPayload(BaseModel):
    monthlyIncome: Optional[Decimal] = Field(default=None, ge=0, le=999999999)
    dailyGoal: Optional[Decimal] = Field(default=None, gt=0, le=999999999)
    reserveAmount: Optional[Decimal] = Field(default=None, ge=0, le=999999999)

    class Config:
        extra = "forbid"


class CategoryPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    type: Literal["income", "expense"] = "expense"
    color: str = Field(default="#9be768", min_length=1, max_length=20)
    icon: str = Field(default="\u25cf", min_length=1, max_length=10)

    class Config:
        extra = "forbid"


class TransactionPayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    amount: Decimal = Field(..., gt=0, le=999999999)
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

    class Config:
        extra = "forbid"


class CardPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    brand: str = Field(..., min_length=1, max_length=40)
    lastFour: str = Field(..., min_length=4, max_length=4)
    creditLimit: Decimal = Field(..., ge=0, le=999999999)
    closingDay: int = Field(..., ge=1, le=31)
    dueDay: int = Field(..., ge=1, le=31)
    color: str = Field(default="#171717", min_length=1, max_length=20)

    class Config:
        extra = "forbid"


class InstallmentPayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    categoryId: Optional[int] = Field(default=None, ge=1)
    totalAmount: Decimal = Field(..., gt=0, le=999999999)
    totalInstallments: int = Field(..., ge=2, le=24)
    purchaseDate: str = Field(..., min_length=10, max_length=10)
    notes: str = Field(default="", max_length=1000)

    class Config:
        extra = "forbid"


class PurchaseSimulationPayload(BaseModel):
    totalAmount: Decimal = Field(..., gt=0, le=999999999)
    totalInstallments: int = Field(..., ge=2, le=24)
    purchaseDate: str = Field(..., min_length=10, max_length=10)
    months: int = Field(default=12, ge=1, le=24)

    class Config:
        extra = "forbid"


class CsvColumnMapping(BaseModel):
    date: str = Field(..., min_length=1, max_length=120)
    description: str = Field(..., min_length=1, max_length=120)
    value: str = Field(..., min_length=1, max_length=120)
    type: Optional[str] = Field(default=None, max_length=120)

    class Config:
        extra = "forbid"


class CsvImportPreviewPayload(BaseModel):
    importToken: str = Field(..., min_length=16, max_length=200)
    mapping: CsvColumnMapping

    class Config:
        extra = "forbid"


class CsvImportConfirmPayload(CsvImportPreviewPayload):
    pass


class PinPayload(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6)

    class Config:
        extra = "forbid"


class ProfilePayload(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    send_monthly_summary: Optional[bool] = None

    class Config:
        extra = "forbid"


class ChangePasswordPayload(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=72)
    new_password: str = Field(..., min_length=8, max_length=72)

    class Config:
        extra = "forbid"


class RecurringPayload(BaseModel):
    is_recurring: bool
    recurrence_type: Optional[Literal["monthly", "weekly"]] = None
    recurrence_day: Optional[int] = Field(default=None, ge=0, le=31)

    class Config:
        extra = "forbid"


def validate_csv_mapping(columns: list[str], mapping: CsvColumnMapping) -> None:
    required = [mapping.date, mapping.description, mapping.value]
    if mapping.type:
        required.append(mapping.type)
    missing = [column for column in required if column not in columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Colunas não encontradas: {', '.join(missing)}.")


def get_csv_import_session(user_id: str, token: str) -> dict:
    session = csv_import_sessions.get(token)
    if not session or session["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Importação não encontrada ou expirada.")
    return session


def cleanup_csv_import_sessions() -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    for token, session in list(csv_import_sessions.items()):
        created_at = session.get("created_at")
        if not isinstance(created_at, datetime) or created_at < cutoff:
            csv_import_sessions.pop(token, None)


def build_csv_import_preview(user_id: str, session: dict, mapping: CsvColumnMapping) -> dict:
    validate_csv_mapping(session["columns"], mapping)

    parsed_rows: list[dict] = []
    errors_list: list[dict] = []
    for index, row in enumerate(session["rows"], start=1):
        try:
            transaction_date = parse_import_date(row.get(mapping.date))
            description = clean_text(row.get(mapping.description, ""), "Descrição", 200)
            signed_amount = parse_decimal_text(row.get(mapping.value))
            transaction_type = parse_import_type(row.get(mapping.type) if mapping.type else None, signed_amount)
            amount = round_money(abs(signed_amount))
            if amount <= 0:
                raise ValueError("Valor precisa ser maior que zero.")
            duplicate_hash = build_duplicate_hash(user_id, transaction_date, description, amount)
            parsed_rows.append(
                {
                    "line": index,
                    "transactionDate": transaction_date,
                    "title": description,
                    "rawDescription": row.get(mapping.description, ""),
                    "amount": amount,
                    "type": transaction_type,
                    "duplicateHash": duplicate_hash,
                }
            )
        except (ValueError, HTTPException) as exc:
            detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
            errors_list.append({"line": index, "detail": detail})

    return {
        "importToken": session["token"],
        "columns": session["columns"],
        "totalRows": len(session["rows"]),
        "validRows": len(parsed_rows),
        "invalidRows": len(errors_list),
        "preview": parsed_rows[:CSV_IMPORT_PREVIEW_LIMIT],
        "errors": errors_list[:CSV_IMPORT_PREVIEW_LIMIT],
        "rows": parsed_rows,
    }


@app.get("/api/health")
def health():
    conn = None
    started_at = time.perf_counter()
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        latency_ms = round((time.perf_counter() - started_at) * 1000, 2)
        return {
            "ok": True,
            "db": "connected",
            "version": "2.0.0",
            "uptime_seconds": int(time.time() - startup_time),
            "checks": {
                "database": {"status": "ok", "latency_ms": latency_ms},
                "migrations": {"status": "ok"},
            },
        }
    except Exception:
        logger.exception("Health check failed")
        return JSONResponse(
            {
                "ok": False,
                "db": "error",
                "version": "2.0.0",
                "uptime_seconds": int(time.time() - startup_time),
                "checks": {
                    "database": {"status": "error", "latency_ms": None},
                    "migrations": {"status": "unknown"},
                },
            },
            status_code=503,
        )
    finally:
        if conn is not None:
            release_connection(conn)


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("3 per 1 hour")
def register(request: Request, payload: RegisterPayload) -> dict:
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
        audit_log("user_register_failed", None, {"email_hash": email_hash(email), "reason": "duplicate"})
        raise HTTPException(status_code=400, detail="E-mail j\u00e1 cadastrado.")

    audit_log("user_registered", str(user["id"]), {"email_hash": email_hash(email)})
    return {"access_token": create_access_token(user["id"]), "token_type": "bearer"}  # nosec B105


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
        audit_log("login_failed", str(user["id"]) if user else None, {"email_hash": email_hash(email_value)})
        raise HTTPException(status_code=401, detail="E-mail ou senha inv\u00e1lidos.")

    audit_log("login_success", str(user["id"]), {"email_hash": email_hash(email_value)})
    return {"access_token": create_access_token(user["id"]), "token_type": "bearer"}  # nosec B105


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
    audit_log("password_changed", current_user["id"])
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
def logout(token: str = Depends(oauth2_scheme), current_user: dict = Depends(get_current_user)) -> dict:
    revoke_token(token)
    return {"message": "Sessao encerrada no servidor."}


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


@app.post("/api/imports/csv/upload")
def upload_csv_import(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)) -> dict:
    cleanup_csv_import_sessions()
    filename = file.filename or ""
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Envie um arquivo com extensão .csv.")
    if content_type not in CSV_IMPORT_ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Content-Type de CSV inválido.")

    content = file.file.read(CSV_IMPORT_MAX_BYTES + 1)
    if len(content) > CSV_IMPORT_MAX_BYTES:
        raise HTTPException(status_code=413, detail="CSV excede o tamanho máximo de 1 MB.")

    columns, rows = parse_csv_rows(content)
    token = secrets.token_urlsafe(32)
    csv_import_sessions[token] = {
        "token": token,
        "user_id": current_user["id"],
        "filename": filename,
        "columns": columns,
        "rows": rows,
        "created_at": datetime.now(timezone.utc),
    }
    return {
        "importToken": token,
        "filename": filename,
        "columns": columns,
        "totalRows": len(rows),
        "preview": rows[:CSV_IMPORT_PREVIEW_LIMIT],
    }


@app.post("/api/imports/csv/preview")
def preview_csv_import(payload: CsvImportPreviewPayload, current_user: dict = Depends(get_current_user)) -> dict:
    session = get_csv_import_session(current_user["id"], payload.importToken)
    preview = build_csv_import_preview(current_user["id"], session, payload.mapping)
    preview.pop("rows", None)
    return preview


@app.post("/api/imports/csv/confirm")
def confirm_csv_import(payload: CsvImportConfirmPayload, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["id"]
    session = get_csv_import_session(user_id, payload.importToken)
    preview = build_csv_import_preview(user_id, session, payload.mapping)

    imported: list[dict] = []
    duplicates: list[dict] = []
    with db_cursor(commit=True) as cursor:
        for row in preview["rows"]:
            cursor.execute(
                """
                SELECT id
                FROM transactions
                WHERE user_id = %s AND duplicate_hash = %s
                LIMIT 1
                """,
                (user_id, row["duplicateHash"]),
            )
            if cursor.fetchone():
                duplicates.append(row)
                continue

            cursor.execute(
                """
                INSERT INTO transactions
                  (user_id, title, amount, type, category_id, payment_method, transaction_date, notes, card_id,
                   billing_month, installment_group, installment_number, total_installments, source, external_id,
                   imported_at, raw_description, duplicate_hash)
                VALUES (%s, %s, %s, %s, NULL, 'csv_import', %s, '', NULL, NULL, NULL, NULL, NULL,
                        'csv_import', %s, NOW(), %s, %s)
                RETURNING *
                """,
                (
                    user_id,
                    row["title"],
                    row["amount"],
                    row["type"],
                    row["transactionDate"],
                    row["duplicateHash"],
                    row["rawDescription"],
                    row["duplicateHash"],
                ),
            )
            imported.append(require_row(normalize_row(cursor.fetchone()), "Lançamento importado não criado."))

    csv_import_sessions.pop(payload.importToken, None)
    return {
        "imported": len(imported),
        "duplicates": len(duplicates),
        "invalidRows": preview["invalidRows"],
        "transactions": imported,
    }


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
    audit_log("card_pin_set", user_id, {"card_id": card_id})
    return {"ok": True}


@app.post("/api/cards/{card_id}/unlock")
def unlock_card(
    card_id: int,
    payload: PinPayload,
    month: Optional[str] = None,
    categoryId: Optional[int] = Query(default=None, ge=1),
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
        audit_log("card_pin_wrong", user_id, {"card_id": card_id, "attempts_remaining": attempts_remaining})
        if attempts_remaining <= 0:
            audit_log("card_pin_blocked", user_id, {"card_id": card_id})
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
    audit_log("card_unlocked", user_id, {"card_id": card_id})
    return get_unlocked_card_details(user_id, card_id, month_key, include_token=True, category_id=categoryId)


@app.get("/api/cards/{card_id}/simulate-invoices")
def simulate_invoices_route(
    card_id: int,
    months: int = Query(12, ge=1, le=24),
    month: Optional[str] = None,
    categoryId: Optional[int] = Query(default=None, ge=1),
    x_card_unlock_token: str = Header(..., alias="X-Card-Unlock-Token"),
    current_user: dict = Depends(get_current_user),
) -> list[dict]:
    user_id = current_user["id"]
    month_key = validate_month_text(month) or get_current_month()
    get_card_for_user(user_id, card_id)
    verify_card_unlock_session(user_id, card_id, x_card_unlock_token)
    return simulate_card_invoices(user_id, card_id, month_key, months, categoryId)


@app.post("/api/cards/{card_id}/purchase-simulation")
def simulate_card_purchase(
    card_id: int,
    payload: PurchaseSimulationPayload,
    current_user: dict = Depends(get_current_user),
) -> dict:
    user_id = current_user["id"]
    get_card_for_user(user_id, card_id)
    purchase_date = validate_date_text(payload.purchaseDate, "Data da compra")
    base_month = month_key_from_date(purchase_date)
    installment_amounts = distribute_installments(payload.totalAmount, payload.totalInstallments)
    current_invoices = simulate_card_invoices(user_id, card_id, base_month, payload.months)
    simulated_by_month = {
        add_months(base_month, index): amount for index, amount in enumerate(installment_amounts)
    }

    projection = []
    for invoice in current_invoices:
        simulated_amount = round_money(simulated_by_month.get(invoice["month"], Decimal("0")))
        projection.append(
            {
                "month": invoice["month"],
                "currentInvoice": invoice["projected_total"],
                "simulatedInstallment": simulated_amount,
                "projectedTotal": round_money(invoice["projected_total"] + simulated_amount),
            }
        )

    return {
        "cardId": card_id,
        "totalAmount": round_money(payload.totalAmount),
        "totalInstallments": payload.totalInstallments,
        "installments": installment_amounts,
        "projection": projection,
    }


@app.post("/api/settings")
def save_settings(payload: SettingsPayload, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["id"]
    current = get_settings(user_id)
    monthly_income = round_money(payload.monthlyIncome if payload.monthlyIncome is not None else current["monthly_income"])
    daily_goal = round_money(payload.dailyGoal if payload.dailyGoal is not None else current["daily_goal"])
    reserve_amount = round_money(payload.reserveAmount if payload.reserveAmount is not None else current["reserve_amount"])

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE settings
            SET monthly_income = %s, daily_goal = %s, reserve_amount = %s
            WHERE user_id = %s AND id = 1
            RETURNING *
            """,
            (monthly_income, daily_goal, reserve_amount, user_id),
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
                   installment_group, installment_number, total_installments, is_recurring, recurrence_type, recurrence_day, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, NULL, NULL, %s, %s, %s, 'manual')
                RETURNING *
                """,
                (
                    user_id,
                    title,
                    round_money(payload.amount),
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


def get_export_transactions(user_id: str, month_key: str) -> list[dict]:
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
        return normalize_rows(cursor.fetchall())


@app.get("/api/export/csv")
@limiter.limit("20 per 1 hour")
def export_csv(request: Request, month: Optional[str] = None, current_user: dict = Depends(get_current_user)) -> Response:
    user_id = current_user["id"]
    month_key = validate_month_text(month) or get_current_month()
    rows = get_export_transactions(user_id, month_key)

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
                f"{round_money(row.get('amount') or 0):.2f}",
                row.get("payment_method") or "",
                row.get("card_name") or "",
                installment,
            ]
        )

    headers = {"Content-Disposition": f'attachment; filename="financeiro-{month_key}.csv"'}
    return Response(content="\ufeff" + output.getvalue(), media_type="text/csv; charset=utf-8", headers=headers)


def pdf_escape(value: Any) -> str:
    text = str(value or "").encode("latin-1", "replace").decode("latin-1")
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap_pdf_line(line: str, max_length: int = 92) -> list[str]:
    words = line.split()
    if not words:
        return [""]

    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        if len(current) + len(word) + 1 <= max_length:
            current = f"{current} {word}"
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def build_basic_pdf(lines: list[str]) -> bytes:
    prepared_lines: list[str] = []
    for line in lines:
        prepared_lines.extend(wrap_pdf_line(line))

    max_lines_per_page = 46
    pages = [
        prepared_lines[index : index + max_lines_per_page]
        for index in range(0, len(prepared_lines), max_lines_per_page)
    ] or [["Sem dados para exibir."]]

    page_count = len(pages)
    font_object_id = 3 + page_count * 2
    objects: dict[int, bytes] = {
        1: b"<< /Type /Catalog /Pages 2 0 R >>",
        font_object_id: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    }

    page_ids: list[int] = []
    for index, page_lines in enumerate(pages):
        page_id = 3 + index * 2
        content_id = page_id + 1
        page_ids.append(page_id)

        commands = ["BT", "/F1 11 Tf", "50 800 Td"]
        for line_index, line in enumerate(page_lines):
            if line_index:
                commands.append("0 -16 Td")
            commands.append(f"({pdf_escape(line)}) Tj")
        commands.append("ET")

        stream = "\n".join(commands).encode("latin-1", "replace")
        objects[content_id] = (
            f"<< /Length {len(stream)} >>\nstream\n".encode("ascii")
            + stream
            + b"\nendstream"
        )
        objects[page_id] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_object_id} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        ).encode("ascii")

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {page_count} >>".encode("ascii")

    pdf = b"%PDF-1.4\n"
    offsets = [0]
    for object_id in range(1, max(objects) + 1):
        offsets.append(len(pdf))
        pdf += f"{object_id} 0 obj\n".encode("ascii") + objects[object_id] + b"\nendobj\n"

    xref_offset = len(pdf)
    pdf += f"xref\n0 {len(offsets)}\n".encode("ascii")
    pdf += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n".encode("ascii")
    pdf += (
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    ).encode("ascii")
    return pdf


@app.get("/api/export/pdf")
@limiter.limit("20 per 1 hour")
def export_pdf(request: Request, month: Optional[str] = None, current_user: dict = Depends(get_current_user)) -> Response:
    user_id = current_user["id"]
    month_key = validate_month_text(month) or get_current_month()
    settings = get_settings(user_id)
    totals = get_month_totals(user_id, month_key)
    score_data = calculate_score(user_id, month_key)
    rows = get_export_transactions(user_id, month_key)
    balance = round_money(settings["monthly_income"] or 0) + totals["inflow"] - totals["outflow"]

    lines = [
        "Ritmo Financeiro Pro",
        f"Relatorio financeiro - {month_key}",
        "",
        f"Salario base: {format_brl(settings['monthly_income'] or 0)}",
        f"Entradas: {format_brl(totals['inflow'])}",
        f"Saidas: {format_brl(totals['outflow'])}",
        f"Saldo projetado: {format_brl(balance)}",
        f"Ritmo Score: {score_data['score']} - {score_data['label']}",
        "",
        "Transacoes",
    ]

    if not rows:
        lines.append("Nenhuma transacao encontrada para este mes.")
    for row in rows:
        installment = ""
        if row.get("total_installments"):
            installment = f" ({row.get('installment_number')}/{row.get('total_installments')})"
        sign = "+" if row.get("type") == "income" else "-"
        lines.append(
            " | ".join(
                [
                    str(row.get("transaction_date") or ""),
                    str(row.get("title") or ""),
                    str(row.get("category_name") or "Sem categoria"),
                    str(row.get("payment_method") or ""),
                    f"{sign}{format_brl(row.get('amount') or 0)}{installment}",
                ]
            )
        )

    headers = {"Content-Disposition": f'attachment; filename="financeiro-{month_key}.pdf"'}
    return Response(content=build_basic_pdf(lines), media_type="application/pdf", headers=headers)


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
            (user_id, name, brand, last_four, round_money(payload.creditLimit), payload.closingDay, payload.dueDay, color),
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
    try:
        installment_amounts = distribute_installments(payload.totalAmount, payload.totalInstallments)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

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
            for number, amount in enumerate(installment_amounts, start=1):
                cursor.execute(
                    """
                    INSERT INTO transactions
                      (user_id, title, amount, type, category_id, payment_method, transaction_date, notes, card_id,
                       billing_month, installment_group, installment_number, total_installments, source)
                    VALUES (%s, %s, %s, 'expense', %s, 'cr\u00e9dito', %s, %s, %s, %s, %s, %s, %s, 'manual')
                    """,
                    (
                        user_id,
                        title,
                        amount,
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
            audit_log("transaction_deleted", user_id, {"transaction_id": transaction_id, "group": True})
            return {"deletedGroup": True}

        cursor.execute(
            """
            DELETE FROM transactions
            WHERE user_id = %s AND id = %s
            """,
            (user_id, transaction_id),
        )
    audit_log("transaction_deleted", user_id, {"transaction_id": transaction_id, "group": False})
    return {"deleted": True}


if FRONTEND_OUT_DIR.exists():

    @app.get("/")
    def frontend_index() -> FileResponse:
        return FileResponse(FRONTEND_OUT_DIR / "index.html")

    app.mount("/", StaticFiles(directory=FRONTEND_OUT_DIR, html=True), name="frontend")
else:

    @app.get("/")
    def api_root() -> dict:
        return {"service": "Ritmo Financeiro Pro API", "docs": "/docs", "health": "/api/health"}
