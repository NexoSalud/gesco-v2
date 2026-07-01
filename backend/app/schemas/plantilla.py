"""Pydantic schemas para Plantilla de Observaciones."""

from datetime import datetime
from pydantic import BaseModel, Field


class PlantillaObservacionBase(BaseModel):
    titulo: str = Field(..., max_length=200)
    contenido: str


class PlantillaObservacionCreate(PlantillaObservacionBase):
    pass


class PlantillaObservacionOut(PlantillaObservacionBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
