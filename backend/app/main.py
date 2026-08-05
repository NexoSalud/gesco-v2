"""Gesco V2 — Main entry point."""

import logging
from contextlib import asynccontextmanager
import os

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
    inventario_router,
    auth_router,
    seguridad_router,
    evaluacion_router,
    documentos_router,
    apoyo_router,
    maintenance_router,
)
from app.models.plantilla_objeto import PlantillaObjeto
from app.seed_data import seed_database
from app.error_handlers import global_exception_handler, validation_exception_handler, http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles

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
        async with engine.begin() as conn:
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
        logger.info("Columna 'activa' ya existe o resoluciones no tiene registros, saltando migración")
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
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(300) NOT NULL,
                    identificacion VARCHAR(20) NOT NULL UNIQUE,
                    cargo VARCHAR(200),
                    nivel_profesional VARCHAR(100),
                    telefono VARCHAR(30),
                    correo VARCHAR(200),
                    created_at TIMESTAMP DEFAULT NOW()
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
    # Migración: agregar columna usuario_id a actas_inventario
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE actas_inventario ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL"))
            logger.info("Migración OK: columna 'usuario_id' agregada a actas_inventario")
    except Exception as e:
        logger.info("Columna 'usuario_id' ya existe en actas_inventario o error al crearla, saltando: %s", e)

    # Migración: agregar columna resolucion_id a articulos y unidades_inventario
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE articulos ADD COLUMN resolucion_id INTEGER REFERENCES resoluciones(id) ON DELETE SET NULL"))
            logger.info("Migración OK: columna 'resolucion_id' agregada a articulos")
    except Exception as e:
        logger.info("Columna 'resolucion_id' ya existe en articulos o error al crearla, saltando: %s", e)

    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE unidades_inventario ADD COLUMN resolucion_id INTEGER REFERENCES resoluciones(id) ON DELETE SET NULL"))
            logger.info("Migración OK: columna 'resolucion_id' agregada a unidades_inventario")
    except Exception as e:
        logger.info("Columna 'resolucion_id' ya existe en unidades_inventario o error al crearla, saltando: %s", e)

    # Migración: crear tabla documentos_contratista si no existe
    try:
        async with engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS documentos_contratista (
                    id SERIAL PRIMARY KEY,
                    contratista_id INTEGER NOT NULL REFERENCES contratistas(id) ON DELETE CASCADE,
                    contrato_numero VARCHAR(50) NOT NULL REFERENCES contratos(numero_contrato) ON DELETE CASCADE,
                    tipo_documento VARCHAR(50) NOT NULL,
                    archivo_ruta VARCHAR(500) NOT NULL,
                    archivo_nombre VARCHAR(200) NOT NULL,
                    archivo_tamano INTEGER DEFAULT 0,
                    estado VARCHAR(20) DEFAULT 'PENDIENTE',
                    observacion TEXT,
                    evaluated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP,
                    evaluated_at TIMESTAMP
                )
            """))
            logger.info("Migración OK: tabla documentos_contratista creada/verificada")
    except Exception as e:
        logger.warning(f"Migración documentos_contratista: {e}")

    # Migración: crear tabla evidencias si no existe
    try:
        async with engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS evidencias (
                    id SERIAL PRIMARY KEY,
                    actividad_contrato_id INTEGER NOT NULL REFERENCES actividades_contrato(id) ON DELETE CASCADE,
                    contratista_id INTEGER NOT NULL REFERENCES contratistas(id) ON DELETE CASCADE,
                    contrato_id VARCHAR(50) NOT NULL REFERENCES contratos(numero_contrato) ON DELETE CASCADE,
                    tipo VARCHAR(20) NOT NULL,
                    contenido_texto TEXT,
                    archivo_ruta VARCHAR(500),
                    archivo_nombre VARCHAR(200),
                    archivo_tipo VARCHAR(50),
                    estado VARCHAR(20) DEFAULT 'PENDIENTE',
                    observacion_coordinadora TEXT,
                    evaluated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    evaluated_at TIMESTAMP
                )
            """))
            logger.info("Migración OK: tabla evidencias creada/verificada")
    except Exception as e:
        logger.warning(f"Migración evidencias: {e}")

    # Migración: actualizar fecha_cdp y fecha_inicio para contratos de Agosto 2026
    try:
        from app.migrations import migrar_fechas_agosto_2026
        resultado = await migrar_fechas_agosto_2026()
        logger.info(f"Migración agosto 2026: {resultado}")
    except Exception as e:
        logger.warning(f"Migración agosto 2026 — ya ejecutada o error: {e}")

    # ─── Migración: PERIODOS DE EVALUACIÓN (evaluaciones por mes) ───
    # Crea la tabla periodos_evaluacion, agrega periodo_id a
    # actividades_contrato y documentos_contratista, y hace backfill
    # desde los meses de fecha_inicio de los contratos existentes.
    try:
        async with engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS periodos_evaluacion (
                    id SERIAL PRIMARY KEY,
                    fecha DATE NOT NULL,
                    nombre VARCHAR(50) NOT NULL,
                    activo BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            await conn.execute(text(
                "ALTER TABLE actividades_contrato ADD COLUMN IF NOT EXISTS periodo_id INTEGER "
                "REFERENCES periodos_evaluacion(id) ON DELETE CASCADE"
            ))
            await conn.execute(text(
                "ALTER TABLE documentos_contratista ADD COLUMN IF NOT EXISTS periodo_id INTEGER "
                "REFERENCES periodos_evaluacion(id) ON DELETE CASCADE"
            ))
            logger.info("Migración OK: tabla periodos_evaluacion + columnas periodo_id")
    except Exception as e:
        logger.warning(f"Migración periodos_evaluacion (tabla/columnas): {e}")

    # Backfill: crear periodos desde los meses de los contratos existentes
    try:
        from datetime import date as _date
        from app.models.periodo_evaluacion import PeriodoEvaluacion
        from app.database import async_session_factory as _asf

        MESES_ES = [
            "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
            "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
        ]

        async with _asf() as db:
            # Meses distintos presentes en contratos
            res = await db.execute(text(
                "SELECT DISTINCT DATE_TRUNC('month', fecha_inicio) AS mes "
                "FROM contratos WHERE fecha_inicio IS NOT NULL ORDER BY mes"
            ))
            meses = [row[0] for row in res.all()]

            # Crear periodo por mes si no existe
            for mes in meses:
                mes_date = mes.date() if hasattr(mes, "date") else mes
                nombre = f"{MESES_ES[mes_date.month - 1]} {mes_date.year}"
                existe = await db.execute(
                    text("SELECT id FROM periodos_evaluacion WHERE fecha = :f"),
                    {"f": mes_date},
                )
                if not existe.scalar_one_or_none():
                    await db.execute(
                        text("INSERT INTO periodos_evaluacion (fecha, nombre, activo) VALUES (:f, :n, FALSE)"),
                        {"f": mes_date, "n": nombre},
                    )

            # Asignar actividades existentes sin periodo (por mes del contrato)
            await db.execute(text("""
                UPDATE actividades_contrato ac SET periodo_id = p.id
                FROM contratos c, periodos_evaluacion p
                WHERE ac.contrato_id = c.numero_contrato
                  AND c.fecha_inicio IS NOT NULL
                  AND DATE_TRUNC('month', c.fecha_inicio) = p.fecha
                  AND ac.periodo_id IS NULL
            """))
            # Asignar documentos existentes sin periodo
            await db.execute(text("""
                UPDATE documentos_contratista dc SET periodo_id = p.id
                FROM contratos c, periodos_evaluacion p
                WHERE dc.contrato_numero = c.numero_contrato
                  AND c.fecha_inicio IS NOT NULL
                  AND DATE_TRUNC('month', c.fecha_inicio) = p.fecha
                  AND dc.periodo_id IS NULL
            """))
            # Marcar activo el periodo más reciente (si ninguno está activo)
            hay_activo = await db.execute(
                text("SELECT id FROM periodos_evaluacion WHERE activo = TRUE LIMIT 1")
            )
            if not hay_activo.scalar_one_or_none():
                await db.execute(text("""
                    UPDATE periodos_evaluacion SET activo = TRUE
                    WHERE id = (SELECT id FROM periodos_evaluacion ORDER BY fecha DESC LIMIT 1)
                """))
            await db.commit()
            logger.info("Migración OK: backfill de periodos de evaluación")
    except Exception as e:
        logger.warning(f"Migración periodos_evaluacion (backfill): {e}")

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
app.include_router(inventario_router)
app.include_router(auth_router)
app.include_router(seguridad_router)
app.include_router(evaluacion_router)
app.include_router(documentos_router)
app.include_router(apoyo_router)
app.include_router(maintenance_router)

# Archivos estáticos: logo, evidencias, etc.
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")
# Uploads persistentes (evidencias, imágenes subidas)
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

# Error handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name}


