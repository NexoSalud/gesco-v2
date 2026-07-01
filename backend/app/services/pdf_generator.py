"""Generador de PDFs de supervisión (informes de pago) usando WeasyPrint + Jinja2."""

import io
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.services.numero_letras import numero_a_letras

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


def generar_supervision_pdf(contrato: dict, pago: dict, planillas: list) -> bytes:
    """Genera PDF de informe de supervisión de pago."""
    valor_letras = numero_a_letras(pago.get("valor_a_pagar", 0))

    plantilla = env.get_template("supervision_pdf.html")
    html = plantilla.render(
        contrato=contrato,
        pago=pago,
        planillas=planillas or [],
        valor_letras=valor_letras,
        fecha_generacion=datetime.now().strftime("%d/%m/%Y %H:%M"),
    )

    pdf_bytes = HTML(string=html).write_pdf()
    return pdf_bytes
