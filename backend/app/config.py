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

    # Gestión Contractual — login propio y almacenamiento privado de documentos.
    # El directorio NO debe estar bajo /app/uploads (que se sirve públicamente).
    gc_secret_key: str = "GESCO_GC_SECRET_KEY_CAMBIAR!"
    gc_upload_dir: str = "/app/private_uploads/gestion_contractual"
    gc_max_file_mb: int = 50
    gc_admin_password: str = "gcadmin123"
    # Los datos de contratos y contratistas se gestionan solo desde Gestión Contractual;
    # el módulo de contratos del GESCO principal queda en solo lectura.
    contratos_solo_lectura: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
