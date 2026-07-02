"""Generador de PDFs de supervisión usando WeasyPrint + Jinja2.
Formato idéntico al proyecto original gestionContractos."""

import io
import base64
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

MESES = [
    "", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
]


def _fmt_money(val) -> str:
    """Formato COP con puntos y sin decimales."""
    if not val:
        return "0"
    return "{:,.0f}".format(float(val)).replace(",", ".")


def generar_supervision_pdf(contrato: dict, pago: dict, planillas: list,
                             actividades_supervision: list | None = None) -> bytes:
    """Genera PDF con el formato oficial de supervisión."""
    from app.services.numero_letras import numero_a_letras

    hoy = datetime.now()

    # --- Construir objeto informe ---
    tipo_informe = (pago.get("tipo_informe") or "SUPERVISION").upper()
    valor_contrato = float(contrato.get("monto_total", 0))
    valor_final = float(contrato.get("monto_total", 0))  # igual (sin adiciones aún)
    valor_pagar = float(pago.get("valor_a_pagar", 0))

    # Planilla principal
    pl = planillas[0] if planillas else {}

    informe = {
        "logo_b64": contrato.get("logo_b64", ""),
        "numero_contrato": contrato.get("numero_contrato", "_____"),
        "tipo_informe": tipo_informe,
        "periodo_desde": pago.get("periodo_desde", "_________"),
        "periodo_hasta": pago.get("periodo_hasta", "_________"),
        "contratante": "EMPRESA SOCIAL DEL ESTADO NORTE 3 - E.S.E.",
        "contratista": contrato.get("nombre_contratista", "_____"),
        "identificacion": contrato.get("identificacion", "_____"),
        "lugar_expedicion": contrato.get("lugar_expedicion", ""),
        "telefono": contrato.get("telefono", ""),
        "direccion": contrato.get("direccion", ""),
        "tipo_persona": contrato.get("tipo_persona", "NATURAL"),
        "codigo_ciiu": contrato.get("codigo_ciiu", ""),
        "supervisor": contrato.get("supervisor", ""),
        "nivel_supervisor": contrato.get("nivel_supervisor", "UNIVERSITARIO, DESPACHO, COORDINACION"),
        "interventor": contrato.get("interventor", "NINGUNO"),
        "nivel_interventor": contrato.get("nivel_interventor", "N/A"),
        "cdp": contrato.get("no_cdp", ""),
        "crp": contrato.get("rp", ""),
        "imputacion": contrato.get("rubro", ""),
        "valor_contrato": valor_contrato,
        "fecha_inicio": contrato.get("fecha_inicio", "_________"),
        "fecha_fin": contrato.get("fecha_fin", "_________"),
        "tiempo_adicion": contrato.get("tiempo_adicion", "NINGUNA"),
        "valor_final": valor_final,
        "forma_pago": contrato.get("forma_pago", "SEGÚN CLÁUSULA DE FORMA DE PAGO DEL CONTRATO."),
        "numero_pago": pago.get("numero_pago", "_____"),
        "valor_a_pagar": valor_pagar,
        "otro_si": float(pago.get("otro_si", 0)),
        "valor_pagado": float(pago.get("valor_pagado", 0)),
        "saldo_a_pagar": max(0, valor_final - valor_pagar),
        "ibc": float(pl.get("ibc", 0)),
        "periodo_cotizado": pl.get("periodo_cotizado", ""),
        "eps_nombre": pl.get("eps_nombre", ""),
        "eps_valor": float(pl.get("eps_valor", 0)),
        "arl_nombre": pl.get("arl_nombre", ""),
        "arl_valor": float(pl.get("arl_valor", 0)),
        "sena_valor": float(pl.get("sena_valor", 0)),
        "icbf_valor": float(pl.get("icbf_valor", 0)),
        "ccf_nombre": pl.get("ccf_nombre", ""),
        "ccf_valor": float(pl.get("ccf_valor", 0)),
        "afp_nombre": pl.get("afp_nombre", ""),
        "afp_valor": float(pl.get("afp_valor", 0)),
        "total_planilla": float(pl.get("eps_valor", 0)) + float(pl.get("arl_valor", 0))
            + float(pl.get("afp_valor", 0)) + float(pl.get("ccf_valor", 0))
            + float(pl.get("sena_valor", 0)) + float(pl.get("icbf_valor", 0)),
        "planilla_no": pl.get("planilla_no", ""),
        "retefuente": False,
        "objeto_contrato": contrato.get("objeto", ""),
        "observaciones": pago.get("observaciones", ""),
        "folios": pago.get("folios", ""),
        "dia_firma": hoy.day,
        "mes_firma": MESES[hoy.month],
        "anio_firma": hoy.year,
    }

    # Actividades (priorizar actividades de supervisión si existen)
    if actividades_supervision:
        actividades = actividades_supervision
    else:
        actividades_text = (pago.get("actividades") or "").strip()
        actividades = []
        if actividades_text:
            for linea in actividades_text.split("\n"):
                linea = linea.strip()
                if linea:
                    actividades.append({"descripcion": linea, "cumple": True})
    if not actividades:
        actividades.append({"descripcion": "ACTIVIDADES DESARROLLADAS SEGÚN LO ESTABLECIDO EN EL CONTRATO.", "cumple": True})

    # Anexos
    anexos = [
        f"FACTURA O CUENTA DE COBRO No. {pago.get('cuentas_cobro', '______')}",
        f"PLANILLA DE SEGURIDAD SOCIAL No. {pl.get('planilla_no', '______')}",
        "INFORME DE ACTIVIDADES",
        "CERTIFICACION BANCARIA",
    ]

    # Firmas
    firmas = [
        contrato.get("supervisor", "_________________________"),
        contrato.get("nombre_contratista", "_________________________"),
    ]

    plantilla = env.get_template("supervision_pdf.html")
    html = plantilla.render(
        informe=informe,
        actividades=actividades,
        anexos=anexos,
        firmas=firmas,
        fecha_generacion=hoy.strftime("%d/%m/%Y %H:%M"),
    )

    pdf_bytes = HTML(string=html).write_pdf()
    return pdf_bytes
