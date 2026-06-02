from __future__ import annotations

import hashlib


def stable_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
