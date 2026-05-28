from __future__ import annotations

from app.services.finance_service import add_months, month_range


def test_add_months_forward_and_backward():
    assert add_months("2024-12", 1) == "2025-01"
    assert add_months("2024-01", -1) == "2023-12"


def test_month_range_regular_month():
    assert month_range("2024-04") == ("2024-04-01", "2024-04-30")
