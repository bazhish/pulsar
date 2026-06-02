from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any

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


def format_brl(value: Any) -> str:
    formatted = f"{round_money(value):,.2f}"
    return "R$ " + formatted.replace(",", "X").replace(".", ",").replace("X", ".")
