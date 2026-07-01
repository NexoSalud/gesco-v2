"""Gesco V2 — Main entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import (
    resoluciones_router,
    contratos_router,
    contratistas_router,
    pagos_router,
    perfiles_router,
    plantillas_router,
    export_router,
)
from app.seed_data import seed_database
from app.error_handlers import global_exception_handler, validation_exception_handler, http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables & seed data."""
    logger.info("Inicializando base de datos...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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
app.include_router(export_router)

# Error handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
