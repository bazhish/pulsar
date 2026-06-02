from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass(frozen=True)
class ImportedTransaction:
    external_id: str | None
    transaction_date: str
    description: str
    amount: Decimal
    source: str
    raw_payload: dict


class FinancialDataSource(Protocol):
    source_name: str

    def fetch_transactions(self, user_id: str, month: str) -> list[ImportedTransaction]:
        """Return normalized transactions for a user/month without persisting them."""
