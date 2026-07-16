"""Supervisor — persona encargada de supervisar contratos."""

import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Supervisor(Base):
    __tablename__ = "supervisores"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(300), nullable=False)
    identificacion: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    cargo: Mapped[str | None] = mapped_column(String(200))
    nivel_profesional: Mapped[str | None] = mapped_column(String(100))
    telefono: Mapped[str | None] = mapped_column(String(30))
    correo: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
