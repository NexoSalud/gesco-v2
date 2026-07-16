"""Router para Supervisores."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.supervisor import Supervisor
from app.schemas.supervisor import SupervisorCreate, SupervisorUpdate, SupervisorOut

router = APIRouter(prefix="/api/v1/supervisores", tags=["Supervisores"])


@router.get("", response_model=list[SupervisorOut])
async def listar_supervisores(
    buscar: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Supervisor).order_by(Supervisor.nombre)
    if buscar:
        stmt = stmt.where(
            Supervisor.nombre.ilike(f"%{buscar}%") |
            Supervisor.identificacion.ilike(f"%{buscar}%")
        )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{supervisor_id}", response_model=SupervisorOut)
async def obtener_supervisor(supervisor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Supervisor).where(Supervisor.id == supervisor_id)
    )
    supervisor = result.scalar_one_or_none()
    if not supervisor:
        raise HTTPException(404, "Supervisor no encontrado")
    return supervisor


@router.post("", response_model=SupervisorOut, status_code=201)
async def crear_supervisor(data: SupervisorCreate, db: AsyncSession = Depends(get_db)):
    # Verificar si ya existe
    result = await db.execute(
        select(Supervisor).where(Supervisor.identificacion == data.identificacion)
    )
    if result.scalar_one_or_none():
        raise HTTPException(400, "Ya existe un supervisor con esa identificación")
    supervisor = Supervisor(**data.model_dump())
    db.add(supervisor)
    await db.commit()
    await db.refresh(supervisor)
    return supervisor


@router.put("/{supervisor_id}", response_model=SupervisorOut)
async def actualizar_supervisor(
    supervisor_id: int, data: SupervisorUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Supervisor).where(Supervisor.id == supervisor_id)
    )
    supervisor = result.scalar_one_or_none()
    if not supervisor:
        raise HTTPException(404, "Supervisor no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(supervisor, field, value)
    await db.commit()
    await db.refresh(supervisor)
    return supervisor


@router.delete("/{supervisor_id}", status_code=204)
async def eliminar_supervisor(supervisor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Supervisor).where(Supervisor.id == supervisor_id)
    )
    supervisor = result.scalar_one_or_none()
    if not supervisor:
        raise HTTPException(404, "Supervisor no encontrado")
    await db.delete(supervisor)
    await db.commit()
