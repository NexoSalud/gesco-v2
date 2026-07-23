"""Pydantic schemas para Documentos de Contratista."""

from datetime import datetime
from pydantic import BaseModel, Field


# Tipos de documento soportados
TIPOS_DOCUMENTO = [
    "CUENTA_COBRO",
    "RETENCION",
    "LISTADO_ASISTENCIA",
    "PLANILLA_SEGURIDAD",
    "CERTIFICACION_BANCARIA",
    "ARL",
]

TIPOS_DOCUMENTO_LABELS = {
    "CUENTA_COBRO": "Cuenta de Cobro",
    "RETENCION": "Retención formato",
    "LISTADO_ASISTENCIA": "Listado de asistencia",
    "PLANILLA_SEGURIDAD": "Planilla de seguridad social",
    "CERTIFICACION_BANCARIA": "Certificación bancaria",
    "ARL": "ARL",
}


class DocumentoContratistaCreate(BaseModel):
    contratista_id: int
    contrato_numero: str
    tipo_documento: str = Field(..., pattern="^(CUENTA_COBRO|RETENCION|LISTADO_ASISTENCIA|PLANILLA_SEGURIDAD|CERTIFICACION_BANCARIA|ARL)$")


class DocumentoContratistaOut(BaseModel):
    id: int
    contratista_id: int
    contrato_numero: str
    tipo_documento: str
    archivo_ruta: str
    archivo_nombre: str
    archivo_tamano: int
    estado: str
    observacion: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    evaluated_at: datetime | None = None
    contratista_nombre: str | None = None
    contratista_identificacion: str | None = None

    model_config = {"from_attributes": True}


class DocumentoContratistaEvaluar(BaseModel):
    estado: str = Field(..., pattern="^(APROBADO|RECHAZADO)$")
    observacion: str | None = None
