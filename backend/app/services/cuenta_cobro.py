"""Servicio para generar la Cuenta de Cobro en PDF a partir de los datos
contractuales del contratista y del contrato (template como los del backend)."""

import base64
import logging
from datetime import date, datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from weasyprint import HTML

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

DIAS_ES = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"]
MESES_ES = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
]


def _cargar_logo_base64() -> str:
    """Carga el logo de la ESE desde static/ y lo devuelve en base64."""
    for nombre in ("logo_es.png", "logo_left.png"):
        logo_path = Path(__file__).parent.parent / "static" / nombre
        if logo_path.exists():
            with open(logo_path, "rb") as f:
                return base64.b64encode(f.read()).decode()
    # Fallback: logo en frontend/public
    logo_path = Path(__file__).parent.parent.parent / "frontend" / "public" / "logo_es.png"
    if logo_path.exists():
        with open(logo_path, "rb") as f:
            return base64.b64encode(f.read()).decode()
    return ""


def _fecha_texto_es(fecha: date | None = None) -> str:
    """Formatea una fecha en español: 'MARTES 04 DE AGOSTO DE 2026'."""
    f = fecha or date.today()
    return f"{DIAS_ES[f.weekday()]} {f.day:02d} DE {MESES_ES[f.month - 1]} DE {f.year}"


def _numero_periodo(periodo_nombre: str | None) -> str:
    """Deriva el número de la cuenta de cobro del periodo, ej. '01'."""
    return "01"


def generar_cuenta_cobro_pdf(
    *,
    contratista_nombre: str,
    contratista_cedula: str,
    expedida_en: str | None,
    banco: str | None,
    tipo_cuenta: str | None,
    numero_cuenta: str | None,
    numero_contrato: str,
    objeto: str,
    valor: float,
    periodo_nombre: str,
    numero: str = "01",
    fecha: date | None = None,
) -> bytes:
    """Genera el PDF de la cuenta de cobro."""
    from app.services.numero_letras import numero_a_letras

    valor_letras = numero_a_letras(valor)
    # Ej: numero_a_letras(6500000) → "SEIS MILLONES QUINIENTOS MIL PESOS M/CTE"
    if not valor_letras.upper().endswith("M/CTE"):
        valor_letras = f"{valor_letras} M/CTE"

    ctx = {
        "logo_base64": _cargar_logo_base64(),
        "numero": numero,
        "periodo_nombre": periodo_nombre,
        "contratista_nombre": contratista_nombre.upper(),
        "contratista_cedula": contratista_cedula,
        "expedida_en": expedida_en,
        "valor_letras": valor_letras,
        "valor": valor,
        "objeto": objeto,
        "numero_contrato": numero_contrato,
        "fecha_texto": _fecha_texto_es(fecha),
        "banco": banco,
        "tipo_cuenta": tipo_cuenta,
        "numero_cuenta": numero_cuenta,
    }

    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    template = env.get_template("cuenta_cobro.html")
    html_str = template.render(**ctx)

    pdf_bytes = HTML(string=html_str).write_pdf()
    return pdf_bytes
