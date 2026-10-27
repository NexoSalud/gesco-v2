"""Router del módulo de Gestión Contractual.

Módulo independiente con login propio (usuarios en `gc_usuarios`, token con
clave y audiencia propias). Permite:
  - Sincronizar de forma selectiva contratos del módulo de contratos actual.
  - Llevar el estado de gestión de cada contrato real.
  - Cargar los documentos escaneados del expediente y previsualizarlos/descargarlos.

Roles: ADMIN (todo + usuarios), GESTOR (sincronizar, cargar, editar), CONSULTA (solo lectura).
"""

import datetime
import hashlib
import logging
import os
import re
import tempfile
import zipfile
from datetime import date, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.background import BackgroundTask

from app.database import get_db
from app.models.contratista import Contratista
from app.models.contrato import Contrato
from app.models.gestion_contractual import GcContratista, GcContrato, GcDocumento, GcEvento, GcUsuario
from app.models.resolucion import Resolucion
from app.schemas.gestion_contractual import (
    CAMPOS_EDITABLES_MANUAL,
    CATEGORIAS_DOCUMENTO,
    ContratistaOrigenOut,
    ContratoOrigenOut,
    GcContratistaCreate,
    GcContratistaOut,
    GcContratistaUpdate,
    GcContratoCreate,
    GcCambioPassword,
    GcContratoOut,
    GcContratoUpdate,
    GcDocumentoOut,
    GcDocumentoUpdate,
    GcEstadisticasOut,
    GcEventoOut,
    GcLogin,
    GcResumenOut,
    GcTokenOut,
    GcUsuarioCreate,
    GcUsuarioOut,
    GcUsuarioUpdate,
    ResolucionMini,
    SincronizarContratistasIn,
    SincronizarContratistasOut,
    SincronizarIn,
    SincronizarOut,
)
from app.services.auth_service import hash_password, verify_password
from app.services.numero_letras import numero_a_letras
from app.services.gestion_contractual import (
    ArchivoInvalido,
    aplicar_snapshot,
    crear_token_gc,
    decodificar_token_gc,
    eliminar_archivo,
    estado_inicial,
    valor_comprometido,
    guardar_archivo,
    huella,
    procesar_archivo,
    registrar_evento,
    ruta_absoluta,
    snapshot_contratista,
    snapshot_contrato,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/gestion-contractual", tags=["Gestión Contractual"])

_bearer = HTTPBearer(auto_error=False)


# ─── Dependencias de autenticación ───────────────────────────────────────────

async def gc_usuario_actual(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> GcUsuario:
    no_autorizado = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if cred is None:
        raise no_autorizado
    payload = decodificar_token_gc(cred.credentials)
    if not payload or not str(payload.get("sub", "")).isdigit():
        raise no_autorizado
    usuario = await db.get(GcUsuario, int(payload["sub"]))
    if usuario is None or not usuario.activo:
        raise no_autorizado
    return usuario


def requiere_rol(*roles: str):
    async def checker(usuario: GcUsuario = Depends(gc_usuario_actual)) -> GcUsuario:
        if usuario.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tiene permisos para esta acción")
        return usuario
    return checker


puede_editar = requiere_rol("ADMIN", "GESTOR")
solo_admin = requiere_rol("ADMIN")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _origen_query():
    return select(Contrato).options(
        selectinload(Contrato.contratista_rel),
        selectinload(Contrato.resolucion),
    )


async def _origenes_por_id(db: AsyncSession, ids: list[int]) -> dict[int, Contrato]:
    if not ids:
        return {}
    res = await db.execute(_origen_query().where(Contrato.id.in_(ids)))
    return {c.id: c for c in res.scalars().all()}


def _contrato_out(
    gc: GcContrato,
    origen: Contrato | None,
    total_docs: int = 0,
    categorias: list[str] | None = None,
) -> GcContratoOut:
    desactualizado = bool(origen) and huella(snapshot_contrato(origen)) != gc.huella_origen
    return GcContratoOut(
        id=gc.id,
        origen=gc.origen,
        contrato_origen_id=gc.contrato_origen_id,
        contratista_id=gc.contratista_id,
        numero_contrato=gc.numero_contrato,
        contratista_nombre=gc.contratista_nombre,
        contratista_identificacion=gc.contratista_identificacion,
        perfil=gc.perfil,
        objeto=gc.objeto,
        fecha_contrato=gc.fecha_contrato,
        fecha_inicio=gc.fecha_inicio,
        fecha_fin=gc.fecha_fin,
        valor_total=gc.valor_total or 0,
        valor_final=gc.valor_final,
        valor_transporte=gc.valor_transporte or 0,
        supervisor=gc.supervisor,
        resolucion_id=gc.resolucion_id,
        resolucion_codigo=gc.resolucion_codigo,
        estado_origen=gc.estado_origen,
        estado_gestion=gc.estado_gestion,
        observaciones=gc.observaciones,
        sincronizado_at=gc.sincronizado_at,
        sincronizado_por=(gc.sincronizado_por.nombre_completo or gc.sincronizado_por.username)
        if gc.sincronizado_por else None,
        total_documentos=total_docs,
        categorias_cubiertas=categorias or [],
        desactualizado=desactualizado,
        origen_eliminado=gc.contrato_origen_id is None and (gc.origen == "SINCRONIZADO" or gc.huella_origen is not None),
    )


def _documento_out(doc: GcDocumento) -> GcDocumentoOut:
    return GcDocumentoOut(
        id=doc.id,
        contrato_id=doc.contrato_id,
        categoria=doc.categoria,
        nombre=doc.nombre,
        descripcion=doc.descripcion,
        archivo_nombre=doc.archivo_nombre,
        mime_type=doc.mime_type,
        tamano=doc.tamano,
        paginas=doc.paginas,
        tiene_miniatura=bool(doc.miniatura_ruta),
        subido_por=(doc.subido_por.nombre_completo or doc.subido_por.username) if doc.subido_por else None,
        created_at=doc.created_at,
    )


async def _get_gc_contrato(db: AsyncSession, contrato_id: int) -> GcContrato:
    res = await db.execute(
        select(GcContrato)
        .options(selectinload(GcContrato.sincronizado_por))
        .where(GcContrato.id == contrato_id)
    )
    gc = res.scalar_one_or_none()
    if not gc:
        raise HTTPException(404, "Contrato no encontrado en Gestión Contractual")
    return gc


async def _get_documento(db: AsyncSession, documento_id: int) -> GcDocumento:
    res = await db.execute(
        select(GcDocumento)
        .options(selectinload(GcDocumento.subido_por))
        .where(GcDocumento.id == documento_id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento no encontrado")
    return doc


def _nombre_descarga(doc: GcDocumento) -> str:
    base = re.sub(r'[\\/:*?"<>|\r\n]+', " ", doc.nombre).strip() or "documento"
    ext = os.path.splitext(doc.archivo_ruta)[1]
    return base if base.lower().endswith(ext) else f"{base}{ext}"


async def _estadisticas_docs(db: AsyncSession, contrato_ids: list[int]) -> tuple[dict[int, int], dict[int, list[str]]]:
    if not contrato_ids:
        return {}, {}
    res = await db.execute(
        select(GcDocumento.contrato_id, GcDocumento.categoria, func.count())
        .where(GcDocumento.contrato_id.in_(contrato_ids))
        .group_by(GcDocumento.contrato_id, GcDocumento.categoria)
    )
    totales: dict[int, int] = {}
    categorias: dict[int, list[str]] = {}
    for cid, cat, n in res.all():
        totales[cid] = totales.get(cid, 0) + n
        categorias.setdefault(cid, []).append(cat)
    return totales, categorias


# ─── Autenticación ───────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=GcTokenOut)
async def login(payload: GcLogin, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(GcUsuario).where(GcUsuario.username == payload.username.strip()))
    usuario = res.scalar_one_or_none()
    if not usuario or not verify_password(usuario.password_hash, payload.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario o contraseña incorrectos")
    if not usuario.activo:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "El usuario está inactivo")
    usuario.ultimo_acceso = datetime.datetime.now()
    await db.commit()
    await db.refresh(usuario)
    return GcTokenOut(access_token=crear_token_gc(usuario), user=GcUsuarioOut.model_validate(usuario))


@router.get("/auth/me", response_model=GcUsuarioOut)
async def me(usuario: GcUsuario = Depends(gc_usuario_actual)):
    return usuario


@router.put("/auth/password", response_model=GcUsuarioOut)
async def cambiar_password(
    payload: GcCambioPassword,
    usuario: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(usuario.password_hash, payload.actual):
        raise HTTPException(400, "La contraseña actual no es correcta")
    if payload.actual == payload.nueva:
        raise HTTPException(400, "La nueva contraseña debe ser diferente a la actual")
    usuario.password_hash = hash_password(payload.nueva)
    usuario.debe_cambiar_password = False
    await db.commit()
    await db.refresh(usuario)
    return usuario


# ─── Usuarios del módulo (solo ADMIN) ────────────────────────────────────────

@router.get("/usuarios", response_model=list[GcUsuarioOut])
async def listar_usuarios(_: GcUsuario = Depends(solo_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(GcUsuario).order_by(GcUsuario.created_at))
    return res.scalars().all()


@router.post("/usuarios", response_model=GcUsuarioOut, status_code=201)
async def crear_usuario(
    payload: GcUsuarioCreate,
    admin: GcUsuario = Depends(solo_admin),
    db: AsyncSession = Depends(get_db),
):
    username = payload.username.strip().lower()
    dup = await db.execute(select(GcUsuario.id).where(GcUsuario.username == username))
    if dup.scalar_one_or_none():
        raise HTTPException(409, "Ya existe un usuario con ese nombre")
    usuario = GcUsuario(
        username=username,
        nombre_completo=payload.nombre_completo,
        correo=payload.correo,
        rol=payload.rol,
        password_hash=hash_password(payload.password),
        activo=True,
        debe_cambiar_password=True,
    )
    db.add(usuario)
    await registrar_evento(db, admin, "USUARIO_CREADO", f"{username} ({payload.rol})")
    await db.commit()
    await db.refresh(usuario)
    return usuario


@router.put("/usuarios/{usuario_id}", response_model=GcUsuarioOut)
async def actualizar_usuario(
    usuario_id: int,
    payload: GcUsuarioUpdate,
    admin: GcUsuario = Depends(solo_admin),
    db: AsyncSession = Depends(get_db),
):
    usuario = await db.get(GcUsuario, usuario_id)
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")
    if usuario.id == admin.id and (payload.activo is False or (payload.rol and payload.rol != "ADMIN")):
        raise HTTPException(400, "No puede desactivarse ni quitarse el rol de administrador a sí mismo")
    datos = payload.model_dump(exclude_unset=True)
    password = datos.pop("password", None)
    for campo, valor in datos.items():
        setattr(usuario, campo, valor)
    if password:
        usuario.password_hash = hash_password(password)
        usuario.debe_cambiar_password = True
    await registrar_evento(db, admin, "USUARIO_ACTUALIZADO", usuario.username)
    await db.commit()
    await db.refresh(usuario)
    return usuario


# ─── Sincronización con el módulo de contratos ───────────────────────────────

@router.get("/origen/resoluciones", response_model=list[ResolucionMini])
async def resoluciones_origen(_: GcUsuario = Depends(gc_usuario_actual), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Resolucion.id, Resolucion.codigo).order_by(Resolucion.created_at.desc()))
    return [ResolucionMini(id=r.id, codigo=r.codigo) for r in res.all()]


@router.get("/origen", response_model=list[ContratoOrigenOut])
async def listar_origen(
    buscar: str | None = Query(None),
    estado: str | None = Query(None),
    resolucion_id: int | None = Query(None),
    vista: str = Query("todos", pattern="^(todos|pendientes|sincronizados|desactualizados)$"),
    _: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    """Contratos del módulo actual con su estado de sincronización."""
    stmt = _origen_query().order_by(Contrato.created_at.desc())
    if estado:
        stmt = stmt.where(Contrato.estado == estado)
    if resolucion_id:
        stmt = stmt.where(Contrato.resolucion_id == resolucion_id)
    if buscar:
        like = f"%{buscar.strip()}%"
        stmt = stmt.outerjoin(Contratista, Contrato.contratista_id == Contratista.id).where(or_(
            Contrato.numero_contrato.ilike(like),
            Contrato.perfil.ilike(like),
            Contratista.nombre.ilike(like),
            Contratista.identificacion.ilike(like),
        ))
    contratos = (await db.execute(stmt)).scalars().all()

    gc_res = await db.execute(
        select(GcContrato.contrato_origen_id, GcContrato.id, GcContrato.huella_origen)
        .where(GcContrato.contrato_origen_id.is_not(None))
    )
    sincronizados = {row[0]: (row[1], row[2]) for row in gc_res.all()}

    salida = []
    for c in contratos:
        snap = snapshot_contrato(c)
        gc_info = sincronizados.get(c.id)
        item = ContratoOrigenOut(
            id=c.id,
            numero_contrato=c.numero_contrato,
            contratista_nombre=snap["contratista_nombre"],
            contratista_identificacion=snap["contratista_identificacion"],
            perfil=c.perfil,
            fecha_inicio=c.fecha_inicio,
            fecha_fin=c.fecha_fin,
            valor_total=c.monto_total or 0,
            estado=c.estado,
            resolucion_id=c.resolucion_id,
            resolucion_codigo=snap["resolucion_codigo"],
            sincronizado=gc_info is not None,
            gc_contrato_id=gc_info[0] if gc_info else None,
            desactualizado=bool(gc_info) and huella(snap) != gc_info[1],
        )
        if vista == "pendientes" and item.sincronizado:
            continue
        if vista == "sincronizados" and not item.sincronizado:
            continue
        if vista == "desactualizados" and not item.desactualizado:
            continue
        salida.append(item)
    return salida


async def _upsert_contratista(
    db: AsyncSession, usuario: GcUsuario, origen: Contratista
) -> tuple[GcContratista, str]:
    """Crea o actualiza el contratista del módulo a partir del contratista de origen.

    Si existe uno creado aquí con la misma identificación, se vincula al origen.
    Devuelve (contratista, "creado" | "actualizado" | "sin_cambios").
    """
    snap = snapshot_contratista(origen)
    h = huella(snap)
    gc = (await db.execute(select(GcContratista).where(
        or_(GcContratista.contratista_origen_id == origen.id, GcContratista.identificacion == origen.identificacion)
    ).order_by(GcContratista.contratista_origen_id.is_(None)))).scalars().first()
    ahora = datetime.datetime.now()
    if gc is None:
        gc = GcContratista(
            contratista_origen_id=origen.id, origen="SINCRONIZADO", huella_origen=h,
            sincronizado_at=ahora, creado_por_id=usuario.id, **snap,
        )
        db.add(gc)
        await db.flush()
        await registrar_evento(db, usuario, "CONTRATISTA_SINCRONIZADO", f"{gc.nombre} ({gc.identificacion})")
        return gc, "creado"
    if gc.contratista_origen_id == origen.id and gc.huella_origen == h:
        return gc, "sin_cambios"
    for campo, valor in snap.items():
        setattr(gc, campo, valor)
    gc.contratista_origen_id = origen.id
    gc.huella_origen = h
    gc.sincronizado_at = ahora
    await _propagar_contratista(db, gc)
    await registrar_evento(db, usuario, "CONTRATISTA_ACTUALIZADO", f"{gc.nombre} ({gc.identificacion})")
    return gc, "actualizado"


async def _propagar_contratista(db: AsyncSession, gc: GcContratista) -> None:
    """Refleja nombre e identificación en los contratos creados aquí que lo usan."""
    contratos = (await db.execute(
        select(GcContrato).where(GcContrato.contratista_id == gc.id, GcContrato.origen == "MANUAL")
    )).scalars().all()
    origenes = await _origenes_por_id(db, [c.contrato_origen_id for c in contratos if c.contrato_origen_id])
    for c in contratos:
        c.contratista_nombre = gc.nombre
        c.contratista_identificacion = gc.identificacion
        origen = origenes.get(c.contrato_origen_id)
        if origen and origen.contratista_rel and origen.contratista_rel.id == gc.contratista_origen_id:
            c.huella_origen = huella(snapshot_contrato(origen))


# ─── Escritura en el GESCO principal (registros creados aquí) ───────────────

ESTADO_ORIGEN_POR_GESTION = {
    "VIGENTE": "ACTIVO",
    "SUSPENDIDO": "EN_PROCESO",
    "TERMINADO": "FINALIZADO",
    "LIQUIDADO": "FINALIZADO",
    "ANULADO": "ANULADO",
}


async def _asegurar_contratista_origen(db: AsyncSession, gc: GcContratista) -> Contratista:
    """Devuelve el contratista del GESCO principal enlazado; si no existe, lo crea con los datos del módulo."""
    origen = await db.get(Contratista, gc.contratista_origen_id) if gc.contratista_origen_id else None
    if origen is None:
        origen = (await db.execute(
            select(Contratista).where(Contratista.identificacion == gc.identificacion)
        )).scalar_one_or_none()
    if origen is None:
        origen = Contratista(**snapshot_contratista(gc))
        db.add(origen)
        await db.flush()
    gc.contratista_origen_id = origen.id
    gc.huella_origen = huella(snapshot_contratista(origen))
    gc.sincronizado_at = datetime.datetime.now()
    return origen


def _escribir_contrato_origen(contrato: Contrato, datos: dict) -> None:
    """Copia al contrato del GESCO principal los campos editados en el módulo."""
    mapa = {
        "numero_contrato": "numero_contrato", "perfil": "perfil", "objeto": "objeto",
        "fecha_contrato": "fecha_contrato", "fecha_inicio": "fecha_inicio", "fecha_fin": "fecha_fin",
        "valor_total": "monto_total", "valor_final": "valor_final", "valor_transporte": "monto_transporte",
        "supervisor": "supervisor", "resolucion_id": "resolucion_id",
    }
    for campo, destino in mapa.items():
        if campo in datos:
            setattr(contrato, destino, datos[campo])
    if "valor_total" in datos:
        contrato.valor_letras = numero_a_letras(contrato.monto_total or 0)
    if "valor_transporte" in datos:
        contrato.tiene_transporte = (contrato.monto_transporte or 0) > 0


async def _recargar_origen(db: AsyncSession, contrato: Contrato) -> Contrato:
    """Guarda el contrato de origen y lo vuelve a leer con su contratista y resolución actuales."""
    await db.flush()
    res = await db.execute(
        _origen_query().where(Contrato.id == contrato.id).execution_options(populate_existing=True)
    )
    return res.scalar_one()


async def _sincronizar_contratos(db: AsyncSession, usuario: GcUsuario, ids: list[int]) -> SincronizarOut:
    """Crea los contratos nuevos y actualiza los existentes (junto con su contratista). No hace commit."""
    ids = list(dict.fromkeys(ids))
    origenes = await _origenes_por_id(db, ids)
    existentes_res = await db.execute(select(GcContrato).where(GcContrato.contrato_origen_id.in_(ids)))
    existentes = {gc.contrato_origen_id: gc for gc in existentes_res.scalars().all()}

    creados = actualizados = sin_cambios = 0
    ahora = datetime.datetime.now()
    nuevos: list[GcContrato] = []
    for cid in ids:
        origen = origenes.get(cid)
        if not origen:
            continue
        snap = snapshot_contrato(origen)
        gc = existentes.get(cid)
        gc_contratista = None
        if origen.contratista_rel:
            gc_contratista, _ = await _upsert_contratista(db, usuario, origen.contratista_rel)
        if gc is None:
            gc = GcContrato(
                contrato_origen_id=cid,
                origen="SINCRONIZADO",
                estado_gestion=estado_inicial(snap),
                sincronizado_por_id=usuario.id,
                sincronizado_at=ahora,
            )
            aplicar_snapshot(gc, snap)
            gc.contratista_id = gc_contratista.id if gc_contratista else None
            db.add(gc)
            nuevos.append(gc)
            creados += 1
            continue
        if gc_contratista and gc.contratista_id != gc_contratista.id:
            gc.contratista_id = gc_contratista.id
        if gc.huella_origen != huella(snap):
            aplicar_snapshot(gc, snap)
            gc.sincronizado_at = ahora
            gc.sincronizado_por_id = usuario.id
            actualizados += 1
            await registrar_evento(db, usuario, "CONTRATO_ACTUALIZADO", gc.numero_contrato, gc.id)
        else:
            sin_cambios += 1

    await db.flush()
    for gc in nuevos:
        await registrar_evento(db, usuario, "CONTRATO_SINCRONIZADO", gc.numero_contrato, gc.id)
    return SincronizarOut(
        creados=creados,
        actualizados=actualizados,
        sin_cambios=sin_cambios,
        no_encontrados=[cid for cid in ids if cid not in origenes],
    )


@router.post("/sincronizar", response_model=SincronizarOut)
async def sincronizar(
    payload: SincronizarIn,
    usuario: GcUsuario = Depends(puede_editar),
    db: AsyncSession = Depends(get_db),
):
    """Sincroniza los contratos seleccionados (y sus contratistas): crea los nuevos y actualiza los existentes."""
    resultado = await _sincronizar_contratos(db, usuario, payload.contrato_ids)
    await db.commit()
    return resultado


# ─── Contratistas ────────────────────────────────────────────────────────────

@router.get("/origen/contratistas", response_model=list[ContratistaOrigenOut])
async def listar_contratistas_origen(
    buscar: str | None = Query(None),
    vista: str = Query("todos", pattern="^(todos|pendientes|sincronizados|desactualizados)$"),
    _: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    """Contratistas del GESCO principal con su estado de sincronización."""
    stmt = select(Contratista).order_by(Contratista.nombre)
    if buscar:
        like = f"%{buscar.strip()}%"
        stmt = stmt.where(or_(Contratista.nombre.ilike(like), Contratista.identificacion.ilike(like)))
    contratistas = (await db.execute(stmt)).scalars().all()
    conteo = dict((await db.execute(
        select(Contrato.contratista_id, func.count(Contrato.id)).group_by(Contrato.contratista_id)
    )).all())
    vinculados = {
        row[0]: (row[1], row[2]) for row in (await db.execute(
            select(GcContratista.contratista_origen_id, GcContratista.id, GcContratista.huella_origen)
            .where(GcContratista.contratista_origen_id.is_not(None))
        )).all()
    }
    salida = []
    for c in contratistas:
        info = vinculados.get(c.id)
        item = ContratistaOrigenOut(
            id=c.id,
            identificacion=c.identificacion,
            nombre=c.nombre,
            telefono=c.telefono,
            correo=c.correo,
            contratos=conteo.get(c.id, 0),
            sincronizado=info is not None,
            gc_contratista_id=info[0] if info else None,
            desactualizado=bool(info) and huella(snapshot_contratista(c)) != info[1],
        )
        if vista == "pendientes" and item.sincronizado:
            continue
        if vista == "sincronizados" and not item.sincronizado:
            continue
        if vista == "desactualizados" and not item.desactualizado:
            continue
        salida.append(item)
    return salida


@router.post("/contratistas/sincronizar", response_model=SincronizarContratistasOut)
async def sincronizar_contratistas(
    payload: SincronizarContratistasIn,
    usuario: GcUsuario = Depends(puede_editar),
    db: AsyncSession = Depends(get_db),
):
    """Sincroniza contratistas seleccionados; opcionalmente también todos sus contratos."""
    ids = list(dict.fromkeys(payload.contratista_ids))
    origenes = (await db.execute(select(Contratista).where(Contratista.id.in_(ids)))).scalars().all()
    conteo = {"creado": 0, "actualizado": 0, "sin_cambios": 0}
    for origen in origenes:
        _, accion = await _upsert_contratista(db, usuario, origen)
        conteo[accion] += 1
    contratos = None
    if payload.incluir_contratos:
        contrato_ids = (await db.execute(
            select(Contrato.id).where(Contrato.contratista_id.in_([o.id for o in origenes]))
        )).scalars().all()
        if contrato_ids:
            contratos = await _sincronizar_contratos(db, usuario, list(contrato_ids))
    await db.commit()
    return SincronizarContratistasOut(
        creados=conteo["creado"], actualizados=conteo["actualizado"], sin_cambios=conteo["sin_cambios"], contratos=contratos,
    )


async def _contratistas_out(db: AsyncSession, contratistas: list[GcContratista]) -> list[GcContratistaOut]:
    ids = [c.id for c in contratistas]
    stats: dict[int, list] = {}
    if ids:
        for c in (await db.execute(select(GcContrato).where(GcContrato.contratista_id.in_(ids)))).scalars().all():
            st = stats.setdefault(c.contratista_id, [0, 0, 0.0])
            st[0] += 1
            if c.estado_gestion == "VIGENTE":
                st[1] += 1
            if c.estado_gestion != "ANULADO":
                st[2] += valor_comprometido(c.valor_total, c.valor_final, c.valor_transporte)
    origen_ids = [c.contratista_origen_id for c in contratistas if c.contratista_origen_id]
    origenes = {}
    if origen_ids:
        origenes = {o.id: o for o in (await db.execute(select(Contratista).where(Contratista.id.in_(origen_ids)))).scalars().all()}
    salida = []
    for c in contratistas:
        st = stats.get(c.id, [0, 0, 0.0])
        origen = origenes.get(c.contratista_origen_id)
        salida.append(GcContratistaOut(
            id=c.id,
            identificacion=c.identificacion,
            nombre=c.nombre,
            tipo_persona=c.tipo_persona,
            expedida_en=c.expedida_en,
            telefono=c.telefono,
            direccion=c.direccion,
            correo=c.correo,
            banco=c.banco,
            tipo_cuenta=c.tipo_cuenta,
            numero_cuenta=c.numero_cuenta,
            origen=c.origen,
            contratista_origen_id=c.contratista_origen_id,
            total_contratos=st[0],
            contratos_vigentes=st[1],
            valor_contratado=st[2],
            desactualizado=bool(origen) and huella(snapshot_contratista(origen)) != c.huella_origen,
            created_at=c.created_at,
        ))
    return salida


@router.get("/contratistas", response_model=list[GcContratistaOut])
async def listar_contratistas(
    buscar: str | None = Query(None),
    _: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(GcContratista).order_by(GcContratista.nombre)
    if buscar:
        like = f"%{buscar.strip()}%"
        stmt = stmt.where(or_(GcContratista.nombre.ilike(like), GcContratista.identificacion.ilike(like)))
    return await _contratistas_out(db, list((await db.execute(stmt)).scalars().all()))


async def _get_gc_contratista(db: AsyncSession, contratista_id: int) -> GcContratista:
    gc = await db.get(GcContratista, contratista_id)
    if not gc:
        raise HTTPException(404, "Contratista no encontrado")
    return gc


@router.get("/contratistas/{contratista_id}", response_model=GcContratistaOut)
async def obtener_contratista(
    contratista_id: int,
    _: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    return (await _contratistas_out(db, [await _get_gc_contratista(db, contratista_id)]))[0]


@router.post("/contratistas", response_model=GcContratistaOut, status_code=201)
async def crear_contratista(
    payload: GcContratistaCreate,
    usuario: GcUsuario = Depends(puede_editar),
    db: AsyncSession = Depends(get_db),
):
    identificacion = payload.identificacion.strip()
    if (await db.execute(select(GcContratista.id).where(GcContratista.identificacion == identificacion))).scalar_one_or_none():
        raise HTTPException(409, "Ya existe un contratista con esa identificación en el módulo")
    en_origen = (await db.execute(select(Contratista.id).where(Contratista.identificacion == identificacion))).scalar_one_or_none()
    if en_origen:
        raise HTTPException(409, "Ese contratista ya existe en el GESCO principal: sincronízalo en lugar de crearlo")
    datos = payload.model_dump()
    datos["identificacion"] = identificacion
    datos["nombre"] = datos["nombre"].strip().upper()
    gc = GcContratista(origen="MANUAL", creado_por_id=usuario.id, **datos)
    db.add(gc)
    await _asegurar_contratista_origen(db, gc)
    await db.flush()
    await registrar_evento(db, usuario, "CONTRATISTA_CREADO", f"{gc.nombre} ({gc.identificacion})")
    await db.commit()
    return (await _contratistas_out(db, [gc]))[0]


@router.patch("/contratistas/{contratista_id}", response_model=GcContratistaOut)
async def actualizar_contratista(
    contratista_id: int,
    payload: GcContratistaUpdate,
    usuario: GcUsuario = Depends(puede_editar),
    db: AsyncSession = Depends(get_db),
):
    gc = await _get_gc_contratista(db, contratista_id)
    if gc.origen != "MANUAL":
        raise HTTPException(409, "Este contratista vino del GESCO principal; edítalo allá y sincroniza")
    datos = payload.model_dump(exclude_unset=True)
    if "identificacion" in datos:
        datos["identificacion"] = datos["identificacion"].strip()
        dup = await db.execute(select(GcContratista.id).where(
            GcContratista.identificacion == datos["identificacion"], GcContratista.id != gc.id
        ))
        if dup.scalar_one_or_none():
            raise HTTPException(409, "Ya existe un contratista con esa identificación en el módulo")
        dup_origen = select(Contratista.id).where(Contratista.identificacion == datos["identificacion"])
        if gc.contratista_origen_id:
            dup_origen = dup_origen.where(Contratista.id != gc.contratista_origen_id)
        if (await db.execute(dup_origen)).scalar_one_or_none():
            raise HTTPException(409, "Ya existe un contratista con esa identificación en el GESCO principal")
    if datos.get("nombre"):
        datos["nombre"] = datos["nombre"].strip().upper()
    for campo, valor in datos.items():
        setattr(gc, campo, valor)
    # Se escribe también en el GESCO principal para que ambos queden iguales
    origen = await _asegurar_contratista_origen(db, gc)
    for campo, valor in snapshot_contratista(gc).items():
        setattr(origen, campo, valor)
    await db.flush()
    gc.huella_origen = huella(snapshot_contratista(origen))
    await _propagar_contratista(db, gc)
    await registrar_evento(db, usuario, "CONTRATISTA_ACTUALIZADO", f"{gc.nombre} ({gc.identificacion})")
    await db.commit()
    return (await _contratistas_out(db, [gc]))[0]


@router.delete("/contratistas/{contratista_id}", status_code=204)
async def eliminar_contratista(
    contratista_id: int,
    usuario: GcUsuario = Depends(solo_admin),
    db: AsyncSession = Depends(get_db),
):
    gc = await _get_gc_contratista(db, contratista_id)
    tiene = (await db.execute(select(GcContrato.id).where(GcContrato.contratista_id == gc.id).limit(1))).scalar_one_or_none()
    if tiene:
        raise HTTPException(409, "El contratista tiene contratos en el módulo; retíralos primero")
    await registrar_evento(db, usuario, "CONTRATISTA_ELIMINADO", f"{gc.nombre} ({gc.identificacion})")
    await db.delete(gc)
    await db.commit()


# ─── Contratos gestionados ───────────────────────────────────────────────────

@router.get("/contratos", response_model=list[GcContratoOut])
async def listar_contratos(
    buscar: str | None = Query(None),
    estado: str | None = Query(None),
    contratista_id: int | None = Query(None),
    _: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(GcContrato).options(selectinload(GcContrato.sincronizado_por)).order_by(
        GcContrato.sincronizado_at.desc()
    )
    if estado:
        stmt = stmt.where(GcContrato.estado_gestion == estado)
    if contratista_id:
        stmt = stmt.where(GcContrato.contratista_id == contratista_id)
    if buscar:
        like = f"%{buscar.strip()}%"
        stmt = stmt.where(or_(
            GcContrato.numero_contrato.ilike(like),
            GcContrato.contratista_nombre.ilike(like),
            GcContrato.contratista_identificacion.ilike(like),
            GcContrato.perfil.ilike(like),
        ))
    contratos = (await db.execute(stmt)).scalars().all()
    ids = [c.id for c in contratos]
    totales, categorias = await _estadisticas_docs(db, ids)
    origenes = await _origenes_por_id(db, [c.contrato_origen_id for c in contratos if c.contrato_origen_id])
    return [
        _contrato_out(c, origenes.get(c.contrato_origen_id), totales.get(c.id, 0), categorias.get(c.id))
        for c in contratos
    ]


@router.get("/contratos/{contrato_id}", response_model=GcContratoOut)
async def obtener_contrato(
    contrato_id: int,
    _: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    gc = await _get_gc_contrato(db, contrato_id)
    totales, categorias = await _estadisticas_docs(db, [gc.id])
    origenes = await _origenes_por_id(db, [gc.contrato_origen_id] if gc.contrato_origen_id else [])
    return _contrato_out(gc, origenes.get(gc.contrato_origen_id), totales.get(gc.id, 0), categorias.get(gc.id))


async def _validar_datos_manual(
    db: AsyncSession, datos: dict, excluir_id: int | None = None, excluir_origen_id: int | None = None
) -> None:
    """Valida número único, contratista y resolución, y completa los campos derivados."""
    if "numero_contrato" in datos:
        numero = datos["numero_contrato"].strip().upper()
        datos["numero_contrato"] = numero
        stmt = select(GcContrato.id).where(func.upper(GcContrato.numero_contrato) == numero)
        if excluir_id:
            stmt = stmt.where(GcContrato.id != excluir_id)
        if (await db.execute(stmt)).scalar_one_or_none():
            raise HTTPException(409, "Ya existe un contrato con ese número en el módulo")
        stmt = select(Contrato.id).where(func.upper(Contrato.numero_contrato) == numero)
        if excluir_origen_id:
            stmt = stmt.where(Contrato.id != excluir_origen_id)
        if (await db.execute(stmt)).scalar_one_or_none():
            raise HTTPException(409, "Ese número ya existe en el GESCO principal: sincronízalo en lugar de crearlo")
    if "contratista_id" in datos:
        if datos["contratista_id"] is None:
            raise HTTPException(400, "El contrato debe tener un contratista")
        contratista = await _get_gc_contratista(db, datos["contratista_id"])
        datos["contratista_nombre"] = contratista.nombre
        datos["contratista_identificacion"] = contratista.identificacion
    if "resolucion_id" in datos:
        if not datos["resolucion_id"]:
            raise HTTPException(400, "El contrato debe pertenecer a una resolución")
        res = await db.get(Resolucion, datos["resolucion_id"])
        if not res:
            raise HTTPException(400, "Resolución no encontrada")
        datos["resolucion_codigo"] = res.codigo
    inicio, fin = datos.get("fecha_inicio"), datos.get("fecha_fin")
    if inicio and fin and fin < inicio:
        raise HTTPException(400, "La fecha de terminación no puede ser anterior a la de inicio")


@router.post("/contratos", response_model=GcContratoOut, status_code=201)
async def crear_contrato(
    payload: GcContratoCreate,
    usuario: GcUsuario = Depends(puede_editar),
    db: AsyncSession = Depends(get_db),
):
    """Crea un contrato en el módulo y también en el GESCO principal, enlazados entre sí."""
    datos = payload.model_dump()
    await _validar_datos_manual(db, datos)
    gc_contratista = await _get_gc_contratista(db, datos["contratista_id"])
    contratista_origen = await _asegurar_contratista_origen(db, gc_contratista)
    origen = Contrato(
        contratista_id=contratista_origen.id,
        estado=ESTADO_ORIGEN_POR_GESTION.get(datos["estado_gestion"], "EN_PROCESO"),
    )
    _escribir_contrato_origen(origen, datos)
    origen.fecha_contrato = origen.fecha_contrato or origen.fecha_inicio
    origen.valor_letras = numero_a_letras(origen.monto_total or 0)
    origen.tiene_transporte = (origen.monto_transporte or 0) > 0
    db.add(origen)
    await db.flush()
    origen = await _recargar_origen(db, origen)
    gc = GcContrato(
        origen="MANUAL",
        contrato_origen_id=origen.id,
        contratista_id=gc_contratista.id,
        estado_gestion=datos["estado_gestion"],
        observaciones=datos.get("observaciones"),
        sincronizado_por_id=usuario.id,
        sincronizado_at=datetime.datetime.now(),
    )
    aplicar_snapshot(gc, snapshot_contrato(origen))
    db.add(gc)
    await db.flush()
    await registrar_evento(db, usuario, "CONTRATO_CREADO", f"{gc.numero_contrato} · {gc.contratista_nombre}", gc.id)
    await db.commit()
    return await obtener_contrato(gc.id, usuario, db)


@router.patch("/contratos/{contrato_id}", response_model=GcContratoOut)
async def actualizar_contrato(
    contrato_id: int,
    payload: GcContratoUpdate,
    usuario: GcUsuario = Depends(puede_editar),
    db: AsyncSession = Depends(get_db),
):
    gc = await _get_gc_contrato(db, contrato_id)
    datos = payload.model_dump(exclude_unset=True)
    propios = CAMPOS_EDITABLES_MANUAL & datos.keys()
    if propios:
        if gc.origen != "MANUAL":
            raise HTTPException(409, "Los datos de un contrato sincronizado se actualizan desde el GESCO principal")
        if (datos.get("numero_contrato") or "").strip().upper() in ("", gc.numero_contrato.upper()):
            datos.pop("numero_contrato", None)
        await _validar_datos_manual(db, datos, excluir_id=gc.id, excluir_origen_id=gc.contrato_origen_id)
        inicio = datos.get("fecha_inicio", gc.fecha_inicio)
        fin = datos.get("fecha_fin", gc.fecha_fin)
        if inicio and fin and fin < inicio:
            raise HTTPException(400, "La fecha de terminación no puede ser anterior a la de inicio")
    if "estado_gestion" in datos and datos["estado_gestion"] != gc.estado_gestion:
        await registrar_evento(
            db, usuario, "ESTADO_CAMBIADO",
            f"{gc.numero_contrato}: {gc.estado_gestion} → {datos['estado_gestion']}", gc.id,
        )
    for campo, valor in datos.items():
        setattr(gc, campo, valor)
    if propios and gc.contrato_origen_id:
        # Creado aquí: el cambio se escribe también en el GESCO principal
        origen = await db.get(Contrato, gc.contrato_origen_id)
        if origen:
            cambios = {k: datos[k] for k in propios if k in datos}
            if "contratista_id" in cambios:
                contratista_origen = await _asegurar_contratista_origen(db, await _get_gc_contratista(db, gc.contratista_id))
                origen.contratista_id = contratista_origen.id
            _escribir_contrato_origen(origen, cambios)
            origen = await _recargar_origen(db, origen)
            aplicar_snapshot(gc, snapshot_contrato(origen))
    if propios:
        await registrar_evento(db, usuario, "CONTRATO_EDITADO", gc.numero_contrato, gc.id)
    await db.commit()
    db.expire(gc)
    return await obtener_contrato(contrato_id, usuario, db)


@router.post("/contratos/{contrato_id}/resincronizar", response_model=GcContratoOut)
async def resincronizar_contrato(
    contrato_id: int,
    usuario: GcUsuario = Depends(puede_editar),
    db: AsyncSession = Depends(get_db),
):
    gc = await _get_gc_contrato(db, contrato_id)
    if not gc.contrato_origen_id:
        raise HTTPException(409, "El contrato de origen ya no existe; no se puede resincronizar")
    origen = (await _origenes_por_id(db, [gc.contrato_origen_id])).get(gc.contrato_origen_id)
    if not origen:
        raise HTTPException(409, "El contrato de origen ya no existe; no se puede resincronizar")
    aplicar_snapshot(gc, snapshot_contrato(origen))
    if origen.contratista_rel:
        gc_contratista, _ = await _upsert_contratista(db, usuario, origen.contratista_rel)
        gc.contratista_id = gc_contratista.id
    gc.sincronizado_at = datetime.datetime.now()
    gc.sincronizado_por_id = usuario.id
    await registrar_evento(db, usuario, "CONTRATO_ACTUALIZADO", gc.numero_contrato, gc.id)
    await db.commit()
    db.expire(gc)
    return await obtener_contrato(contrato_id, usuario, db)


@router.delete("/contratos/{contrato_id}", status_code=204)
async def desvincular_contrato(
    contrato_id: int,
    usuario: GcUsuario = Depends(solo_admin),
    db: AsyncSession = Depends(get_db),
):
    """Quita el contrato del módulo (y su expediente). El contrato de origen no se toca."""
    gc = await _get_gc_contrato(db, contrato_id)
    docs = (await db.execute(select(GcDocumento).where(GcDocumento.contrato_id == gc.id))).scalars().all()
    rutas = [(d.archivo_ruta, d.miniatura_ruta) for d in docs]
    accion = "CONTRATO_ELIMINADO" if gc.origen == "MANUAL" else "CONTRATO_DESVINCULADO"
    await registrar_evento(db, usuario, accion, f"{gc.numero_contrato} ({len(docs)} documentos)")
    await db.delete(gc)
    await db.commit()
    for ruta, thumb in rutas:
        eliminar_archivo(ruta)
        eliminar_archivo(thumb)


# ─── Documentos escaneados ───────────────────────────────────────────────────

@router.get("/categorias")
async def categorias(_: GcUsuario = Depends(gc_usuario_actual)):
    return [{"value": k, "label": v} for k, v in CATEGORIAS_DOCUMENTO.items()]


@router.get("/contratos/{contrato_id}/documentos", response_model=list[GcDocumentoOut])
async def listar_documentos(
    contrato_id: int,
    _: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    await _get_gc_contrato(db, contrato_id)
    res = await db.execute(
        select(GcDocumento)
        .options(selectinload(GcDocumento.subido_por))
        .where(GcDocumento.contrato_id == contrato_id)
        .order_by(GcDocumento.created_at.desc(), GcDocumento.id.desc())
    )
    return [_documento_out(d) for d in res.scalars().all()]


@router.post("/contratos/{contrato_id}/documentos", response_model=GcDocumentoOut, status_code=201)
async def subir_documento(
    contrato_id: int,
    archivo: UploadFile = File(...),
    categoria: str = Form("OTRO"),
    nombre: str | None = Form(None),
    descripcion: str | None = Form(None),
    usuario: GcUsuario = Depends(puede_editar),
    db: AsyncSession = Depends(get_db),
):
    gc = await _get_gc_contrato(db, contrato_id)
    if categoria not in CATEGORIAS_DOCUMENTO:
        raise HTTPException(400, "Categoría de documento inválida")

    contenido = await archivo.read()
    try:
        procesado = procesar_archivo(contenido)
    except ArchivoInvalido as e:
        raise HTTPException(400, str(e))

    digest = hashlib.sha256(procesado.contenido).hexdigest()
    dup = await db.execute(
        select(GcDocumento.nombre).where(GcDocumento.contrato_id == gc.id, GcDocumento.sha256 == digest)
    )
    nombre_dup = dup.scalar_one_or_none()
    if nombre_dup:
        raise HTTPException(409, f"Este archivo ya está cargado en el expediente como «{nombre_dup}»")

    original = os.path.basename(archivo.filename or "documento")
    titulo = (nombre or "").strip() or os.path.splitext(original)[0] or CATEGORIAS_DOCUMENTO[categoria]
    ruta, ruta_thumb = guardar_archivo(gc.id, procesado)
    doc = GcDocumento(
        contrato_id=gc.id,
        categoria=categoria,
        nombre=titulo[:250],
        descripcion=(descripcion or "").strip() or None,
        archivo_nombre=original[:250],
        archivo_ruta=ruta,
        miniatura_ruta=ruta_thumb,
        mime_type=procesado.mime_type,
        tamano=len(procesado.contenido),
        paginas=procesado.paginas,
        sha256=digest,
        subido_por_id=usuario.id,
    )
    db.add(doc)
    try:
        await registrar_evento(
            db, usuario, "DOCUMENTO_CARGADO",
            f"{gc.numero_contrato}: {titulo} ({CATEGORIAS_DOCUMENTO[categoria]})", gc.id,
        )
        await db.commit()
    except Exception:
        eliminar_archivo(ruta)
        eliminar_archivo(ruta_thumb)
        raise
    return _documento_out(await _get_documento(db, doc.id))


@router.patch("/documentos/{documento_id}", response_model=GcDocumentoOut)
async def actualizar_documento(
    documento_id: int,
    payload: GcDocumentoUpdate,
    _: GcUsuario = Depends(puede_editar),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_documento(db, documento_id)
    datos = payload.model_dump(exclude_unset=True)
    if "categoria" in datos and datos["categoria"] not in CATEGORIAS_DOCUMENTO:
        raise HTTPException(400, "Categoría de documento inválida")
    for campo, valor in datos.items():
        setattr(doc, campo, valor)
    await db.commit()
    db.expire(doc)
    return _documento_out(await _get_documento(db, documento_id))


@router.delete("/documentos/{documento_id}", status_code=204)
async def eliminar_documento(
    documento_id: int,
    usuario: GcUsuario = Depends(puede_editar),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_documento(db, documento_id)
    gc = await db.get(GcContrato, doc.contrato_id)
    rutas = (doc.archivo_ruta, doc.miniatura_ruta)
    await registrar_evento(
        db, usuario, "DOCUMENTO_ELIMINADO",
        f"{gc.numero_contrato if gc else ''}: {doc.nombre}", doc.contrato_id,
    )
    await db.delete(doc)
    await db.commit()
    for ruta in rutas:
        eliminar_archivo(ruta)


@router.get("/documentos/{documento_id}/archivo")
async def archivo_documento(
    documento_id: int,
    descargar: bool = Query(False),
    _: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_documento(db, documento_id)
    ruta = ruta_absoluta(doc.archivo_ruta)
    if not ruta.exists():
        raise HTTPException(404, "El archivo no se encuentra en el almacenamiento")
    return FileResponse(
        ruta,
        media_type=doc.mime_type,
        filename=_nombre_descarga(doc),
        content_disposition_type="attachment" if descargar else "inline",
        headers={"Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff"},
    )


@router.get("/documentos/{documento_id}/miniatura")
async def miniatura_documento(
    documento_id: int,
    _: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_documento(db, documento_id)
    if not doc.miniatura_ruta:
        raise HTTPException(404, "El documento no tiene miniatura")
    ruta = ruta_absoluta(doc.miniatura_ruta)
    if not ruta.exists():
        raise HTTPException(404, "Miniatura no disponible")
    return FileResponse(ruta, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


@router.get("/contratos/{contrato_id}/documentos/zip")
async def descargar_expediente(
    contrato_id: int,
    usuario: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    """Descarga todo el expediente en un ZIP, organizado por categoría."""
    gc = await _get_gc_contrato(db, contrato_id)
    docs = (await db.execute(
        select(GcDocumento).where(GcDocumento.contrato_id == gc.id).order_by(GcDocumento.categoria, GcDocumento.created_at)
    )).scalars().all()
    if not docs:
        raise HTTPException(404, "El expediente no tiene documentos")

    tmp = tempfile.NamedTemporaryFile(prefix="expediente_", suffix=".zip", delete=False)
    tmp.close()
    usados: set[str] = set()
    with zipfile.ZipFile(tmp.name, "w", zipfile.ZIP_DEFLATED) as zf:
        for d in docs:
            ruta = ruta_absoluta(d.archivo_ruta)
            if not ruta.exists():
                continue
            carpeta = CATEGORIAS_DOCUMENTO.get(d.categoria, d.categoria).replace("/", "-")
            nombre = f"{carpeta}/{_nombre_descarga(d)}"
            base, ext = os.path.splitext(nombre)
            i = 2
            while nombre in usados:
                nombre = f"{base} ({i}){ext}"
                i += 1
            usados.add(nombre)
            zf.write(ruta, nombre)

    numero = re.sub(r"[^\w\-]+", "_", gc.numero_contrato).strip("_")
    await registrar_evento(db, usuario, "EXPEDIENTE_DESCARGADO", gc.numero_contrato, gc.id)
    await db.commit()
    return FileResponse(
        tmp.name,
        media_type="application/zip",
        filename=f"expediente_{numero}.zip",
        background=BackgroundTask(os.remove, tmp.name),
    )


# ─── Resumen ─────────────────────────────────────────────────────────────────

@router.get("/resumen", response_model=GcResumenOut)
async def resumen(_: GcUsuario = Depends(gc_usuario_actual), db: AsyncSession = Depends(get_db)):
    contratos = (await db.execute(
        select(GcContrato).options(selectinload(GcContrato.sincronizado_por))
    )).scalars().all()
    ids = [c.id for c in contratos]
    totales, categorias = await _estadisticas_docs(db, ids)
    origenes = await _origenes_por_id(db, [c.contrato_origen_id for c in contratos if c.contrato_origen_id])

    salidas = {
        c.id: _contrato_out(c, origenes.get(c.contrato_origen_id), totales.get(c.id, 0), categorias.get(c.id))
        for c in contratos
    }
    por_estado: dict[str, int] = {}
    for c in contratos:
        por_estado[c.estado_gestion] = por_estado.get(c.estado_gestion, 0) + 1

    hoy = date.today()
    limite = hoy + timedelta(days=30)
    proximos = sorted(
        (c for c in contratos if c.estado_gestion == "VIGENTE" and c.fecha_fin and hoy <= c.fecha_fin <= limite),
        key=lambda c: c.fecha_fin,
    )[:8]

    doc_stats = (await db.execute(select(func.count(GcDocumento.id), func.coalesce(func.sum(GcDocumento.tamano), 0)))).one()
    sincronizados_ids = {c.contrato_origen_id for c in contratos if c.contrato_origen_id}
    total_origen = (await db.execute(select(func.count(Contrato.id)))).scalar_one()

    eventos = (await db.execute(
        select(GcEvento).options(selectinload(GcEvento.usuario)).order_by(GcEvento.created_at.desc(), GcEvento.id.desc()).limit(8)
    )).scalars().all()

    return GcResumenOut(
        total_contratos=len(contratos),
        por_estado=por_estado,
        total_documentos=doc_stats[0],
        almacenamiento_bytes=int(doc_stats[1]),
        sin_documentos=sum(1 for c in contratos if not totales.get(c.id)),
        desactualizados=sum(1 for s in salidas.values() if s.desactualizado),
        pendientes_sincronizar=max(total_origen - len(sincronizados_ids), 0),
        proximos_vencer=[salidas[c.id] for c in proximos],
        actividad=[
            GcEventoOut(
                id=e.id,
                accion=e.accion,
                detalle=e.detalle,
                contrato_id=e.contrato_id,
                usuario=(e.usuario.nombre_completo or e.usuario.username) if e.usuario else None,
                created_at=e.created_at,
            )
            for e in eventos
        ],
    )


# ─── Estadísticas ────────────────────────────────────────────────────────────

@router.get("/estadisticas", response_model=GcEstadisticasOut)
async def estadisticas(
    resolucion_id: int | None = Query(None),
    _: GcUsuario = Depends(gc_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    """Contratos, presupuesto y resoluciones.

    Compara lo *real* (contratos sincronizados en este módulo) con lo *registrado*
    en el módulo de contratos, sobre el presupuesto de cada resolución. Los
    contratos anulados no comprometen presupuesto.
    """
    resoluciones = (await db.execute(select(Resolucion).order_by(Resolucion.created_at.desc()))).scalars().all()

    stmt = select(GcContrato)
    if resolucion_id:
        stmt = stmt.where(GcContrato.resolucion_id == resolucion_id)
    contratos = (await db.execute(stmt)).scalars().all()
    activos = [c for c in contratos if c.estado_gestion != "ANULADO"]

    # Lo registrado en el módulo de contratos, por resolución (misma fórmula que /resoluciones)
    reg_rows = (await db.execute(
        select(
            Contrato.resolucion_id,
            func.count(Contrato.id),
            func.coalesce(func.sum(Contrato.monto_total + func.coalesce(Contrato.monto_transporte, 0)), 0),
        )
        .where(Contrato.estado != "ANULADO")
        .group_by(Contrato.resolucion_id)
    )).all()
    registrado = {r[0]: (int(r[1]), float(r[2])) for r in reg_rows}

    # Expedientes completos = tienen todas las categorías clave
    clave = ("CONTRATO_FIRMADO", "CDP", "RP", "POLIZA", "ACTA_INICIO")
    _, categorias = await _estadisticas_docs(db, [c.id for c in contratos])
    completos = {c.id for c in contratos if set(clave) <= set(categorias.get(c.id, []))}

    def valor(c: GcContrato) -> float:
        return valor_comprometido(c.valor_total, c.valor_final, c.valor_transporte)

    por_resolucion = []
    for r in resoluciones:
        if resolucion_id and r.id != resolucion_id:
            continue
        propios = [c for c in activos if c.resolucion_id == r.id]
        comp = sum(valor(c) for c in propios)
        n_reg, comp_reg = registrado.get(r.id, (0, 0.0))
        presupuesto = float(r.presupuesto or 0)
        por_resolucion.append({
            "id": r.id,
            "codigo": r.codigo,
            "titulo": r.titulo,
            "vigencia": r.vigencia,
            "activa": bool(r.activa),
            "presupuesto": presupuesto,
            "contratos_reales": len(propios),
            "comprometido_real": comp,
            "contratos_registrados": n_reg,
            "comprometido_registrado": comp_reg,
            "saldo_real": presupuesto - comp,
            "ejecucion_real_pct": round(comp / presupuesto * 100, 1) if presupuesto else 0.0,
            "expedientes_completos": sum(1 for c in propios if c.id in completos),
        })

    def agrupar(clave_fn, items) -> list[dict]:
        grupos: dict[str, dict] = {}
        for c in items:
            k = clave_fn(c) or "Sin dato"
            g = grupos.setdefault(k, {"clave": k, "contratos": 0, "valor": 0.0})
            g["contratos"] += 1
            g["valor"] += valor(c)
        return list(grupos.values())

    por_estado = agrupar(lambda c: c.estado_gestion, contratos)
    por_perfil = sorted(agrupar(lambda c: c.perfil, activos), key=lambda g: -g["valor"])
    if len(por_perfil) > 8:
        resto = por_perfil[7:]
        por_perfil = por_perfil[:7] + [{
            "clave": "Otros",
            "contratos": sum(g["contratos"] for g in resto),
            "valor": sum(g["valor"] for g in resto),
        }]
    por_mes = sorted(
        agrupar(lambda c: c.fecha_inicio.strftime("%Y-%m") if c.fecha_inicio else None, activos),
        key=lambda g: g["clave"],
    )[-12:]

    presupuesto_total = sum(r["presupuesto"] for r in por_resolucion)
    comp_total = sum(r["comprometido_real"] for r in por_resolucion)
    comp_reg_total = sum(r["comprometido_registrado"] for r in por_resolucion)
    n_reg_total = sum(r["contratos_registrados"] for r in por_resolucion)
    n_real = sum(r["contratos_reales"] for r in por_resolucion)
    return GcEstadisticasOut(
        totales={
            "resoluciones": len(por_resolucion),
            "presupuesto": presupuesto_total,
            "contratos_reales": n_real,
            "comprometido_real": comp_total,
            "contratos_registrados": n_reg_total,
            "comprometido_registrado": comp_reg_total,
            "saldo_real": presupuesto_total - comp_total,
            "ejecucion_real_pct": round(comp_total / presupuesto_total * 100, 1) if presupuesto_total else 0.0,
            "cobertura_pct": round(n_real / n_reg_total * 100, 1) if n_reg_total else 0.0,
            "valor_promedio": comp_total / n_real if n_real else 0.0,
        },
        por_resolucion=por_resolucion,
        por_estado=por_estado,
        por_perfil=por_perfil,
        por_mes=por_mes,
    )
