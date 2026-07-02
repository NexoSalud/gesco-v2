"""Pydantic schemas para Perfil."""

from datetime import datetime
from pydantic import BaseModel, Field


class ActividadPerfilOut(BaseModel):
    id: int
    descripcion: str
    tipo: str = "GENERAL"
    orden: int

    model_config = {"from_attributes": True}


class PerfilBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    objeto: str | None = None
    obligaciones_json: str | None = None
    notas_internas: str | None = None


class PerfilCreate(PerfilBase):
    pass


class PerfilOut(PerfilBase):
    id: int
    created_at: datetime
    actividades: list[ActividadPerfilOut] = []

    model_config = {"from_attributes": True}
