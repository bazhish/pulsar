from __future__ import annotations

import hashlib
import re
from decimal import Decimal
from typing import Any

from app.shared.money import round_money, to_decimal


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
