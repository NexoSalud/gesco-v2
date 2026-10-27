"""Servicios del módulo de Gestión Contractual: tokens, sincronización y archivos."""

import datetime
import hashlib
import io
import json
import logging
import os
import uuid
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.contrato import Contrato
from app.models.gestion_contractual import GcContrato, GcUsuario, GcEvento
from app.services.auth_service import hash_password

logger = logging.getLogger(__name__)

# El token del módulo usa una clave y una audiencia propias: un token del
# dashboard principal no sirve aquí y viceversa.
GC_AUDIENCE = "gestion-contractual"
GC_ALGORITHM = "HS256"
GC_TOKEN_EXPIRE_MINUTES = 480  # 8 horas


# ─── Tokens ──────────────────────────────────────────────────────────────────

def crear_token_gc(usuario: GcUsuario) -> str:
    payload = {
        "sub": str(usuario.id),
        "rol": usuario.rol,
        "aud": GC_AUDIENCE,
        "exp": datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(minutes=GC_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.gc_secret_key, algorithm=GC_ALGORITHM)


def decodificar_token_gc(token: str) -> dict | None:
    try:
        return jwt.decode(
            token, settings.gc_secret_key, algorithms=[GC_ALGORITHM], audience=GC_AUDIENCE
        )
    except jwt.PyJWTError:
        return None


# ─── Sincronización ──────────────────────────────────────────────────────────

def snapshot_contrato(contrato: Contrato) -> dict:
    """Campos del contrato de origen que se copian al módulo."""
    contratista = contrato.contratista_rel
    resolucion = contrato.resolucion
    return {
        "numero_contrato": contrato.numero_contrato,
        "contratista_nombre": contratista.nombre if contratista else None,
        "contratista_identificacion": contratista.identificacion if contratista else None,
        "perfil": contrato.perfil,
        "objeto": contrato.objeto,
        "fecha_contrato": contrato.fecha_contrato,
        "fecha_inicio": contrato.fecha_inicio,
        "fecha_fin": contrato.fecha_fin,
        "valor_total": contrato.monto_total or 0,
        "valor_final": contrato.valor_final,
        "valor_transporte": contrato.monto_transporte or 0,
        "supervisor": contrato.supervisor,
        "resolucion_id": contrato.resolucion_id,
        "resolucion_codigo": resolucion.codigo if resolucion else None,
        "estado_origen": contrato.estado,
    }


def huella(snapshot: dict) -> str:
    """Hash estable del snapshot, para saber si el origen cambió desde la última sincronización."""
    normalizado = json.dumps(snapshot, sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(normalizado.encode("utf-8")).hexdigest()


def estado_inicial(snapshot: dict) -> str:
    if snapshot.get("estado_origen") == "ANULADO":
        return "ANULADO"
    fin = snapshot.get("fecha_fin")
    if isinstance(fin, date) and fin < date.today():
        return "TERMINADO"
    return "VIGENTE"


def aplicar_snapshot(gc: GcContrato, snapshot: dict) -> None:
    for campo, valor in snapshot.items():
        setattr(gc, campo, valor)
    gc.huella_origen = huella(snapshot)


async def registrar_evento(
    db: AsyncSession,
    usuario: GcUsuario | None,
    accion: str,
    detalle: str | None = None,
    contrato_id: int | None = None,
) -> None:
    db.add(GcEvento(
        usuario_id=usuario.id if usuario else None,
        accion=accion,
        detalle=detalle,
        contrato_id=contrato_id,
    ))


# ─── Archivos ────────────────────────────────────────────────────────────────

MIME_POR_EXTENSION = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
}

THUMB_ANCHO = 360


class ArchivoInvalido(ValueError):
    pass


@dataclass
class ArchivoProcesado:
    contenido: bytes
    extension: str
    mime_type: str
    paginas: int | None
    miniatura: bytes | None
    convertido_desde_tiff: bool = False


def _detectar_tipo(contenido: bytes) -> str | None:
    if contenido.startswith(b"%PDF"):
        return ".pdf"
    if contenido.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if contenido.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if contenido[:4] == b"RIFF" and contenido[8:12] == b"WEBP":
        return ".webp"
    if contenido[:4] in (b"II*\x00", b"MM\x00*"):
        return ".tif"
    return None


def _tiff_a_pdf(contenido: bytes) -> bytes:
    """Los navegadores no previsualizan TIFF: se convierte a PDF multipágina."""
    from PIL import Image, ImageSequence

    with Image.open(io.BytesIO(contenido)) as img:
        paginas = [frame.convert("RGB") for frame in ImageSequence.Iterator(img)]
    if not paginas:
        raise ArchivoInvalido("El archivo TIFF no contiene páginas.")
    salida = io.BytesIO()
    paginas[0].save(salida, "PDF", save_all=True, append_images=paginas[1:], resolution=200.0)
    return salida.getvalue()


def _miniatura_pdf(contenido: bytes) -> tuple[bytes | None, int | None]:
    try:
        import fitz  # pymupdf

        with fitz.open(stream=contenido, filetype="pdf") as doc:
            paginas = doc.page_count
            if doc.needs_pass or paginas == 0:
                return None, paginas or None
            pagina = doc[0]
            escala = THUMB_ANCHO / max(pagina.rect.width, 1)
            pix = pagina.get_pixmap(matrix=fitz.Matrix(escala, escala), alpha=False)
            return _a_jpeg(pix.tobytes("png")), paginas
    except Exception as e:  # PDF dañado: se guarda igual, sin miniatura
        logger.warning("No se pudo generar miniatura del PDF: %s", e)
        return None, None


def _a_jpeg(imagen: bytes) -> bytes:
    from PIL import Image, ImageOps

    with Image.open(io.BytesIO(imagen)) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        img.thumbnail((THUMB_ANCHO, THUMB_ANCHO * 2))
        salida = io.BytesIO()
        img.save(salida, "JPEG", quality=80, optimize=True)
        return salida.getvalue()


def procesar_archivo(contenido: bytes) -> ArchivoProcesado:
    """Valida el archivo por su contenido real (no por la extensión) y genera la miniatura."""
    if not contenido:
        raise ArchivoInvalido("El archivo está vacío.")
    max_bytes = settings.gc_max_file_mb * 1024 * 1024
    if len(contenido) > max_bytes:
        raise ArchivoInvalido(f"El archivo supera el máximo de {settings.gc_max_file_mb} MB.")

    ext = _detectar_tipo(contenido)
    if ext is None:
        raise ArchivoInvalido("Formato no soportado. Se aceptan PDF, JPG, PNG, WEBP y TIFF.")

    convertido = False
    if ext == ".tif":
        contenido = _tiff_a_pdf(contenido)
        ext = ".pdf"
        convertido = True

    if ext == ".pdf":
        miniatura, paginas = _miniatura_pdf(contenido)
    else:
        try:
            miniatura = _a_jpeg(contenido)
        except Exception:
            raise ArchivoInvalido("La imagen está dañada o no se puede leer.")
        paginas = 1

    return ArchivoProcesado(
        contenido=contenido,
        extension=ext,
        mime_type=MIME_POR_EXTENSION[ext],
        paginas=paginas,
        miniatura=miniatura,
        convertido_desde_tiff=convertido,
    )


def directorio_base() -> Path:
    base = Path(settings.gc_upload_dir)
    base.mkdir(parents=True, exist_ok=True)
    return base


def guardar_archivo(contrato_id: int, procesado: ArchivoProcesado) -> tuple[str, str | None]:
    """Guarda el archivo (y su miniatura) y devuelve las rutas relativas."""
    carpeta = directorio_base() / str(contrato_id)
    carpeta.mkdir(parents=True, exist_ok=True)
    nombre = uuid.uuid4().hex
    ruta = f"{contrato_id}/{nombre}{procesado.extension}"
    (directorio_base() / ruta).write_bytes(procesado.contenido)
    ruta_thumb = None
    if procesado.miniatura:
        ruta_thumb = f"{contrato_id}/{nombre}.thumb.jpg"
        (directorio_base() / ruta_thumb).write_bytes(procesado.miniatura)
    return ruta, ruta_thumb


def ruta_absoluta(relativa: str) -> Path:
    base = directorio_base().resolve()
    ruta = (base / relativa).resolve()
    if base not in ruta.parents:
        raise ArchivoInvalido("Ruta de archivo inválida.")
    return ruta


def eliminar_archivo(relativa: str | None) -> None:
    if not relativa:
        return
    try:
        os.remove(ruta_absoluta(relativa))
    except FileNotFoundError:
        pass
    except Exception as e:
        logger.warning("No se pudo eliminar %s: %s", relativa, e)


# ─── Seed ────────────────────────────────────────────────────────────────────

async def seed_gestion_contractual(db: AsyncSession) -> None:
    """Crea el administrador inicial del módulo si no existe ningún usuario."""
    existe = (await db.execute(select(GcUsuario.id).limit(1))).scalar_one_or_none()
    if existe:
        return
    db.add(GcUsuario(
        username="gcadmin",
        password_hash=hash_password(settings.gc_admin_password),
        nombre_completo="Administrador de Gestión Contractual",
        rol="ADMIN",
        activo=True,
        debe_cambiar_password=True,
    ))
    await db.commit()
    logger.info("Gestión Contractual: usuario 'gcadmin' creado (debe cambiar la contraseña)")


def valor_comprometido(valor_total: float | None, valor_final: float | None, transporte: float | None) -> float:
    """Valor comprometido de un contrato: valor final (con adiciones) o inicial, más transporte.

    Es la misma base que usa el módulo de resoluciones (monto_total + monto_transporte).
    """
    base = valor_final if valor_final is not None else (valor_total or 0)
    return float(base or 0) + float(transporte or 0)


CAMPOS_CONTRATISTA = (
    "identificacion", "nombre", "tipo_persona", "expedida_en", "telefono",
    "direccion", "correo", "banco", "tipo_cuenta", "numero_cuenta",
)


def snapshot_contratista(contratista) -> dict:
    """Campos del contratista de origen que se copian al módulo."""
    return {campo: getattr(contratista, campo, None) for campo in CAMPOS_CONTRATISTA}
