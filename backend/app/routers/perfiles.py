"""Router para Perfiles (cargos) y sus actividades/obligaciones."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.perfil import Perfil, ActividadPerfil
from app.schemas.perfil import PerfilCreate, PerfilOut, ActividadPerfilOut

router = APIRouter(prefix="/api/v1/perfiles", tags=["Perfiles"])


@router.get("", response_model=list[PerfilOut])
async def listar_perfiles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Perfil).options(selectinload(Perfil.actividades)).order_by(Perfil.nombre)
    )
    return result.scalars().all()


@router.get("/{perfil_id}", response_model=PerfilOut)
async def obtener_perfil(perfil_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Perfil)
        .options(selectinload(Perfil.actividades))
        .where(Perfil.id == perfil_id)
    )
    perfil = result.scalar_one_or_none()
    if not perfil:
        raise HTTPException(404, "Perfil no encontrado")
    return perfil


@router.post("", response_model=PerfilOut, status_code=201)
async def crear_perfil(data: PerfilCreate, db: AsyncSession = Depends(get_db)):
    perfil = Perfil(**data.model_dump())
    db.add(perfil)
    await db.commit()
    await db.refresh(perfil)
    return perfil


@router.put("/{perfil_id}", response_model=PerfilOut)
async def actualizar_perfil(
    perfil_id: int, data: PerfilCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Perfil).where(Perfil.id == perfil_id)
    )
    perfil = result.scalar_one_or_none()
    if not perfil:
        raise HTTPException(404, "Perfil no encontrado")
    for field, value in data.model_dump().items():
        setattr(perfil, field, value)
    await db.commit()
    await db.refresh(perfil)
    return perfil


@router.delete("/{perfil_id}", status_code=204)
async def eliminar_perfil(perfil_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Perfil).where(Perfil.id == perfil_id))
    perfil = result.scalar_one_or_none()
    if not perfil:
        raise HTTPException(404, "Perfil no encontrado")
    await db.delete(perfil)
    await db.commit()


# ─── Actividades por perfil ───────────────────────────────────────────────────

@router.get("/{perfil_id}/actividades", response_model=list[ActividadPerfilOut])
async def listar_actividades(perfil_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ActividadPerfil)
        .where(ActividadPerfil.perfil_id == perfil_id)
        .order_by(ActividadPerfil.orden)
    )
    return result.scalars().all()


@router.post("/{perfil_id}/actividades", response_model=ActividadPerfilOut, status_code=201)
async def crear_actividad(
    perfil_id: int, descripcion: str, orden: int = 0,
    tipo: str = "GENERAL", db: AsyncSession = Depends(get_db)
):
    actividad = ActividadPerfil(perfil_id=perfil_id, descripcion=descripcion, orden=orden, tipo=tipo)
    db.add(actividad)
    await db.commit()
    await db.refresh(actividad)
    return actividad


@router.delete("/actividades/{actividad_id}", status_code=204)
async def eliminar_actividad(actividad_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ActividadPerfil).where(ActividadPerfil.id == actividad_id))
    actividad = result.scalar_one_or_none()
    if not actividad:
        raise HTTPException(404, "Actividad no encontrada")
    await db.delete(actividad)
    await db.commit()
