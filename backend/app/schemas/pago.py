"""Pydantic schemas para Pago y Planilla."""

from datetime import date, datetime
from pydantic import BaseModel, Field


class PlanillaCreate(BaseModel):
    planilla_no: str | None = None
    periodo_cotizado: str | None = None
    ibc: str | None = "0"
    eps_nombre: str | None = None
    eps_valor: float = 0
    arl_nombre: str | None = None
    arl_valor: float = 0
    afp_nombre: str | None = None
    afp_valor: float = 0
    ccf_nombre: str | None = None
    ccf_valor: float = 0
    sena_valor: float = 0
    icbf_valor: float = 0
    valor_total: float = 0


class PlanillaOut(PlanillaCreate):
    id: int
    pago_id: int

    model_config = {"from_attributes": True}


class PagoCreate(BaseModel):
    contrato_id: str
    tipo_informe: str = "SUPERVISION"
    periodo_desde: date | None = None
    periodo_hasta: date | None = None
    fecha_firma: date | None = None
    valor_a_pagar: float = 0
    otro_si: str | None = None
    folios: str | None = None
    actividades: str | None = None
    observaciones: str | None = None
    act: str | None = None
    planillas: list[PlanillaCreate] = []
    finalizar_contrato: bool = False


class PagoOut(BaseModel):
    id: int
    contrato_id: str
    numero_pago: int
    tipo_informe: str | None
    periodo_desde: date | None
    periodo_hasta: date | None
    fecha_firma: date | None
    valor_a_pagar: float
    valor_pagado: float | None
    otro_si: str | None
    folios: str | None
    actividades: str | None
    observaciones: str | None
    act: str | None
    created_at: datetime
    planillas: list[PlanillaOut] = []

    model_config = {"from_attributes": True}
