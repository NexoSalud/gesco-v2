"""Schemas para ActividadContrato y ActividadSupervision."""

from pydantic import BaseModel


class ActividadContratoOut(BaseModel):
    id: int
    contrato_id: str
    descripcion: str
    tipo: str
    orden: int

    model_config = {"from_attributes": True}


class EvaluacionItem(BaseModel):
    id: int
    cumple: bool | None = None


class EvaluarActividadesInput(BaseModel):
    actividades: list[EvaluacionItem]


class ActividadSupervisionOut(BaseModel):
    id: int
    pago_id: int
    actividad_contrato_id: int | None = None
    actividad_perfil_id: int | None = None
    descripcion: str
    cumple: bool | None = None
    orden: int

    model_config = {"from_attributes": True}
