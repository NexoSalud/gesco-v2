"""Almacen — represents a physical storage/warehouse location for inventory."""

import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Almacen(Base):
    __tablename__ = "almacenes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    ubicacion: Mapped[str | None] = mapped_column(String(200))
    responsable: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    articulos = relationship("Articulo", back_populates="almacen")
    unidades = relationship("UnidadInventario", back_populates="almacen")
