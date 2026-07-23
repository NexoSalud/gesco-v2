"""Router para Documentos de Contratista — subida, consulta y evaluación.

Rutas públicas (identificación por cédula del contratista):
  POST /api/v1/documentos/subir        — subir un documento (multipart)
  GET  /api/v1/documentos/contrato/{contrato_numero}?cedula=...  — listar docs de un contrato
  GET  /api/v1/documentos/{id}/descargar                          — descargar PDF

Rutas protegidas (requieren JWT):
  GET    /api/v1/documentos/admin/listar        — listar todos los docs con filtros
  PUT    /api/v1/documentos/{id}/evaluar        — aprobar/rechazar
"""

import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.contratista import Contratista
from app.models.contrato import Contrato
from app.models.documento_contratista import DocumentoContratista
from app.schemas.documento_contratista import (
    DocumentoContratistaCreate,
    DocumentoContratistaOut,
    DocumentoContratistaEvaluar,
    TIPOS_DOCUMENTO,
    TIPOS_DOCUMENTO_LABELS,
)
from app.routers.auth import get_current_user
from app.models.auth import Usuario

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documentos", tags=["Documentos de Contratista"])

# Directorio para documentos contractuales
DOCS_DIR = "/app/uploads/documentos"
os.makedirs(DOCS_DIR, exist_ok=True)

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
ALLOWED_EXTENSIONS = {".pdf"}


def _es_pdf_protegido(contenido: bytes) -> tuple[bool, str | None]:
    """Verifica si un PDF está protegido con contraseña usando pikepdf.

    Returns:
        (es_protegido, mensaje_error)
    """
    try:
        import pikepdf

        pdf = pikepdf.open(contenido)
        pdf.close()  # Se abrió bien → no tiene contraseña
        return False, None
    except pikepdf.PasswordError:
        return True, "El archivo PDF está protegido con contraseña. Quita la contraseña e intenta de nuevo."
    except Exception:
        # Si no se puede abrir con pikepdf, intentar validación básica
        pass
    return False, None


def _validar_pdf(contenido: bytes) -> None:
    """Valida que el contenido sea un PDF válido y sin contraseña."""
    # Verificar firma PDF
    if not contenido.startswith(b"%PDF"):
        raise HTTPException(400, "El archivo no es un PDF válido. Solo se aceptan archivos PDF.")

    # Verificar PDF protegido
    protegido, msg = _es_pdf_protegido(contenido)
    if protegido:
        raise HTTPException(400, msg)


# ─── PÚBLICO: Rutas sin autenticación (solo validación por cédula) ──────────

@router.post("/subir", response_model=DocumentoContratistaOut, status_code=201)
async def subir_documento(
    contratista_id: int = Form(...),
    contrato_numero: str = Form(...),
    tipo_documento: str = Form(...),
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Sube un documento contractual (PDF) para un contratista."""
    # Validar tipo de documento
    if tipo_documento not in TIPOS_DOCUMENTO:
        raise HTTPException(400, f"Tipo de documento inválido. Válidos: {', '.join(TIPOS_DOCUMENTO)}")

    # Validar extensión
    ext = ""
    if archivo.filename and "." in archivo.filename:
        ext = "." + archivo.filename.rsplit(".", 1)[-1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Solo se aceptan archivos PDF.")

    # Validar que el contratista existe
    result = await db.execute(
        select(Contratista).where(Contratista.id == contratista_id)
    )
    contratista = result.scalar_one_or_none()
    if not contratista:
        raise HTTPException(404, "Contratista no encontrado")

    # Validar que el contrato existe y pertenece al contratista
    result = await db.execute(
        select(Contrato).where(
            Contrato.numero_contrato == contrato_numero,
            Contrato.contratista_id == contratista_id,
        )
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado o no pertenece al contratista")

    # Leer contenido
    content = await archivo.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, f"El archivo excede el tamaño máximo de {MAX_FILE_SIZE // (1024*1024)}MB")

    # Validar PDF (formato + sin contraseña)
    _validar_pdf(content)

    # Guardar archivo
    safe_name = f"{uuid.uuid4()}.pdf"
    file_path = os.path.join(DOCS_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(content)

    # Crear registro en BD
    doc = DocumentoContratista(
        contratista_id=contratista_id,
        contrato_numero=contrato_numero,
        tipo_documento=tipo_documento,
        archivo_ruta=f"/uploads/documentos/{safe_name}",
        archivo_nombre=archivo.filename or "",
        archivo_tamano=len(content),
        estado="PENDIENTE",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    logger.info(f"Documento subido: {tipo_documento} — contratista {contratista_id}, contrato {contrato_numero}")

    return DocumentoContratistaOut(
        id=doc.id,
        contratista_id=doc.contratista_id,
        contrato_numero=doc.contrato_numero,
        tipo_documento=doc.tipo_documento,
        archivo_ruta=doc.archivo_ruta,
        archivo_nombre=doc.archivo_nombre,
        archivo_tamano=doc.archivo_tamano,
        estado=doc.estado,
        observacion=doc.observacion,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        evaluated_at=doc.evaluated_at,
        contratista_nombre=contratista.nombre,
        contratista_identificacion=contratista.identificacion,
    )


@router.get("/contrato/{contrato_numero}", response_model=list[DocumentoContratistaOut])
async def listar_documentos_contrato(
    contrato_numero: str,
    cedula: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    """Lista los documentos de un contrato. Requiere cédula del contratista como validación."""
    # Validar contratista por cédula
    result = await db.execute(
        select(Contratista).where(Contratista.identificacion == cedula)
    )
    contratista = result.scalar_one_or_none()
    if not contratista:
        raise HTTPException(404, "Contratista no encontrado con esa cédula")

    # Buscar documentos del contratista para ese contrato
    stmt = (
        select(DocumentoContratista)
        .where(
            DocumentoContratista.contratista_id == contratista.id,
            DocumentoContratista.contrato_numero == contrato_numero,
        )
        .order_by(DocumentoContratista.tipo_documento, DocumentoContratista.created_at.desc())
    )
    result = await db.execute(stmt)
    docs = result.scalars().all()

    return [
        DocumentoContratistaOut(
            id=doc.id,
            contratista_id=doc.contratista_id,
            contrato_numero=doc.contrato_numero,
            tipo_documento=doc.tipo_documento,
            archivo_ruta=doc.archivo_ruta,
            archivo_nombre=doc.archivo_nombre,
            archivo_tamano=doc.archivo_tamano,
            estado=doc.estado,
            observacion=doc.observacion,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            evaluated_at=doc.evaluated_at,
            contratista_nombre=contratista.nombre,
            contratista_identificacion=contratista.identificacion,
        )
        for doc in docs
    ]


# ─── PROTEGIDO: Dashboard (coordinadora / administrativo) ────────────────────

@router.get("/admin/listar", response_model=list[DocumentoContratistaOut])
async def listar_todos_documentos(
    contratista_id: int | None = Query(None),
    contrato_numero: str | None = Query(None),
    tipo_documento: str | None = Query(None),
    estado: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista todos los documentos con filtros opcionales. Requiere autenticación."""
    stmt = select(DocumentoContratista).order_by(DocumentoContratista.created_at.desc())

    if contratista_id:
        stmt = stmt.where(DocumentoContratista.contratista_id == contratista_id)
    if contrato_numero:
        stmt = stmt.where(DocumentoContratista.contrato_numero == contrato_numero)
    if tipo_documento:
        stmt = stmt.where(DocumentoContratista.tipo_documento == tipo_documento)
    if estado:
        stmt = stmt.where(DocumentoContratista.estado == estado)

    result = await db.execute(stmt)
    docs = result.scalars().all()

    out = []
    for doc in docs:
        # Obtener nombre del contratista
        cont_result = await db.execute(
            select(Contratista.nombre, Contratista.identificacion).where(
                Contratista.id == doc.contratista_id
            )
        )
        cont_row = cont_result.one_or_none()
        cont_nombre = cont_row[0] if cont_row else None
        cont_ident = cont_row[1] if cont_row else None

        out.append(DocumentoContratistaOut(
            id=doc.id,
            contratista_id=doc.contratista_id,
            contrato_numero=doc.contrato_numero,
            tipo_documento=doc.tipo_documento,
            archivo_ruta=doc.archivo_ruta,
            archivo_nombre=doc.archivo_nombre,
            archivo_tamano=doc.archivo_tamano,
            estado=doc.estado,
            observacion=doc.observacion,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            evaluated_at=doc.evaluated_at,
            contratista_nombre=cont_nombre,
            contratista_identificacion=cont_ident,
        ))

    return out


@router.put("/{documento_id}/evaluar", response_model=DocumentoContratistaOut)
async def evaluar_documento(
    documento_id: int,
    data: DocumentoContratistaEvaluar,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Aprobar o rechazar un documento. Requiere autenticación."""
    result = await db.execute(
        select(DocumentoContratista).where(DocumentoContratista.id == documento_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento no encontrado")

    doc.estado = data.estado
    doc.observacion = data.observacion
    doc.evaluated_by = current_user.id
    from datetime import datetime
    doc.evaluated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(doc)

    # Obtener datos del contratista
    cont_result = await db.execute(
        select(Contratista.nombre, Contratista.identificacion).where(
            Contratista.id == doc.contratista_id
        )
    )
    cont_row = cont_result.one_or_none()
    cont_nombre = cont_row[0] if cont_row else None
    cont_ident = cont_row[1] if cont_row else None

    logger.info(f"Documento {doc.id} evaluado como {data.estado} por usuario {current_user.id}")

    return DocumentoContratistaOut(
        id=doc.id,
        contratista_id=doc.contratista_id,
        contrato_numero=doc.contrato_numero,
        tipo_documento=doc.tipo_documento,
        archivo_ruta=doc.archivo_ruta,
        archivo_nombre=doc.archivo_nombre,
        archivo_tamano=doc.archivo_tamano,
        estado=doc.estado,
        observacion=doc.observacion,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        evaluated_at=doc.evaluated_at,
        contratista_nombre=cont_nombre,
        contratista_identificacion=cont_ident,
    )


@router.delete("/{documento_id}", status_code=204)
async def eliminar_documento(
    documento_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Elimina un documento y su archivo del disco."""
    result = await db.execute(
        select(DocumentoContratista).where(DocumentoContratista.id == documento_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento no encontrado")

    # Eliminar archivo del disco
    if doc.archivo_ruta:
        file_path = os.path.join("/app/uploads", doc.archivo_ruta.replace("/uploads/", "", 1))
        # También probar ruta directa
        if not os.path.exists(file_path):
            file_path = doc.archivo_ruta.lstrip("/")
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Archivo eliminado: {file_path}")
        except Exception as e:
            logger.warning(f"No se pudo eliminar el archivo {file_path}: {e}")

    await db.delete(doc)
    await db.commit()
    return None


# ─── Utilidad: tipos de documento ────────────────────────────────────────────

@router.get("/tipos")
async def listar_tipos_documento():
    """Devuelve los tipos de documento disponibles con sus etiquetas."""
    return {
        "tipos": [
            {"valor": t, "etiqueta": TIPOS_DOCUMENTO_LABELS.get(t, t)}
            for t in TIPOS_DOCUMENTO
        ]
    }
