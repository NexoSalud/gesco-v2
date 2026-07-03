"""Pydantic schemas para Resolución."""

from datetime import date, datetime
from pydantic import BaseModel, Field, model_validator
from typing import Any


class ResolucionBase(BaseModel):
    codigo: str = Field(..., max_length=100, description="Ej: RES-001-2026")
    titulo: str | None = None
    unidad_id: int = 1
    vigencia: int | None = None
    fuente: str | None = None
    presupuesto: float = 0
    indirect_percentage: float = 0
    notas: str | None = None
    activa: bool = False


class ResolucionCreate(ResolucionBase):
    pass


class ResolucionUpdate(BaseModel):
    codigo: str | None = None
    titulo: str | None = None
    presupuesto: float | None = None
    indirect_percentage: float | None = None
    notas: str | None = None
    activa: bool | None = None


class ContratoResumen(BaseModel):
    id: int
    numero_contrato: str
    beneficiario: str | None
    perfil: str | None
    monto_total: float
    monto_transporte: float
    estado: str
    fecha_inicio: date | None
    fecha_fin: date | None
    costo_tipo: str | None
    cuotas_total: int
    cuotas_pagadas: int

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def resolve_beneficiario(cls, data: Any) -> Any:
        if isinstance(data, dict):
            data.setdefault("beneficiario", None)
            return data
        # ORM instance — intenta extraer desde la relación
        try:
            rel = data.contratista_rel
            data.beneficiario = rel.nombre if rel else None
        except Exception:
            data.beneficiario = None
        return data


class ResolucionOut(ResolucionBase):
    id: int
    created_at: datetime
    contratos: list[ContratoResumen] = []

    model_config = {"from_attributes": True}


class ResolucionDashboard(ResolucionBase):
    id: int
    activa: bool = False
    created_at: datetime
    total_contratos: int = 0
    comprometido: float = 0
    saldo: float = 0
    activos: int = 0
    anulados: int = 0
    asignado_directo: float = 0
    asignado_indirecto: float = 0
    gastado_directo: float = 0
    gastado_indirecto: float = 0

    model_config = {"from_attributes": True}
