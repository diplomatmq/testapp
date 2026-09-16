from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_title: str = Field(default="Monkey Dynasty Mini App", alias="APP_TITLE")
    environment: Literal["development", "production"] = Field(default="development", alias="ENVIRONMENT")
    frontend_url: str = Field(default="http://localhost:5173", alias="FRONTEND_URL")
    backend_url: str = Field(default="http://localhost:8000", alias="BACKEND_URL")
    database_url: str = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5432/testapp", alias="DATABASE_URL")
    bot_token: str = Field(default="", alias="BOT_TOKEN")
    secret_key: str = Field(default="change-me", alias="SECRET_KEY")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
