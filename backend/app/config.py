"""Gesco V2 configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Gesco V2"
    debug: bool = True

    # Database — default apunta a PostgreSQL via Docker Compose
    database_url: str = "postgresql+asyncpg://gesco:gesco123@db:5432/gesco_v2"

    # CORS — dominios permitidos
    cors_origins: str = (
        "http://localhost:3000,http://frontend:3000,"
        "https://contratos.esenorte3.lat,https://www.contratos.esenorte3.lat"
    )

    # Uploads
    upload_dir: str = "/app/uploads"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
