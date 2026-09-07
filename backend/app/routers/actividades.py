"""Router para actividades de contrato y supervisión."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.contrato import Contrato
from app.models.actividad_supervision import ActividadSupervision
from app.models.perfil import Perfil, ActividadPerfil
from app.models.periodo_evaluacion import PeriodoEvaluacion
from app.schemas.actividad_schema import (
    ActividadContratoOut,
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
