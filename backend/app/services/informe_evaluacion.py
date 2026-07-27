"""Servicio de generación de Informe de Evaluación de Cumplimiento.
Genera PDF (WeasyPrint) y DOCX (python-docx) con estilo profesional tipo documento formal.
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

    total_actividades = 0
    for c in contratos:
        for act in c.get("actividades", []):
            total_actividades += 1
            evs = act.get("evidencias", [])
            act["total_evidencias"] = len(evs)
            act["observacion"] = None
            if evs:
                act["estado_global"] = "APROBADO"
                # Ocultar observaciones cuando hay evidencias aprobadas
                for ev in evs:
                    ev["observacion_coordinadora"] = None
            else:
                act["estado_global"] = "SIN_EVIDENCIA"

    total_ev = resumen.get("total_actividades", total_actividades) or 1

    # Agrupar documentos contractuales por estado
    total_docs = 0
    docs_aprobados = 0
    docs_rechazados = 0
    docs_pendientes = 0
    for c in contratos:
        for doc in c.get("documentos", []):
            total_docs += 1
            if doc["estado"] == "APROBADO":
                docs_aprobados += 1
            elif doc["estado"] == "RECHAZADO":
                docs_rechazados += 1
            else:
                docs_pendientes += 1

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
        "observaciones": [],
        "documentos": contratos[0].get("documentos", []) if contratos else [],
        "total_documentos": total_docs,
        "documentos_aprobados": docs_aprobados,
        "documentos_rechazados": docs_rechazados,
        "documentos_pendientes": docs_pendientes,
    }


# ─── Generador PDF ────────────────────────────────────────────────────────

def _recolectar_anexos(contratos: list) -> list[dict]:
    """Recolecta los PDFs de documentos contractuales aprobados para anexar."""
    anexos = []
    logger.info(f"_recolectar_anexos: {len(contratos)} contratos")
    for idx, c in enumerate(contratos):
        docs = c.get("documentos", [])
        logger.info(f"  Contrato {idx}: {len(docs)} documentos")
        for doc in docs:
            estado = doc.get("estado", "?")
            tipo = doc.get("tipo_documento", "?")
            archivo_ruta = doc.get("archivo_ruta", "")
            logger.info(f"    Doc: {tipo} estado={estado} ruta={archivo_ruta!r}")
            if estado != "APROBADO":
                continue
            if not archivo_ruta:
                continue
            pdf_path = archivo_ruta.lstrip("/")
            if pdf_path.startswith("uploads/"):
                pdf_path = os.path.join("/app", pdf_path)
            else:
                pdf_path = os.path.join("/app/uploads", pdf_path)
            exists = os.path.exists(pdf_path)
            logger.info(f"    -> resolved={pdf_path!r} exists={exists}")
            if not exists:
                # Try alternative: maybe the file is directly in /app/uploads/
                alt_path = os.path.join("/app", archivo_ruta.lstrip("/"))
                logger.info(f"    -> alt={alt_path!r} exists={os.path.exists(alt_path)}")
                if os.path.exists(alt_path):
                    pdf_path = alt_path
                    exists = True
            if exists:
                anexos.append({
                    "ruta": pdf_path,
                    "tipo": tipo,
                    "nombre": doc.get("archivo_nombre", "documento"),
                })
                logger.info(f"    -> AGREGADO como anexo")
    logger.info(f"_recolectar_anexos: {len(anexos)} anexos encontrados")
    return anexos


def generar_pdf(contratista: dict, contratos: list, resumen: dict) -> bytes:
    """Genera el PDF del informe de evaluación con documentos contractuales anexados."""
    ctx = _build_context(contratista, contratos, resumen)

    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    template = env.get_template("informe_evaluacion.html")
    html_str = template.render(**ctx)

    # Generar PDF principal
    pdf_bytes = HTML(string=html_str).write_pdf()

    # Anexar documentos contractuales aprobados
    anexos = _recolectar_anexos(contratos)
    logger.info(f"generar_pdf: {len(anexos)} anexos para merge")
    if not anexos:
        logger.info("generar_pdf: sin anexos, PDF sin documentos contractuales")
        return pdf_bytes

    try:
        from pikepdf import Pdf
        logger.info("generar_pdf: pikepdf importado correctamente")

        with Pdf.open(io.BytesIO(pdf_bytes)) as main_pdf:
            logger.info(f"generar_pdf: PDF principal tiene {len(main_pdf.pages)} páginas")
            for anexo in anexos:
                try:
                    with Pdf.open(anexo["ruta"]) as doc_pdf:
                        doc_pages = len(doc_pdf.pages)
                        main_pdf.pages.extend(doc_pdf.pages)
                        logger.info(f"Anexado: {anexo['nombre']} ({doc_pages} páginas)")
                except Exception as e:
                    logger.warning(f"No se pudo anexar {anexo['nombre']}: {e}")
                    continue

            output = io.BytesIO()
            main_pdf.save(output)
            result = output.getvalue()
            logger.info(f"PDF generado con {len(anexos)} anexos contractuales ({len(result)} bytes)")
            return result
    except ImportError as e:
        logger.warning(f"pikepdf no disponible ({e}) — se omite anexado de documentos")
        return pdf_bytes
    except Exception as e:
        logger.error(f"Error anexando documentos contractuales: {e}")
        import traceback
        logger.error(traceback.format_exc())
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
    run.font.name = "Times New Roman"
    if color:
        run.font.color.rgb = RGBColor(*color)
    if alignment is not None:
        p.alignment = alignment
    return cell


def _set_cell_shading(cell, color_hex):
    """Aplica color de fondo a una celda."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)


def generar_docx(contratista: dict, contratos: list, resumen: dict) -> bytes:
    """Genera el DOCX del informe de evaluación con estilo profesional."""
    ctx = _build_context(contratista, contratos, resumen)
    doc = Document()

    # ─── Estilos base ───────────────────────────────────────────────────
    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(11)

    # ─── Letterhead: Logo + entidad ──────────────────────────────────────
    logo_b64 = ctx["logo_base64"]
    if logo_b64:
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(base64.b64decode(logo_b64))
            logo_path = tmp.name
        try:
            doc.add_picture(logo_path, width=Cm(4.5))
        except Exception:
            pass
        finally:
            try:
                os.unlink(logo_path)
            except Exception:
                pass

    _add_styled_paragraph(doc, "ESE NORTE 3 E.S.E.",
                          bold=True, size=13,
                          alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=1)
    _add_styled_paragraph(doc, "NIT: 900.146.438-8",
                          bold=False, size=8.5, color=(68, 68, 68),
                          alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=1)
    _add_styled_paragraph(doc, "Equipos Básicos de Salud",
                          bold=False, size=8.5, color=(68, 68, 68),
                          alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)

    # ─── Separator ──────────────────────────────────────────────────────
    sep_p = doc.add_paragraph()
    sep_p.paragraph_format.space_before = Pt(0)
    sep_p.paragraph_format.space_after = Pt(8)
    run_sep = sep_p.add_run("_" * 85)
    run_sep.font.size = Pt(6)
    run_sep.font.color.rgb = RGBColor(0, 0, 0)

    # ─── Title ─────────────────────────────────────────────────────────
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(8)
    title_p.paragraph_format.space_after = Pt(14)
    run = title_p.add_run("INFORME DE EVALUACIÓN DE CUMPLIMIENTO")
    run.bold = True
    run.font.size = Pt(12)
    run.font.name = "Times New Roman"

    # ─── 1. Datos del Contratista ──────────────────────────────────────
    _add_styled_paragraph(doc, "1. Datos del Contratista",
                          bold=True, size=10.5, space_after=4)

    info_data = [
        ("Nombre:", ctx["nombre"]),
        ("Identificación:", ctx["identificacion"]),
        ("Teléfono:", ctx["telefono"] or "—"),
        ("Correo electrónico:", ctx["correo"] or "—"),
        ("Contrato No.:", ctx["contrato"]),
        ("Perfil:", ctx["perfil"] or "—"),
        ("Periodo evaluado:", ctx["periodo"]),
        ("Fecha del informe:", ctx["fecha_informe"]),
    ]

    table_info = doc.add_table(rows=len(info_data), cols=2)
    table_info.style = "Table Grid"
    table_info.alignment = WD_TABLE_ALIGNMENT.LEFT
    for i, (label, value) in enumerate(info_data):
        _add_cell_text(table_info.rows[i].cells[0], label, bold=True, size=10)
        _add_cell_text(table_info.rows[i].cells[1], value, bold=False, size=10)

    doc.add_paragraph()  # spacer

    # ─── 2. Detalle de Actividades por Contrato ─────────────────────────
    _add_styled_paragraph(doc, "2. Detalle de Actividades por Contrato",
                          bold=True, size=10.5, space_after=4)

    from docx.oxml.ns import qn as _qn
    from docx.oxml import parse_xml as _parse_xml

    for c in contratos:
        _add_styled_paragraph(doc,
            f"Contrato: {c['numero_contrato']}" +
            (f" — {c.get('perfil', '')}" if c.get('perfil') else ""),
            bold=True, size=9, color=(26, 58, 92), space_after=2)

        acts = c.get("actividades", [])
        if not acts:
            _add_styled_paragraph(doc, "  Sin actividades registradas.",
                                  size=9, color=(150, 150, 150))
            continue

        # ─── Tabla: 1 fila de actividad + 1 fila de evidencias por cada act ───
        table_act = doc.add_table(rows=1, cols=3)
        table_act.style = "Table Grid"
        table_act.alignment = WD_TABLE_ALIGNMENT.LEFT

        # Column widths
        for row in table_act.rows:
            row.cells[0].width = Cm(1)
            row.cells[1].width = Cm(13.5)
            row.cells[2].width = Cm(2.5)

        # Header row
        for j, h in enumerate(["#", "Actividad", "Estado"]):
            cell = table_act.rows[0].cells[j]
            _add_cell_text(cell, h, bold=True, size=7,
                           color=(255, 255, 255),
                           alignment=WD_ALIGN_PARAGRAPH.CENTER)
            _set_cell_shading(cell, "1A3A5C")

        for i, act in enumerate(acts):
            estado = act.get("estado_global", "SIN_EVIDENCIA")
            estado_label = {
                "APROBADO": "✓ Aprobado",
                "RECHAZADO": "✗ Rechazado",
                "PENDIENTE": "⏳ Pendiente",
            }.get(estado, "— Sin evidencia")

            # ── Fila 1: Actividad ──
            row_act = table_act.add_row()
            _add_cell_text(row_act.cells[0], str(i + 1),
                           bold=True, alignment=WD_ALIGN_PARAGRAPH.CENTER)
            _add_cell_text(row_act.cells[1], act.get("descripcion", ""), size=8)
            _add_cell_text(row_act.cells[2], estado_label, size=8,
                           alignment=WD_ALIGN_PARAGRAPH.CENTER)
            for cell in row_act.cells:
                _set_cell_shading(cell, "F0F4F8")

            # ── Fila 2: Evidencias agrupadas por tipo ──
            row_ev = table_act.add_row()
            row_ev.cells[0].merge(row_ev.cells[2])
            ev_cell = row_ev.cells[0]

            evidencias = act.get("evidencias", [])
            if evidencias:
                ev_cell.text = ""
                imgs = [e for e in evidencias if e.get("tipo") == "IMAGEN"]
                textos = [e for e in evidencias if e.get("tipo") == "TEXTO"]
                archivos = [e for e in evidencias if e.get("tipo") == "ARCHIVO"]

                import tempfile, os as _os_docx

                # IMÁGENES (todas juntas)
                if imgs:
                    p_label = ev_cell.add_paragraph()
                    p_label.paragraph_format.space_before = Pt(4)
                    p_label.paragraph_format.space_after = Pt(2)
                    r_l = p_label.add_run(f"📷  IMAGEN ({len(imgs)})")
                    r_l.font.size = Pt(6.5)
                    r_l.font.color.rgb = RGBColor(136, 136, 136)
                    r_l.bold = True

                    for ev in imgs:
                        img_b64 = ev.get("img_base64")
                        if img_b64:
                            img_data_clean = base64.b64decode(img_b64)
                            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                                tmp.write(img_data_clean)
                                tmp_path = tmp.name
                            try:
                                from PIL import Image as _PILImg
                                with _PILImg.open(tmp_path) as img_pil:
                                    orig_w, orig_h = img_pil.size
                                ratio = orig_w / orig_h if orig_h > 0 else 1
                                if ratio > 1.3:
                                    disp_w = min(Cm(14), Cm(orig_w * 14 / orig_h))
                                    disp_h = Cm(float(disp_w / ratio))
                                elif ratio < 0.7:
                                    disp_h = min(Cm(10), Cm(orig_h * 10 / orig_w))
                                    disp_w = Cm(float(disp_h * ratio))
                                else:
                                    disp_w = min(Cm(10), Cm(orig_w * 10 / orig_h))
                                    disp_h = Cm(float(disp_w / ratio))
                                ev_cell.add_picture(tmp_path, width=Cm(float(disp_w)), height=Cm(float(disp_h)))
                            except Exception:
                                pass
                            finally:
                                try:
                                    _os_docx.unlink(tmp_path)
                                except Exception:
                                    pass
                        else:
                            p_fallback = ev_cell.add_paragraph()
                            r_f = p_fallback.add_run(f"  {ev.get('archivo_nombre', 'Imagen')}")
                            r_f.font.size = Pt(8)

                    for ev in imgs:
                        if ev.get("observacion_coordinadora"):
                            p_obs = ev_cell.add_paragraph()
                            p_obs.paragraph_format.space_before = Pt(1)
                            p_obs.paragraph_format.space_after = Pt(1)
                            r3 = p_obs.add_run(f"Obs: {ev['observacion_coordinadora']}")
                            r3.font.size = Pt(7)
                            r3.font.color.rgb = RGBColor(125, 102, 8)
                            r3.italic = True

                # TEXTOS (cada uno en su fila)
                for ev in textos:
                    p_t_label = ev_cell.add_paragraph()
                    p_t_label.paragraph_format.space_before = Pt(4)
                    p_t_label.paragraph_format.space_after = Pt(1)
                    r_tl = p_t_label.add_run("📝  TEXTO")
                    r_tl.font.size = Pt(6.5)
                    r_tl.font.color.rgb = RGBColor(136, 136, 136)
                    r_tl.bold = True

                    p_text = ev_cell.add_paragraph()
                    p_text.paragraph_format.space_before = Pt(1)
                    p_text.paragraph_format.space_after = Pt(2)
                    r_text = p_text.add_run(ev.get("contenido_texto", "")[:200])
                    r_text.font.size = Pt(7.5)
                    r_text.font.color.rgb = RGBColor(68, 68, 68)

                    if ev.get("observacion_coordinadora"):
                        p_obs = ev_cell.add_paragraph()
                        p_obs.paragraph_format.left_indent = Cm(0.5)
                        r3 = p_obs.add_run(f"Obs: {ev['observacion_coordinadora']}")
                        r3.font.size = Pt(7)
                        r3.font.color.rgb = RGBColor(125, 102, 8)
                        r3.italic = True

                # ARCHIVOS (cada uno en su fila)
                for ev in archivos:
                    p_a_label = ev_cell.add_paragraph()
                    p_a_label.paragraph_format.space_before = Pt(4)
                    p_a_label.paragraph_format.space_after = Pt(1)
                    r_al = p_a_label.add_run("📄  ARCHIVO")
                    r_al.font.size = Pt(6.5)
                    r_al.font.color.rgb = RGBColor(136, 136, 136)
                    r_al.bold = True

                    p_file = ev_cell.add_paragraph()
                    p_file.paragraph_format.space_before = Pt(1)
                    p_file.paragraph_format.space_after = Pt(1)
                    r_file = p_file.add_run(f"  {ev.get('archivo_nombre', 'Archivo')}")
                    r_file.font.size = Pt(8)

                    if ev.get("observacion_coordinadora"):
                        p_obs = ev_cell.add_paragraph()
                        p_obs.paragraph_format.left_indent = Cm(0.5)
                        r3 = p_obs.add_run(f"Obs: {ev['observacion_coordinadora']}")
                        r3.font.size = Pt(7)
                        r3.font.color.rgb = RGBColor(125, 102, 8)
                        r3.italic = True
            else:
                _add_cell_text(ev_cell, "Sin evidencias aprobadas",
                               size=8, color=(150, 150, 150))

        doc.add_paragraph()

    # ─── 3. Documentos Contractuales ─────────────────────────────────
    doc.add_paragraph()
    _add_styled_paragraph(doc, "3. Documentos Contractuales Anexos",
                          bold=True, size=10.5, space_after=4)

    docs_global = []
    for c in contratos:
        for d in c.get("documentos", []):
            docs_global.append({
                "contrato_numero": c["numero_contrato"],
                **d
            })

    if docs_global:
        _add_styled_paragraph(doc,
            "A continuación se listan los documentos contractuales adjuntos al presente informe.",
            size=9, color=(68, 68, 68), space_after=6)

        for i, doc_item in enumerate(docs_global):
            tipo_nombres = {
                "CUENTA_COBRO": "Cuenta de Cobro",
                "RETENCION": "Retención formato",
                "LISTADO_ASISTENCIA": "Listado de asistencia",
                "PLANILLA_SEGURIDAD": "Planilla de seguridad social",
                "CERTIFICACION_BANCARIA": "Certificación bancaria",
                "ARL": "ARL",
            }
            tipo_label = tipo_nombres.get(doc_item["tipo_documento"], doc_item["tipo_documento"])

            _add_styled_paragraph(doc,
                f"{i+1}. {tipo_label} — {doc_item.get('contrato_numero', '')}",
                bold=True, size=9, color=(26, 58, 92), space_after=2)

            _add_styled_paragraph(doc,
                f"Archivo: {doc_item.get('archivo_nombre', '')}",
                size=8, color=(100, 100, 100), space_after=1)

            _add_styled_paragraph(doc,
                f"Estado: {'✓ Aprobado' if doc_item.get('estado') == 'APROBADO' else '✗ Rechazado' if doc_item.get('estado') == 'RECHAZADO' else '⏳ Pendiente'}",
                size=8, space_after=2)

            if doc_item.get("observacion"):
                _add_styled_paragraph(doc,
                    f"Observación: {doc_item['observacion']}",
                    size=8, color=(125, 102, 8), space_after=4)

            # Intentar incrustar imagen si es un archivo de imagen
            archivo_ruta = doc_item.get("archivo_ruta", "")
            if archivo_ruta:
                pdf_path = archivo_ruta.lstrip("/")
                if pdf_path.startswith("uploads/"):
                    pdf_path = os.path.join("/app", pdf_path)
                else:
                    pdf_path = os.path.join("/app/uploads", pdf_path)

                if os.path.exists(pdf_path):
                    try:
                        from PIL import Image as _PILDoc
                        with _PILDoc.open(pdf_path) as img_check:
                            # Es una imagen incrustable
                            doc.add_picture(pdf_path, width=Cm(14))
                            doc.add_paragraph()
                    except Exception:
                        # No es imagen, es PDF (se anexa en la versión PDF)
                        _add_styled_paragraph(doc,
                            "📎 Documento anexado al final del informe en formato PDF.",
                            size=7.5, color=(100, 100, 100), space_after=6)

        doc.add_paragraph()
        _add_styled_paragraph(doc,
            "— Fin de anexos —",
            size=8, color=(150, 150, 150),
            alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=6)
    else:
        _add_styled_paragraph(doc,
            "No se han cargado documentos contractuales para este período.",
            size=9, color=(150, 150, 150))

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
        r.font.name = "Times New Roman"
        p_name = cell.add_paragraph()
        p_name.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r2 = p_name.add_run(titulo)
        r2.bold = True
        r2.font.size = Pt(9)
        r2.font.name = "Times New Roman"
        p_sub = cell.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r3 = p_sub.add_run(sub)
        r3.font.size = Pt(8)
        r3.font.color.rgb = RGBColor(85, 85, 85)
        r3.font.name = "Times New Roman"

    # ─── Footer ────────────────────────────────────────────────────────
    doc.add_paragraph()
    footer_p = doc.add_paragraph()
    footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_f = footer_p.add_run(
        f"ESE Norte 3 E.S.E. — Equipos Básicos de Salud\n"
        f"Documento generado el {ctx['fecha_informe']} — GESCO V2"
    )
    run_f.font.size = Pt(7.5)
    run_f.font.color.rgb = RGBColor(102, 102, 102)
    run_f.font.name = "Times New Roman"

    # ─── Output ────────────────────────────────────────────────────────
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()
