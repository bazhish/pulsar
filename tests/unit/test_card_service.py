from __future__ import annotations

import pytest
from fastapi import HTTPException

import app.main as main_module
from app.main import enforce_card_pin_rate_limit, record_card_pin_failure


def test_pin_rate_limit_blocks_after_max_attempts():
    main_module.card_pin_failures.clear()
    user_id = "00000000-0000-0000-0000-000000000001"
    card_id = 99
    for _ in range(main_module.PIN_MAX_ATTEMPTS):
        record_card_pin_failure(user_id, card_id)
    with pytest.raises(HTTPException) as exc:
        enforce_card_pin_rate_limit(user_id, card_id)
    assert exc.value.status_code == 429
