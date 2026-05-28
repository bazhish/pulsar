from __future__ import annotations

from app.services.finance_service import add_months, format_brl, month_range


def test_format_brl():
    assert format_brl(1234.56) == "R$ 1.234,56"


def test_add_months_crosses_year_boundaries():
    assert add_months("2024-12", 1) == "2025-01"
    assert add_months("2024-01", -1) == "2023-12"


def test_month_range_handles_leap_year():
    assert month_range("2024-02") == ("2024-02-01", "2024-02-29")


def test_score_contract_range_with_stub():
    score = {"score": 720}
    assert 0 <= score["score"] <= 1000
