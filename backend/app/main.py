"""Gesco V2 — Main entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from sqlalchemy import text
from app.routers import (
    resoluciones_router,
    contratos_router,
    contratistas_router,
    pagos_router,
    perfiles_router,
    plantillas_router,
    plantillas_objeto_router,
    export_router,
    import_router,
    actividades_router,
)
from app.models.plantilla_objeto import PlantillaObjeto
from app.seed_data import seed_database
from app.error_handlers import global_exception_handler, validation_exception_handler, http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables, run migrations & seed data."""
    logger.info("Inicializando base de datos...")
    async with engine.begin() as conn:
        logger.info(f"Tablas registradas en metadata: {list(Base.metadata.tables.keys())}")
        await conn.run_sync(Base.metadata.create_all)
        logger.info("create_all completado")

        # Migración: agregar columna activa a resoluciones si no existe
        try:
            await conn.execute(text("ALTER TABLE resoluciones ADD COLUMN activa BOOLEAN DEFAULT FALSE NOT NULL"))
            logger.info("Migración OK: columna 'activa' agregada a resoluciones")
            # Activar la resolución más reciente
            await conn.execute(text("""
                UPDATE resoluciones SET activa = TRUE WHERE id = (
                    SELECT id FROM resoluciones ORDER BY created_at DESC LIMIT 1
                )
            """))
            logger.info("Resolución más reciente marcada como activa")
        except Exception:
            logger.info("Columna 'activa' ya existe, saltando migración")
    # Migración: crear tabla plantillas_objeto (create_all no la creó automáticamente)
    try:
        async with engine.begin() as conn:
            from app.models.plantilla_objeto import PlantillaObjeto
            import sqlalchemy as sa
            if "plantillas_objeto" not in Base.metadata.tables:
                logger.warning("PlantillaObjeto no está en metadata, forzando import...")
            # Crear usando CREATE TABLE IF NOT EXISTS raw
            await conn.execute(text("CREATE TABLE IF NOT EXISTS plantillas_objeto (id SERIAL PRIMARY KEY, titulo VARCHAR(200) NOT NULL, contenido TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())"))
            logger.info("Migración OK: tabla plantillas_objeto creada/verificada")
    except Exception as e:
        logger.warning(f"Migración plantillas_objeto: {e}")

    # Migración: agregar columnas UNSPSC a perfiles y contratos
    for table, column, coltype in [
        ("perfiles", "codigo_unspsc", "VARCHAR(20)"),
        ("perfiles", "descripcion_unspsc", "VARCHAR(300)"),
        ("contratos", "codigo_unspsc", "VARCHAR(20)"),
        ("contratos", "descripcion_unspsc", "VARCHAR(300)"),
    ]:
        try:
            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}"))
            logger.info(f"Migración OK: columna '{column}' agregada a {table}")
        except Exception:
            logger.info(f"Columna '{column}' ya existe en {table}, saltando")

    await seed_database()
    logger.info("Gesco V2 listo!")
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(resoluciones_router)
app.include_router(contratos_router)
app.include_router(contratistas_router)
app.include_router(pagos_router)
app.include_router(perfiles_router)
app.include_router(plantillas_router)
app.include_router(plantillas_objeto_router)
app.include_router(export_router)
app.include_router(import_router)
app.include_router(actividades_router)

# Error handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name}


