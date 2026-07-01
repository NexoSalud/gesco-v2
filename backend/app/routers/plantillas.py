"""Router para Plantillas de observaciones predefinidas."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.plantilla import PlantillaObservacion
from app.schemas.plantilla import PlantillaObservacionCreate, PlantillaObservacionOut

router = APIRouter(prefix="/api/v1/plantillas", tags=["Plantillas"])


@router.get("", response_model=list[PlantillaObservacionOut])
async def listar_plantillas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlantillaObservacion).order_by(PlantillaObservacion.titulo)
    )
    return result.scalars().all()


@router.post("", response_model=PlantillaObservacionOut, status_code=201)
async def crear_plantilla(data: PlantillaObservacionCreate, db: AsyncSession = Depends(get_db)):
    plantilla = PlantillaObservacion(**data.model_dump())
    db.add(plantilla)
    await db.commit()
    await db.refresh(plantilla)
    return plantilla


@router.put("/{plantilla_id}", response_model=PlantillaObservacionOut)
async def actualizar_plantilla(
    plantilla_id: int, data: PlantillaObservacionCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PlantillaObservacion).where(PlantillaObservacion.id == plantilla_id)
    )
    plantilla = result.scalar_one_or_none()
    if not plantilla:
        raise HTTPException(404, "Plantilla no encontrada")
    plantilla.titulo = data.titulo
    plantilla.contenido = data.contenido
    await db.commit()
    await db.refresh(plantilla)
    return plantilla


@router.delete("/{plantilla_id}", status_code=204)
async def eliminar_plantilla(plantilla_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlantillaObservacion).where(PlantillaObservacion.id == plantilla_id)
    )
    plantilla = result.scalar_one_or_none()
    if not plantilla:
        raise HTTPException(404, "Plantilla no encontrada")
    await db.delete(plantilla)
    await db.commit()
