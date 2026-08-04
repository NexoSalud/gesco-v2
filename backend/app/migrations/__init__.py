"""
Migración única — Actualizar fecha_cdp y fecha_inicio para contratos de Agosto 2026.

Se ejecuta al inicio del siguiente deploy. Es idempotente: si los contratos
ya tienen fecha_cdp asignada, no se modificarán.

Datos extraídos de CONTRATOS DE AGOSTO 2026.xlsx (50 contratos, 300 al 349).
"""

import logging
from datetime import date

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory

logger = logging.getLogger(__name__)

# ─── Datos de la migración ────────────────────────────────────────────────────
# (numero_contrato_como_aparece_en_db, fecha_cdp, fecha_inicio)
CONTRATOS_AGOSTO = [
    ("300 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("301 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("302 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("303 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("304 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("305 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("306 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("307 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("308 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("309 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("310 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("311 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("312 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("313 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("314 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("315 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("316 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("317 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("318 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("319 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("320 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("321 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("322 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("323 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("324 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("325 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("326 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("327 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("328 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("329 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("330 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("331 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("332 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("333 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("334 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("335 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("336 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("337 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("338 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("339 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("340 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("341 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("342 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("343 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("344 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("345 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("346 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("347 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("348 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
    ("349 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01"),
]


async def migrar_fechas_agosto_2026() -> dict:
    """Actualiza fecha_cdp y fecha_inicio de los contratos de agosto 2026.
    
    Idempotente: solo modifica contratos que tengan fecha_cdp NULL o vacía.
    
    Returns:
        dict con {'actualizados': N, 'saltados': N, 'no_encontrados': N}
    """
    async with async_session_factory() as db:
        actualizados = 0
        saltados = 0
        no_encontrados = 0

        for num_contrato, fecha_cdp_str, fecha_inicio_str in CONTRATOS_AGOSTO:
            # Verificar si el contrato existe y si ya tiene fecha_cdp
            result = await db.execute(
                text(
                    "SELECT numero_contrato, fecha_cdp, fecha_inicio "
                    "FROM contratos WHERE numero_contrato = :nc"
                ),
                {"nc": num_contrato},
            )
            row = result.fetchone()

            if not row:
                logger.warning(f"Contrato no encontrado: {num_contrato}")
                no_encontrados += 1
                continue

            # Si ya tiene fecha_cdp, saltar (idempotente)
            if row.fecha_cdp is not None:
                logger.info(f"Contrato {num_contrato} ya tiene fecha_cdp={row.fecha_cdp}, saltando")
                saltados += 1
                continue

            # Actualizar
            await db.execute(
                text(
                    "UPDATE contratos SET fecha_cdp = :fcdp, fecha_inicio = :fini "
                    "WHERE numero_contrato = :nc"
                ),
                {
                    "fcdp": date.fromisoformat(fecha_cdp_str),
                    "fini": date.fromisoformat(fecha_inicio_str),
                    "nc": num_contrato,
                },
            )
            actualizados += 1
            logger.info(
                f"Contrato {num_contrato}: fecha_cdp={fecha_cdp_str}, "
                f"fecha_inicio={fecha_inicio_str}"
            )

        await db.commit()

    resultado = {
        "actualizados": actualizados,
        "saltados": saltados,
        "no_encontrados": no_encontrados,
    }
    logger.info(
        f"Migración agosto 2026 completada: "
        f"{actualizados} actualizados, {saltados} saltados, "
        f"{no_encontrados} no encontrados"
    )
    return resultado
