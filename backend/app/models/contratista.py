"""Contratista — persona natural o jurídica."""

import datetime
from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Contratista(Base):
    __tablename__ = "contratistas"

    id: Mapped[int] = mapped_column(primary_key=True)
    identificacion: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(300), nullable=False)
    tipo_persona: Mapped[str] = mapped_column(String(20), default="NATURAL")
    expedida_en: Mapped[str | None] = mapped_column(String(100))
    telefono: Mapped[str | None] = mapped_column(String(30))
    direccion: Mapped[str | None] = mapped_column(String(300))
    correo: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    contratos = relationship("Contrato", back_populates="contratista_rel")
