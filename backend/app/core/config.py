from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    PROJECT_NAME: str = "主数据管理系统 (MDM)"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    OPEN_API_PREFIX: str = "/api/open/v1"

    # Database
    DATABASE_URL: str = "sqlite:///./mdm.db"

    # Security
    JWT_SECRET: str = "mdm-secret-key-super-secure-change-in-prod-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Initial Admin Credentials
    INITIAL_ADMIN_USERNAME: str = "admin"
    INITIAL_ADMIN_PASSWORD: str = "Admin@123456"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5200",
        "http://127.0.0.1:5200",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []


settings = Settings()
