"""Pago / supervisión — cada vez que se le paga a un contratista."""

import datetime
from datetime import date
from sqlalchemy import String, Float, Text, Integer, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Pago(Base):
    __tablename__ = "pagos"

    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[str] = mapped_column(ForeignKey("contratos.numero_contrato", ondelete="CASCADE"), comment="FK por número de contrato")

    numero_pago: Mapped[int] = mapped_column(Integer, nullable=False)
    tipo_informe: Mapped[str | None] = mapped_column(String(50), default="SUPERVISION")

    # Período
    periodo_desde: Mapped[date | None] = mapped_column(Date)
    periodo_hasta: Mapped[date | None] = mapped_column(Date)
    fecha_firma: Mapped[date | None] = mapped_column(Date)

    # Valores
    valor_a_pagar: Mapped[float] = mapped_column(Float, default=0)
    valor_pagado: Mapped[float | None] = mapped_column(Float, default=0)
    otro_si: Mapped[str | None] = mapped_column(String(50))

    # Documentos
    folios: Mapped[str | None] = mapped_column(String(20))

    # Actividades
    actividades: Mapped[str | None] = mapped_column(Text)
    observaciones: Mapped[str | None] = mapped_column(Text)
    act: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    contrato = relationship("Contrato", back_populates="pagos")
    planillas = relationship("Planilla", back_populates="pago", cascade="all, delete-orphan")
