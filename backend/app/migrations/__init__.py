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


async def migrar_fix_portal_agosto() -> dict:
    """Correcciones puntuales del portal de evaluación (2026-09-03).

    1. Contrato 279 (MEDICINA, 'DEL 01 DE JULIO') tenía fecha_inicio/fecha_fin
       mal (2026-09-01 / 2026-12-03) → se corrige a julio-diciembre (igual que
       su par 278): 2026-07-01 / 2026-12-28.
    2. Contrato 001 (ENFERMERÍA, 'DEL 01/08/2026') tenía fechas NULL y cero
       actividades → se fijan fechas agosto-diciembre y se heredan las
       actividades del perfil ENFERMERÍA al periodo AGOSTO.

    Idempotente: solo corrige fechas si están mal/NULL, y las actividades se
    insertan con dedup (contrato + periodo + descripcion).
    """
    async with async_session_factory() as db:
        # 1) Contrato 279 → julio-diciembre
        await db.execute(
            text(
                "UPDATE contratos SET fecha_inicio = :fi, fecha_fin = :ff "
                "WHERE numero_contrato = :nc "
                "AND (fecha_inicio IS DISTINCT FROM :fi OR fecha_fin IS DISTINCT FROM :ff)"
            ),
            {"fi": date(2026, 7, 1), "ff": date(2026, 12, 28),
             "nc": "279 DEL 01 DE JULIO DE 2026"},
        )

        # 2) Contrato 001 → agosto-diciembre (solo si las fechas están NULL)
        await db.execute(
            text(
                "UPDATE contratos SET fecha_inicio = :fi, fecha_fin = :ff "
                "WHERE numero_contrato = :nc "
                "AND (fecha_inicio IS NULL OR fecha_fin IS NULL)"
            ),
            {"fi": date(2026, 8, 1), "ff": date(2026, 12, 28),
             "nc": "001 DEL 01/08/2026"},
        )

        # 3) Heredar actividades de ENFERMERÍA al periodo AGOSTO para 001
        pid = await db.execute(
            text("SELECT id FROM periodos_evaluacion WHERE fecha = :f"),
            {"f": date(2026, 8, 1)},
        )
        periodo_id = pid.scalar_one_or_none()
        heredadas = 0
        if periodo_id:
            res = await db.execute(
                text(
                    "INSERT INTO actividades_contrato "
                    "(contrato_id, descripcion, tipo, orden, periodo_id) "
                    "SELECT c.numero_contrato, ap.descripcion, ap.tipo, ap.orden, :p "
                    "FROM contratos c "
                    "JOIN perfiles p ON p.nombre = c.perfil "
                    "JOIN actividades_perfil ap ON ap.perfil_id = p.id "
                    "WHERE c.numero_contrato = :nc "
                    "AND NOT EXISTS ("
                    "  SELECT 1 FROM actividades_contrato ac "
                    "  WHERE ac.contrato_id = c.numero_contrato "
                    "    AND ac.periodo_id = :p "
                    "    AND ac.descripcion = ap.descripcion"
                    ")"
                ),
                {"p": periodo_id, "nc": "001 DEL 01/08/2026"},
            )
            heredadas = res.rowcount

        await db.commit()

    resultado = {"contrato_279": "corregido", "contrato_001": "corregido",
                 "actividades_heredadas_001": heredadas}
    logger.info(f"Migración fix portal agosto: {resultado}")
    return resultado


async def migrar_evidencias_actividad_perfil() -> dict:
    """Fase 1 del refactor de actividades (evidencias por actividad del perfil).

    Añade a `evidencias` las columnas `actividad_perfil_id` y `periodo_id` y las
    rellena mapeando cada evidencia (vía su `actividad_contrato_id`) a la actividad
    del PERFIL correspondiente, copiando el `periodo_id` original.

    NO destructiva: solo agrega columnas y hace backfill. `actividad_contrato_id`
    se conserva intacto como fallback durante la transición.

    Mapeo:
      1. Exacto: (perfil del contrato, descripcion) de actividades_contrato == actividades_perfil.
      2. Fallback: normalizando HTML entities (&lt;br&gt; -> <br>), para redacciones
         que cambiaron entre la copia y el perfil actual (p.ej. "587 atenciones").
    """
    async with async_session_factory() as db:
        # 1) Columnas (idempotente)
        await db.execute(text(
            "ALTER TABLE evidencias ADD COLUMN IF NOT EXISTS "
            "actividad_perfil_id INTEGER REFERENCES actividades_perfil(id) ON DELETE SET NULL"
        ))
        await db.execute(text(
            "ALTER TABLE evidencias ADD COLUMN IF NOT EXISTS "
            "periodo_id INTEGER REFERENCES periodos_evaluacion(id) ON DELETE SET NULL"
        ))
        # Fase 2/3: actividad_contrato_id deja de ser obligatoria (las nuevas
        # evidencias referencian actividad_perfil_id + periodo_id).
        await db.execute(text(
            "ALTER TABLE evidencias ALTER COLUMN actividad_contrato_id DROP NOT NULL"
        ))
        # Fase 3: supervisiones referencian la actividad del perfil (trazabilidad)
        await db.execute(text(
            "ALTER TABLE actividades_supervision ADD COLUMN IF NOT EXISTS "
            "actividad_perfil_id INTEGER REFERENCES actividades_perfil(id) ON DELETE SET NULL"
        ))
        await db.commit()

        # 2) Backfill exacto
        res = await db.execute(text("""
            UPDATE evidencias e
            SET actividad_perfil_id = ap.id,
                periodo_id = ac.periodo_id
            FROM actividades_contrato ac
            JOIN contratos c ON c.numero_contrato = ac.contrato_id
            JOIN perfiles p ON p.nombre = c.perfil
            JOIN actividades_perfil ap
              ON ap.perfil_id = p.id AND ap.descripcion = ac.descripcion
            WHERE e.actividad_contrato_id = ac.id
              AND e.actividad_perfil_id IS NULL
        """))
        exactas = res.rowcount

        # 3) Fallback por normalización HTML (redacciones que cambiaron de
        #    escape: la copia guardó &lt;br&gt; y el perfil actual <br>)
        res = await db.execute(text("""
            UPDATE evidencias e
            SET actividad_perfil_id = ap.id,
                periodo_id = ac.periodo_id
            FROM actividades_contrato ac
            JOIN contratos c ON c.numero_contrato = ac.contrato_id
            JOIN perfiles p ON p.nombre = c.perfil
            JOIN actividades_perfil ap ON ap.perfil_id = p.id
                AND replace(replace(ac.descripcion, '&lt;br&gt;', '<br>'), '&amp;', '&')
                    = replace(replace(ap.descripcion, '&lt;br&gt;', '<br>'), '&amp;', '&')
            WHERE e.actividad_contrato_id = ac.id
              AND e.actividad_perfil_id IS NULL
        """))
        fallback = res.rowcount
        await db.commit()

        # 4) Verificación
        sin_mapear = (await db.execute(text(
            "SELECT count(*) FROM evidencias WHERE actividad_perfil_id IS NULL"
        ))).scalar_one()
        total = (await db.execute(text("SELECT count(*) FROM evidencias"))).scalar_one()
        mal_periodo = (await db.execute(text("""
            SELECT count(*)
            FROM evidencias e
            JOIN actividades_contrato ac ON ac.id = e.actividad_contrato_id
            WHERE e.periodo_id IS DISTINCT FROM ac.periodo_id
        """))).scalar_one()

    resultado = {
        "exactas": exactas,
        "fallback_html": fallback,
        "total_evidencias": total,
        "sin_mapear": sin_mapear,
        "periodo_desincronizado": mal_periodo,
    }
    logger.info(f"Migración evidencias→actividad_perfil: {resultado}")
    return resultado

