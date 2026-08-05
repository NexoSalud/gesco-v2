"""Schemas para Periodos de Evaluación."""

from datetime import date, datetime
from pydantic import BaseModel, Field


class PeriodoEvaluacionCreate(BaseModel):
    fecha: date = Field(..., description="Primer día del mes del periodo, ej. 2026-08-01")


class PeriodoEvaluacionOut(BaseModel):
    id: int
    fecha: date
    nombre: str
    activo: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
