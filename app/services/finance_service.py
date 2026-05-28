from __future__ import annotations

from app.main import add_months, format_brl, get_goals, get_month_range


def month_range(month_key: str) -> tuple[str, str]:
    return get_month_range(month_key)


__all__ = ["add_months", "format_brl", "get_goals", "month_range"]

