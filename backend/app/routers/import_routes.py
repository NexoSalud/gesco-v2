"""Router para importación masiva de contratos desde Excel."""

import io
import logging
import re

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from openpyxl import load_workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.contrato import Contrato
from app.models.contratista import Contratista
from app.models.perfil import Perfil
from app.schemas.import_schema import ImportResult
from app.services.numero_letras import numero_a_letras

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/import", tags=["Importación"])

# Columnas esperadas en el Excel (mapeo a campos del modelo)
COLUMN_MAP = {
    "NO. CONTRATO": "numero_contrato",
    "CONTRATISTA": "beneficiario_nombre",
    "CEDULA DE CONTRATISTA": "cedula_contratista",
    "LUGAR DE EXPEDICIÓN": "lugar_expedicion",
    "TELEFONO": "telefono",
    "DIRECCION": "direccion",
    "CORREO": "correo",
    "TÍTULO": "perfil",
    "VALOR DEL CONTRATO": "monto_total",
    "CUOTAS": "cuotas",
    "VIGENCIA DEL CONTRATO": "vigencia_texto",
    "OBJETO DEL CONTRATO": "objeto",
    "SUPERVISOR": "supervisor",
    "CEDULA SUPERVISOR": "cedula_supervisor",
    "No. CDP": "no_cdp",
}

# Normalizaciones de títulos (acentos, mayúsculas, espacios)
_TITLE_NORMALIZE_RE = re.compile(r"[^A-Z0-9ÁÉÍÓÚÑ ]")


def _normalize_title(title: str) -> str:
    """Normaliza un título de columna para matching flexible."""
    t = title.strip().upper()
    t = _TITLE_NORMALIZE_RE.sub("", t)
    # Compress spaces
    return re.sub(r"\s+", " ", t)


def _find_column_index(headers: list[str], target: str) -> int | None:
    """Busca una columna por nombre normalizado."""
    target_norm = _normalize_title(target)
    for i, h in enumerate(headers):
        if _normalize_title(str(h)) == target_norm:
            return i
    return None


def _parse_number(val) -> float:
    """Convierte un valor a número, soportando formatos colombianos."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("$", "").replace(" ", "").replace("\xa0", "")
    # Detectar formato colombiano: 1.250.000,00
    if "," in s and "." in s:
        # Si hay puntos y comas, el último separador define decimales
        if s.rfind(".") > s.rfind(","):
            s = s.replace(",", "")
        else:
            s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        parts = s.split(",")
        if len(parts) == 2 and len(parts[1]) <= 2:
            s = s.replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "." in s:
        parts = s.split(".")
        if len(parts) > 2:  # miles
            s = s.replace(".", "")
        # else: ya está bien
    try:
        return float(s) if s else 0.0
    except ValueError:
        return 0.0


def _clean_str(val) -> str | None:
    """Limpia un valor string."""
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


@router.post("/excel", response_model=ImportResult)
async def importar_contratos_excel(
    resolucion_id: int = Query(..., description="ID de la resolución destino"),
    file: UploadFile = File(..., description="Archivo Excel (.xlsx)"),
    db: AsyncSession = Depends(get_db),
):
    """Importa contratos masivamente desde un archivo Excel.

    El Excel debe tener las columnas esperadas en la primera fila (header).
    """
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "El archivo debe ser .xlsx")

    # Leer el Excel
    try:
        contents = await file.read()
        wb = load_workbook(filename=io.BytesIO(contents), read_only=True)
        ws = wb.active
        if ws is None:
            raise HTTPException(400, "El Excel no tiene hojas activas")
    except Exception as e:
        raise HTTPException(400, f"Error al leer el Excel: {e}")

    rows_iter = ws.iter_rows(values_only=True)

    # Primera fila = headers
    try:
        raw_headers = next(rows_iter)
    except StopIteration:
        raise HTTPException(400, "El archivo Excel está vacío")

    headers = [str(h) if h else "" for h in raw_headers]

    # Mapear columnas
    col_indices: dict[str, int] = {}
    for col_name in COLUMN_MAP:
        idx = _find_column_index(headers, col_name)
        if idx is not None:
            col_indices[col_name] = idx

    if not col_indices:
        raise HTTPException(400, "No se encontraron columnas reconocidas en el Excel. "
                                 "Verifique que los encabezados coincidan con el formato esperado.")

    # Obtener perfiles existentes para mapeo
    result = await db.execute(select(Perfil))
    perfiles_existentes = {p.nombre.upper(): p.nombre for p in result.scalars().all()}

    result_summary = ImportResult()

    # Procesar filas
    for fila_idx, row in enumerate(rows_iter, start=2):  # fila 2 = primera de datos
        # Saltar filas completamente vacías
        if all(cell is None or str(cell).strip() == "" for cell in row):
            continue

        try:
            # Extraer campos del Excel
            numero_contrato = _clean_str(row[col_indices.get("NO. CONTRATO")])
            if not numero_contrato:
                continue  # saltar filas sin número de contrato

            result_summary.total += 1

            beneficiario_nombre = _clean_str(row[col_indices.get("CONTRATISTA")])
            cedula_contratista = _clean_str(row[col_indices.get("CEDULA DE CONTRATISTA")])
            lugar_expedicion = _clean_str(row[col_indices.get("LUGAR DE EXPEDICIÓN")])
            telefono = _clean_str(row[col_indices.get("TELEFONO")])
            direccion = _clean_str(row[col_indices.get("DIRECCION")])
            correo = _clean_str(row[col_indices.get("CORREO")])
            perfil_raw = _clean_str(row[col_indices.get("TÍTULO")])
            monto_total = _parse_number(row[col_indices.get("VALOR DEL CONTRATO")] if "VALOR DEL CONTRATO" in col_indices else None)
            cuotas_raw = _clean_str(row[col_indices.get("CUOTAS")])
            vigencia_texto = _clean_str(row[col_indices.get("VIGENCIA DEL CONTRATO")])
            objeto = _clean_str(row[col_indices.get("OBJETO DEL CONTRATO")])
            supervisor = _clean_str(row[col_indices.get("SUPERVISOR")])
            cedula_supervisor = _clean_str(row[col_indices.get("CEDULA SUPERVISOR")])
            no_cdp = _clean_str(row[col_indices.get("No. CDP")])

            # --- Validaciones ---
            if not cedula_contratista:
                result_summary.errors.append({
                    "fila": fila_idx,
                    "numero_contrato": numero_contrato,
                    "error": "Cédula del contratista vacía",
                })
                result_summary.skipped += 1
                continue

            # --- Buscar o crear contratista ---
            result_db = await db.execute(
                select(Contratista).where(Contratista.identificacion == cedula_contratista)
            )
            contratista = result_db.scalar_one_or_none()

            if contratista:
                contratista_id = contratista.id
                # Actualizar datos si están presentes
                if beneficiario_nombre:
                    contratista.nombre = beneficiario_nombre.upper()
                if lugar_expedicion:
                    contratista.expedida_en = lugar_expedicion.upper()
                if telefono:
                    contratista.telefono = telefono
                if direccion:
                    contratista.direccion = direccion.upper()
                if correo:
                    contratista.correo = correo.lower()
            else:
                contratista = Contratista(
                    identificacion=cedula_contratista,
                    nombre=(beneficiario_nombre or "").upper(),
                    expedida_en=(lugar_expedicion or "").upper(),
                    telefono=telefono or "",
                    direccion=(direccion or "").upper(),
                    correo=(correo or "").lower(),
                )
                db.add(contratista)
                await db.flush()
                contratista_id = contratista.id

            # --- Normalizar perfil ---
            perfil_normalized = None
            if perfil_raw:
                perfil_upper = perfil_raw.upper()
                # Buscar match exacto primero
                if perfil_upper in perfiles_existentes:
                    perfil_normalized = perfiles_existentes[perfil_upper]
                else:
                    # Búsqueda flexible
                    for p_name in perfiles_existentes.values():
                        if perfil_upper in p_name.upper() or p_name.upper() in perfil_upper:
                            perfil_normalized = p_name
                            break
                    if not perfil_normalized:
                        perfil_normalized = perfil_raw.upper()

            # --- Parsear cuotas ---
            cuotas_total = 0
            cuotas_txt = None
            if cuotas_raw:
                cuotas_txt = cuotas_raw
                # Extraer número de cuotas (primer número encontrado)
                nums = re.findall(r"\d+", cuotas_raw)
                if nums:
                    cuotas_total = int(nums[0])
                else:
                    cuotas_total = 1
            else:
                cuotas_txt = "1"
                cuotas_total = 1

            # --- Verificar si el contrato ya existe ---
            existing = await db.execute(
                select(Contrato).where(Contrato.numero_contrato == numero_contrato)
            )
            if existing.scalar_one_or_none():
                result_summary.errors.append({
                    "fila": fila_idx,
                    "numero_contrato": numero_contrato,
                    "error": "El contrato ya existe",
                })
                result_summary.skipped += 1
                continue

            # --- Generar valor en letras ---
            valor_letras = numero_a_letras(monto_total)

            # --- Crear contrato ---
            contrato = Contrato(
                resolucion_id=resolucion_id,
                contratista_id=contratista_id,
                numero_contrato=numero_contrato,
                perfil=perfil_normalized,
                estado="EN_PROCESO",
                objeto=objeto or "",
                monto_total=monto_total,
                valor_letras=valor_letras,
                cuotas=cuotas_txt,
                cuotas_total=cuotas_total,
                supervisor=supervisor or "",
                cedula_supervisor=cedula_supervisor or "",
                no_cdp=no_cdp or "",
            )
            db.add(contrato)
            await db.flush()
            result_summary.created += 1

        except Exception as e:
            logger.exception(f"Error procesando fila {fila_idx}")
            result_summary.errors.append({
                "fila": fila_idx,
                "numero_contrato": row[col_indices.get("NO. CONTRATO")] if col_indices.get("NO. CONTRATO") is not None and row else "",
                "error": str(e),
            })
            result_summary.skipped += 1
            continue

    await db.commit()
    return result_summary



