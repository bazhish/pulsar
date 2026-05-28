from __future__ import annotations

import os

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
CARD_UNLOCK_SECONDS = 15 * 60
PIN_FAILURE_WINDOW_SECONDS = 5 * 60
PIN_MAX_ATTEMPTS = 3
LOG_FORMAT = os.getenv("LOG_FORMAT", "text")

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")


def is_production() -> bool:
    return ENVIRONMENT.lower() == "production"


def parse_allowed_origins() -> list[str]:
    raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    if origins:
        return origins
    if is_production():
        raise RuntimeError("ALLOWED_ORIGINS environment variable is required in production.")
    return ["http://localhost:8000", "http://127.0.0.1:8000"]


ALLOWED_ORIGINS = parse_allowed_origins()

DEFAULT_CATEGORIES: list[tuple[str, str, str, str, int]] = [
    ("Salario", "income", "#9be768", "BRL", 1),
    ("Freelance", "income", "#b8b8ff", "FR", 1),
    ("Investimentos", "income", "#7cd992", "INV", 1),
    ("Moradia", "expense", "#ff8a80", "CASA", 1),
    ("Alimentacao", "expense", "#ffd54f", "FOOD", 1),
    ("Mercado", "expense", "#ffcc80", "MERC", 1),
    ("Transporte", "expense", "#90caf9", "BUS", 1),
    ("Saude", "expense", "#ef9a9a", "SAU", 1),
    ("Educacao", "expense", "#ce93d8", "EDU", 1),
    ("Assinaturas", "expense", "#80cbc4", "SUB", 1),
    ("Lazer", "expense", "#f48fb1", "GAME", 1),
    ("Contas", "expense", "#b0bec5", "BILL", 1),
    ("Reserva", "expense", "#aed581", "RES", 1),
    ("Pets", "expense", "#bcaaa4", "PET", 1),
    ("Presentes", "expense", "#ffab91", "GIFT", 1),
    ("Outros", "expense", "#cfd8dc", "OUT", 1),
]

