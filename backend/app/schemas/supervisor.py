"""Pydantic schemas para Supervisor."""

from datetime import datetime
from pydantic import BaseModel, Field


class SupervisorBase(BaseModel):
    nombre: str = Field(..., max_length=300)
    identificacion: str = Field(..., max_length=20)
    cargo: str | None = None
    nivel_profesional: str | None = None
    telefono: str | None = None
    correo: str | None = None


class SupervisorCreate(SupervisorBase):
    pass


class SupervisorOut(SupervisorBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SupervisorUpdate(BaseModel):
    """Para actualización parcial — todos los campos opcionales."""
    nombre: str | None = None
    cargo: str | None = None
    nivel_profesional: str | None = None
    telefono: str | None = None
    correo: str | None = None
