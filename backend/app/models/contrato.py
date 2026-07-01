"""Contrato — el core del sistema."""

import datetime
from datetime import date
from sqlalchemy import String, Float, Text, Integer, Date, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Contrato(Base):
    __tablename__ = "contratos"

    id: Mapped[int] = mapped_column(primary_key=True)
    resolucion_id: Mapped[int] = mapped_column(ForeignKey("resoluciones.id", ondelete="CASCADE"))
    contratista_id: Mapped[int | None] = mapped_column(ForeignKey("contratistas.id", ondelete="SET NULL"))

    # Identificación
    numero_contrato: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    perfil: Mapped[str | None] = mapped_column(String(100), comment="Nombre del perfil (ej: MÉDICO GENERAL)")
    estado: Mapped[str] = mapped_column(String(30), default="EN_PROCESO")

    # Partes
    objeto: Mapped[str | None] = mapped_column(Text)
    obligaciones: Mapped[str | None] = mapped_column(Text)
    lugar_ejecucion: Mapped[str | None] = mapped_column(String(200))

    # Fechas
    fecha_inicio: Mapped[date | None] = mapped_column(Date)
    fecha_fin: Mapped[date | None] = mapped_column(Date)
    fecha_contrato: Mapped[date | None] = mapped_column(Date)

    # Económico
    monto_total: Mapped[float] = mapped_column(Float, default=0)
    monto_transporte: Mapped[float] = mapped_column(Float, default=0)
    tiene_transporte: Mapped[bool] = mapped_column(Boolean, default=False)
    valor_letras: Mapped[str | None] = mapped_column(String(500))

    # CDP / RP
    no_cdp: Mapped[str | None] = mapped_column(String(50))
    fecha_cdp: Mapped[date | None] = mapped_column(Date)
    valor_cdp: Mapped[str | None] = mapped_column(String(50))
    rubro: Mapped[str | None] = mapped_column(String(100))
    rp: Mapped[str | None] = mapped_column(String(50))
    cpd: Mapped[str | None] = mapped_column(String(50))

    # Costo
    costo_tipo: Mapped[str | None] = mapped_column(String(30), default="DIRECTO")
    sub_tipo: Mapped[str | None] = mapped_column(String(50), default="TALENTO_HUMANO")
    clasificacion: Mapped[str | None] = mapped_column(String(50))

    # Supervisión
    supervisor: Mapped[str | None] = mapped_column(String(200))
    cedula_supervisor: Mapped[str | None] = mapped_column(String(20))
    cargo_supervisor: Mapped[str | None] = mapped_column(String(100))
    unidad_atencion: Mapped[str | None] = mapped_column(String(200))

    # UNSPSC
    codigo_unspsc: Mapped[str | None] = mapped_column(String(20))
    descripcion_unspsc: Mapped[str | None] = mapped_column(String(300))

    # Cuotas
    cuotas: Mapped[str | None] = mapped_column(String(100), comment="Texto ej: '2' o 'DOS (2)'")
    cuotas_total: Mapped[int] = mapped_column(Integer, default=0)
    cuotas_pagadas: Mapped[int] = mapped_column(Integer, default=0)

    # Anulación
    motivo_anulacion: Mapped[str | None] = mapped_column(Text)
    fecha_anulacion: Mapped[date | None] = mapped_column(Date)

    # Auditoría
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, onupdate=func.now())

    # Relationships
    resolucion = relationship("Resolucion", back_populates="contratos")
    contratista_rel = relationship("Contratista", back_populates="contratos")
    pagos = relationship("Pago", back_populates="contrato", cascade="all, delete-orphan",
                         order_by="Pago.numero_pago")
