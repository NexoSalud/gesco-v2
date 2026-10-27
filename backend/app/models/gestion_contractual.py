"""Módulo de Gestión Contractual — independiente del dashboard principal.

Tiene su propio sistema de usuarios (login separado) y mantiene un registro
curado de los contratos *reales*: solo los contratos que un usuario decide
sincronizar desde el módulo de contratos existente. Cada contrato gestionado
guarda una copia (snapshot) de los datos de origen y su expediente de
documentos escaneados.
"""

import datetime
from datetime import date
from sqlalchemy import String, Text, Integer, Float, Date, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GcUsuario(Base):
    __tablename__ = "gc_usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(250), nullable=False)
    nombre_completo: Mapped[str | None] = mapped_column(String(200))
    correo: Mapped[str | None] = mapped_column(String(200))
    rol: Mapped[str] = mapped_column(
        String(20), default="CONSULTA", comment="ADMIN | GESTOR | CONSULTA"
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    debe_cambiar_password: Mapped[bool] = mapped_column(Boolean, default=False)
    ultimo_acceso: Mapped[datetime.datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())


class GcContrato(Base):
    """Contrato gestionado: copia sincronizada de un contrato del módulo actual."""

    __tablename__ = "gc_contratos"

    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_origen_id: Mapped[int | None] = mapped_column(
        ForeignKey("contratos.id", ondelete="SET NULL"), unique=True, nullable=True, index=True,
        comment="Contrato del módulo actual del que proviene (NULL si el origen fue eliminado)",
    )

    # Snapshot de los datos de origen
    numero_contrato: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    contratista_nombre: Mapped[str | None] = mapped_column(String(300))
    contratista_identificacion: Mapped[str | None] = mapped_column(String(20), index=True)
    perfil: Mapped[str | None] = mapped_column(String(100))
    objeto: Mapped[str | None] = mapped_column(Text)
    fecha_contrato: Mapped[date | None] = mapped_column(Date)
    fecha_inicio: Mapped[date | None] = mapped_column(Date)
    fecha_fin: Mapped[date | None] = mapped_column(Date)
    valor_total: Mapped[float] = mapped_column(Float, default=0)
    valor_final: Mapped[float | None] = mapped_column(Float)
    supervisor: Mapped[str | None] = mapped_column(String(200))
    resolucion_codigo: Mapped[str | None] = mapped_column(String(100))
    estado_origen: Mapped[str | None] = mapped_column(String(30))
    huella_origen: Mapped[str | None] = mapped_column(
        String(64), comment="Hash de los campos sincronizados, para detectar cambios en el origen"
    )

    # Gestión propia del módulo
    estado_gestion: Mapped[str] = mapped_column(
        String(20), default="VIGENTE",
        comment="VIGENTE | SUSPENDIDO | TERMINADO | LIQUIDADO | ANULADO",
    )
    observaciones: Mapped[str | None] = mapped_column(Text)

    sincronizado_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    sincronizado_por_id: Mapped[int | None] = mapped_column(
        ForeignKey("gc_usuarios.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, onupdate=func.now())

    sincronizado_por = relationship("GcUsuario")
    documentos = relationship(
        "GcDocumento", back_populates="contrato", cascade="all, delete-orphan",
        order_by="GcDocumento.created_at.desc()",
    )


class GcDocumento(Base):
    """Documento escaneado del expediente de un contrato gestionado."""

    __tablename__ = "gc_documentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[int] = mapped_column(
        ForeignKey("gc_contratos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    categoria: Mapped[str] = mapped_column(String(40), default="OTRO")
    nombre: Mapped[str] = mapped_column(String(250), nullable=False, comment="Título visible")
    descripcion: Mapped[str | None] = mapped_column(Text)

    archivo_nombre: Mapped[str] = mapped_column(String(250), nullable=False, comment="Nombre original")
    archivo_ruta: Mapped[str] = mapped_column(String(500), nullable=False, comment="Ruta relativa al directorio privado")
    miniatura_ruta: Mapped[str | None] = mapped_column(String(500))
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    tamano: Mapped[int] = mapped_column(Integer, default=0, comment="Bytes")
    paginas: Mapped[int | None] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    subido_por_id: Mapped[int | None] = mapped_column(ForeignKey("gc_usuarios.id", ondelete="SET NULL"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, onupdate=func.now())

    contrato = relationship("GcContrato", back_populates="documentos")
    subido_por = relationship("GcUsuario")


class GcEvento(Base):
    """Bitácora de acciones del módulo (sincronizaciones, cargas, cambios)."""

    __tablename__ = "gc_eventos"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("gc_usuarios.id", ondelete="SET NULL"))
    accion: Mapped[str] = mapped_column(String(40), nullable=False)
    contrato_id: Mapped[int | None] = mapped_column(
        ForeignKey("gc_contratos.id", ondelete="SET NULL"), index=True
    )
    detalle: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now(), index=True)

    usuario = relationship("GcUsuario")
