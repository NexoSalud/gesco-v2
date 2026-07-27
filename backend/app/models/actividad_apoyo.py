"""ActividadApoyo — actividades/obligaciones específicas de cada apoyo administrativo."""

from sqlalchemy import String, Text, Integer, ForeignKey, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ActividadApoyo(Base):
    __tablename__ = "actividades_apoyo"

    id: Mapped[int] = mapped_column(primary_key=True)
    apoyo_id: Mapped[int] = mapped_column(
        ForeignKey("apoyo_administrativo.id", ondelete="CASCADE"), nullable=False, index=True
    )
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), default="GENERAL", comment="GENERAL | ESPECIFICA")
    orden: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    apoyo = relationship("ApoyoAdministrativo", backref="actividades_apoyo")
