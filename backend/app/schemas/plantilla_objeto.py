"""Pydantic schemas para Plantillas de Objeto del Contrato."""

from datetime import datetime
from pydantic import BaseModel, Field


class PlantillaObjetoCreate(BaseModel):
    titulo: str = Field(..., max_length=200)
    contenido: str


class PlantillaObjetoOut(BaseModel):
    id: int
    titulo: str
    contenido: str
    created_at: datetime

    model_config = {"from_attributes": True}
