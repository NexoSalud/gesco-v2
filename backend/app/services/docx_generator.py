"""Generador de documentos .docx de contratos.

Migrado y mejorado desde GESCO app.py. Genera un documento Word profesional
con las 14 cláusulas legales, logos, firmas y formato ESE Norte 3.
"""

import io
import json
import os
from typing import Any

from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

from app.services.numero_letras import numero_a_letras

# ─── DATOS DE LA ESE ───────────────────────────────────────────────────────────
ESE_NOMBRE = "ESE NORTE 3"
ESE_NIT = "NIT. 891.xxx.xxx-x"
ESE_GERENTE = "ADELA MESÚ PONTÓN"
ESE_CARGO_GERENTE = "GERENTE E.S.E. NORTE 3"
ESE_CC_GERENTE = "C.C. 31.448.285"
ESE_MUNICIPIO = "Puerto Tejada – Cauca"

# ─── CLAUSULAS DEL CONTRATO (base) ────────────────────────────────────────────

CLAUSULAS = [
    ("PRIMERA. – OBJETO:", None),  # Se reemplaza dinámicamente
    ("SEGUNDA. – OBLIGACIONES GENERALES DEL CONTRATISTA:",
     "El contratista se obliga a cumplir con el objeto del presente contrato de conformidad con las "
     "especificaciones técnicas, normas profesionales y disposiciones legales vigentes, bajo su "
     "exclusiva responsabilidad y con la más amplia autonomía técnica y administrativa."),
    ("TERCERA. – OBLIGACIONES ESPECÍFICAS:", None),  # Se reemplaza con las del perfil
    ("CUARTA. – VALOR DEL CONTRATO:", None),
    ("QUINTA. – FORMA DE PAGO:", "La ESE NORTE 3 pagará al CONTRATISTA el valor del contrato de acuerdo "
     "con las cuotas establecidas y previa presentación de la documentación requerida, incluyendo "
     "la planilla de seguridad social de los períodos correspondientes."),
    ("SEXTA. – VIGENCIA DEL CONTRATO:", None),
    ("SÉPTIMA. – SUPERVISIÓN:", None),
    ("OCTAVA. – LUGAR DE EJECUCIÓN:", None),
    ("NOVENA. – GARANTÍAS:",
     "El CONTRATISTA declara que conoce y acepta las condiciones del contrato y se obliga a su "
     "cumplimiento. La ESE NORTE 3 se reserva el derecho de exigir las garantías establecidas en "
     "el Estatuto de Contratación de la entidad."),
    ("DÉCIMA. – CESIÓN:",
     "El CONTRATISTA no podrá ceder ni transferir total ni parcialmente los derechos y obligaciones "
     "derivados del presente contrato sin autorización previa y escrita de la ESE NORTE 3."),
    ("DÉCIMA PRIMERA. – INHABILIDADES E INCOMPATIBILIDADES:",
     "El CONTRATISTA declara bajo la gravedad del juramento que no se encuentra incurso en ninguna "
     "de las causales de inhabilidad e incompatibilidad previstas en la Constitución y la Ley."),
    ("DÉCIMA SEGUNDA. – CLÁUSULAS EXCEPCIONALES:",
     "En cumplimiento del Estatuto de Contratación de la ESE NORTE 3, se incorporan las cláusulas "
     "de interpretación unilateral, modificación unilateral, terminación unilateral, sometimiento "
     "a las leyes nacionales y caducidad administrativa."),
    ("DÉCIMA TERCERA. – CAUSALES DE TERMINACIÓN:",
     "El contrato podrá ser terminado anticipadamente por mutuo acuerdo, por decisión unilateral "
     "de la entidad, o por las causales establecidas en el Estatuto de Contratación de la ESE NORTE 3."),
    ("DÉCIMA CUARTA. – PROTECCIÓN DE DATOS PERSONALES:",
     "En cumplimiento de la Ley Estatutaria 1581 de 2012, EL CONTRATISTA autoriza el tratamiento "
     "de sus datos personales para los fines contractuales, administrativos y contables de la ESE NORTE 3."),
    ("DÉCIMA QUINTA. – CLÁUSULA PENAL:",
     "En caso de incumplimiento del CONTRATISTA, este pagará a la ESE NORTE 3, a título de sanción, "
     "el equivalente al diez por ciento (10%) del valor del contrato."),
]

# ─── HELPERS DOCX ─────────────────────────────────────────────────────────────


def _set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        node = OxmlElement(f"w:{side}")
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), "4")
        node.set(qn("w:space"), "0")
        node.set(qn("w:color"), "333333")
        tcBorders.append(node)
    tcPr.append(tcBorders)


def _agregar_parrafo(doc, text="", bold=False, italic=False, size=11,
                     align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=4, space_before=0):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    if text:
        r = p.add_run(text)
        r.bold = bold
        r.italic = italic
        r.font.size = Pt(size)
        r.font.name = "Times New Roman"
    return p


def _mixed_paragraph(doc, parts, size=11, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=4):
    """parts: list of (text, bold, italic) tuples."""
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    for text, bold, italic in parts:
        r = p.add_run(text)
        r.bold = bold
        r.italic = italic
        r.font.size = Pt(size)
        r.font.name = "Times New Roman"
    return p


def _add_heading_line(doc, text, size=12):
    """Adds a centered, bold heading."""
    _agregar_parrafo(doc, text, bold=True, size=size, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=6)


# ─── GENERADOR PRINCIPAL ─────────────────────────────────────────────────────
def generar_contrato_docx(data: dict, obligaciones_esp: list[str] | None = None) -> bytes:
    """Genera un documento .docx para un contrato.

    Args:
        data: Dict con campos del contrato (numero, contratista, cedula, etc.)
        obligaciones_esp: Lista de obligaciones específicas según el perfil

    Returns:
        bytes del archivo .docx
    """
    doc = Document()

    # ── Configurar página ──
    for sec in doc.sections:
        sec.top_margin = Cm(2.0)
        sec.bottom_margin = Cm(2.2)
        sec.left_margin = Cm(2.8)
        sec.right_margin = Cm(2.5)
        sec.page_width = Cm(21.59)
        sec.page_height = Cm(27.94)
        sec.header_distance = Cm(0.8)
        sec.footer_distance = Cm(0.8)

    # ── Encabezado (solo en sección 1) ──
    header = doc.sections[0].header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # — Logos en el header —
    logo_left_path = "/app/uploads/logos/logo_left.png"
    logo_right_path = "/app/uploads/logos/logo_right.png"
    has_left = os.path.exists(logo_left_path)
    has_right = os.path.exists(logo_right_path)

    if has_left or has_right:
        hp.clear()
        tbl = header.add_table(rows=1, cols=2, width=Cm(16))
        tbl.autofit = True
        cell_left = tbl.rows[0].cells[0]
        cell_left.width = Cm(8)
        if has_left:
            p_left = cell_left.paragraphs[0]
            p_left.alignment = WD_ALIGN_PARAGRAPH.LEFT
            run_pic = p_left.add_run()
            run_pic.add_picture(logo_left_path, width=Inches(1.2))
        else:
            cell_left.text = ""
        cell_right = tbl.rows[0].cells[1]
        cell_right.width = Cm(8)
        if has_right:
            p_right = cell_right.paragraphs[0]
            p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            run_pic = p_right.add_run()
            run_pic.add_picture(logo_right_path, width=Inches(1.2))
        else:
            cell_right.text = ""
        tbl_pr = tbl._tbl.tblPr
        tbl_borders = OxmlElement("w:tblBorders")
        for side in ("top", "left", "bottom", "right", "insideH", "insideV"):
            child = OxmlElement(f"w:{side}")
            child.set(qn("w:val"), "none")
            child.set(qn("w:sz"), "0")
            child.set(qn("w:space"), "0")
            child.set(qn("w:color"), "auto")
            tbl_borders.append(child)
        tbl_pr.append(tbl_borders)
        spacer = header.add_paragraph()
        spacer.paragraph_format.space_after = Pt(2)
    else:
        hr = hp.add_run(f"{ESE_NOMBRE}\n{ESE_NIT}\n{ESE_MUNICIPIO}")
        hr.bold = True
        hr.font.size = Pt(9)
        hr.font.name = "Arial"

    # ── TÍTULO ──
    _add_heading_line(doc, "CONTRATO DE PRESTACIÓN DE SERVICIOS", size=13)
    _add_heading_line(doc, f"No. {data.get('numero_contrato', '_________')}", size=12)

    doc.add_paragraph()  # espacio

    # ── CONSIDERANDOS ──
    _agregar_parrafo(doc, "Entre los suscritos, ", size=12)
    _mixed_paragraph(doc, [
        (ESE_GERENTE, True, False),
        (f", {ESE_CARGO_GERENTE}, {ESE_CC_GERENTE}, identificada con Nit {ESE_NIT}, "
         "domiciliada en ", False, False),
        (ESE_MUNICIPIO, True, False),
        (", quien en adelante se denominará ", False, False),
        ("LA ENTIDAD", True, False),
        (" y ", False, False),
        (data.get("nombre_contratista", "___________________"), True, False),
        (f", identificado(a) con C.C. No. {data.get('cedula', '_________')} "
         f"expedida en {data.get('lugar_expedicion', '_________')}, de {data.get('direccion', '_________')}, "
         f"teléfono {data.get('telefono', '_________')}, correo {data.get('correo', '_________')}, "
         "quien se desempeñará como ", False, False),
        (data.get("perfil", "_________").upper(), True, False),
        (", quien en adelante se denominará ", False, False),
        ("EL CONTRATISTA", True, False),
        (", hemos acordado celebrar el presente contrato de prestación de servicios, "
         "el cual se regirá por las siguientes cláusulas:", False, False),
    ], size=12, space_after=8)

    # ── CLAUSULAS ──
    valor = float(data.get("valor_contrato", 0))
    valor_letras = data.get("valor_letras", "") or numero_a_letras(valor)
    fecha_inicio = data.get("fecha_inicio", "_________")
    fecha_fin = data.get("fecha_fin", "_________")
    supervisor = data.get("supervisor", "___________________")
    cedula_sup = data.get("cedula_supervisor", "_________")
    cargo_sup = data.get("cargo_supervisor", "___________________")
    lugar_ejec = data.get("lugar_ejecucion", ESE_MUNICIPIO)
    cuotas = data.get("cuotas", "_________")
    no_cdp = data.get("no_cdp", "_________")
    objeto = data.get("objeto", "_________")
    unidad_atencion = data.get("unidad_atencion", "_________").upper()

    for titulo, texto_default in CLAUSULAS:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(6)

        # Título de la cláusula en bold
        r = p.add_run(titulo + " ")
        r.bold = True
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)

        # Contenido dinámico
        contenido = texto_default or ""
        if "OBJETO" in titulo.upper() and texto_default is None:
            contenido = (
                f"El presente contrato tiene por objeto la prestación de servicios como "
                f"{data.get('perfil', '_________').upper()} en la {ESE_NOMBRE}, en el "
                f"municipio/Unidad de Atención {unidad_atencion}. "
                f"{objeto}"
            )
        elif "OBLIGACIONES ESPECÍFICAS" in titulo.upper():
            pass  # Las manejamos abajo
        elif "VALOR DEL CONTRATO" in titulo.upper():
            contenido = (
                f"El valor del presente contrato es de {valor_letras}, equivalentes a "
                f"${valor:,.0f} pesos moneda corriente colombiana. El valor incluye todos los "
                f"impuestos, tasas y contribuciones a cargo del CONTRATISTA."
            )
        elif "VIGENCIA" in titulo.upper():
            contenido = (
                f"El presente contrato tendrá una vigencia desde el {fecha_inicio} "
                f"hasta el {fecha_fin}."
            )
        elif "SUPERVISIÓN" in titulo.upper():
            contenido = (
                f"La supervisión del presente contrato estará a cargo de {supervisor}, "
                f"identificado con C.C. {cedula_sup}, en su calidad de {cargo_sup}, "
                f"quien verificará el cumplimiento del objeto contractual."
            )
        elif "LUGAR DE EJECUCIÓN" in titulo.upper():
            contenido = (
                f"El servicio se ejecutará en {lugar_ejec}, "
                f"Unidad de Atención {unidad_atencion}."
            )
        elif "FORMA DE PAGO" in titulo.upper():
            contenido = (
                f"La ESE NORTE 3 pagará al CONTRATISTA el valor del contrato en "
                f"{cuotas} cuota(s), previa presentación de la documentación requerida, "
                f"incluyendo las planillas de seguridad social de los períodos correspondientes."
            )

        r2 = p.add_run(contenido)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(12)

    # ── OBLIGACIONES ESPECÍFICAS ──
    doc.add_paragraph()
    _agregar_parrafo(doc, "OBLIGACIONES DEL CONTRATISTA:", bold=True, size=12)
    for i, oblig in enumerate(obligaciones_esp or [], 1):
        p = doc.add_paragraph(style="List Number")
        run = p.add_run(oblig)
        run.font.name = "Times New Roman"
        run.font.size = Pt(12)

    doc.add_paragraph()
    _agregar_parrafo(
        doc,
        "PARÁGRAFO PRIMERO: El cumplimiento será validado mediante inspección y vigilancia "
        "diaria a través del tablero de control dispuesto por el Ministerio de Salud y "
        "Protección Social.",
        italic=True, size=11,
    )

    # ── FIRMAS ──
    doc.add_paragraph()
    doc.add_paragraph()
    _agregar_parrafo(
        doc,
        f"Estando las partes de acuerdo con lo consignado en el presente documento, se firma "
        f"en {ESE_MUNICIPIO}, el día {data.get('fecha_contrato', fecha_inicio)}.",
        size=12,
    )
    doc.add_paragraph()
    doc.add_paragraph()

    # Tabla de firmas
    tabla = doc.add_table(rows=2, cols=2)
    tabla.style = "Table Grid"
    celdas = tabla.rows[0].cells
    celdas[0].text = f"{ESE_GERENTE}\n{ESE_CARGO_GERENTE}\n{ESE_CC_GERENTE}"
    celdas[1].text = (
        f"{data.get('nombre_contratista', '___________________')}\n"
        f"{data.get('perfil', '_________').upper()}\n"
        f"C.C. {data.get('cedula', '_________')}"
    )
    for cell in celdas:
        for p2 in cell.paragraphs:
            p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in p2.runs:
                run.font.name = "Times New Roman"
                run.font.size = Pt(12)

    doc.add_paragraph()
    _agregar_parrafo(doc, "ELABORADO POR: APOYO JURÍDICO", italic=True, size=10,
                     align=WD_ALIGN_PARAGRAPH.CENTER)
    _agregar_parrafo(doc, f"APROBADO POR: {ESE_GERENTE} – {ESE_CARGO_GERENTE}",
                     italic=True, size=10, align=WD_ALIGN_PARAGRAPH.CENTER)

    # ── Guardar a bytes ──
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.getvalue()
