"""Generador de documentos .docx de contratos a partir de plantilla oficial.

Carga la plantilla DOCX de la ESE Norte 3 y reemplaza los placeholders
con los datos reales del contrato. Si no hay plantilla, genera uno básico.
"""

import io
import json
import os
import re
from datetime import date
from copy import deepcopy

from docx import Document
from docx.shared import Pt, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

from app.services.numero_letras import numero_a_letras

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "..", "templates", "plantilla_contrato.docx")
TEMPLATE_PATH = os.path.normpath(TEMPLATE_PATH)


def _replace_in_paragraph(paragraph, placeholder, value):
    """Reemplaza un placeholder en un párrafo, preservando formato."""
    if not paragraph.text:
        return False
    if placeholder not in paragraph.text:
        return False
    
    value = str(value) if value is not None else ""
    
    for run in paragraph.runs:
        if placeholder in run.text:
            run.text = run.text.replace(placeholder, value)
    
    # Si después de reemplazar en runs aún queda, reemplazar en todo el XML
    if placeholder in paragraph.text:
        # Reemplazo directo en el XML para preservar formato parcial
        for run in paragraph.runs:
            run.text = run.text.replace(placeholder, value)
    
    return True


def _replace_in_table(table, placeholder, value):
    """Reemplaza un placeholder en todas las celdas de una tabla."""
    value = str(value) if value is not None else ""
    replaced = False
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                if _replace_in_paragraph(paragraph, placeholder, value):
                    replaced = True
    return replaced


def _find_paragraph_by_text(doc, search_text):
    """Encuentra el primer párrafo que contenga el texto dado."""
    for i, p in enumerate(doc.paragraphs):
        if search_text in p.text:
            return i, p
    return None, None


def _insert_paragraph_after(doc, after_idx, text, bold=False, size=12, 
                           align=WD_ALIGN_PARAGRAPH.JUSTIFY, style_name=None):
    """Inserta un párrafo después del índice dado."""
    # No se puede insertar fácilmente, así que trabajamos con XML
    ref_paragraph = doc.paragraphs[after_idx]
    new_p = OxmlElement('w:p')
    ref_paragraph._p.addnext(new_p)
    
    # Crear run
    pPr = OxmlElement('w:pPr')
    if style_name:
        pStyle = OxmlElement('w:pStyle')
        pStyle.set(qn('w:val'), style_name)
        pPr.append(pStyle)
    
    jc = OxmlElement('w:jc')
    jc.set(qn('w:val'), {WD_ALIGN_PARAGRAPH.CENTER: 'center', 
                         WD_ALIGN_PARAGRAPH.RIGHT: 'right',
                         WD_ALIGN_PARAGRAPH.JUSTIFY: 'both'}.get(align, 'both'))
    pPr.append(jc)
    new_p.append(pPr)
    
    r = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:ascii'), 'Aptos Display')
    rFonts.set(qn('w:hAnsi'), 'Aptos Display')
    rPr.append(rFonts)
    
    sz = OxmlElement('w:sz')
    sz.set(qn('w:val'), str(size * 2))  # half-points
    rPr.append(sz)
    
    if bold:
        b = OxmlElement('w:b')
        rPr.append(b)
    
    r.append(rPr)
    t = OxmlElement('w:t')
    t.text = text
    t.set(qn('xml:space'), 'preserve')
    r.append(t)
    new_p.append(r)
    
    return new_p


def generar_contrato_docx(data: dict, obligaciones_esp: list[str] | None = None) -> bytes:
    """Genera contrato DOCX.

    Si existe la plantilla oficial, la carga y reemplaza placeholders.
    Si no, genera un documento básico.
    """
    valor = float(data.get("valor_contrato", 0))
    valor_letras = data.get("valor_letras", "") or numero_a_letras(valor)
    
    placeholders = {
        "<<NO. DE CONTRATO>>": data.get("numero_contrato", "_________"),
        "<<FECHA DEL CONTRATO>>": str(data.get("fecha_contrato", data.get("fecha_inicio", "_________"))),
        "<<CONTRATISTA>>": data.get("nombre_contratista", "___________________"),
        "<<CÉDULA DEL CONTRATISTA>>": data.get("cedula", "_________"),
        "<<LUGAR DE EXPEDICIÓN>>": data.get("lugar_expedicion", "_________"),
        "<<DIRECCIÓN>>": data.get("direccion", "_________"),
        "<<TELÉFONO>>": data.get("telefono", "_________"),
        "<<CORREO>>": data.get("correo", "_________"),
        "<<OBJETO DEL CONTRATO>>": data.get("objeto", "_________"),
        "<<FECHA DE TERMINACIÓN>>": str(data.get("fecha_fin", "_________")),
        "<<VALOR DEL CONTRATO>>": f"${valor:,.0f} ({valor_letras})",
        "<<CDP>>": data.get("no_cdp", "_________"),
        "<<FECHA DEL CDP>>": str(data.get("fecha_cdp", "") or ""),
        "<<VALOR DEL CDP>>": str(data.get("valor_cdp", "") or ""),
        "<<LUGAR DE EJECUCIÓN>>": data.get("lugar_ejecucion", "Puerto Tejada - Cauca"),
        "<<fecha del acta>>": str(date.today() if not data.get("fecha_inicio") else data.get("fecha_inicio", str(date.today()))),
        "<<PERFIL>>": data.get("perfil", "_________"),
        "<<PERFIL_EN_MAYUS>>": (data.get("perfil", "_________") or "").upper(),
    }

    # Intentar cargar plantilla
    if os.path.exists(TEMPLATE_PATH):
        doc = Document(TEMPLATE_PATH)
    else:
        # Generar documento básico si no hay plantilla
        doc = Document()
        for sec in doc.sections:
            sec.top_margin = Cm(2.5)
            sec.bottom_margin = Cm(2.5)
            sec.left_margin = Cm(3.0)
            sec.right_margin = Cm(3.0)
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(f"CONTRATO DE PRESTACIÓN DE SERVICIOS No. {data.get('numero_contrato', '')}")
        r.bold = True
        r.font.size = Pt(14)
        r.font.name = 'Aptos Display'
        
        p2 = doc.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        r2 = p2.add_run(f"Contratista: {data.get('nombre_contratista', '')}")
        r2.font.name = 'Aptos Display'
        r2.font.size = Pt(12)

    # Reemplazar placeholders en párrafos
    for p in doc.paragraphs:
        for ph, val in placeholders.items():
            try:
                _replace_in_paragraph(p, ph, val)
            except:
                pass

    # Reemplazar placeholders en tablas
    for table in doc.tables:
        for ph, val in placeholders.items():
            try:
                _replace_in_table(table, ph, val)
            except:
                pass

    # Insertar obligaciones específicas después de <<OBLIGACIONES>>
    if obligaciones_esp:
        for idx, p in enumerate(doc.paragraphs):
            if "<<OBLIGACIONES>>" in p.text:
                # Reemplazar placeholder
                _replace_in_paragraph(p, "<<OBLIGACIONES>>", "")
                
                # Insertar cada obligación como párrafo numerado
                for i, oblig in enumerate(obligaciones_esp, 1):
                    text = f"{i}. {oblig}"
                    _insert_paragraph_after(doc, idx + i - 1, text, size=12)
                break

    # Guardar
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.getvalue()
