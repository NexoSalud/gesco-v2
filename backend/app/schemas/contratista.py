"""Pydantic schemas para Contratista."""

from datetime import datetime
from pydantic import BaseModel, Field


class ContratistaBase(BaseModel):
    identificacion: str = Field(..., max_length=20)
    nombre: str = Field(..., max_length=300)
    tipo_persona: str = "NATURAL"
    expedida_en: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    correo: str | None = None


class ContratistaCreate(ContratistaBase):
    pass


class ContratistaOut(ContratistaBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
