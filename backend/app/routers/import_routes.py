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

COLUMN_MAP = {
    # Legacy format (template antiguo)
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

    # Plantilla de supervisiones (nuevo formato)
    "N° DE CONTRATO": "numero_contrato",
    "NOMBRE CONTRATISTA": "beneficiario_nombre",
    "No. DE IDENTIFICACIÓN": "cedula_contratista",
    "EXPEDIDA EN": "lugar_expedicion",
    "No. TELÉFONO y/o CELULAR": "telefono",
    "DIRECCION": "direccion",
    "PERFIL": "perfil",
    "VALOR TOTAL DEL CONTRATO": "monto_total",
    "VALOR FINAL DEL CONTRATO": "monto_total",
    "OBJETO DEL CONTRATO": "objeto",
    "SUPERVISOR": "supervisor",
    "CDP  No.": "no_cdp",
    "CRP No.": "rp",
    "IMPUTACIÓN PRESUPUESTAL": "rubro",
    "UNIDAD DE ATENCION": "unidad_atencion",
    "FECHA DE INICIO DEL CONTRATO": "fecha_inicio",
    "FECHA TERMINACION DEL CONTRATO": "fecha_fin",
    "ESTADO": "estado_contrato",
    "TIPO DE PERSONA": "tipo_persona",
    "RESOLUCION": "resolucion_codigo",
}

_TITLE_NORMALIZE_RE = re.compile(r"[^A-Z0-9ÁÉÍÓÚÑ ]")


def _normalize_title(title: str) -> str:
    t = title.strip().upper()
    t = _TITLE_NORMALIZE_RE.sub("", t)
    return re.sub(r"\s+", " ", t)


def _find_column_index(headers: list[str], target: str) -> int | None:
    target_norm = _normalize_title(target)
    for i, h in enumerate(headers):
        if _normalize_title(str(h)) == target_norm:
            return i
    return None


def _parse_number(val) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("$", "").replace(" ", "").replace("\xa0", "")
    if "," in s and "." in s:
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
        if len(parts) > 2:
            s = s.replace(".", "")
    try:
        return float(s) if s else 0.0
    except ValueError:
        return 0.0


def _clean_str(val) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


def _get_col(col_indices: dict[str, int], row: tuple, *names: str):
    """Read a cell value trying multiple column names."""
    for name in names:
        idx = col_indices.get(name)
        if idx is not None and idx < len(row):
            val = row[idx]
            return val
    return None


def _parse_date(val) -> date | None:
    """Parse a date from various formats."""
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val if isinstance(val, date) else val.date()
    s = str(val).strip()
    if not s:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d/%m/%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _map_estado(val) -> str:
    """Map Excel estado to internal estado."""
    if val is None:
        return "EN_PROCESO"
    s = str(val).strip().upper()
    if s in ("ACTIVO",):
        return "ACTIVO"
    if s in ("FINALIZADO",):
        return "FINALIZADO"
    if s in ("ANULADO",):
        return "ANULADO"
    return "EN_PROCESO"


@router.post("/excel", response_model=ImportResult)
async def importar_contratos_excel(
    resolucion_id: int = Query(..., description="ID de la resolución destino"),
    file: UploadFile = File(..., description="Archivo Excel (.xlsx)"),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "El archivo debe ser .xlsx")

    try:
        contents = await file.read()
        wb = load_workbook(filename=io.BytesIO(contents), read_only=True)
        ws = wb.active
        if ws is None:
            raise HTTPException(400, "El Excel no tiene hojas activas")
    except Exception as e:
        raise HTTPException(400, f"Error al leer el Excel: {e}")

    rows_iter = ws.iter_rows(values_only=True)

    try:
        raw_headers = next(rows_iter)
    except StopIteration:
        raise HTTPException(400, "El archivo Excel está vacío")

    headers = [str(h) if h else "" for h in raw_headers]

    col_indices: dict[str, int] = {}
    for col_name in COLUMN_MAP:
        idx = _find_column_index(headers, col_name)
        if idx is not None:
            col_indices[col_name] = idx

    if not col_indices:
        raise HTTPException(
            400,
            "No se encontraron columnas reconocidas en el Excel. "
            "Verifique que los encabezados coincidan con el formato esperado.",
        )

    result_db = await db.execute(select(Perfil))
    perfiles_existentes = {p.nombre.upper(): p.nombre for p in result_db.scalars().all()}

    result_summary = ImportResult()
    contratos_creados: set[str] = set()  # track created contracts for dedup

    for fila_idx, row in enumerate(rows_iter, start=2):
        if all(cell is None or str(cell).strip() == "" for cell in row):
            continue

        try:
            # ─── Número de contrato (soporta ambos formatos) ──
            numero_contrato = _clean_str(_get_col(col_indices, row, "N° DE CONTRATO", "NO. CONTRATO"))
            if not numero_contrato:
                continue

            # Skip if already created from a previous row (same contrato, different cuota)
            if numero_contrato in contratos_creados:
                continue

            result_summary.total += 1

            # ─── Contratista (soporta ambos formatos) ──
            beneficiario_nombre = _clean_str(_get_col(col_indices, row, "NOMBRE CONTRATISTA", "CONTRATISTA"))
            cedula_contratista = _clean_str(_get_col(col_indices, row, "No. DE IDENTIFICACIÓN", "CEDULA DE CONTRATISTA"))
            lugar_expedicion = _clean_str(_get_col(col_indices, row, "EXPEDIDA EN", "LUGAR DE EXPEDICIÓN"))
            telefono = _clean_str(_get_col(col_indices, row, "No. TELÉFONO y/o CELULAR", "TELEFONO"))
            direccion = _clean_str(_get_col(col_indices, row, "DIRECCION"))
            correo = _clean_str(_get_col(col_indices, row, "CORREO"))
            tipo_persona = _clean_str(_get_col(col_indices, row, "TIPO DE PERSONA"))

            # ─── Si no hay cédula de contratista, no podemos crear el contrato ──
            if not cedula_contratista:
                result_summary.errors.append({"fila": fila_idx, "numero_contrato": numero_contrato, "error": "Cédula del contratista vacía"})
                result_summary.skipped += 1
                continue

            # ─── Perfil ──
            perfil_raw = _clean_str(_get_col(col_indices, row, "PERFIL", "TÍTULO"))
            perfil_normalized = None
            if perfil_raw:
                perfil_upper = perfil_raw.upper()
                if perfil_upper in perfiles_existentes:
                    perfil_normalized = perfiles_existentes[perfil_upper]
                else:
                    for p_name in perfiles_existentes.values():
                        if perfil_upper in p_name.upper() or p_name.upper() in perfil_upper:
                            perfil_normalized = p_name
                            break
                    if not perfil_normalized:
                        perfil_normalized = perfil_raw.upper()

            # ─── Monto: prefiere VALOR FINAL DEL CONTRATO (con adiciones), luego VALOR TOTAL / VALOR DEL ──
            monto_total = _parse_number(_get_col(col_indices, row, "VALOR FINAL DEL CONTRATO", "VALOR TOTAL DEL CONTRATO", "VALOR DEL CONTRATO"))

            # ─── Fechas ──
            fecha_inicio = _parse_date(_get_col(col_indices, row, "FECHA DE INICIO DEL CONTRATO"))
            fecha_fin = _parse_date(_get_col(col_indices, row, "FECHA TERMINACION DEL CONTRATO"))

            # ─── Objeto ──
            objeto = _clean_str(_get_col(col_indices, row, "OBJETO DEL CONTRATO"))

            # ─── Supervisor ──
            supervisor = _clean_str(_get_col(col_indices, row, "SUPERVISOR"))
            cedula_supervisor = _clean_str(_get_col(col_indices, row, "CEDULA SUPERVISOR"))

            # ─── CDP / RP / Rubro ──
            no_cdp = _clean_str(_get_col(col_indices, row, "CDP  No.", "No. CDP"))
            rp = _clean_str(_get_col(col_indices, row, "CRP No."))
            rubro = _clean_str(_get_col(col_indices, row, "IMPUTACIÓN PRESUPUESTAL"))

            # ─── Unidad de atención ──
            unidad_atencion = _clean_str(_get_col(col_indices, row, "UNIDAD DE ATENCION"))

            # ─── Cuotas ──
            cuotas_raw = _clean_str(_get_col(col_indices, row, "CUOTAS"))
            cuotas_total = 0
            cuotas_txt = None
            if cuotas_raw:
                cuotas_txt = cuotas_raw
                nums = re.findall(r"\d+", cuotas_raw)
                cuotas_total = int(nums[0]) if nums else 1
            else:
                cuotas_txt = "1"
                cuotas_total = 1

            # ─── Estado ──
            estado_raw = _get_col(col_indices, row, "ESTADO", "estado_contrato")
            estado = _map_estado(estado_raw)

            # ─── Contratista (crear o actualizar) ──
            result_db2 = await db.execute(select(Contratista).where(Contratista.identificacion == cedula_contratista))
            contratista = result_db2.scalar_one_or_none()

            if contratista:
                contratista_id = contratista.id
                if beneficiario_nombre:
                    contratista.nombre = beneficiario_nombre.upper().strip('"')
                if lugar_expedicion:
                    contratista.expedida_en = lugar_expedicion.upper()
                if telefono:
                    contratista.telefono = telefono
                if direccion:
                    contratista.direccion = direccion.upper()
                if correo:
                    contratista.correo = correo.lower()
                if tipo_persona:
                    contratista.tipo_persona = tipo_persona.upper()
            else:
                contratista = Contratista(
                    identificacion=cedula_contratista,
                    nombre=(beneficiario_nombre or "").upper().strip('"'),
                    expedida_en=(lugar_expedicion or "").upper(),
                    telefono=telefono or "",
                    direccion=(direccion or "").upper(),
                    correo=(correo or "").lower(),
                    tipo_persona=(tipo_persona or "").upper(),
                )
                db.add(contratista)
                await db.flush()
                contratista_id = contratista.id

            # ─── Verificar duplicado en DB ──
            existing = await db.execute(select(Contrato).where(Contrato.numero_contrato == numero_contrato))
            if existing.scalar_one_or_none():
                result_summary.errors.append({"fila": fila_idx, "numero_contrato": numero_contrato, "error": "El contrato ya existe en BD"})
                result_summary.skipped += 1
                continue

            # ─── Crear contrato ──
            valor_letras = numero_a_letras(monto_total)
            contrato = Contrato(
                resolucion_id=resolucion_id,
                contratista_id=contratista_id,
                numero_contrato=numero_contrato,
                perfil=perfil_normalized,
                estado=estado,
                objeto=objeto or "",
                monto_total=monto_total,
                valor_letras=valor_letras,
                cuotas=cuotas_txt,
                cuotas_total=cuotas_total,
                supervisor=supervisor or "",
                cedula_supervisor=cedula_supervisor or "",
                no_cdp=no_cdp or "",
                rp=rp or "",
                rubro=rubro or "",
                unidad_atencion=unidad_atencion or "",
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
            )
            db.add(contrato)
            await db.flush()
            contratos_creados.add(numero_contrato)
            result_summary.created += 1

        except Exception as e:
            logger.exception(f"Error procesando fila {fila_idx}")
            err_numero = ""
            for col_name in ("N° DE CONTRATO", "NO. CONTRATO"):
                idx = col_indices.get(col_name)
                if idx is not None:
                    try:
                        err_numero = str(row[idx])
                        break
                    except Exception:
                        continue
            result_summary.errors.append({"fila": fila_idx, "numero_contrato": err_numero or "", "error": str(e)})
            result_summary.skipped += 1
            continue

    await db.commit()
    return result_summary
