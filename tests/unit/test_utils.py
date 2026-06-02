from __future__ import annotations

from app.main import add_months, get_month_range


def test_add_months_forward_and_backward():
    assert add_months("2024-12", 1) == "2025-01"
    assert add_months("2024-01", -1) == "2023-12"


def test_month_range_regular_month():
    assert get_month_range("2024-04") == ("2024-04-01", "2024-04-30")
