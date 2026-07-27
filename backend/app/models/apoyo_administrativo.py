"""ApoyoAdministrativo — personal de apoyo administrativo que es evaluado en el sistema.

No son contratistas, pero participan en el flujo de evaluación (actividades + evidencias).
"""

import datetime
from sqlalchemy import String, Text, Integer, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ApoyoAdministrativo(Base):
    __tablename__ = "apoyo_administrativo"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    identificacion: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    correo: Mapped[str | None] = mapped_column(String(150), nullable=True)
    perfil: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="Rol/cargo dentro del apoyo administrativo")
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, onupdate=func.now())
