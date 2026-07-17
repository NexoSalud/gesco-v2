"""Modelos para la gestión de usuarios, roles y accesos (RBAC)."""

import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(250))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    usuarios = relationship("Usuario", back_populates="role", cascade="all, delete-orphan")
    accesos = relationship("Acceso", back_populates="role", cascade="all, delete-orphan")


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(250), nullable=False)
    nombre_completo: Mapped[str | None] = mapped_column(String(200))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    role = relationship("Role", back_populates="usuarios")


class Acceso(Base):
    __tablename__ = "accesos"

    id: Mapped[int] = mapped_column(primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    vista: Mapped[str] = mapped_column(String(150), nullable=False)  # ej. "inventario", "contratistas", "contratos", "resoluciones", "plantillas", "importar"
    crear: Mapped[bool] = mapped_column(Boolean, default=False)
    leer: Mapped[bool] = mapped_column(Boolean, default=True)
    actualizar: Mapped[bool] = mapped_column(Boolean, default=False)
    eliminar: Mapped[bool] = mapped_column(Boolean, default=False)

    role = relationship("Role", back_populates="accesos")
