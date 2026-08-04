"""
Migración única — Actualizar fechas para contratos de Agosto 2026.

Se ejecuta al inicio del siguiente deploy. Es idempotente: si el contrato
ya tiene fecha_fin asignada, no se modifica.

Campos actualizados: fecha_cdp, fecha_inicio, fecha_fin
Datos extraídos de CONTRATOS DE AGOSTO 2026.xlsx (50 contratos, 300 al 349).
"""

import logging
from datetime import date

from sqlalchemy import text

from app.database import async_session_factory

logger = logging.getLogger(__name__)

# ─── Datos de la migración ────────────────────────────────────────────────────
# (numero_contrato_en_db, fecha_cdp, fecha_inicio, fecha_fin)
CONTRATOS_AGOSTO = [
    ("300 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("301 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("302 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("303 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("304 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("305 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("306 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("307 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("308 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("309 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("310 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("311 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("312 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("313 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("314 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("315 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("316 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("317 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("318 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("319 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("320 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("321 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("322 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("323 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("324 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("325 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("326 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("327 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("328 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("329 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("330 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("331 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("332 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("333 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("334 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("335 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("336 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("337 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("338 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("339 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("340 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("341 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("342 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("343 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("344 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("345 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("346 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("347 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("348 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
    ("349 DEL 01 DE AGOSTO DE 2026", "2026-08-01", "2026-08-01", "2026-12-28"),
]


async def migrar_fechas_agosto_2026() -> dict:
    """Actualiza fecha_cdp, fecha_inicio y fecha_fin de los contratos de agosto 2026.

    Idempotente: solo modifica contratos que tengan fecha_fin NULL.

    Returns:
        dict con {'actualizados': N, 'saltados': N, 'no_encontrados': N}
    """
    async with async_session_factory() as db:
        actualizados = 0
        saltados = 0
        no_encontrados = 0

        for num_contrato, fecha_cdp_str, fecha_inicio_str, fecha_fin_str in CONTRATOS_AGOSTO:
            # Verificar si el contrato existe
            result = await db.execute(
                text(
                    "SELECT numero_contrato, fecha_cdp, fecha_inicio, fecha_fin "
                    "FROM contratos WHERE numero_contrato = :nc"
                ),
                {"nc": num_contrato},
            )
            row = result.fetchone()

            if not row:
                logger.warning(f"Contrato no encontrado: {num_contrato}")
                no_encontrados += 1
                continue

            # Si ya tiene fecha_fin, saltar (idempotente)
            if row.fecha_fin is not None:
                logger.info(
                    f"Contrato {num_contrato} ya tiene fecha_fin={row.fecha_fin}, saltando"
                )
                saltados += 1
                continue

            # Actualizar las tres fechas
            await db.execute(
                text(
                    "UPDATE contratos SET "
                    "fecha_cdp = :fcdp, fecha_inicio = :fini, fecha_fin = :ffin "
                    "WHERE numero_contrato = :nc"
                ),
                {
                    "fcdp": date.fromisoformat(fecha_cdp_str),
                    "fini": date.fromisoformat(fecha_inicio_str),
                    "ffin": date.fromisoformat(fecha_fin_str),
                    "nc": num_contrato,
                },
            )
            actualizados += 1
            logger.info(
                f"Contrato {num_contrato}: fecha_cdp={fecha_cdp_str}, "
                f"fecha_inicio={fecha_inicio_str}, fecha_fin={fecha_fin_str}"
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
