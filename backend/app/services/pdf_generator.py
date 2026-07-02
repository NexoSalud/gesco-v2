"""Generador de PDFs de supervisión (informes de pago) usando Playwright + Jinja2."""

import io
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from playwright.sync_api import sync_playwright

from app.services.numero_letras import numero_a_letras

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


def generar_supervision_pdf(contrato: dict, pago: dict, planillas: list) -> bytes:
    """Genera PDF de informe de supervisión de pago usando Playwright."""
    valor_letras = numero_a_letras(pago.get("valor_a_pagar", 0))

    plantilla = env.get_template("supervision_pdf.html")
    html = plantilla.render(
        contrato=contrato,
        pago=pago,
        planillas=planillas or [],
        valor_letras=valor_letras,
        fecha_generacion=datetime.now().strftime("%d/%m/%Y %H:%M"),
    )

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        page.set_content(html, wait_until="networkidle")
        pdf_bytes = page.pdf(format="A4", print_background=True, margin={"top": "10mm", "bottom": "10mm", "left": "8mm", "right": "8mm"})
        browser.close()

    return pdf_bytes
