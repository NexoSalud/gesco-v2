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
    supervisores_router,
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
    try:
        async with engine.begin() as conn:
            for table, column, coltype in [
                ("perfiles", "codigo_unspsc", "VARCHAR(20)"),
                ("perfiles", "descripcion_unspsc", "VARCHAR(300)"),
                ("contratos", "codigo_unspsc", "VARCHAR(20)"),
                ("contratos", "descripcion_unspsc", "VARCHAR(300)"),
            ]:
                try:
                    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {coltype}"))
                    logger.info(f"Migración OK: columna '{column}' agregada a {table}")
                except Exception as e:
                    logger.warning(f"Columna '{column}' en {table}: {e}")
            # Poblar UNSPSC en perfiles existentes que estén vacíos
            unspsc_defaults = {
                "MEDICINA": ("85111600", "SERVICIOS DE PERSONAL TEMPORAL"),
                "ENFERMERIA": ("85101601", "SERVICIOS DE ENFERMERÍA"),
                "PSICOLOGIA": ("85121608", "SERVICIOS DE PSICOLOGÍA"),
                "SALUD ORAL": ("85122001", "SERVICIOS DE ODONTÓLOGOS"),
                "HIGIENISTA ORAL": ("85122002", "SERVICIOS DE HIGIENISTAS ORALES"),
                "FONOAUDIOLOGIA": ("85111600", "SERVICIOS DE PERSONAL TEMPORAL"),
                "GESTOR COMUNITARIO": ("85111600", "SERVICIOS DE PERSONAL TEMPORAL"),
                "AUXILIAR ENFERMERIA": ("85101601", "SERVICIOS DE ENFERMERÍA"),
            }
            for nombre, (codigo, descripcion) in unspsc_defaults.items():
                try:
                    await conn.execute(text(
                        "UPDATE perfiles SET codigo_unspsc = :cod, descripcion_unspsc = :desc "
                        "WHERE nombre = :nom AND (codigo_unspsc IS NULL OR codigo_unspsc = '')"
                    ), {"cod": codigo, "desc": descripcion, "nom": nombre})
                    logger.info(f"UNSPSC actualizado para perfil '{nombre}'")
                except Exception as e:
                    logger.warning(f"UNSPSC perfil '{nombre}': {e}")
            # Poblar UNSPSC en contratos existentes que estén vacíos (heredar del perfil)
            for nombre, (codigo, descripcion) in unspsc_defaults.items():
                try:
                    await conn.execute(text(
                        "UPDATE contratos SET codigo_unspsc = :cod, descripcion_unspsc = :desc "
                        "WHERE perfil = :nom AND (codigo_unspsc IS NULL OR codigo_unspsc = '')"
                    ), {"cod": codigo, "desc": descripcion, "nom": nombre})
                    logger.info(f"UNSPSC actualizado para contratos con perfil '{nombre}'")
                except Exception as e:
                    logger.warning(f"UNSPSC contratos '{nombre}': {e}")
    except Exception as e:
        logger.warning(f"Migración UNSPSC: {e}")

    # Migración: crear tabla supervisores si no existe
    try:
        async with engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS supervisores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre VARCHAR(300) NOT NULL,
                    identificacion VARCHAR(20) NOT NULL UNIQUE,
                    cargo VARCHAR(200),
                    nivel_profesional VARCHAR(100),
                    telefono VARCHAR(30),
                    correo VARCHAR(200),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            logger.info("Migración OK: tabla supervisores creada/verificada")
    except Exception as e:
        logger.warning(f"Migración supervisores: {e}")

    # Migración: columnas para PDF de supervisión (campos originales)
    try:
        async with engine.begin() as conn:
            contratos_cols = [
                ("codigo_ciiu", "VARCHAR(50)"),
                ("nivel_prof_supervisor", "VARCHAR(100)"),
                ("interventor", "VARCHAR(200)"),
                ("nivel_prof_interventor", "VARCHAR(100)"),
                ("imputacion", "VARCHAR(100)"),
                ("tiempo_adicion", "VARCHAR(100)"),
                ("valor_final", "FLOAT DEFAULT NULL"),
                ("forma_pago", "TEXT"),
            ]
            for col, coltype in contratos_cols:
                try:
                    await conn.execute(text(f"ALTER TABLE contratos ADD COLUMN IF NOT EXISTS {col} {coltype}"))
                    logger.info(f"Migración OK: columna '{col}' agregada a contratos")
                except Exception as e:
                    logger.warning(f"Columna '{col}' en contratos: {e}")
            # Migración: anexa_cert en pagos
            try:
                await conn.execute(text("ALTER TABLE pagos ADD COLUMN IF NOT EXISTS anexa_cert VARCHAR(10)"))
                logger.info("Migración OK: columna 'anexa_cert' agregada a pagos")
            except Exception as e:
                logger.warning(f"Columna 'anexa_cert' en pagos: {e}")
    except Exception as e:
        logger.warning(f"Migración PDF supervisión: {e}")

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
app.include_router(supervisores_router)

# Error handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name}


