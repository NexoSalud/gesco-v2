"""Router para actividades de contrato y supervisión."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.contrato import Contrato
from app.models.actividad_contrato import ActividadContrato
from app.models.actividad_supervision import ActividadSupervision
from app.models.pago import Pago
from app.models.perfil import Perfil, ActividadPerfil
from app.models.periodo_evaluacion import PeriodoEvaluacion
from app.schemas.actividad_schema import (
    ActividadContratoCreate, ActividadContratoUpdate, ActividadContratoOut,
    EvaluarActividadesInput, ActividadSupervisionOut,
)

router = APIRouter(prefix="/api/v1", tags=["Actividades"])


async def _get_periodo_activo(db: AsyncSession) -> PeriodoEvaluacion | None:
    """Devuelve el periodo de evaluación activo (el más reciente marcado activo)."""
    result = await db.execute(
        select(PeriodoEvaluacion)
        .where(PeriodoEvaluacion.activo == True)
        .order_by(PeriodoEvaluacion.fecha.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


# ─── Actividades del Contrato ─────────────────────────────────────────────────

@router.get("/contratos/{numero_contrato}/actividades", response_model=list[ActividadContratoOut])
async def listar_actividades_contrato(
    numero_contrato: str,
    periodo_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Lista las actividades del PERFIL asociado al contrato.

    La actividad es una entidad estable ligada al perfil (ya no se replica por
    periodo como texto). `periodo_id` se conserva por compatibilidad pero no
    cambia el resultado (el set de actividades es el mismo en todos los periodos).
    """
    contrato = (await db.execute(
        select(Contrato).where(Contrato.numero_contrato == numero_contrato)
    )).scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    if not contrato.perfil:
        return []

    perfil = (await db.execute(
        select(Perfil).where(Perfil.nombre == contrato.perfil)
    )).scalar_one_or_none()
    if not perfil:
        return []

    acts = (await db.execute(
        select(ActividadPerfil)
        .where(ActividadPerfil.perfil_id == perfil.id)
        .order_by(ActividadPerfil.orden)
    )).scalars().all()

    return [
        ActividadContratoOut(
            id=ap.id,
            contrato_id=numero_contrato,
            descripcion=ap.descripcion,
            tipo=ap.tipo,
            orden=ap.orden,
        )
        for ap in acts
    ]


@router.get("/contratos/id/{contrato_id}/actividades", response_model=list[ActividadContratoOut])
async def listar_actividades_contrato_por_id(contrato_id: int, db: AsyncSession = Depends(get_db)):
    """Busca actividades del contrato por ID numérico (evita problemas con slashes)."""
    ctr = await db.execute(
        select(Contrato).where(Contrato.id == contrato_id)
    )
    contrato = ctr.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    # Delegar en la función por número (pasar db por keyword: el 2º arg ahora es periodo_id)
    return await listar_actividades_contrato(contrato.numero_contrato, db=db)


@router.post("/contratos/{numero_contrato}/actividades", response_model=ActividadContratoOut, status_code=201)
async def crear_actividad_contrato(
    numero_contrato: str, data: ActividadContratoCreate, db: AsyncSession = Depends(get_db)
):
    # Verificar que el contrato existe
    result = await db.execute(select(Contrato).where(Contrato.numero_contrato == numero_contrato))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Contrato no encontrado")

    act = ActividadContrato(contrato_id=numero_contrato, **data.model_dump())
    db.add(act)
    await db.commit()
    await db.refresh(act)
    return act


@router.put("/contratos/actividades/{actividad_id}", response_model=ActividadContratoOut)
async def actualizar_actividad_contrato(actividad_id: int, data: ActividadContratoUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ActividadContrato).where(ActividadContrato.id == actividad_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(404, "Actividad no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(act, field, value)
    await db.commit()
    await db.refresh(act)
    return act


@router.delete("/contratos/actividades/{actividad_id}", status_code=204)
async def eliminar_actividad_contrato(actividad_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ActividadContrato).where(ActividadContrato.id == actividad_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(404, "Actividad no encontrada")
    await db.delete(act)
    await db.commit()


async def reheredar_actividades_perfil(db: AsyncSession, numero_contrato: str, perfil_nombre: str) -> int:
    """Borra las actividades actuales del contrato y las reemplaza por las del perfil.

    Preserva el periodo_id de las actividades previas. NO hace commit.
    Retorna cuántas actividades insertó (0 si el perfil no existe).
    """
    result = await db.execute(select(Perfil).where(Perfil.nombre == perfil_nombre))
    perfil = result.scalar_one_or_none()
    if not perfil:
        return 0

    # Preservar el periodo_id actual del contrato (si ya estaba asignado)
    res_p = await db.execute(
        select(ActividadContrato.periodo_id)
        .where(ActividadContrato.contrato_id == numero_contrato)
        .limit(1)
    )
    periodo_id = res_p.scalar_one_or_none()

    # Eliminar actividades existentes
    await db.execute(
        delete(ActividadContrato).where(ActividadContrato.contrato_id == numero_contrato)
    )

    # Insertar las del perfil
    result = await db.execute(
        select(ActividadPerfil)
        .where(ActividadPerfil.perfil_id == perfil.id)
        .order_by(ActividadPerfil.orden)
    )
    acts_perfil = result.scalars().all()
    for ap in acts_perfil:
        db.add(ActividadContrato(
            contrato_id=numero_contrato,
            descripcion=ap.descripcion,
            tipo=ap.tipo,
            orden=ap.orden,
            periodo_id=periodo_id,
        ))
    return len(acts_perfil)


@router.post("/contratos/{numero_contrato}/actividades/heredar")
async def heredar_actividades_perfil(numero_contrato: str, db: AsyncSession = Depends(get_db)):
    """Reemplaza las actividades del contrato por las de su perfil."""
    result = await db.execute(
        select(Contrato).where(Contrato.numero_contrato == numero_contrato)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    if not contrato.perfil:
        raise HTTPException(400, "El contrato no tiene perfil asignado")

    creadas = await reheredar_actividades_perfil(db, numero_contrato, contrato.perfil)
    if creadas == 0:
        raise HTTPException(404, f"Perfil {contrato.perfil} no encontrado o sin actividades")

    await db.commit()
    return {"message": f"Se heredaron {creadas} actividades del perfil {contrato.perfil}"}


# ─── Actividades de Supervisión ───────────────────────────────────────────────

@router.get("/pagos/{pago_id}/actividades", response_model=list[ActividadSupervisionOut])
async def listar_actividades_supervision(pago_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ActividadSupervision)
        .where(ActividadSupervision.pago_id == pago_id)
        .order_by(ActividadSupervision.orden)
    )
    return result.scalars().all()


@router.post("/pagos/{pago_id}/actividades/evaluar")
async def evaluar_actividades(pago_id: int, data: EvaluarActividadesInput, db: AsyncSession = Depends(get_db)):
    """Evalúa actividades de un pago (marca cumple/no cumple)."""
    for item in data.actividades:
        result = await db.execute(
            select(ActividadSupervision).where(
                ActividadSupervision.id == item.id,
                ActividadSupervision.pago_id == pago_id,
            )
        )
        act = result.scalar_one_or_none()
        if act:
            act.cumple = item.cumple

    await db.commit()
    return {"message": f"{len(data.actividades)} actividades evaluadas"}
