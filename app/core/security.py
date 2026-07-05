from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

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

# Used so login performs a bcrypt verification even when the email does not exist
# (constant-time-ish defense against user enumeration by response timing).
DUMMY_PASSWORD_HASH = password_context.hash("DummyPassword1")


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 8 caracteres.")
    if len(password) > 72:
        raise HTTPException(status_code=400, detail="A senha excede o tamanho permitido.")
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="A senha não pode exceder 72 bytes.")
    if not any(char.isdigit() for char in password):
        raise HTTPException(status_code=400, detail="A senha deve conter pelo menos 1 número.")
    if not any(char.isupper() for char in password):
        raise HTTPException(status_code=400, detail="A senha deve conter pelo menos 1 letra maiúscula.")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return bool(password_context.verify(password, hashed_password))


def validate_pin(pin: str) -> str:
    cleaned = pin.strip()
    if not cleaned.isdigit() or not 4 <= len(cleaned) <= 6:
        raise HTTPException(status_code=400, detail="PIN deve conter de 4 a 6 dígitos numéricos.")
    return cleaned


def hash_pin(pin: str) -> str:
    return pin_context.hash(pin)


def verify_pin(pin: str, pin_hash: str) -> bool:
    return bool(pin_context.verify(pin, pin_hash))


def create_access_token(user_id: str) -> str:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(hours=settings.access_token_expire_hours)
    payload = {"sub": str(user_id), "iat": int(issued_at.timestamp()), "exp": int(expires_at.timestamp())}
    return jwt.encode(payload, settings.require_jwt_secret(), algorithm=settings.jwt_algorithm)
