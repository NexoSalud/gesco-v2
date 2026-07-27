"""Schemas para ApoyoAdministrativo."""

from datetime import datetime
from pydantic import BaseModel


class ApoyoOut(BaseModel):
    id: int
    nombre: str
    identificacion: str
    telefono: str | None = None
    correo: str | None = None
    perfil: str | None = None
    activo: bool = True
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ApoyoCreate(BaseModel):
    nombre: str
    identificacion: str
    telefono: str | None = None
    correo: str | None = None
    perfil: str | None = None


class ApoyoUpdate(BaseModel):
    nombre: str | None = None
    identificacion: str | None = None
    telefono: str | None = None
    correo: str | None = None
    perfil: str | None = None


class ActividadApoyoOut(BaseModel):
    id: int
    apoyo_id: int
    descripcion: str
    tipo: str
    orden: int

    model_config = {"from_attributes": True}


class ActividadApoyoCreate(BaseModel):
    descripcion: str
    tipo: str = "GENERAL"
    orden: int = 0


class EvidenciaApoyoOut(BaseModel):
    id: int
    actividad_apoyo_id: int
    apoyo_id: int
    tipo: str
    contenido_texto: str | None = None
    archivo_ruta: str | None = None
    archivo_nombre: str | None = None
    archivo_tipo: str | None = None
    estado: str = "PENDIENTE"
    observacion_coordinadora: str | None = None
    created_at: datetime | None = None
    evaluated_at: datetime | None = None
    evaluated_by: int | None = None
    actividad_descripcion: str | None = None

    model_config = {"from_attributes": True}


class EvidenciaApoyoEvaluar(BaseModel):
    estado: str  # APROBADO | RECHAZADO
    observacion: str | None = None


class DashboardApoyo(BaseModel):
    apoyo_id: int
    identificacion: str
    nombre: str
    telefono: str | None = None
    correo: str | None = None
    perfil: str | None = None
    actividades: list[dict] = []


class ResumenApoyo(BaseModel):
    apoyo_id: int
    apoyo_nombre: str
    total_actividades: int = 0
    con_evidencia: int = 0
    sin_evidencia: int = 0
    aprobadas: int = 0
    rechazadas: int = 0
    pendientes: int = 0
    porcentaje_cumplimiento: float = 0.0
