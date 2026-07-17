"""Modelos de Inventario: Articulo, UnidadInventario, MovimientoInventario, Acta."""

import datetime
from datetime import date
from sqlalchemy import String, Integer, Boolean, Date, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Articulo(Base):
    __tablename__ = "articulos"

    id: Mapped[int] = mapped_column(primary_key=True)
    almacen_id: Mapped[int | None] = mapped_column(ForeignKey("almacenes.id", ondelete="SET NULL"))
    
    categoria: Mapped[str] = mapped_column(String(50), nullable=False, comment="TECNOLOGICO / BIOMEDICO / DOTACION_INSUMO")
    tipo_elemento: Mapped[str] = mapped_column(String(100), nullable=False, comment="ej. PORTATIL, TENSIOMETRO, CHALECO")
    elemento: Mapped[str] = mapped_column(String(200), nullable=False, comment="ej. Portatil Dell Latitude 5420")
    marca: Mapped[str | None] = mapped_column(String(100))
    modelo: Mapped[str | None] = mapped_column(String(100))
    requiere_serial: Mapped[bool] = mapped_column(Boolean, default=True)
    resolucion_id: Mapped[int | None] = mapped_column(ForeignKey("resoluciones.id", ondelete="SET NULL"))
    
    # Para dotación/insumos
    stock_total: Mapped[int] = mapped_column(Integer, default=0)
    stock_disponible: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    almacen = relationship("Almacen", back_populates="articulos")
    unidades = relationship("UnidadInventario", back_populates="articulo", cascade="all, delete-orphan")
    movimientos = relationship("MovimientoInventario", back_populates="articulo")
    resolucion = relationship("Resolucion")


class UnidadInventario(Base):
    __tablename__ = "unidades_inventario"

    id: Mapped[int] = mapped_column(primary_key=True)
    articulo_id: Mapped[int] = mapped_column(ForeignKey("articulos.id", ondelete="CASCADE"), nullable=False)
    almacen_id: Mapped[int | None] = mapped_column(ForeignKey("almacenes.id", ondelete="SET NULL"))
    
    serial: Mapped[str | None] = mapped_column(String(100), unique=True, index=True)
    imei2: Mapped[str | None] = mapped_column(String(100), comment="IMEI 2 o ID Dispositivo si aplica")
    estado: Mapped[str] = mapped_column(String(50), default="DISPONIBLE", comment="DISPONIBLE / ENTREGADO / EN_MANTENIMIENTO / DE_BAJA")
    resolucion_id: Mapped[int | None] = mapped_column(ForeignKey("resoluciones.id", ondelete="SET NULL"))
    
    contrato_actual_id: Mapped[int | None] = mapped_column(ForeignKey("contratos.id", ondelete="SET NULL"))
    
    fecha_ultima_entrega: Mapped[date | None] = mapped_column(Date)
    fecha_ultima_devolucion: Mapped[date | None] = mapped_column(Date)
    observaciones: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    articulo = relationship("Articulo", back_populates="unidades")
    almacen = relationship("Almacen", back_populates="unidades")
    contrato_actual = relationship("Contrato", back_populates="equipos_asignados")
    movimientos = relationship("MovimientoInventario", back_populates="unidad", cascade="all, delete-orphan")
    resolucion = relationship("Resolucion")

    @property
    def contratista_nombre(self) -> str | None:
        if self.contrato_actual and self.contrato_actual.contratista_rel:
            return self.contrato_actual.contratista_rel.nombre
        return None

    @property
    def numero_contrato(self) -> str | None:
        if self.contrato_actual:
            return self.contrato_actual.numero_contrato
        return None


class MovimientoInventario(Base):
    __tablename__ = "movimientos_inventario"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, comment="ENTREGA / DEVOLUCION")
    contrato_id: Mapped[int] = mapped_column(ForeignKey("contratos.id", ondelete="CASCADE"), nullable=False)
    
    # Relación con unidad (para tecnológico/biomédico) o artículo (para dotación)
    unidad_id: Mapped[int | None] = mapped_column(ForeignKey("unidades_inventario.id", ondelete="SET NULL"))
    articulo_id: Mapped[int | None] = mapped_column(ForeignKey("articulos.id", ondelete="SET NULL"))
    
    cantidad: Mapped[int] = mapped_column(Integer, default=1, comment="Cantidad para dotación")
    fecha: Mapped[date] = mapped_column(Date, default=date.today)
    
    estado_declarado: Mapped[str | None] = mapped_column(String(250), comment="Estado en el que se asigna o recibe (ej. Excelente estado)")
    observaciones: Mapped[str | None] = mapped_column(Text)
    
    # Persona responsable
    recibido_por: Mapped[str | None] = mapped_column(String(150), comment="Persona que entrega o recibe la devolución")
    
    acta_id: Mapped[int | None] = mapped_column(ForeignKey("actas_inventario.id", ondelete="SET NULL"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    contrato = relationship("Contrato", back_populates="movimientos_inventario")
    unidad = relationship("UnidadInventario", back_populates="movimientos")
    articulo = relationship("Articulo", back_populates="movimientos")
    acta = relationship("Acta", back_populates="movimientos")


class Acta(Base):
    __tablename__ = "actas_inventario"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, comment="ENTREGA / DEVOLUCION")
    categoria: Mapped[str] = mapped_column(String(50), nullable=False, comment="TECNOLOGICO / BIOMEDICO / DOTACION")
    contrato_id: Mapped[int] = mapped_column(ForeignKey("contratos.id", ondelete="CASCADE"), nullable=False)
    
    fecha: Mapped[date] = mapped_column(Date, default=date.today)
    archivo_generado: Mapped[str | None] = mapped_column(String(300), comment="Ruta del archivo .docx o .pdf generado")
    
    firmado_por_contratista: Mapped[bool] = mapped_column(Boolean, default=False)
    recibido_entregado_por: Mapped[str | None] = mapped_column(String(150), comment="Funcionario de la ESE que gestiona")
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    contrato = relationship("Contrato", back_populates="actas_inventario")
    movimientos = relationship("MovimientoInventario", back_populates="acta")
    usuario = relationship("Usuario")
