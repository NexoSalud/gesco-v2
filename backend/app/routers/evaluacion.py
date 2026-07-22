"""Router para el sistema de Evaluación de Cumplimiento.
Dos modos:
- Público: solo identificado por cédula del contratista
- Protegido: con JWT del dashboard (coordinadora)
"""

import logging
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.contratista import Contratista
from app.models.contrato import Contrato
from app.models.actividad_contrato import ActividadContrato
from app.models.evidencia import Evidencia
from app.schemas.evidencia import (
    EvidenciaCreate, EvidenciaOut, EvidenciaEvaluar,
    DashboardContratista, ContratoEvaluacion, ActividadConEvidencias, ResumenCumplimiento,
)
from app.routers.auth import get_current_user
from app.models.auth import Usuario

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/evaluacion", tags=["Evaluación"])

# Directorio para subir archivos de evidencia
EVIDENCIAS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "evidencias")
os.makedirs(EVIDENCIAS_DIR, exist_ok=True)


# ─── PÚBLICO: Sin autenticación ──────────────────────────────────────────────

@router.get("/buscar", response_model=DashboardContratista)
async def buscar_contratista(
    cedula: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    """Busca un contratista por cédula y devuelve sus contratos con actividades y evidencias."""
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
        for act in c.actividades_contrato:
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

        evidencia_data["archivo_ruta"] = f"/static/evidencias/{safe_name}"
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
        ))

    return out


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
    )


@router.get("/contratista/{contratista_id}/resumen", response_model=ResumenCumplimiento)
async def resumen_contratista(
    contratista_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Resumen de cumplimiento de un contratista. Requiere autenticación."""
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

    # Contar actividades totales de esos contratos
    act_result = await db.execute(
        select(func.count(ActividadContrato.id))
        .where(ActividadContrato.contrato_id.in_(contrato_numeros))
    )
    total_actividades = act_result.scalar() or 0

    # Contar evidencias agrupadas
    ev_result = await db.execute(
        select(
            Evidencia.estado,
            func.count(Evidencia.id),
        )
        .where(Evidencia.contrato_id.in_(contrato_numeros))
        .group_by(Evidencia.estado)
    )
    counts = {row[0]: row[1] for row in ev_result.all()}

    # Contar actividades con al menos una evidencia
    act_con_ev = await db.execute(
        select(func.count(func.distinct(Evidencia.actividad_contrato_id)))
        .where(Evidencia.contrato_id.in_(contrato_numeros))
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


@router.get("/contratistas", response_model=list[dict])
async def listar_contratistas_con_evidencias(
    buscar: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista contratistas que tienen contratos activos con información de evidencias."""
    # Contratistas con contratos activos
    stmt = (
        select(
            Contratista.id,
            Contratista.identificacion,
            Contratista.nombre,
            Contratista.telefono,
            Contratista.correo,
            func.count(Evidencia.id).label("total_evidencias"),
            func.sum(
                func.cast(
                    func.iff(Evidencia.estado == "PENDIENTE", 1, 0),
                    # Usamos CASE en lugar de iff para compatibilidad con PostgreSQL
                )
            ).label("pendientes"),
        )
        .select_from(Contratista)
        .join(Contrato, Contrato.contratista_id == Contratista.id)
        .outerjoin(Evidencia, Evidencia.contratista_id == Contratista.id)
        .where(Contrato.estado.in_(["EN_PROCESO", "ACTIVO"]))
        .group_by(Contratista.id)
        .order_by(Contratista.nombre)
    )
    
    if buscar:
        stmt = stmt.where(
            Contratista.nombre.ilike(f"%{buscar}%") |
            Contratista.identificacion.ilike(f"%{buscar}%")
        )

    try:
        # Intentar con Postgres (no tiene iff)
        result = await db.execute(stmt)
        rows = result.all()
        return [
            {
                "id": r.id,
                "identificacion": r.identificacion,
                "nombre": r.nombre,
                "telefono": r.telefono,
                "correo": r.correo,
                "total_evidencias": r.total_evidencias,
            } for r in rows
        ]
    except Exception:
        # Fallback: consulta simple sin conteos
        stmt_simple = (
            select(Contratista)
            .join(Contrato, Contrato.contratista_id == Contratista.id)
            .where(Contrato.estado.in_(["EN_PROCESO", "ACTIVO"]))
            .distinct()
            .order_by(Contratista.nombre)
        )
        if buscar:
            stmt_simple = stmt_simple.where(
                Contratista.nombre.ilike(f"%{buscar}%") |
                Contratista.identificacion.ilike(f"%{buscar}%")
            )
        result = await db.execute(stmt_simple)
        contratistas = result.scalars().all()
        return [
            {
                "id": c.id,
                "identificacion": c.identificacion,
                "nombre": c.nombre,
                "telefono": c.telefono,
                "correo": c.correo,
            } for c in contratistas
        ]
