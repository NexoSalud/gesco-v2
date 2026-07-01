"""Gesco V2 configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Gesco V2"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://gesco:gesco123@db:5432/gesco_v2"

    # CORS
    cors_origins: str = "http://localhost:3000,http://frontend:3000"

    # Uploads
    upload_dir: str = "/app/uploads"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
