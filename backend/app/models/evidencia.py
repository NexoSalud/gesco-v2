"""Evidencia — archivos, imágenes o textos que el contratista sube para acreditar actividades."""

import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Evidencia(Base):
    __tablename__ = "evidencias"

    id: Mapped[int] = mapped_column(primary_key=True)
    actividad_contrato_id: Mapped[int] = mapped_column(
        ForeignKey("actividades_contrato.id", ondelete="CASCADE"), nullable=False
    )
    contratista_id: Mapped[int] = mapped_column(
        ForeignKey("contratistas.id", ondelete="CASCADE"), nullable=False
    )
    contrato_id: Mapped[str] = mapped_column(
        ForeignKey("contratos.numero_contrato", ondelete="CASCADE"), nullable=False
    )

    tipo: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="ARCHIVO | TEXTO | IMAGEN"
    )

    # Para tipo TEXTO
    contenido_texto: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Para tipo ARCHIVO e IMAGEN
    archivo_ruta: Mapped[str | None] = mapped_column(String(500), nullable=True)
    archivo_nombre: Mapped[str | None] = mapped_column(String(200), nullable=True)
    archivo_tipo: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Evaluación
    estado: Mapped[str] = mapped_column(
        String(20), default="PENDIENTE",
        comment="PENDIENTE | APROBADO | RECHAZADO"
    )
    observacion_coordinadora: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluated_by: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )

    # Auditoría
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    evaluated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    actividad = relationship("ActividadContrato", backref="evidencias")
    contratista = relationship("Contratista")
    contrato = relationship("Contrato")
    evaluador = relationship("Usuario")
