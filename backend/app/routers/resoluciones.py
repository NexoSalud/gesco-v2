"""Router para Resoluciones."""

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.resolucion import Resolucion
from app.models.contrato import Contrato
from app.schemas.resolucion import (ResolucionCreate, ResolucionUpdate,
                                    ResolucionOut, ResolucionDashboard)

router = APIRouter(prefix="/api/v1/resoluciones", tags=["Resoluciones"])


@router.get("", response_model=list[ResolucionDashboard])
async def listar_resoluciones(db: AsyncSession = Depends(get_db)):
    """Lista todas las resoluciones con KPIs de dashboard."""
    result = await db.execute(
        select(Resolucion).order_by(Resolucion.created_at.desc())
    )
    resoluciones = result.scalars().all()
    out = []
    for r in resoluciones:
        # Calcular KPIs
        stats = await db.execute(
            text("""
                SELECT
                    COUNT(*) as total_contratos,
                    COALESCE(SUM(CASE WHEN estado <> 'ANULADO' THEN monto_total + monto_transporte ELSE 0 END), 0) as comprometido,
                    COUNT(CASE WHEN estado = 'ACTIVO' THEN 1 END) as activos,
                    COUNT(CASE WHEN estado = 'ANULADO' THEN 1 END) as anulados,
                    COALESCE(SUM(CASE WHEN costo_tipo = 'INDIRECTO' AND estado <> 'ANULADO' THEN monto_total + monto_transporte ELSE 0 END), 0) as gastado_indirecto,
                    COALESCE(SUM(CASE WHEN (costo_tipo IS NULL OR costo_tipo <> 'INDIRECTO') AND estado <> 'ANULADO' THEN monto_total + monto_transporte ELSE 0 END), 0) as gastado_directo
                FROM contratos WHERE resolucion_id = :rid
            """),
            {"rid": r.id},
        )
        s = stats.fetchone()
        asig_ind = r.presupuesto * (r.indirect_percentage / 100)
        asig_dir = r.presupuesto - asig_ind
        out.append(ResolucionDashboard(
            id=r.id, codigo=r.codigo, titulo=r.titulo,
            unidad_id=r.unidad_id, vigencia=r.vigencia,
            fuente=r.fuente, presupuesto=r.presupuesto,
            indirect_percentage=r.indirect_percentage, notas=r.notas,
            created_at=r.created_at,
            total_contratos=s.total_contratos,
            comprometido=float(s.comprometido),
            saldo=float(r.presupuesto - s.comprometido),
            activos=s.activos, anulados=s.anulados,
            asignado_directo=asig_dir, asignado_indirecto=asig_ind,
            gastado_directo=float(s.gastado_directo),
            gastado_indirecto=float(s.gastado_indirecto),
        ))
    return out


@router.post("", response_model=ResolucionOut, status_code=201)
async def crear_resolucion(data: ResolucionCreate, db: AsyncSession = Depends(get_db)):
    db_obj = Resolucion(**data.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    # Recargar con relaciones para evitar lazy loading en async
    result = await db.execute(
        select(Resolucion)
        .options(selectinload(Resolucion.contratos))
        .where(Resolucion.id == db_obj.id)
    )
    return result.scalar_one()


@router.get("/{resolucion_id}", response_model=ResolucionOut)
async def obtener_resolucion(resolucion_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Resolucion)
        .options(selectinload(Resolucion.contratos))
        .where(Resolucion.id == resolucion_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Resolución no encontrada")
    return r


@router.put("/{resolucion_id}", response_model=ResolucionOut)
async def actualizar_resolucion(
    resolucion_id: int, data: ResolucionUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Resolucion).where(Resolucion.id == resolucion_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Resolución no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(r, field, value)
    await db.commit()
    await db.refresh(r)
    return r


@router.delete("/{resolucion_id}", status_code=204)
async def eliminar_resolucion(resolucion_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Resolucion).where(Resolucion.id == resolucion_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Resolución no encontrada")
    # Verificar si tiene contratos
    count = await db.execute(
        text("SELECT COUNT(*) FROM contratos WHERE resolucion_id = :rid"),
        {"rid": resolucion_id},
    )
    if count.scalar() > 0:
        raise HTTPException(400, "No se puede eliminar: la resolución tiene contratos asociados")
    await db.delete(r)
    await db.commit()
