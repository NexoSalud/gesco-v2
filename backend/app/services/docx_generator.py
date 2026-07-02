"""Generador de .docx de contratos a partir de plantilla oficial ESE Norte 3."""
import io, os, re
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
    if old_text not in paragraph.text:
        return False
    full_new = paragraph.text.replace(old_text, str(new_text) if new_text else "")
    for i, run in enumerate(paragraph.runs):
        run.text = full_new if i == 0 else ""
    return True


def _replace_all(doc, placeholders):
    for ph, val in placeholders.items():
        val = str(val) if val is not None else ""
        for p in doc.paragraphs:
            if ph in p.text:
                _merge_runs_and_replace(p, ph, val)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for p in cell.paragraphs:
                        if ph in p.text:
                            _merge_runs_and_replace(p, ph, val)


def _html_to_plain(html_text):
    """Convierte HTML simple a texto plano con formato DOCX.
    - <br> → salto de línea
    - <table>, <th>, <td> → extrae texto tabular
    - <b>, <strong> → indica con mayúsculas
    """
    # Reemplazar <br>, <br/>, </br> con \n
    text = re.sub(r'<br\s*/?>', '\n', html_text, flags=re.IGNORECASE)
    
    # Extraer tablas HTML: por simplicidad, extraer texto de celdas
    # Buscar <table>...</table>
    def _extract_table(m):
        table_html = m.group(0)
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, re.DOTALL | re.IGNORECASE)
        lines = []
        for row in rows:
            cells = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, re.DOTALL | re.IGNORECASE)
            # Limpiar HTML interno de cada celda
            cell_texts = []
            for c in cells:
                ct = re.sub(r'<[^>]+>', '', c).strip()
                cell_texts.append(ct)
            lines.append(' | '.join(cell_texts))
        return '\n'.join(lines)
    
    text = re.sub(r'<table[^>]*>.*?</table>', _extract_table, text, flags=re.DOTALL | re.IGNORECASE)
    
    # Limpiar otros tags HTML
    text = re.sub(r'<[^>]+>', '', text)
    # Decodificar entidades HTML básicas
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    # Limpiar múltiples espacios y líneas
    text = re.sub(r' +\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()


def _create_paragraph_element(text, size=12, bold=False, align='both'):
    """Crea un elemento <w:p> con un run."""
    new_p = OxmlElement('w:p')
    pPr = OxmlElement('w:pPr')
    jc = OxmlElement('w:jc')
    jc.set(qn('w:val'), align)
    pPr.append(jc)
    new_p.append(pPr)
    
    r_elem = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:ascii'), 'Aptos Display')
    rFonts.set(qn('w:hAnsi'), 'Aptos Display')
    rPr.append(rFonts)
    sz = OxmlElement('w:sz')
    sz.set(qn('w:val'), str(size * 2))
    rPr.append(sz)
    if bold:
        b = OxmlElement('w:b')
        rPr.append(b)
    r_elem.append(rPr)
    
    t = OxmlElement('w:t')
    t.text = text
    t.set(qn('xml:space'), 'preserve')
    r_elem.append(t)
    new_p.append(r_elem)
    return new_p


def generar_contrato_docx(data: dict, obligaciones_esp: list[str] | None = None) -> bytes:
    valor = float(data.get("valor_contrato", 0))
    valor_letras = data.get("valor_letras", "") or numero_a_letras(valor)
    fecha_inicio = str(data.get("fecha_inicio", str(date.today())))
    
    placeholders = {
        "<<NO. DE CONTRATO>>": data.get("numero_contrato", "_________"),
        "<<FECHA DEL CONTRATO>>": str(data.get("fecha_contrato", data.get("fecha_inicio", "_________"))),
        "<<fecha del contrato>>": str(data.get("fecha_contrato", data.get("fecha_inicio", "_________"))),
        "<<CONTRATISTA>>": data.get("nombre_contratista", "___________________"),
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
            sec.top_margin = Cm(2.5); sec.bottom_margin = Cm(2.5)
            sec.left_margin = Cm(3.0); sec.right_margin = Cm(3.0)
    
    _replace_all(doc, placeholders)

    # Insertar obligaciones
    if obligaciones_esp:
        for pi, p in enumerate(doc.paragraphs):
            if "<<OBLIGACIONES>>" in p.text:
                _merge_runs_and_replace(p, "<<OBLIGACIONES>>", "")
                last_p = p._p  # referencia para addnext
                for oi, oblig in enumerate(obligaciones_esp, 1):
                    # Convertir HTML a texto plano
                    texto_plano = _html_to_plain(oblig)
                    
                    # Si el texto tiene saltos de línea (de <br> o tablas extraídas en múltiples líneas),
                    # crear múltiples párrafos para mantener formato
                    partes = texto_plano.split('\n')
                    for pi2, parte in enumerate(partes):
                        if pi2 == 0:
                            texto_item = f"{oi}. {parte.strip()}"
                        else:
                            texto_item = parte.strip()
                        if not texto_item:
                            continue
                        new_p = _create_paragraph_element(texto_item, size=12)
                        last_p.addnext(new_p)
                        last_p = new_p
                break

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.getvalue()
