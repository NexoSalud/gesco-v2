"""Router para Contratistas."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.contratista import Contratista
from app.models.contrato import Contrato
from app.schemas.contratista import ContratistaCreate, ContratistaOut
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/api/v1/contratistas", tags=["Contratistas"])


@router.get("", response_model=list[ContratistaOut])
async def listar_contratistas(
    buscar: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Contratista).order_by(Contratista.nombre)
    if buscar:
        stmt = stmt.where(
            Contratista.nombre.ilike(f"%{buscar}%") |
            Contratista.identificacion.ilike(f"%{buscar}%")
        )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{identificacion}", response_model=ContratistaOut)
async def obtener_contratista(identificacion: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Contratista)
        .options(selectinload(Contratista.contratos))
        .where(Contratista.identificacion == identificacion)
    )
    contratista = result.scalar_one_or_none()
    if not contratista:
        raise HTTPException(404, "Contratista no encontrado")
    return contratista


@router.post("", response_model=ContratistaOut, status_code=201)
async def crear_contratista(data: ContratistaCreate, db: AsyncSession = Depends(get_db)):
    # Verificar si ya existe
    result = await db.execute(
        select(Contratista).where(Contratista.identificacion == data.identificacion)
    )
    if result.scalar_one_or_none():
        raise HTTPException(400, "Ya existe un contratista con esa identificación")
    contratista = Contratista(**data.model_dump())
    db.add(contratista)
    await db.commit()
    await db.refresh(contratista)
    return contratista


@router.put("/{identificacion}", response_model=ContratistaOut)
async def actualizar_contratista(
    identificacion: str, data: ContratistaCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Contratista).where(Contratista.identificacion == identificacion)
    )
    contratista = result.scalar_one_or_none()
    if not contratista:
        raise HTTPException(404, "Contratista no encontrado")
    for field, value in data.model_dump().items():
        setattr(contratista, field, value)
    await db.commit()
    await db.refresh(contratista)
    return contratista
