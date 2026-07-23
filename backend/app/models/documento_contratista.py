"""DocumentoContratista — documentos contractuales que el contratista debe subir
(Cuenta de Cobro, Retención, Asistencia, Seguridad Social, Certificación Bancaria, ARL).
"""

import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DocumentoContratista(Base):
    __tablename__ = "documentos_contratista"

    id: Mapped[int] = mapped_column(primary_key=True)
    contratista_id: Mapped[int] = mapped_column(
        ForeignKey("contratistas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    contrato_numero: Mapped[str] = mapped_column(
        ForeignKey("contratos.numero_contrato", ondelete="CASCADE"), nullable=False
    )

    # Tipo de documento (enum en código)
    tipo_documento: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment=(
            "CUENTA_COBRO | RETENCION | LISTADO_ASISTENCIA | "
            "PLANILLA_SEGURIDAD | CERTIFICACION_BANCARIA | ARL"
        )
    )

    # Archivo
    archivo_ruta: Mapped[str] = mapped_column(String(500), nullable=False)
    archivo_nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    archivo_tamano: Mapped[int] = mapped_column(Integer, default=0, comment="Tamaño en bytes")

    # Estado
    estado: Mapped[str] = mapped_column(
        String(20), default="PENDIENTE",
        comment="PENDIENTE | APROBADO | RECHAZADO"
    )
    observacion: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluated_by: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )

    # Auditoría
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, onupdate=func.now()
    )
    evaluated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    contratista = relationship("Contratista")
    contrato = relationship("Contrato")
    evaluador = relationship("Usuario")
