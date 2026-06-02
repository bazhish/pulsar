from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    environment: str = os.getenv("ENVIRONMENT", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_format: str = os.getenv("LOG_FORMAT", "text")
    database_url: str = os.getenv("DATABASE_URL", "")
    jwt_algorithm: str = "HS256"
    access_token_expire_hours: int = 24

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


settings = Settings()
