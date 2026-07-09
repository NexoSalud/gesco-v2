"""Pydantic schemas para Contrato."""

from datetime import date, datetime
from pydantic import BaseModel, Field


class ContratoBase(BaseModel):
    numero_contrato: str = Field(..., max_length=50)
    resolucion_id: int
    contratista_id: int | None = None
    perfil: str | None = None
    estado: str = "EN_PROCESO"
    objeto: str | None = None
    obligaciones: str | None = None
    lugar_ejecucion: str | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    fecha_contrato: date | None = None
    monto_total: float = 0
    monto_transporte: float = 0
    tiene_transporte: bool = False
    no_cdp: str | None = None
    fecha_cdp: date | None = None
    valor_cdp: str | None = None
    rubro: str | None = None
    rp: str | None = None
    cpd: str | None = None
    costo_tipo: str | None = "DIRECTO"
    sub_tipo: str | None = "TALENTO_HUMANO"
    clasificacion: str | None = None
    supervisor: str | None = None
    cedula_supervisor: str | None = None
    cargo_supervisor: str | None = None
    unidad_atencion: str | None = None
    codigo_unspsc: str | None = None
    descripcion_unspsc: str | None = None
    cuotas: str | None = None
    cuotas_total: int = 0


class ContratoCreate(ContratoBase):
    contratista_nombre: str | None = None
    contratista_identificacion: str | None = None
    contratista_expedida_en: str | None = None
    contratista_telefono: str | None = None
    contratista_direccion: str | None = None
    contratista_correo: str | None = None


class ContratoUpdate(BaseModel):
    estado: str | None = None
    perfil: str | None = None
    objeto: str | None = None
    obligaciones: str | None = None
    monto_total: float | None = None
    monto_transporte: float | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    fecha_contrato: date | None = None
    supervisor: str | None = None
    cedula_supervisor: str | None = None
    cargo_supervisor: str | None = None
    unidad_atencion: str | None = None
    no_cdp: str | None = None
    fecha_cdp: date | None = None
    rubro: str | None = None
    rp: str | None = None
    lugar_ejecucion: str | None = None
    costo_tipo: str | None = None
    sub_tipo: str | None = None
    clasificacion: str | None = None


class PagoResumen(BaseModel):
    id: int
    numero_pago: int
    tipo_informe: str | None
    periodo_desde: date | None
    periodo_hasta: date | None
    fecha_firma: date | None
    valor_a_pagar: float
    observaciones: str | None

    model_config = {"from_attributes": True}


class ContratoOut(ContratoBase):
    id: int
    created_at: datetime
    cuotas_pagadas: int = 0
    valor_letras: str | None = None
    contratista_rel: "ContratistaOut | None" = None
    pagos: list[PagoResumen] = []

    model_config = {"from_attributes": True}


from app.schemas.contratista import ContratistaOut
ContratoOut.model_rebuild()
