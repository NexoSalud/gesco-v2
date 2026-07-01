"""Resolución / CDP — presupuesto anual."""

import datetime
from datetime import date
from sqlalchemy import String, Float, Text, Date, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Resolucion(Base):
    __tablename__ = "resoluciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="Ej: RES-001-2026")
    titulo: Mapped[str | None] = mapped_column(String(300))
    unidad_id: Mapped[int] = mapped_column(Integer, default=1)
    vigencia: Mapped[int | None] = mapped_column(Integer, comment="Año presupuestal")
    fuente: Mapped[str | None] = mapped_column(String(100))
    presupuesto: Mapped[float] = mapped_column(Float, default=0)
    indirect_percentage: Mapped[float] = mapped_column(Float, default=0, comment="% para costos indirectos")
    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    contratos = relationship("Contrato", back_populates="resolucion", cascade="all, delete-orphan")
