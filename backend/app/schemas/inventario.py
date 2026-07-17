"""Schemas Pydantic para el módulo de Inventario y Almacenes."""

from datetime import date, datetime
from pydantic import BaseModel
from typing import List, Optional


# --- Almacén ---
class AlmacenBase(BaseModel):
    nombre: str
    ubicacion: Optional[str] = None
    responsable: Optional[str] = None


class AlmacenCreate(AlmacenBase):
    pass


class AlmacenUpdate(BaseModel):
    nombre: Optional[str] = None
    ubicacion: Optional[str] = None
    responsable: Optional[str] = None


class AlmacenResponse(AlmacenBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Artículo ---
class ArticuloBase(BaseModel):
    categoria: str  # TECNOLOGICO / BIOMEDICO / DOTACION_INSUMO
    tipo_elemento: str
    elemento: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    requiere_serial: bool = True
    almacen_id: Optional[int] = None
    resolucion_id: Optional[int] = None


class ArticuloCreate(ArticuloBase):
    stock_total: Optional[int] = 0


class ArticuloResponse(ArticuloBase):
    id: int
    stock_total: int
    stock_disponible: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Unidad de Inventario ---
class UnidadInventarioBase(BaseModel):
    articulo_id: int
    almacen_id: Optional[int] = None
    serial: Optional[str] = None
    imei2: Optional[str] = None
    observaciones: Optional[str] = None
    resolucion_id: Optional[int] = None


class UnidadInventarioCreate(UnidadInventarioBase):
    estado: Optional[str] = "DISPONIBLE"


class UnidadInventarioResponse(UnidadInventarioBase):
    id: int
    estado: str
    contrato_actual_id: Optional[int] = None
    contratista_nombre: Optional[str] = None
    numero_contrato: Optional[str] = None
    fecha_ultima_entrega: Optional[date] = None
    fecha_ultima_devolucion: Optional[date] = None
    created_at: datetime
    articulo: Optional[ArticuloResponse] = None

    class Config:
        from_attributes = True


# --- Movimiento ---
class MovimientoResponse(BaseModel):
    id: int
    tipo: str  # ENTREGA / DEVOLUCION
    contrato_id: int
    unidad_id: Optional[int] = None
    articulo_id: Optional[int] = None
    cantidad: int
    fecha: date
    estado_declarado: Optional[str] = None
    observaciones: Optional[str] = None
    recibido_por: Optional[str] = None
    acta_id: Optional[int] = None
    created_at: datetime
    articulo: Optional[ArticuloResponse] = None
    unidad: Optional[UnidadInventarioResponse] = None

    class Config:
        from_attributes = True


# --- Acta ---
class ActaResponse(BaseModel):
    id: int
    tipo: str  # ENTREGA / DEVOLUCION
    categoria: str  # TECNOLOGICO / BIOMEDICO / DOTACION
    contrato_id: int
    fecha: date
    archivo_generado: Optional[str] = None
    firmado_por_contratista: bool
    recibido_entregado_por: Optional[str] = None
    usuario_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ActaListResponse(ActaResponse):
    numero_contrato: Optional[str] = None



# --- Transacciones de Entrega/Devolución ---
class EntregaItem(BaseModel):
    articulo_id: int
    unidad_id: Optional[int] = None  # Para serializados
    cantidad: Optional[int] = 1       # Para dotación
    estado_declarado: Optional[str] = "Se entrega en excelente estado funcional"
    observaciones: Optional[str] = None


class EntregaRequest(BaseModel):
    contrato_id: int
    items: List[EntregaItem]
    fecha: Optional[date] = None
    recibido_entregado_por: Optional[str] = None  # Persona de la ESE que entrega
    recibido_por: Optional[str] = None            # Persona que firma (nombre contratista o supervisor)


class DevolucionItem(BaseModel):
    unidad_id: Optional[int] = None  # Para serializados
    articulo_id: Optional[int] = None # Para dotación
    cantidad: Optional[int] = 1       # Para dotación
    estado_declarado: Optional[str] = "Excelente estado"
    reutilizable: Optional[bool] = True # Para dotación (reingresa a stock)
    observaciones: Optional[str] = None


class DevolucionRequest(BaseModel):
    contrato_id: int
    items: List[DevolucionItem]
    fecha: Optional[date] = None
    recibido_entregado_por: Optional[str] = None  # Persona de la ESE que recibe
    recibido_por: Optional[str] = None            # Persona que entrega/devuelve


# --- Resultados de Importación ---
class ImportInventarioResult(BaseModel):
    total: int = 0
    created_articles: int = 0
    created_units: int = 0
    skipped_duplicates: int = 0
    errors: List[dict] = []
    dry_run: bool = False
    error_file: Optional[str] = None


# --- Dashboard ---
class ArticuloDashboardInfo(BaseModel):
    id: int
    categoria: str
    tipo_elemento: str
    elemento: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    registrados: int
    entregados: int
    disponibles: int
    mantenimiento: int = 0
    baja: int = 0
    resolucion_id: Optional[int] = None


class CategoriaResumen(BaseModel):
    total: int = 0
    disponibles: int = 0
    entregados: int = 0
    mantenimiento: int = 0
    baja: int = 0


class DashboardResponse(BaseModel):
    resumen_tecnologico: CategoriaResumen
    resumen_biomedico: CategoriaResumen
    resumen_dotacion: CategoriaResumen
    resumen_insumo: CategoriaResumen
    articulos: List[ArticuloDashboardInfo]


class ArticuloUpdate(BaseModel):
    categoria: Optional[str] = None
    tipo_elemento: Optional[str] = None
    elemento: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    requiere_serial: Optional[bool] = None
    almacen_id: Optional[int] = None
    stock_total: Optional[int] = None
    resolucion_id: Optional[int] = None


class UnidadInventarioUpdate(BaseModel):
    articulo_id: Optional[int] = None
    almacen_id: Optional[int] = None
    serial: Optional[str] = None
    imei2: Optional[str] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None
    resolucion_id: Optional[int] = None


class BulkDeleteRequest(BaseModel):
    ids: List[int]
