"""Servicio de generación de Informe de Evaluación de Cumplimiento.
Genera PDF (WeasyPrint) y DOCX (python-docx) con la misma estructura formal.
"""

import io
import base64
import os
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

MESES = [
    "", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
]

# ─── Renderizado común ───────────────────────────────────────────────────

def _cargar_logo_base64() -> str:
    """Carga el logo de la ESE desde static/ y lo devuelve en base64."""
    logo_path = Path(__file__).parent.parent / "static" / "logo_es.png"
    if logo_path.exists():
        with open(logo_path, "rb") as f:
            return base64.b64encode(f.read()).decode()
    return ""


def _build_context(contratista: dict, contratos: list, resumen: dict) -> dict:
    """Construye el contexto unificado para PDF y DOCX."""
    today = datetime.now()
    fecha_informe = f"{today.day:02d} de {MESES[today.month]} de {today.year}"

    # Preparar actividades con estado global
    total_actividades = 0
    for c in contratos:
        for act in c.get("actividades", []):
            total_actividades += 1
            evs = act.get("evidencias", [])
            act["total_evidencias"] = len(evs)
            act["observacion"] = None
            act["estado_global"] = "SIN_EVIDENCIA"
            if evs:
                # Última evidencia define el estado
                ultima = evs[-1]
                act["estado_global"] = ultima.get("estado", "PENDIENTE")
                act["observacion"] = ultima.get("observacion_coordinadora")

    total_ev = resumen.get("total_actividades", total_actividades) or 1

    return {
        "logo_base64": _cargar_logo_base64(),
        "nombre": contratista.get("nombre", ""),
        "identificacion": contratista.get("identificacion", ""),
        "telefono": contratista.get("telefono"),
        "correo": contratista.get("correo"),
        "contrato": contratos[0]["numero_contrato"] if contratos else "",
        "perfil": contratos[0].get("perfil") if contratos else "",
        "periodo": MESES[today.month],
        "fecha_informe": fecha_informe,
        "total_actividades": total_actividades,
        "aprobadas": resumen.get("aprobadas", 0),
        "rechazadas": resumen.get("rechazadas", 0),
        "pendientes": resumen.get("pendientes", 0),
        "sin_evidencia": resumen.get("sin_evidencia", 0),
        "porcentaje": resumen.get("porcentaje_cumplimiento", 0),
        "pct_aprobadas": round(resumen.get("aprobadas", 0) / total_ev * 100, 1),
        "pct_rechazadas": round(resumen.get("rechazadas", 0) / total_ev * 100, 1),
        "pct_pendientes": round(resumen.get("pendientes", 0) / total_ev * 100, 1),
        "pct_sin_evidencia": round(resumen.get("sin_evidencia", 0) / total_ev * 100, 1),
        "contratos": contratos,
        "observaciones": [],  # se llena abajo si hay observaciones
    }


# ─── Generador PDF ────────────────────────────────────────────────────────

def generar_pdf(contratista: dict, contratos: list, resumen: dict) -> bytes:
    """Genera el PDF del informe de evaluación."""
    ctx = _build_context(contratista, contratos, resumen)

    # Recolectar observaciones
    observaciones = []
    for c in contratos:
        for act in c.get("actividades", []):
            if act.get("observacion"):
                observaciones.append({
                    "actividad": act["descripcion"],
                    "texto": act["observacion"],
                })
    ctx["observaciones"] = observaciones

    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    template = env.get_template("informe_evaluacion.html")
    html_str = template.render(**ctx)

    pdf_bytes = HTML(string=html_str).write_pdf()
    return pdf_bytes


# ─── Generador DOCX ───────────────────────────────────────────────────────

def _add_styled_paragraph(doc, text, style_name=None, bold=False, size=None, color=None, alignment=None, space_after=None):
    """Agrega un párrafo con estilo."""
    p = doc.add_paragraph()
    if style_name:
        p.style = doc.styles[style_name]
    run = p.add_run(text)
    run.bold = bold
    if size:
        run.font.size = Pt(size)
    if color:
        run.font.color.rgb = RGBColor(*color)
    if alignment is not None:
        p.alignment = alignment
    if space_after is not None:
        p.paragraph_format.space_after = Pt(space_after)
    return p


def _add_cell_text(cell, text, bold=False, size=9, color=None, alignment=None):
    """Agrega texto formateado a una celda de tabla."""
    cell.text = ""
    p = cell.paragraphs[0]
    run = p.add_run(str(text))
    run.bold = bold
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = RGBColor(*color)
    if alignment is not None:
        p.alignment = alignment
    # Cell shading
    return cell


def _set_cell_shading(cell, color_hex):
    """Aplica color de fondo a una celda."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)


def generar_docx(contratista: dict, contratos: list, resumen: dict) -> bytes:
    """Genera el DOCX del informe de evaluación."""
    ctx = _build_context(contratista, contratos, resumen)
    doc = Document()

    # ─── Estilos de párrafo ────────────────────────────────────────────
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(10)

    # ─── Header ────────────────────────────────────────────────────────
    # Logo
    logo_b64 = ctx["logo_base64"]
    if logo_b64:
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(base64.b64decode(logo_b64))
            logo_path = tmp.name
        try:
            doc.add_picture(logo_path, width=Cm(3))
        except Exception:
            pass
        finally:
            try:
                os.unlink(logo_path)
            except Exception:
                pass

    _add_styled_paragraph(doc, "", space_after=2)
    _add_styled_paragraph(doc, "ESE NORTE 3 E.S.E.",
                          bold=True, size=14, color=(26, 82, 118),
                          alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    _add_styled_paragraph(doc, "Equipos Básicos de Salud",
                          bold=False, size=11, color=(44, 62, 80),
                          alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=6)

    # ─── Title ─────────────────────────────────────────────────────────
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(6)
    title_p.paragraph_format.space_after = Pt(12)
    run = title_p.add_run("INFORME DE EVALUACIÓN DE CUMPLIMIENTO")
    run.bold = True
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(26, 82, 118)

    # ─── 1. Datos del Contratista ──────────────────────────────────────
    _add_styled_paragraph(doc, "1. DATOS DEL CONTRATISTA",
                          bold=True, size=10, color=(26, 82, 118),
                          space_after=4)

    info_data = [
        ("Nombre:", ctx["nombre"]),
        ("Identificación:", ctx["identificacion"]),
        ("Teléfono:", ctx["telefono"] or "—"),
        ("Correo:", ctx["correo"] or "—"),
        ("Contrato:", ctx["contrato"]),
        ("Perfil:", ctx["perfil"] or "—"),
        ("Periodo evaluado:", ctx["periodo"]),
        ("Fecha del informe:", ctx["fecha_informe"]),
    ]

    table_info = doc.add_table(rows=len(info_data), cols=2)
    table_info.style = "Table Grid"
    table_info.alignment = WD_TABLE_ALIGNMENT.LEFT
    for i, (label, value) in enumerate(info_data):
        _add_cell_text(table_info.rows[i].cells[0], label, bold=True, size=9)
        _add_cell_text(table_info.rows[i].cells[1], value, bold=False, size=9)

    doc.add_paragraph()  # spacer

    # ─── 2. Resumen ────────────────────────────────────────────────────
    _add_styled_paragraph(doc, "2. RESUMEN DE CUMPLIMIENTO",
                          bold=True, size=10, color=(26, 82, 118),
                          space_after=4)

    res_data = [
        ("Actividades", ctx["total_actividades"]),
        ("Aprobadas", ctx["aprobadas"]),
        ("Rechazadas", ctx["rechazadas"]),
        ("Pendientes", ctx["pendientes"]),
        ("Sin evidencia", ctx["sin_evidencia"]),
    ]

    table_res = doc.add_table(rows=1, cols=len(res_data))
    table_res.style = "Table Grid"
    table_res.alignment = WD_TABLE_ALIGNMENT.CENTER
    for j, (label, value) in enumerate(res_data):
        cell = table_res.rows[0].cells[j]
        _add_cell_text(cell, str(value), bold=True, size=14,
                       alignment=WD_ALIGN_PARAGRAPH.CENTER)
        cell2 = table_res.add_row().cells[j]
        _add_cell_text(cell2, label.upper(), bold=False, size=7,
                       color=(102, 102, 102),
                       alignment=WD_ALIGN_PARAGRAPH.CENTER)
        _set_cell_shading(cell, "F0F8FF")
        _set_cell_shading(cell2, "F0F8FF")

    doc.add_paragraph()

    # Cumplimiento percentage
    _add_styled_paragraph(doc,
        f"Porcentaje de cumplimiento: {ctx['porcentaje']}%",
        bold=True, size=10, color=(26, 164, 78), space_after=6)

    # ─── 3. Detalle de Actividades ─────────────────────────────────────
    _add_styled_paragraph(doc, "3. DETALLE DE ACTIVIDADES POR CONTRATO",
                          bold=True, size=10, color=(26, 82, 118),
                          space_after=4)

    for c in contratos:
        # Contract sub-header
        _add_styled_paragraph(doc,
            f"Contrato: {c['numero_contrato']}" +
            (f" — {c.get('perfil', '')}" if c.get('perfil') else ""),
            bold=True, size=9, color=(26, 82, 118), space_after=2)

        acts = c.get("actividades", [])
        if not acts:
            _add_styled_paragraph(doc, "  Sin actividades registradas.",
                                  size=9, color=(150, 150, 150))
            continue

        table_act = doc.add_table(rows=1 + len(acts), cols=4)
        table_act.style = "Table Grid"
        table_act.alignment = WD_TABLE_ALIGNMENT.LEFT

        # Header row
        headers = ["#", "Actividad", "Estado", "Ev."]
        for j, h in enumerate(headers):
            cell = table_act.rows[0].cells[j]
            _add_cell_text(cell, h, bold=True, size=7,
                           color=(255, 255, 255),
                           alignment=WD_ALIGN_PARAGRAPH.CENTER)
            _set_cell_shading(cell, "1A5276")

        # Set column widths
        for row in table_act.rows:
            row.cells[0].width = Cm(1)
            row.cells[1].width = Cm(11)
            row.cells[2].width = Cm(2.5)
            row.cells[3].width = Cm(1)

        for i, act in enumerate(acts):
            row = table_act.rows[i + 1]
            estado = act.get("estado_global", "SIN_EVIDENCIA")
            estado_label = {
                "APROBADO": "✓ Aprobado",
                "RECHAZADO": "✗ Rechazado",
                "PENDIENTE": "⏳ Pendiente",
            }.get(estado, "— Sin evidencia")

            _add_cell_text(row.cells[0], str(i + 1),
                           alignment=WD_ALIGN_PARAGRAPH.CENTER)
            _add_cell_text(row.cells[1], act.get("descripcion", ""), size=8)
            _add_cell_text(row.cells[2], estado_label, size=8,
                           alignment=WD_ALIGN_PARAGRAPH.CENTER)
            _add_cell_text(row.cells[3], str(act.get("total_evidencias", 0)),
                           alignment=WD_ALIGN_PARAGRAPH.CENTER)

            # Observation row
            if act.get("observacion"):
                obs_p = doc.add_paragraph()
                obs_p.paragraph_format.space_before = Pt(0)
                obs_p.paragraph_format.space_after = Pt(4)
                run_label = obs_p.add_run("Observación: ")
                run_label.bold = True
                run_label.font.size = Pt(8)
                run_label.font.color.rgb = RGBColor(125, 102, 8)
                run_text = obs_p.add_run(act["observacion"])
                run_text.font.size = Pt(8)

        doc.add_paragraph()

    # ─── 4. Observaciones ─────────────────────────────────────────────
    observaciones = []
    for c in contratos:
        for act in c.get("actividades", []):
            if act.get("observacion"):
                observaciones.append({
                    "actividad": act["descripcion"],
                    "texto": act["observacion"],
                })

    if observaciones:
        _add_styled_paragraph(doc, "4. OBSERVACIONES",
                              bold=True, size=10, color=(26, 82, 118),
                              space_after=4)
        for obs in observaciones:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(4)
            run = p.add_run(f"{obs['actividad']}: ")
            run.bold = True
            run.font.size = Pt(9)
            run2 = p.add_run(obs["texto"])
            run2.font.size = Pt(9)

    # ─── Firmas ────────────────────────────────────────────────────────
    doc.add_paragraph()
    doc.add_paragraph()

    sig_table = doc.add_table(rows=1, cols=2)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for j, (titulo, sub) in enumerate([
        ("COORDINADOR DE SUPERVISIÓN", "ESE Norte 3 E.S.E."),
        ("CONTRATISTA", ctx["nombre"]),
    ]):
        cell = sig_table.rows[0].cells[j]
        cell.text = ""
        for _ in range(3):
            cell.add_paragraph()
        p_line = cell.add_paragraph()
        p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_line.paragraph_format.space_before = Pt(20)
        r = p_line.add_run("_" * 35)
        r.font.size = Pt(9)
        p_name = cell.add_paragraph()
        p_name.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r2 = p_name.add_run(titulo)
        r2.bold = True
        r2.font.size = Pt(9)
        p_sub = cell.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r3 = p_sub.add_run(sub)
        r3.font.size = Pt(8)
        r3.font.color.rgb = RGBColor(102, 102, 102)

    # ─── Footer ────────────────────────────────────────────────────────
    doc.add_paragraph()
    footer_p = doc.add_paragraph()
    footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_f = footer_p.add_run(
        f"ESE Norte 3 E.S.E. — Equipos Básicos de Salud\n"
        f"Documento generado el {ctx['fecha_informe']} — GESCO V2"
    )
    run_f.font.size = Pt(7)
    run_f.font.color.rgb = RGBColor(136, 136, 136)

    # ─── Output ────────────────────────────────────────────────────────
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()
