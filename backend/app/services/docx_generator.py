"""Generador de .docx de contratos a partir de plantilla oficial ESE Norte 3.
Carga la plantilla, reemplaza <<PLACEHOLDERS>> y agrega obligaciones específicas."""

import io
import os
import re
from datetime import date

from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

from app.services.numero_letras import numero_a_letras

TEMPLATE_PATH = os.path.normpath(os.path.join(
    os.path.dirname(__file__), "..", "templates", "plantilla_contrato.docx"))


def _merge_runs_and_replace(paragraph, old_text, new_text):
    """Reemplaza old_text por new_text en un párrafo, manejando runs divididos.
    Junta todo el texto del párrafo en el primer run y vacía los demás."""
    if old_text not in paragraph.text:
        return False
    
    full_old = paragraph.text
    full_new = full_old.replace(old_text, new_text)
    
    runs = paragraph.runs
    if not runs:
        return False
    
    # Poner todo el texto modificado en el primer run, vaciar los demás
    for i, run in enumerate(runs):
        if i == 0:
            run.text = full_new
        else:
            run.text = ""
    return True


def _replace_all(doc, placeholders):
    """Reemplaza placeholders en todos los párrafos y tablas del documento."""
    for ph, val in placeholders.items():
        val = str(val) if val is not None else ""
        
        # Reemplazar en párrafos
        for p in doc.paragraphs:
            _merge_runs_and_replace(p, ph, val)
        
        # Reemplazar en tablas
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for p in cell.paragraphs:
                        _merge_runs_and_replace(p, ph, val)


def generar_contrato_docx(data: dict, obligaciones_esp: list[str] | None = None) -> bytes:
    """Genera contrato DOCX desde la plantilla oficial."""
    valor = float(data.get("valor_contrato", 0))
    valor_letras = data.get("valor_letras", "") or numero_a_letras(valor)
    fecha_inicio = str(data.get("fecha_inicio", str(date.today())))
    
    # Mapa de placeholders
    placeholders = {
        "<<NO. DE CONTRATO>>": data.get("numero_contrato", "_________"),
        "<<FECHA DEL CONTRATO>>": str(data.get("fecha_contrato", data.get("fecha_inicio", "_________"))),
        "<<fecha del contrato>>": str(data.get("fecha_contrato", data.get("fecha_inicio", "_________"))),
        "<<CONTRATISTA>>": data.get("nombre_contratista", "___________________"),
        "<<CONTRAT": "",  # Manejar split runs
        "<<CEDULA DEL CONTRATISTA>>": data.get("cedula", "_________"),
        "<<CÉDULA DEL CONTRATISTA>>": data.get("cedula", "_________"),
        "<<LUGAR DE EXPEDICIÓN>>": data.get("lugar_expedicion", "_________"),
        "<< LUGAR DE EXPEDICIÓN>>": data.get("lugar_expedicion", "_________"),
        "<<DIRECCIÓN>>": data.get("direccion", "_________"),
        "<<TELÉFONO>>": data.get("telefono", "_________"),
        "<<CORREO>>": data.get("correo", "_________"),
        "<<OBJETO DEL CONTRATO>>": data.get("objeto", "_________"),
        "<<FECHA DE TERMINACIÓN>>": str(data.get("fecha_fin", "_________")),
        "<<fecha de terminación>>": str(data.get("fecha_fin", "_________")),
        "<<VALOR DEL CONTRATO>>": f"${valor:,.0f} ({valor_letras})",
        "<<CDP>>": data.get("no_cdp", "_________"),
        "<<FECHA DEL CDP>>": str(data.get("fecha_cdp", "") or ""),
        "<<fecha del CDP>>": str(data.get("fecha_cdp", "") or ""),
        "<<VALOR DEL CDP>>": str(data.get("valor_cdp", "") or ""),
        "<<LUGAR DE EJECUCIÓN>>": data.get("lugar_ejecucion", "Puerto Tejada - Cauca"),
        "<<fecha del acta>>": fecha_inicio,
        "<<SUPERVISOR>>": data.get("supervisor", "_________"),
        "<<CEDULA DE SUPERVISOR>>": data.get("cedula_supervisor", "_________"),
        "<<PERFIL>>": data.get("perfil", "_________"),
    }

    if os.path.exists(TEMPLATE_PATH):
        doc = Document(TEMPLATE_PATH)
    else:
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
        r2 = p2.add_run(f"Contratista: {data.get('nombre_contratista', '')}")
        r2.font.name = 'Aptos Display'
        r2.font.size = Pt(12)

    # Reemplazar placeholders
    _replace_all(doc, placeholders)

    # El placeholder <<CONTRATISTA>> está en algunos lugares como <<CONTRAT en un run e ISTA>> en otro.
    # La función _merge_runs_and_replace maneja esto juntando todo el texto en el primer run.
    # Pero si el texto completo fue reemplazado, el <<CONTRAT vacío ya no importa.

    # Insertar obligaciones específicas donde esté "<<OBLIGACIONES>>"
    if obligaciones_esp:
        for pi, p in enumerate(doc.paragraphs):
            if "<<OBLIGACIONES>>" in p.text:
                _merge_runs_and_replace(p, "<<OBLIGACIONES>>", "")
                # Insertar obligaciones después de este párrafo
                for oi, oblig in enumerate(obligaciones_esp, 1):
                    text = f"{oi}. {oblig}"
                    new_p = OxmlElement('w:p')
                    p._p.addnext(new_p)
                    pPr = OxmlElement('w:pPr')
                    jc = OxmlElement('w:jc')
                    jc.set(qn('w:val'), 'both')
                    pPr.append(jc)
                    new_p.append(pPr)
                    r_elem = OxmlElement('w:r')
                    rPr = OxmlElement('w:rPr')
                    rFonts = OxmlElement('w:rFonts')
                    rFonts.set(qn('w:ascii'), 'Aptos Display')
                    rFonts.set(qn('w:hAnsi'), 'Aptos Display')
                    rPr.append(rFonts)
                    sz = OxmlElement('w:sz')
                    sz.set(qn('w:val'), '24')
                    rPr.append(sz)
                    r_elem.append(rPr)
                    t = OxmlElement('w:t')
                    t.text = text
                    t.set(qn('xml:space'), 'preserve')
                    r_elem.append(t)
                    new_p.append(r_elem)
                break

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.getvalue()
