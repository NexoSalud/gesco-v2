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


@app.get("/api/debug/create-table")
async def debug_create_table():
    from app.database import engine
    from sqlalchemy import text as _st
    async with engine.begin() as conn:
        await conn.execute(_st("CREATE TABLE IF NOT EXISTS plantillas_objeto (id SERIAL PRIMARY KEY, titulo VARCHAR(200) NOT NULL, contenido TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())"))
        from app.models.plantilla_objeto import PlantillaObjeto
        logger.info(f"Tables in metadata: {list(Base.metadata.tables.keys())}")
    return {"status": "ok"}
