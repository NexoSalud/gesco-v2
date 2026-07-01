"""Perfiles profesionales & actividades asociadas."""

import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Perfil(Base):
    __tablename__ = "perfiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    objeto: Mapped[str | None] = mapped_column(Text, comment="Objeto contractual default")
    obligaciones_json: Mapped[str | None] = mapped_column(Text, comment="JSON array de obligaciones específicas")
    notas_internas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    actividades = relationship("ActividadPerfil", back_populates="perfil", cascade="all, delete-orphan")


class ActividadPerfil(Base):
    __tablename__ = "actividades_perfil"

    id: Mapped[int] = mapped_column(primary_key=True)
    perfil_id: Mapped[int] = mapped_column(ForeignKey("perfiles.id", ondelete="CASCADE"))
    descripcion: Mapped[str] = mapped_column(Text)
    orden: Mapped[int] = mapped_column(Integer, default=0)

    perfil = relationship("Perfil", back_populates="actividades")
