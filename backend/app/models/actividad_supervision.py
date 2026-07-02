"""ActividadSupervision — evaluación de actividades en cada pago/supervisión."""

from sqlalchemy import String, Text, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ActividadSupervision(Base):
    __tablename__ = "actividades_supervision"

    id: Mapped[int] = mapped_column(primary_key=True)
    pago_id: Mapped[int] = mapped_column(ForeignKey("pagos.id", ondelete="CASCADE"))
    actividad_contrato_id: Mapped[int | None] = mapped_column(
        ForeignKey("actividades_contrato.id", ondelete="SET NULL"), nullable=True
    )
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    cumple: Mapped[bool | None] = mapped_column(Boolean, nullable=True, comment="null=sin evaluar, true=cumple, false=no cumple")
    orden: Mapped[int] = mapped_column(Integer, default=0)

    pago = relationship("Pago", back_populates="actividades_supervision")
    actividad_contrato = relationship("ActividadContrato")
