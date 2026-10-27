"""Esquemas Pydantic del módulo de Gestión Contractual."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

RolGc = Literal["ADMIN", "GESTOR", "CONSULTA"]
EstadoGestion = Literal["VIGENTE", "SUSPENDIDO", "TERMINADO", "LIQUIDADO", "ANULADO"]

CATEGORIAS_DOCUMENTO: dict[str, str] = {
    "CONTRATO_FIRMADO": "Contrato firmado",
    "ESTUDIOS_PREVIOS": "Estudios previos",
    "CDP": "Certificado de disponibilidad (CDP)",
    "RP": "Registro presupuestal (RP)",
    "POLIZA": "Póliza / garantía",
    "ACTA_INICIO": "Acta de inicio",
    "DESIGNACION_SUPERVISION": "Designación de supervisión",
    "DOCUMENTOS_CONTRATISTA": "Documentos del contratista",
    "OTROSI": "Otrosí / modificación",
    "INFORME_SUPERVISION": "Informe de supervisión",
    "ACTA_LIQUIDACION": "Acta de liquidación",
    "OTRO": "Otro",
}


# ─── Auth / usuarios ─────────────────────────────────────────────────────────

class GcLogin(BaseModel):
    username: str
    password: str


class GcUsuarioOut(BaseModel):
    id: int
    username: str
    nombre_completo: str | None = None
    correo: str | None = None
    rol: str
    activo: bool
    debe_cambiar_password: bool = False
    ultimo_acceso: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GcTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: GcUsuarioOut


class GcCambioPassword(BaseModel):
    actual: str
    nueva: str = Field(min_length=8)


class GcUsuarioCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    nombre_completo: str | None = None
    correo: str | None = None
    rol: RolGc = "CONSULTA"
    password: str = Field(min_length=8)


class GcUsuarioUpdate(BaseModel):
    nombre_completo: str | None = None
    correo: str | None = None
    rol: RolGc | None = None
    activo: bool | None = None
    password: str | None = Field(default=None, min_length=8)


# ─── Sincronización ──────────────────────────────────────────────────────────

class ContratoOrigenOut(BaseModel):
    id: int
    numero_contrato: str
    contratista_nombre: str | None = None
    contratista_identificacion: str | None = None
    perfil: str | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    valor_total: float = 0
    estado: str | None = None
    resolucion_id: int | None = None
    resolucion_codigo: str | None = None
    sincronizado: bool = False
    gc_contrato_id: int | None = None
    desactualizado: bool = False


class SincronizarIn(BaseModel):
    contrato_ids: list[int] = Field(min_length=1, max_length=1000)


class SincronizarOut(BaseModel):
    creados: int
    actualizados: int
    sin_cambios: int
    no_encontrados: list[int] = []


class ResolucionMini(BaseModel):
    id: int
    codigo: str


# ─── Contratos gestionados ───────────────────────────────────────────────────

class GcContratoOut(BaseModel):
    id: int
    origen: str = "SINCRONIZADO"
    contrato_origen_id: int | None = None
    contratista_id: int | None = None
    numero_contrato: str
    contratista_nombre: str | None = None
    contratista_identificacion: str | None = None
    perfil: str | None = None
    objeto: str | None = None
    fecha_contrato: date | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    valor_total: float = 0
    valor_final: float | None = None
    valor_transporte: float = 0
    supervisor: str | None = None
    resolucion_id: int | None = None
    resolucion_codigo: str | None = None
    estado_origen: str | None = None
    estado_gestion: str
    observaciones: str | None = None
    sincronizado_at: datetime
    sincronizado_por: str | None = None
    total_documentos: int = 0
    categorias_cubiertas: list[str] = []
    desactualizado: bool = False
    origen_eliminado: bool = False


class GcContratoUpdate(BaseModel):
    estado_gestion: EstadoGestion | None = None
    observaciones: str | None = None
    # Solo para contratos creados en el módulo (MANUAL): se escriben también en el GESCO principal
    numero_contrato: str | None = Field(default=None, min_length=1, max_length=50)
    contratista_id: int | None = None
    perfil: str | None = None
    objeto: str | None = None
    fecha_contrato: date | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    valor_total: float | None = Field(default=None, ge=0)
    valor_transporte: float | None = Field(default=None, ge=0)
    valor_final: float | None = Field(default=None, ge=0)
    supervisor: str | None = None
    resolucion_id: int | None = None


CAMPOS_EDITABLES_MANUAL = {
    "numero_contrato", "contratista_id", "perfil", "objeto", "fecha_contrato", "fecha_inicio",
    "fecha_fin", "valor_total", "valor_transporte", "valor_final", "supervisor", "resolucion_id",
}


class GcContratoCreate(BaseModel):
    numero_contrato: str = Field(min_length=1, max_length=50)
    contratista_id: int
    perfil: str | None = None
    objeto: str | None = None
    fecha_contrato: date | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    valor_total: float = Field(default=0, ge=0)
    valor_transporte: float = Field(default=0, ge=0)
    valor_final: float | None = Field(default=None, ge=0)
    supervisor: str | None = None
    resolucion_id: int
    estado_gestion: EstadoGestion = "VIGENTE"
    observaciones: str | None = None


# ─── Contratistas ────────────────────────────────────────────────────────────

class GcContratistaBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=300)
    tipo_persona: Literal["NATURAL", "JURIDICA"] = "NATURAL"
    expedida_en: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    correo: str | None = None
    banco: str | None = None
    tipo_cuenta: str | None = None
    numero_cuenta: str | None = None


class GcContratistaCreate(GcContratistaBase):
    identificacion: str = Field(min_length=3, max_length=20)


class GcContratistaUpdate(BaseModel):
    identificacion: str | None = Field(default=None, min_length=3, max_length=20)
    nombre: str | None = Field(default=None, min_length=2, max_length=300)
    tipo_persona: Literal["NATURAL", "JURIDICA"] | None = None
    expedida_en: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    correo: str | None = None
    banco: str | None = None
    tipo_cuenta: str | None = None
    numero_cuenta: str | None = None


class GcContratistaOut(GcContratistaBase):
    id: int
    identificacion: str
    tipo_persona: str | None = None
    origen: str
    contratista_origen_id: int | None = None
    total_contratos: int = 0
    contratos_vigentes: int = 0
    valor_contratado: float = 0
    desactualizado: bool = False
    created_at: datetime


class ContratistaOrigenOut(BaseModel):
    id: int
    identificacion: str
    nombre: str
    telefono: str | None = None
    correo: str | None = None
    contratos: int = 0
    sincronizado: bool = False
    gc_contratista_id: int | None = None
    desactualizado: bool = False


class SincronizarContratistasIn(BaseModel):
    contratista_ids: list[int] = Field(min_length=1, max_length=1000)
    incluir_contratos: bool = False


class SincronizarContratistasOut(BaseModel):
    creados: int
    actualizados: int
    sin_cambios: int
    contratos: SincronizarOut | None = None


# ─── Documentos ──────────────────────────────────────────────────────────────

class GcDocumentoOut(BaseModel):
    id: int
    contrato_id: int
    categoria: str
    nombre: str
    descripcion: str | None = None
    archivo_nombre: str
    mime_type: str
    tamano: int
    paginas: int | None = None
    tiene_miniatura: bool = False
    subido_por: str | None = None
    created_at: datetime


class GcDocumentoUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=250)
    categoria: str | None = None
    descripcion: str | None = None


# ─── Resumen ─────────────────────────────────────────────────────────────────

class GcEventoOut(BaseModel):
    id: int
    accion: str
    detalle: str | None = None
    contrato_id: int | None = None
    usuario: str | None = None
    created_at: datetime


class GcResumenOut(BaseModel):
    total_contratos: int
    por_estado: dict[str, int]
    total_documentos: int
    almacenamiento_bytes: int
    sin_documentos: int
    desactualizados: int
    pendientes_sincronizar: int
    proximos_vencer: list[GcContratoOut]
    actividad: list[GcEventoOut]


# ─── Estadísticas ────────────────────────────────────────────────────────────

class EstadisticaResolucion(BaseModel):
    id: int
    codigo: str
    titulo: str | None = None
    vigencia: int | None = None
    activa: bool = False
    presupuesto: float
    # "Real": contratos sincronizados en este módulo (sin anulados)
    contratos_reales: int
    comprometido_real: float
    # "Registrado": todos los contratos del módulo de contratos (sin anulados)
    contratos_registrados: int
    comprometido_registrado: float
    saldo_real: float
    ejecucion_real_pct: float
    expedientes_completos: int


class EstadisticaGrupo(BaseModel):
    clave: str
    contratos: int
    valor: float


class EstadisticasTotales(BaseModel):
    resoluciones: int
    presupuesto: float
    contratos_reales: int
    comprometido_real: float
    contratos_registrados: int
    comprometido_registrado: float
    saldo_real: float
    ejecucion_real_pct: float
    cobertura_pct: float
    valor_promedio: float


class GcEstadisticasOut(BaseModel):
    totales: EstadisticasTotales
    por_resolucion: list[EstadisticaResolucion]
    por_estado: list[EstadisticaGrupo]
    por_perfil: list[EstadisticaGrupo]
    por_mes: list[EstadisticaGrupo]
