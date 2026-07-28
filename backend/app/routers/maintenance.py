"""Router de mantenimiento — endpoints administrativos para limpieza de datos."""

import logging
import os
import shutil
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.auth import Usuario
from app.models.evidencia import Evidencia
from app.models.evidencia_apoyo import EvidenciaApoyo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/maintenance", tags=["Mantenimiento"])

EVIDENCIAS_DIRS = [
    "/app/uploads/evidencias",
    "/app/uploads/evidencias_apoyo",
]


@router.post("/cleanup-evidencias")
async def cleanup_evidencias(
    confirm: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Elimina TODAS las evidencias subidas (registros y archivos) — solo con confirm=true.

    Requiere autenticación. Útil para limpiar datos de prueba.
    """
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Debes enviar ?confirm=true para ejecutar la limpieza. "
                   "Esta acción es irreversible y eliminará TODAS las evidencias.",
        )

    results = {}

    # ─── 1. Contar registros antes de eliminar ─────────────────────────────

    count_ev = (
        await db.execute(select(func.count(Evidencia.id)))
    ).scalar() or 0

    count_apoyo = (
        await db.execute(select(func.count(EvidenciaApoyo.id)))
    ).scalar() or 0

    # ─── 2. Eliminar registros de la BD ────────────────────────────────────

    await db.execute(delete(Evidencia))
    await db.execute(delete(EvidenciaApoyo))
    await db.commit()

    results["registros_eliminados"] = {
        "evidencias_contratos": count_ev,
        "evidencias_apoyo": count_apoyo,
        "total": count_ev + count_apoyo,
    }

    # ─── 3. Eliminar archivos físicos ──────────────────────────────────────

    archivos_ok = 0
    archivos_fallidos = 0

    for dir_path in EVIDENCIAS_DIRS:
        if os.path.isdir(dir_path):
            try:
                items = os.listdir(dir_path)
                for item in items:
                    item_path = os.path.join(dir_path, item)
                    try:
                        if os.path.isfile(item_path) or os.path.islink(item_path):
                            os.remove(item_path)
                            archivos_ok += 1
                        elif os.path.isdir(item_path):
                            shutil.rmtree(item_path)
                            archivos_ok += 1
                    except Exception as e:
                        archivos_fallidos += 1
                        logger.warning("No se pudo eliminar %s: %s", item_path, e)

                logger.info("Directorio %s limpiado (%d archivos)", dir_path, len(items))
            except Exception as e:
                logger.warning("Error al leer directorio %s: %s", dir_path, e)
        else:
            logger.info("Directorio %s no existe, se omite", dir_path)

    results["archivos_eliminados"] = {
        "ok": archivos_ok,
        "fallidos": archivos_fallidos,
    }

    # ─── 4. Auditoría ─────────────────────────────────────────────────────

    timestamp = datetime.now(timezone.utc).isoformat()
    logger.info(
        "🧹 CLEANUP ejecutado por %s (%s) a las %s — "
        "registros=%d archivos=%d fallos=%d",
        current_user.username,
        current_user.nombre_completo or "?",
        timestamp,
        results["registros_eliminados"]["total"],
        results["archivos_eliminados"]["ok"],
        results["archivos_eliminados"]["fallidos"],
    )

    return {
        "success": True,
        "message": "Limpieza de evidencias completada",
        "timestamp": timestamp,
        "ejecutado_por": current_user.username,
        "detalle": results,
    }
