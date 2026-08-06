"""Router para el sistema de Evaluación de Cumplimiento.
Dos modos:
- Público: solo identificado por cédula del contratista
- Protegido: con JWT del dashboard (coordinadora)
"""

import logging
import os
import uuid
import base64
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import select, update, func, case as sql_case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.contratista import Contratista
from app.models.contrato import Contrato
from app.models.actividad_contrato import ActividadContrato
from app.models.evidencia import Evidencia
from app.models.documento_contratista import DocumentoContratista
from app.models.periodo_evaluacion import PeriodoEvaluacion
from app.models.perfil import Perfil, ActividadPerfil
from app.models.supervisor import Supervisor
from app.schemas.evidencia import (
    EvidenciaCreate, EvidenciaOut, EvidenciaEvaluar,
    DashboardContratista, ContratoEvaluacion, ActividadConEvidencias, ResumenCumplimiento,
)
from app.schemas.periodo import PeriodoEvaluacionCreate, PeriodoEvaluacionOut
from app.routers.auth import get_current_user
from app.models.auth import Usuario

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/evaluacion", tags=["Evaluación"])

# Directorio para subir archivos de evidencia (volumen persistente: uploads)
EVIDENCIAS_DIR = "/app/uploads/evidencias"
os.makedirs(EVIDENCIAS_DIR, exist_ok=True)

MESES_ES = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
]


def _nombre_periodo(fecha) -> str:
    """Genera el nombre del periodo desde la fecha: 'AGOSTO 2026'."""
    return f"{MESES_ES[fecha.month - 1]} {fecha.year}"


async def _get_periodo_activo(db: AsyncSession) -> PeriodoEvaluacion | None:
    """Devuelve el periodo activo (el más reciente marcado como activo)."""
    result = await db.execute(
        select(PeriodoEvaluacion)
        .where(PeriodoEvaluacion.activo == True)
        .order_by(PeriodoEvaluacion.fecha.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _resolve_periodo(db: AsyncSession, periodo_id: int | None) -> int | None:
    """Resuelve el periodo a usar: el indicado o el activo."""
    if periodo_id is not None:
        return periodo_id
    periodo = await _get_periodo_activo(db)
    return periodo.id if periodo else None


def _estado_actividad(evs: list) -> str:
    """Estado de una actividad según sus evidencias (misma lógica que el frontend).
    Prioridad: corrección pendiente > rechazada > aprobada > sin evidencia."""
    if any(e.estado == "PENDIENTE" for e in evs):
        return "PENDIENTE"
    if any(e.estado == "RECHAZADO" for e in evs):
        return "RECHAZADO"
    if any(e.estado == "APROBADO" for e in evs):
        return "APROBADO"
    return "SIN_EVIDENCIA"


# ─── PÚBLICO: Sin autenticación ──────────────────────────────────────────────

@router.get("/periodos/publicos", response_model=list[PeriodoEvaluacionOut])
async def listar_periodos_publicos(
    db: AsyncSession = Depends(get_db),
):
    """Lista los periodos de evaluación (público, sin auth) para que el
    contratista pueda elegir el mes en su dashboard."""
    result = await db.execute(
        select(PeriodoEvaluacion).order_by(PeriodoEvaluacion.fecha.desc())
    )
    return result.scalars().all()


@router.get("/buscar", response_model=DashboardContratista)
async def buscar_contratista(
    cedula: str = Query(..., min_length=1),
    periodo_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Busca un contratista por cédula y devuelve sus contratos con actividades y evidencias.

    Si no se indica periodo_id, usa el periodo activo. Si no hay periodos,
    devuelve todas las actividades (comportamiento anterior).
    """
    # Resolver periodo
    pid = periodo_id
    if pid is None:
        periodo = await _get_periodo_activo(db)
        pid = periodo.id if periodo else None

    # Buscar contratista
    result = await db.execute(
        select(Contratista).where(Contratista.identificacion == cedula)
    )
    contratista = result.scalar_one_or_none()
    if not contratista:
        raise HTTPException(404, "No se encontró un contratista con esa cédula")

    # Buscar contratos activos del contratista
    contratos_result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.actividades_contrato)
            .selectinload(ActividadContrato.evidencias)
        )
        .where(Contrato.contratista_id == contratista.id)
        .where(Contrato.estado.in_(["EN_PROCESO", "ACTIVO"]))
        .order_by(Contrato.fecha_inicio.desc())
    )
    contratos = contratos_result.scalars().all()

    contratos_data = []
    for c in contratos:
        actividades_data = []
        # Solo actividades ESPECIFICA (las que se diligencian); salvaguarda:
        # si el contrato no tiene ninguna, mostrar todas (perfiles sin documento)
        acts_contrato = [a for a in c.actividades_contrato if a.tipo == "ESPECIFICA"]
        if not acts_contrato:
            acts_contrato = list(c.actividades_contrato)
        for act in acts_contrato:
            # Filtrar por periodo (si hay periodos configurados)
            if pid is not None and act.periodo_id != pid:
                continue
            evidencias_out = []
            for ev in act.evidencias:
                evidencias_out.append(EvidenciaOut(
                    id=ev.id,
                    actividad_contrato_id=ev.actividad_contrato_id,
                    contratista_id=ev.contratista_id,
                    contrato_id=ev.contrato_id,
                    tipo=ev.tipo,
                    contenido_texto=ev.contenido_texto,
                    archivo_ruta=ev.archivo_ruta,
                    archivo_nombre=ev.archivo_nombre,
                    archivo_tipo=ev.archivo_tipo,
                    estado=ev.estado,
                    observacion_coordinadora=ev.observacion_coordinadora,
                    created_at=ev.created_at,
                    evaluated_at=ev.evaluated_at,
                    evaluated_by=ev.evaluated_by,
                    actividad_descripcion=act.descripcion,
                ))

            actividades_data.append(ActividadConEvidencias(
                id=act.id,
                descripcion=act.descripcion,
                tipo=act.tipo,
                orden=act.orden,
                evidencias=evidencias_out,
            ))

        contratos_data.append(ContratoEvaluacion(
            id=c.id,
            numero_contrato=c.numero_contrato,
            perfil=c.perfil,
            objeto=c.objeto,
            estado=c.estado,
            fecha_inicio=str(c.fecha_inicio) if c.fecha_inicio else None,
            fecha_fin=str(c.fecha_fin) if c.fecha_fin else None,
            monto_total=c.monto_total,
            actividades=actividades_data,
        ))

    return DashboardContratista(
        contratista_id=contratista.id,
        identificacion=contratista.identificacion,
        nombre=contratista.nombre,
        telefono=contratista.telefono,
        correo=contratista.correo,
        contratos=contratos_data,
    )


@router.post("/evidencias", response_model=EvidenciaOut, status_code=201)
async def subir_evidencia(
    actividad_contrato_id: int = Form(...),
    contratista_id: int = Form(...),
    contrato_id: str = Form(...),
    tipo: str = Form(...),
    contenido_texto: str | None = Form(None),
    archivo: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
):
    """Sube una evidencia (archivo, imagen o texto) para una actividad de contrato."""
    # Validar tipo
    if tipo not in ("ARCHIVO", "TEXTO", "IMAGEN"):
        raise HTTPException(400, "Tipo debe ser ARCHIVO, TEXTO o IMAGEN")

    # Validar que la actividad existe y pertenece al contrato
    result = await db.execute(
        select(ActividadContrato).where(
            ActividadContrato.id == actividad_contrato_id,
            ActividadContrato.contrato_id == contrato_id,
        )
    )
    actividad = result.scalar_one_or_none()
    if not actividad:
        raise HTTPException(404, "Actividad no encontrada para ese contrato")

    # Validar que el contratista existe
    result = await db.execute(
        select(Contratista).where(Contratista.id == contratista_id)
    )
    contratista = result.scalar_one_or_none()
    if not contratista:
        raise HTTPException(404, "Contratista no encontrado")

    evidencia_data = {
        "actividad_contrato_id": actividad_contrato_id,
        "contratista_id": contratista_id,
        "contrato_id": contrato_id,
        "tipo": tipo,
        "contenido_texto": contenido_texto,
    }

    # Si es archivo o imagen, guardarlo
    if tipo in ("ARCHIVO", "IMAGEN") and archivo:
        # Validar tamaño (max 10MB)
        content = await archivo.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(400, "El archivo excede el tamaño máximo de 10MB")

        # Generar nombre único
        ext = ""
        if archivo.filename and "." in archivo.filename:
            ext = archivo.filename.rsplit(".", 1)[-1]
        safe_name = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(EVIDENCIAS_DIR, safe_name)

        # Guardar archivo
        with open(file_path, "wb") as f:
            f.write(content)

        evidencia_data["archivo_ruta"] = f"/uploads/evidencias/{safe_name}"
        evidencia_data["archivo_nombre"] = archivo.filename
        evidencia_data["archivo_tipo"] = archivo.content_type

    elif tipo == "TEXTO" and not contenido_texto:
        raise HTTPException(400, "Para tipo TEXTO debe proporcionar contenido_texto")

    evidencia = Evidencia(**evidencia_data)
    db.add(evidencia)
    await db.commit()
    await db.refresh(evidencia)

    return EvidenciaOut(
        id=evidencia.id,
        actividad_contrato_id=evidencia.actividad_contrato_id,
        contratista_id=evidencia.contratista_id,
        contrato_id=evidencia.contrato_id,
        tipo=evidencia.tipo,
        contenido_texto=evidencia.contenido_texto,
        archivo_ruta=evidencia.archivo_ruta,
        archivo_nombre=evidencia.archivo_nombre,
        archivo_tipo=evidencia.archivo_tipo,
        estado=evidencia.estado,
        observacion_coordinadora=evidencia.observacion_coordinadora,
        created_at=evidencia.created_at,
        evaluated_at=evidencia.evaluated_at,
        evaluated_by=evidencia.evaluated_by,
        actividad_descripcion=actividad.descripcion,
    )


# ─── PROTEGIDO: Dashboard (coordinadora) ─────────────────────────────────────

# ─── PERIODOS DE EVALUACIÓN ────────────────────────────────────────────────────

@router.get("/periodos", response_model=list[PeriodoEvaluacionOut])
async def listar_periodos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista los periodos de evaluación existentes (más reciente primero)."""
    result = await db.execute(
        select(PeriodoEvaluacion).order_by(PeriodoEvaluacion.fecha.desc())
    )
    return result.scalars().all()


@router.post("/periodos", response_model=PeriodoEvaluacionOut, status_code=201)
async def crear_periodo(
    data: PeriodoEvaluacionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Crea un nuevo periodo de evaluación (mes) y replica las actividades del
    perfil para todos los contratistas con contratos activos.

    El contrato NO se duplica: las actividades nuevas quedan asociadas al
    mismo contrato pero con el periodo_id del nuevo periodo.
    """
    # Normalizar fecha al primer día del mes
    fecha = data.fecha.replace(day=1)
    nombre = _nombre_periodo(fecha)

    # Buscar si ya existe un periodo para ese mes
    existing = await db.execute(
        select(PeriodoEvaluacion).where(PeriodoEvaluacion.fecha == fecha)
    )
    periodo = existing.scalar_one_or_none()
    if not periodo:
        periodo = PeriodoEvaluacion(fecha=fecha, nombre=nombre, activo=True)
        db.add(periodo)
        await db.flush()
    else:
        periodo.nombre = nombre
        periodo.activo = True

    # Desactivar los demás periodos
    await db.execute(
        update(PeriodoEvaluacion)
        .where(PeriodoEvaluacion.id != periodo.id)
        .values(activo=False)
    )

    # Replicar actividades del perfil para todos los contratos activos
    contratos_res = await db.execute(
        select(Contrato).where(Contrato.estado.in_(["EN_PROCESO", "ACTIVO"]))
    )
    contratos = contratos_res.scalars().all()

    replicadas = 0
    for contrato in contratos:
        if not contrato.perfil:
            continue
        perfil_res = await db.execute(
            select(Perfil).where(Perfil.nombre == contrato.perfil)
        )
        perfil = perfil_res.scalar_one_or_none()
        if not perfil:
            continue
        acts_res = await db.execute(
            select(ActividadPerfil)
            .where(ActividadPerfil.perfil_id == perfil.id)
            .order_by(ActividadPerfil.orden)
        )
        acts_perfil = acts_res.scalars().all()
        for ap in acts_perfil:
            # Evitar duplicados (mismo contrato + periodo + descripción)
            dup = await db.execute(
                select(ActividadContrato.id).where(
                    ActividadContrato.contrato_id == contrato.numero_contrato,
                    ActividadContrato.periodo_id == periodo.id,
                    ActividadContrato.descripcion == ap.descripcion,
                )
            )
            if dup.scalar_one_or_none():
                continue
            db.add(ActividadContrato(
                contrato_id=contrato.numero_contrato,
                descripcion=ap.descripcion,
                tipo="GENERAL",
                orden=ap.orden,
                periodo_id=periodo.id,
            ))
            replicadas += 1

    await db.commit()
    await db.refresh(periodo)
    logger.info(f"Periodo {periodo.nombre} creado/activado con {replicadas} actividades replicadas")
    return periodo


@router.get("/evidencias", response_model=list[EvidenciaOut])
async def listar_evidencias(
    contratista_id: int | None = Query(None),
    contrato_id: str | None = Query(None),
    estado: str | None = Query(None),
    actividad_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista evidencias con filtros opcionales. Requiere autenticación."""
    stmt = select(Evidencia).order_by(Evidencia.created_at.desc())

    if contratista_id:
        stmt = stmt.where(Evidencia.contratista_id == contratista_id)
    if contrato_id:
        stmt = stmt.where(Evidencia.contrato_id == contrato_id)
    if estado:
        stmt = stmt.where(Evidencia.estado == estado)
    if actividad_id:
        stmt = stmt.where(Evidencia.actividad_contrato_id == actividad_id)

    result = await db.execute(stmt)
    evidencias = result.scalars().all()

    out = []
    for ev in evidencias:
        # Obtener descripción de la actividad
        act_result = await db.execute(
            select(ActividadContrato.descripcion).where(
                ActividadContrato.id == ev.actividad_contrato_id
            )
        )
        act_desc = act_result.scalar_one_or_none()

        # Obtener nombre del contratista
        cont_result = await db.execute(
            select(Contratista.nombre).where(Contratista.id == ev.contratista_id)
        )
        cont_nombre = cont_result.scalar_one_or_none()

        out.append(EvidenciaOut(
            id=ev.id,
            actividad_contrato_id=ev.actividad_contrato_id,
            contratista_id=ev.contratista_id,
            contrato_id=ev.contrato_id,
            tipo=ev.tipo,
            contenido_texto=ev.contenido_texto,
            archivo_ruta=ev.archivo_ruta,
            archivo_nombre=ev.archivo_nombre,
            archivo_tipo=ev.archivo_tipo,
            estado=ev.estado,
            observacion_coordinadora=ev.observacion_coordinadora,
            created_at=ev.created_at,
            evaluated_at=ev.evaluated_at,
            evaluated_by=ev.evaluated_by,
            actividad_descripcion=act_desc,
            contratista_nombre=cont_nombre,
        ))

    return out


@router.put("/evidencias/{evidencia_id}/editar", response_model=EvidenciaOut)
async def editar_evidencia(
    evidencia_id: int,
    tipo: str = Form(...),
    contenido_texto: str | None = Form(None),
    archivo: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
):
    """Edita una evidencia existente (público, sin auth).
    Al editar, la evidencia vuelve a estado PENDIENTE para revisión.
    """
    if tipo not in ("ARCHIVO", "TEXTO", "IMAGEN"):
        raise HTTPException(400, "Tipo debe ser ARCHIVO, TEXTO o IMAGEN")

    result = await db.execute(
        select(Evidencia).where(Evidencia.id == evidencia_id)
    )
    evidencia = result.scalar_one_or_none()
    if not evidencia:
        raise HTTPException(404, "Evidencia no encontrada")

    # Actualizar tipo si cambió
    evidencia.tipo = tipo

    # Si es TEXTO, actualizar contenido
    if tipo == "TEXTO":
        if not contenido_texto:
            raise HTTPException(400, "Para tipo TEXTO debe proporcionar contenido_texto")
        evidencia.contenido_texto = contenido_texto
        # Limpiar archivo anterior si existía
        if evidencia.archivo_ruta:
            old_path = os.path.join("/app", evidencia.archivo_ruta.lstrip("/"))
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except OSError:
                    pass
            evidencia.archivo_ruta = None
            evidencia.archivo_nombre = None
            evidencia.archivo_tipo = None

    # Si es ARCHIVO o IMAGEN, reemplazar archivo
    elif tipo in ("ARCHIVO", "IMAGEN"):
        if not archivo:
            raise HTTPException(400, "Para tipo ARCHIVO o IMAGEN debe proporcionar un archivo")
        evidencia.contenido_texto = None

        # Eliminar archivo anterior
        if evidencia.archivo_ruta:
            old_path = os.path.join("/app", evidencia.archivo_ruta.lstrip("/"))
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except OSError:
                    pass

        # Guardar nuevo archivo
        content = await archivo.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(400, "El archivo excede el tamaño máximo de 10MB")

        ext = ""
        if archivo.filename and "." in archivo.filename:
            ext = archivo.filename.rsplit(".", 1)[-1]
        safe_name = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(EVIDENCIAS_DIR, safe_name)

        with open(file_path, "wb") as f:
            f.write(content)

        evidencia.archivo_ruta = f"/uploads/evidencias/{safe_name}"
        evidencia.archivo_nombre = archivo.filename
        evidencia.archivo_tipo = archivo.content_type

    # Resetear estado a PENDIENTE y limpiar evaluación
    evidencia.estado = "PENDIENTE"
    evidencia.observacion_coordinadora = None
    evidencia.evaluated_by = None
    evidencia.evaluated_at = None

    await db.commit()
    await db.refresh(evidencia)

    # Obtener descripción de la actividad
    act_result = await db.execute(
        select(ActividadContrato.descripcion).where(
            ActividadContrato.id == evidencia.actividad_contrato_id
        )
    )
    act_desc = act_result.scalar_one_or_none()

    # Obtener nombre del contratista
    cont_result = await db.execute(
        select(Contratista.nombre).where(Contratista.id == evidencia.contratista_id)
    )
    cont_nombre = cont_result.scalar_one_or_none()

    return EvidenciaOut(
        id=evidencia.id,
        actividad_contrato_id=evidencia.actividad_contrato_id,
        contratista_id=evidencia.contratista_id,
        contrato_id=evidencia.contrato_id,
        tipo=evidencia.tipo,
        contenido_texto=evidencia.contenido_texto,
        archivo_ruta=evidencia.archivo_ruta,
        archivo_nombre=evidencia.archivo_nombre,
        archivo_tipo=evidencia.archivo_tipo,
        estado=evidencia.estado,
        observacion_coordinadora=evidencia.observacion_coordinadora,
        created_at=evidencia.created_at,
        evaluated_at=evidencia.evaluated_at,
        evaluated_by=evidencia.evaluated_by,
        actividad_descripcion=act_desc,
        contratista_nombre=cont_nombre,
    )


@router.delete("/evidencias/{evidencia_id}", status_code=204)
async def eliminar_evidencia(
    evidencia_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Elimina una evidencia (público, sin auth).
    También elimina el archivo físico si existe.
    """
    result = await db.execute(
        select(Evidencia).where(Evidencia.id == evidencia_id)
    )
    evidencia = result.scalar_one_or_none()
    if not evidencia:
        raise HTTPException(404, "Evidencia no encontrada")

    # Eliminar archivo físico si existe
    if evidencia.archivo_ruta:
        file_path = os.path.join("/app", evidencia.archivo_ruta.lstrip("/"))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

    await db.delete(evidencia)
    await db.commit()
    return None


@router.put("/evidencias/{evidencia_id}", response_model=EvidenciaOut)
async def evaluar_evidencia(
    evidencia_id: int,
    data: EvidenciaEvaluar,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Aprobar o rechazar una evidencia. Requiere autenticación."""
    result = await db.execute(
        select(Evidencia).where(Evidencia.id == evidencia_id)
    )
    evidencia = result.scalar_one_or_none()
    if not evidencia:
        raise HTTPException(404, "Evidencia no encontrada")

    evidencia.estado = data.estado
    evidencia.observacion_coordinadora = data.observacion
    evidencia.evaluated_by = current_user.id
    evidencia.evaluated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(evidencia)

    # Obtener descripción de la actividad
    act_result = await db.execute(
        select(ActividadContrato.descripcion).where(
            ActividadContrato.id == evidencia.actividad_contrato_id
        )
    )
    act_desc = act_result.scalar_one_or_none()

    # Obtener nombre del contratista
    cont_result = await db.execute(
        select(Contratista.nombre).where(Contratista.id == evidencia.contratista_id)
    )
    cont_nombre = cont_result.scalar_one_or_none()

    return EvidenciaOut(
        id=evidencia.id,
        actividad_contrato_id=evidencia.actividad_contrato_id,
        contratista_id=evidencia.contratista_id,
        contrato_id=evidencia.contrato_id,
        tipo=evidencia.tipo,
        contenido_texto=evidencia.contenido_texto,
        archivo_ruta=evidencia.archivo_ruta,
        archivo_nombre=evidencia.archivo_nombre,
        archivo_tipo=evidencia.archivo_tipo,
        estado=evidencia.estado,
        observacion_coordinadora=evidencia.observacion_coordinadora,
        created_at=evidencia.created_at,
        evaluated_at=evidencia.evaluated_at,
        evaluated_by=evidencia.evaluated_by,
        actividad_descripcion=act_desc,
        contratista_nombre=cont_nombre,
    )


@router.get("/contratista/{contratista_id}/resumen", response_model=ResumenCumplimiento)
async def resumen_contratista(
    contratista_id: int,
    periodo_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Resumen de cumplimiento de un contratista. Requiere autenticación.
    Si no se indica periodo_id, usa el periodo activo."""
    pid = await _resolve_periodo(db, periodo_id)

    # Obtener contratista
    result = await db.execute(
        select(Contratista).where(Contratista.id == contratista_id)
    )
    contratista = result.scalar_one_or_none()
    if not contratista:
        raise HTTPException(404, "Contratista no encontrado")

    # Obtener contratos activos
    contratos_result = await db.execute(
        select(Contrato.id, Contrato.numero_contrato)
        .where(Contrato.contratista_id == contratista_id)
        .where(Contrato.estado.in_(["EN_PROCESO", "ACTIVO"]))
    )
    contratos = contratos_result.all()
    contrato_numeros = [c.numero_contrato for c in contratos]

    if not contrato_numeros:
        return ResumenCumplimiento(
            contratista_id=contratista_id,
            contratista_nombre=contratista.nombre,
            total_actividades=0,
            con_evidencia=0,
            sin_evidencia=0,
            aprobadas=0,
            rechazadas=0,
            pendientes=0,
            porcentaje_cumplimiento=0,
        )

    # Actividades del periodo (solo ESPECIFICA; salvaguarda si el perfil no tiene)
    base_stmt = select(ActividadContrato.id).where(
        ActividadContrato.contrato_id.in_(contrato_numeros)
    )
    if pid is not None:
        base_stmt = base_stmt.where(ActividadContrato.periodo_id == pid)
    acts_stmt = base_stmt.where(ActividadContrato.tipo == "ESPECIFICA")
    acts_result = await db.execute(acts_stmt)
    act_ids = [r[0] for r in acts_result.all()]
    if not act_ids:
        # Salvaguarda: perfiles sin documento (todo GENERAL) — mostrar todas
        acts_result = await db.execute(base_stmt)
        act_ids = [r[0] for r in acts_result.all()]
    total_actividades = len(act_ids)

    if not act_ids:
        return ResumenCumplimiento(
            contratista_id=contratista_id,
            contratista_nombre=contratista.nombre,
            total_actividades=0,
            con_evidencia=0,
            sin_evidencia=0,
            aprobadas=0,
            rechazadas=0,
            pendientes=0,
            porcentaje_cumplimiento=0,
        )

    # Contar evidencias agrupadas (solo del periodo)
    ev_result = await db.execute(
        select(
            Evidencia.estado,
            func.count(Evidencia.id),
        )
        .where(Evidencia.actividad_contrato_id.in_(act_ids))
        .group_by(Evidencia.estado)
    )
    counts = {row[0]: row[1] for row in ev_result.all()}

    # Contar actividades con al menos una evidencia
    act_con_ev = await db.execute(
        select(func.count(func.distinct(Evidencia.actividad_contrato_id)))
        .where(Evidencia.actividad_contrato_id.in_(act_ids))
    )
    con_evidencia = act_con_ev.scalar() or 0

    aprobadas = counts.get("APROBADO", 0)
    rechazadas = counts.get("RECHAZADO", 0)
    pendientes = counts.get("PENDIENTE", 0)
    total_evidencias = aprobadas + rechazadas + pendientes
    sin_evidencia = total_actividades - con_evidencia
    porcentaje = (aprobadas / total_evidencias * 100) if total_evidencias > 0 else 0

    return ResumenCumplimiento(
        contratista_id=contratista_id,
        contratista_nombre=contratista.nombre,
        total_actividades=total_actividades,
        con_evidencia=con_evidencia,
        sin_evidencia=sin_evidencia,
        aprobadas=aprobadas,
        rechazadas=rechazadas,
        pendientes=pendientes,
        porcentaje_cumplimiento=round(porcentaje, 1),
    )


@router.get("/evidencias/pendientes")
async def listar_evidencias_pendientes(
    buscar: str | None = Query(None),
    periodo_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista todas las evidencias PENDIENTES del periodo (o del activo si no se indica),
    con datos del contratista, contrato y actividad para revisión rápida."""
    pid = await _resolve_periodo(db, periodo_id)

    stmt = (
        select(
            Evidencia,
            Contratista.nombre.label("contratista_nombre"),
            Contratista.identificacion.label("contratista_identificacion"),
            Contrato.numero_contrato,
            Contrato.perfil,
            ActividadContrato.descripcion.label("actividad_descripcion"),
        )
        .join(Contratista, Evidencia.contratista_id == Contratista.id)
        .join(Contrato, Evidencia.contrato_id == Contrato.numero_contrato)
        .join(ActividadContrato, Evidencia.actividad_contrato_id == ActividadContrato.id)
        .where(Evidencia.estado == "PENDIENTE")
        .order_by(Evidencia.created_at.desc())
    )

    if pid is not None:
        stmt = stmt.where(ActividadContrato.periodo_id == pid)

    if buscar:
        stmt = stmt.where(
            Contratista.nombre.ilike(f"%{buscar}%")
            | Contratista.identificacion.ilike(f"%{buscar}%")
        )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "id": row.Evidencia.id,
            "tipo": row.Evidencia.tipo,
            "contenido_texto": row.Evidencia.contenido_texto,
            "archivo_ruta": row.Evidencia.archivo_ruta,
            "archivo_nombre": row.Evidencia.archivo_nombre,
            "archivo_tipo": row.Evidencia.archivo_tipo,
            "estado": row.Evidencia.estado,
            "created_at": str(row.Evidencia.created_at) if row.Evidencia.created_at else None,
            "contratista_id": row.Evidencia.contratista_id,
            "contratista_nombre": row.contratista_nombre,
            "contratista_identificacion": row.contratista_identificacion,
            "contrato_id": row.Evidencia.contrato_id,
            "numero_contrato": row.numero_contrato,
            "perfil": row.perfil,
            "actividad_contrato_id": row.Evidencia.actividad_contrato_id,
            "actividad_descripcion": row.actividad_descripcion,
        }
        for row in rows
    ]


@router.get("/contratistas", response_model=list[dict])
async def listar_contratistas_con_evidencias(
    buscar: str | None = Query(None),
    periodo_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista contratistas que tienen contratos activos con información de evidencias,
    filtrado por periodo de evaluación (si no se indica, usa el periodo activo).

    Los 'pendientes' se calculan a nivel de ACTIVIDAD (PENDIENTE o SIN_EVIDENCIA),
    no a nivel de evidencia, para que coincida con el detalle del contratista.
    """
    pid = await _resolve_periodo(db, periodo_id)

    # Contratistas con contratos activos
    stmt = (
        select(Contratista)
        .join(Contrato, Contrato.contratista_id == Contratista.id)
        .where(Contrato.estado.in_(["EN_PROCESO", "ACTIVO"]))
        .distinct()
        .order_by(Contratista.nombre)
    )
    if buscar:
        stmt = stmt.where(
            Contratista.nombre.ilike(f"%{buscar}%")
            | Contratista.identificacion.ilike(f"%{buscar}%")
        )

    result = await db.execute(stmt)
    contratistas = result.scalars().all()

    out = []
    for c in contratistas:
        # Contratos activos del contratista
        contratos_res = await db.execute(
            select(Contrato.numero_contrato, Contrato.perfil)
            .where(
                Contrato.contratista_id == c.id,
                Contrato.estado.in_(["EN_PROCESO", "ACTIVO"]),
            )
        )
        contratos_rows = contratos_res.all()
        numeros = [r[0] for r in contratos_rows]
        perfil = contratos_rows[0][1] if contratos_rows else None
        if not numeros:
            continue

        # Actividades del periodo (solo ESPECIFICA; salvaguarda si el perfil no tiene)
        base_acts = select(ActividadContrato).where(
            ActividadContrato.contrato_id.in_(numeros)
        )
        if pid is not None:
            base_acts = base_acts.where(ActividadContrato.periodo_id == pid)
        acts_stmt = base_acts.where(ActividadContrato.tipo == "ESPECIFICA")
        acts = (await db.execute(acts_stmt)).scalars().all()
        if not acts:
            acts = (await db.execute(base_acts)).scalars().all()

        act_ids = [a.id for a in acts]
        evs: list = []
        if act_ids:
            ev_res = await db.execute(
                select(Evidencia).where(Evidencia.actividad_contrato_id.in_(act_ids))
            )
            evs = ev_res.scalars().all()

        evs_por_act: dict[int, list] = {}
        for ev in evs:
            evs_por_act.setdefault(ev.actividad_contrato_id, []).append(ev)

        total = len(acts)
        pendientes = 0
        for a in acts:
            estado = _estado_actividad(evs_por_act.get(a.id, []))
            if estado in ("PENDIENTE", "SIN_EVIDENCIA"):
                pendientes += 1

        out.append({
            "id": c.id,
            "identificacion": c.identificacion,
            "nombre": c.nombre,
            "telefono": c.telefono,
            "correo": c.correo,
            "perfil": perfil,
            "total_actividades": total,
            "total_evidencias": len(evs),
            "pendientes": pendientes,
        })

    return out


@router.get("/contratista/{contratista_id}/informe")
async def descargar_informe(
    contratista_id: int,
    formato: str = Query("pdf", regex="^(pdf|docx)$"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Descarga el informe de evaluación en PDF o DOCX."""
    from app.services.informe_evaluacion import generar_pdf, generar_docx
    from fastapi.responses import Response

    # Obtener contratista
    result = await db.execute(
        select(Contratista).where(Contratista.id == contratista_id)
    )
    contratista = result.scalar_one_or_none()
    if not contratista:
        raise HTTPException(404, "Contratista no encontrado")

    # Obtener contratos activos con actividades y evidencias
    contratos_result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.actividades_contrato)
            .selectinload(ActividadContrato.evidencias)
        )
        .where(Contrato.contratista_id == contratista_id)
        .where(Contrato.estado.in_(["EN_PROCESO", "ACTIVO"]))
        .order_by(Contrato.fecha_inicio.desc())
    )
    contratos = contratos_result.scalars().all()

    # Obtener resumen
    res_result = await db.execute(
        select(Evidencia.estado, func.count(Evidencia.id))
        .where(Evidencia.contratista_id == contratista_id)
        .group_by(Evidencia.estado)
    )
    counts = {row[0]: row[1] for row in res_result.all()}

    # Contar actividades
    contrato_numeros = [c.numero_contrato for c in contratos]
    act_result = await db.execute(
        select(func.count(ActividadContrato.id))
        .where(ActividadContrato.contrato_id.in_(contrato_numeros))
    )
    total_actividades = act_result.scalar() or 0

    act_con_ev = await db.execute(
        select(func.count(func.distinct(Evidencia.actividad_contrato_id)))
        .where(Evidencia.contratista_id == contratista_id)
    )
    con_evidencia = act_con_ev.scalar() or 0

    resumen = {
        "total_actividades": total_actividades,
        "aprobadas": counts.get("APROBADO", 0),
        "rechazadas": counts.get("RECHAZADO", 0),
        "pendientes": counts.get("PENDIENTE", 0),
        "sin_evidencia": total_actividades - con_evidencia,
        "porcentaje_cumplimiento": round(
            counts.get("APROBADO", 0) / max(total_actividades, 1) * 100, 1
        ),
    }

    # Construir data de contratos para el informe
    import os as _os
    from pathlib import Path as _Path
    try:
        from PIL import Image as _PILImage
        _HAS_PIL = True
    except ImportError:
        _HAS_PIL = False

    _STATIC_BASE = _Path(__file__).parent.parent / "static"

    def _cargar_imagen_evidencia(archivo_ruta: str | None) -> dict:
        """Lee imagen, base64 + dimensiones."""
        if not archivo_ruta:
            logger.warning(f"Informe: archivo_ruta vacío")
            return {"base64": None, "width": 0, "height": 0, "file_found": False}
        
        rel_path = archivo_ruta.lstrip("/")
        
        # Probar múltiples rutas posibles
        rutas_a_probar = []
        
        if rel_path.startswith("uploads/"):
            # Ruta principal: /app/uploads/evidencias/uuid.ext
            rutas_a_probar.append(_Path("/app/uploads") / rel_path[8:])
            # Fallback: static/evidencias/uuid.ext (formato legacy)
            rutas_a_probar.append(_STATIC_BASE / rel_path[8:])
        elif rel_path.startswith("static/"):
            # Ruta principal: static/evidencias/uuid.ext
            rutas_a_probar.append(_STATIC_BASE / rel_path[7:])
            # Fallback: /app/uploads/evidencias/uuid.ext
            rutas_a_probar.append(_Path("/app/uploads") / rel_path[7:])
        else:
            rutas_a_probar.append(_STATIC_BASE / rel_path)
        
        logger.info(f"Informe: archivo_ruta='{archivo_ruta}' rel_path='{rel_path}'")
        
        file_path = None
        for p in rutas_a_probar:
            logger.info(f"Informe: probando {p} (existe={p.exists()})")
            if p.exists():
                file_path = p
                break
        
        if file_path is None:
            logger.warning(f"Informe: imagen NO encontrada en ninguna ruta")
            # Listar directorios para debug
            for d in [_Path("/app/uploads/evidencias"), _Path(str(_STATIC_BASE / "evidencias"))]:
                if d.exists():
                    try:
                        archivos = list(d.iterdir())[:5]
                        logger.info(f"Informe: contenido de {d}: {[str(x.name) for x in archivos]}")
                    except Exception as e:
                        logger.warning(f"Informe: error listando {d}: {e}")
            return {"base64": None, "width": 0, "height": 0, "file_found": False}
        
        try:
            with open(file_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode()
            w, h = 0, 0
            if _HAS_PIL:
                with _PILImage.open(file_path) as img:
                    w, h = img.size
            logger.info(f"Informe: imagen cargada de {file_path} ({w}x{h})")
            return {"base64": img_b64, "width": w, "height": h, "file_found": True}
        except Exception as e:
            logger.error(f"Informe: error cargando imagen: {e}")
            return {"base64": None, "width": 0, "height": 0, "file_found": False}

    periodo_activo_informe = await _get_periodo_activo(db)
    periodo_fecha = str(periodo_activo_informe.fecha) if periodo_activo_informe else None

    contratos_data = []
    for c in contratos:
        actividades_data = []
        for act in c.actividades_contrato:
            evidencias_out = []
            for ev in act.evidencias:
                if ev.estado != "APROBADO":
                    continue
                img_data = {}
                if ev.tipo == "IMAGEN":
                    img_data = _cargar_imagen_evidencia(ev.archivo_ruta)
                evidencias_out.append({
                    "id": ev.id,
                    "tipo": ev.tipo,
                    "contenido_texto": ev.contenido_texto,
                    "archivo_ruta": ev.archivo_ruta,
                    "archivo_nombre": ev.archivo_nombre,
                    "estado": ev.estado,
                    "observacion_coordinadora": ev.observacion_coordinadora,
                    "created_at": str(ev.created_at) if ev.created_at else None,
                    "img_base64": img_data.get("base64"),
                    "img_width": img_data.get("width", 0),
                    "img_height": img_data.get("height", 0),
                    "img_file_found": img_data.get("file_found", False),
                })
            actividades_data.append({
                "id": act.id,
                "descripcion": act.descripcion,
                "tipo": act.tipo,
                "orden": act.orden,
                "evidencias": evidencias_out,
            })
        contratos_data.append({
            "id": c.id,
            "numero_contrato": c.numero_contrato,
            "perfil": c.perfil,
            "objeto": c.objeto,
            "fecha_inicio": str(c.fecha_inicio) if c.fecha_inicio else None,
            "fecha_fin": str(c.fecha_fin) if c.fecha_fin else None,
            "fecha_contrato": str(c.fecha_contrato) if c.fecha_contrato else None,
            "monto_total": c.monto_total,
            "valor_final": c.valor_final or c.monto_total,
            "valor_letras": c.valor_letras,
            "supervisor": c.supervisor,
            "cedula_supervisor": c.cedula_supervisor,
            "cargo_supervisor": c.cargo_supervisor,
            "unidad_atencion": c.unidad_atencion,
            "supervisor_cargo": None,
            "periodo_fecha": periodo_fecha,
            "lugar_ejecucion": c.lugar_ejecucion,
            "forma_pago": c.forma_pago,
            "no_cdp": c.no_cdp,
            "rp": c.rp,
            "actividades": actividades_data,
            "generales": [],
        })
        # Generales del perfil (referencia textual en el informe)
        if c.perfil:
            _p = (await db.execute(
                select(Perfil).where(Perfil.nombre == c.perfil)
            )).scalar_one_or_none()
            if _p:
                _g = (await db.execute(
                    select(ActividadPerfil)
                    .where(ActividadPerfil.perfil_id == _p.id, ActividadPerfil.tipo == "GENERAL")
                    .order_by(ActividadPerfil.orden)
                )).scalars().all()
                contratos_data[-1]["generales"] = [a.descripcion for a in _g]
        # Cargo completo del supervisor (desde tabla supervisores)
        if c.cedula_supervisor:
            _sup = (await db.execute(
                select(Supervisor).where(Supervisor.identificacion == c.cedula_supervisor)
            )).scalar_one_or_none()
            if _sup and _sup.cargo:
                contratos_data[-1]["supervisor_cargo"] = _sup.cargo

    contratista_dict = {
        "id": contratista.id,
        "nombre": contratista.nombre,
        "identificacion": contratista.identificacion,
        "tipo_persona": contratista.tipo_persona,
        "expedida_en": contratista.expedida_en,
        "telefono": contratista.telefono,
        "correo": contratista.correo,
        "direccion": contratista.direccion,
    }

    # Obtener documentos contractuales de todos los contratos
    for c_data in contratos_data:
        docs_result = await db.execute(
            select(DocumentoContratista).where(
                DocumentoContratista.contrato_numero == c_data["numero_contrato"]
            ).order_by(DocumentoContratista.tipo_documento, DocumentoContratista.created_at.desc())
        )
        documentos_data = []
        for doc in docs_result.scalars().all():
            documentos_data.append({
                "id": doc.id,
                "tipo_documento": doc.tipo_documento,
                "archivo_ruta": doc.archivo_ruta,
                "archivo_nombre": doc.archivo_nombre,
                "archivo_tamano": doc.archivo_tamano,
                "estado": doc.estado,
                "observacion": doc.observacion,
                "created_at": str(doc.created_at) if doc.created_at else None,
            })
        c_data["documentos"] = documentos_data

    if formato == "pdf":
        pdf_bytes = generar_pdf(contratista_dict, contratos_data, resumen)
        filename = f"informe_evaluacion_{contratista.identificacion}.pdf"
        media_type = "application/pdf"
        content = pdf_bytes
    else:
        docx_bytes = generar_docx(contratista_dict, contratos_data, resumen)
        filename = f"informe_evaluacion_{contratista.identificacion}.docx"
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        content = docx_bytes

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/publico/informe")
async def descargar_informe_publico(
    cedula: str = Query(..., min_length=1),
    formato: str = Query("pdf", regex="^(pdf|docx)$"),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint público: descarga informe por cédula (sin auth)."""
    from app.services.informe_evaluacion import generar_pdf, generar_docx
    from fastapi.responses import Response

    # Buscar contratista por cédula
    result = await db.execute(
        select(Contratista).where(Contratista.identificacion == cedula)
    )
    contratista = result.scalar_one_or_none()
    if not contratista:
        raise HTTPException(404, "Contratista no encontrado con esa cédula")

    contratista_id = contratista.id

    # Obtener contratos activos con actividades y evidencias
    contratos_result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.actividades_contrato)
            .selectinload(ActividadContrato.evidencias)
        )
        .where(Contrato.contratista_id == contratista_id)
        .where(Contrato.estado.in_(["EN_PROCESO", "ACTIVO"]))
        .order_by(Contrato.fecha_inicio.desc())
    )
    contratos = contratos_result.scalars().all()

    # Resumen
    res_result = await db.execute(
        select(Evidencia.estado, func.count(Evidencia.id))
        .where(Evidencia.contratista_id == contratista_id)
        .group_by(Evidencia.estado)
    )
    counts = {row[0]: row[1] for row in res_result.all()}

    contrato_numeros = [c.numero_contrato for c in contratos]
    total_act = await db.execute(
        select(func.count(ActividadContrato.id))
        .where(ActividadContrato.contrato_id.in_(contrato_numeros))
    )
    total_actividades = total_act.scalar() or 0

    act_con_ev = await db.execute(
        select(func.count(func.distinct(Evidencia.actividad_contrato_id)))
        .where(Evidencia.contratista_id == contratista_id)
    )
    con_evidencia = act_con_ev.scalar() or 0

    resumen = {
        "total_actividades": total_actividades,
        "aprobadas": counts.get("APROBADO", 0),
        "rechazadas": counts.get("RECHAZADO", 0),
        "pendientes": counts.get("PENDIENTE", 0),
        "sin_evidencia": total_actividades - con_evidencia,
        "porcentaje_cumplimiento": round(
            counts.get("APROBADO", 0) / max(total_actividades, 1) * 100, 1
        ),
    }

    # Construir data de contratos (misma lógica del endpoint protegido)
    import os as _os2
    from pathlib import Path as _Path2
    try:
        from PIL import Image as _PILImage2
        _HAS_PIL2 = True
    except ImportError:
        _HAS_PIL2 = False

    _STATIC_BASE2 = _Path2(__file__).parent.parent / "static"

    def _cargar_img(archivo_ruta: str | None) -> dict:
        if not archivo_ruta:
            return {"base64": None, "width": 0, "height": 0, "file_found": False}
        rel_path = archivo_ruta.lstrip("/")
        rutas = []
        if rel_path.startswith("uploads/"):
            rutas.append(_Path2("/app/uploads") / rel_path[8:])
            rutas.append(_STATIC_BASE2 / rel_path[8:])
        elif rel_path.startswith("static/"):
            rutas.append(_STATIC_BASE2 / rel_path[7:])
            rutas.append(_Path2("/app/uploads") / rel_path[7:])
        else:
            rutas.append(_STATIC_BASE2 / rel_path)
        for p in rutas:
            if p.exists():
                try:
                    with open(p, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode()
                    w, h = 0, 0
                    if _HAS_PIL2:
                        with _PILImage2.open(p) as img:
                            w, h = img.size
                    return {"base64": b64, "width": w, "height": h, "file_found": True}
                except Exception:
                    pass
        return {"base64": None, "width": 0, "height": 0, "file_found": False}

    periodo_activo_informe = await _get_periodo_activo(db)
    periodo_fecha = str(periodo_activo_informe.fecha) if periodo_activo_informe else None

    contratos_data = []
    for c in contratos:
        actividades_data = []
        for act in c.actividades_contrato:
            evidencias_out = []
            for ev in act.evidencias:
                if ev.estado != "APROBADO":
                    continue
                img_data = {}
                if ev.tipo == "IMAGEN":
                    img_data = _cargar_img(ev.archivo_ruta)
                evidencias_out.append({
                    "id": ev.id,
                    "tipo": ev.tipo,
                    "contenido_texto": ev.contenido_texto,
                    "archivo_ruta": ev.archivo_ruta,
                    "archivo_nombre": ev.archivo_nombre,
                    "estado": ev.estado,
                    "observacion_coordinadora": ev.observacion_coordinadora,
                    "created_at": str(ev.created_at) if ev.created_at else None,
                    "img_base64": img_data.get("base64"),
                    "img_width": img_data.get("width", 0),
                    "img_height": img_data.get("height", 0),
                    "img_file_found": img_data.get("file_found", False),
                })
            actividades_data.append({
                "id": act.id,
                "descripcion": act.descripcion,
                "tipo": act.tipo,
                "orden": act.orden,
                "evidencias": evidencias_out,
            })
        contratos_data.append({
            "id": c.id,
            "numero_contrato": c.numero_contrato,
            "perfil": c.perfil,
            "objeto": c.objeto,
            "fecha_inicio": str(c.fecha_inicio) if c.fecha_inicio else None,
            "fecha_fin": str(c.fecha_fin) if c.fecha_fin else None,
            "fecha_contrato": str(c.fecha_contrato) if c.fecha_contrato else None,
            "monto_total": c.monto_total,
            "valor_final": c.valor_final or c.monto_total,
            "valor_letras": c.valor_letras,
            "supervisor": c.supervisor,
            "cedula_supervisor": c.cedula_supervisor,
            "cargo_supervisor": c.cargo_supervisor,
            "unidad_atencion": c.unidad_atencion,
            "supervisor_cargo": None,
            "periodo_fecha": periodo_fecha,
            "lugar_ejecucion": c.lugar_ejecucion,
            "forma_pago": c.forma_pago,
            "no_cdp": c.no_cdp,
            "rp": c.rp,
            "actividades": actividades_data,
            "generales": [],
        })
        # Generales del perfil (referencia textual en el informe)
        if c.perfil:
            _p = (await db.execute(
                select(Perfil).where(Perfil.nombre == c.perfil)
            )).scalar_one_or_none()
            if _p:
                _g = (await db.execute(
                    select(ActividadPerfil)
                    .where(ActividadPerfil.perfil_id == _p.id, ActividadPerfil.tipo == "GENERAL")
                    .order_by(ActividadPerfil.orden)
                )).scalars().all()
                contratos_data[-1]["generales"] = [a.descripcion for a in _g]
        # Cargo completo del supervisor (desde tabla supervisores)
        if c.cedula_supervisor:
            _sup = (await db.execute(
                select(Supervisor).where(Supervisor.identificacion == c.cedula_supervisor)
            )).scalar_one_or_none()
            if _sup and _sup.cargo:
                contratos_data[-1]["supervisor_cargo"] = _sup.cargo

    contratista_dict = {
        "id": contratista.id,
        "nombre": contratista.nombre,
        "identificacion": contratista.identificacion,
        "tipo_persona": contratista.tipo_persona,
        "expedida_en": contratista.expedida_en,
        "telefono": contratista.telefono,
        "correo": contratista.correo,
        "direccion": contratista.direccion,
    }

    # Obtener documentos contractuales de todos los contratos
    for c_data in contratos_data:
        docs_result = await db.execute(
            select(DocumentoContratista).where(
                DocumentoContratista.contrato_numero == c_data["numero_contrato"]
            ).order_by(DocumentoContratista.tipo_documento, DocumentoContratista.created_at.desc())
        )
        documentos_data = []
        for doc in docs_result.scalars().all():
            documentos_data.append({
                "id": doc.id,
                "tipo_documento": doc.tipo_documento,
                "archivo_ruta": doc.archivo_ruta,
                "archivo_nombre": doc.archivo_nombre,
                "archivo_tamano": doc.archivo_tamano,
                "estado": doc.estado,
                "observacion": doc.observacion,
                "created_at": str(doc.created_at) if doc.created_at else None,
            })
        c_data["documentos"] = documentos_data

    if formato == "pdf":
        pdf_bytes = generar_pdf(contratista_dict, contratos_data, resumen)
        filename = f"informe_evaluacion_{contratista.identificacion}.pdf"
        media_type = "application/pdf"
        content = pdf_bytes
    else:
        docx_bytes = generar_docx(contratista_dict, contratos_data, resumen)
        filename = f"informe_evaluacion_{contratista.identificacion}.docx"
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        content = docx_bytes

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
