from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator, Protocol


class CursorFactory(Protocol):
    @contextmanager
    def __call__(self, commit: bool = False) -> Iterator[object]:
        yield
