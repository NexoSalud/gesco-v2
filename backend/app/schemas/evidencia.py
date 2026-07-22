"""Pydantic schemas para Evidencias del sistema de evaluación."""

from datetime import datetime
from pydantic import BaseModel, Field


class EvidenciaCreate(BaseModel):
    actividad_contrato_id: int
    contratista_id: int
    contrato_id: str
    tipo: str = Field(..., pattern="^(ARCHIVO|TEXTO|IMAGEN)$")

    # Para tipo TEXTO
    contenido_texto: str | None = None


class EvidenciaOut(BaseModel):
    id: int
    actividad_contrato_id: int
    contratista_id: int
    contrato_id: str
    tipo: str
    contenido_texto: str | None = None
    archivo_ruta: str | None = None
    archivo_nombre: str | None = None
    archivo_tipo: str | None = None
    estado: str
    observacion_coordinadora: str | None = None
    created_at: datetime
    evaluated_at: datetime | None = None
    evaluated_by: int | None = None
    actividad_descripcion: str | None = None

    model_config = {"from_attributes": True}


class EvidenciaEvaluar(BaseModel):
    estado: str = Field(..., pattern="^(APROBADO|RECHAZADO)$")
    observacion: str | None = None


class ActividadConEvidencias(BaseModel):
    id: int
    descripcion: str
    tipo: str
    orden: int
    evidencias: list[EvidenciaOut] = []


class ContratoEvaluacion(BaseModel):
    id: int
    numero_contrato: str
    perfil: str | None
    objeto: str | None
    estado: str
    fecha_inicio: str | None
    fecha_fin: str | None
    monto_total: float
    actividades: list[ActividadConEvidencias] = []


class DashboardContratista(BaseModel):
    contratista_id: int
    identificacion: str
    nombre: str
    telefono: str | None
    correo: str | None
    contratos: list[ContratoEvaluacion] = []


class ResumenCumplimiento(BaseModel):
    contratista_id: int
    contratista_nombre: str
    total_actividades: int
    con_evidencia: int
    sin_evidencia: int
    aprobadas: int
    rechazadas: int
    pendientes: int
    porcentaje_cumplimiento: float
