"""ActividadContrato — actividades/obligaciones específicas de cada contrato."""

from sqlalchemy import String, Text, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ActividadContrato(Base):
    __tablename__ = "actividades_contrato"

    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[str] = mapped_column(ForeignKey("contratos.numero_contrato", ondelete="CASCADE"))
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), default="GENERAL", comment="GENERAL | ESPECIFICA")
    orden: Mapped[int] = mapped_column(Integer, default=0)

    contrato = relationship("Contrato", back_populates="actividades_contrato")
    supervisiones = relationship("ActividadSupervision", back_populates="actividad_contrato", cascade="all, delete-orphan")
