"""Router para actividades de contrato y supervisión."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.contrato import Contrato
from app.models.actividad_contrato import ActividadContrato
from app.models.actividad_supervision import ActividadSupervision
from app.models.pago import Pago
from app.models.perfil import ActividadPerfil
from app.schemas.actividad_schema import (
    ActividadContratoCreate, ActividadContratoUpdate, ActividadContratoOut,
    EvaluarActividadesInput, ActividadSupervisionOut,
)

router = APIRouter(prefix="/api/v1", tags=["Actividades"])


# ─── Actividades del Contrato ─────────────────────────────────────────────────

@router.get("/contratos/{numero_contrato}/actividades", response_model=list[ActividadContratoOut])
async def listar_actividades_contrato(numero_contrato: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ActividadContrato)
        .where(ActividadContrato.contrato_id == numero_contrato)
        .order_by(ActividadContrato.orden)
    )
    return result.scalars().all()


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


@router.post("/contratos/{numero_contrato}/actividades/heredar")
async def heredar_actividades_perfil(numero_contrato: str, db: AsyncSession = Depends(get_db)):
    """Hereda actividades del perfil al contrato."""
    result = await db.execute(
        select(Contrato).where(Contrato.numero_contrato == numero_contrato)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    if not contrato.perfil:
        raise HTTPException(400, "El contrato no tiene perfil asignado")

    # Buscar perfil
    from app.models.perfil import Perfil
    result = await db.execute(select(Perfil).where(Perfil.nombre == contrato.perfil))
    perfil = result.scalar_one_or_none()
    if not perfil:
        raise HTTPException(404, f"Perfil {contrato.perfil} no encontrado")

    # Cargar actividades del perfil
    result = await db.execute(
        select(ActividadPerfil).where(ActividadPerfil.perfil_id == perfil.id).order_by(ActividadPerfil.orden)
    )
    acts_perfil = result.scalars().all()

    if not acts_perfil:
        raise HTTPException(400, "El perfil no tiene actividades definidas")

    # Eliminar actividades existentes del contrato
    await db.execute(
        select(ActividadContrato).where(ActividadContrato.contrato_id == numero_contrato)
    )

    creadas = 0
    for ap in acts_perfil:
        # Verificar si ya existe una igual
        existing = await db.execute(
            select(ActividadContrato).where(
                ActividadContrato.contrato_id == numero_contrato,
                ActividadContrato.descripcion == ap.descripcion,
            )
        )
        if not existing.scalar_one_or_none():
            act = ActividadContrato(
                contrato_id=numero_contrato,
                descripcion=ap.descripcion,
                tipo="GENERAL",
                orden=ap.orden,
            )
            db.add(act)
            creadas += 1

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
