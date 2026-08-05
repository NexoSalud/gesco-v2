"""PeriodoEvaluacion — periodo/mes de evaluación de cumplimiento.

Un contrato tiene varias evaluaciones, una por periodo (mes). El contrato
NO se duplica: las actividades (actividades_contrato) y los documentos
(documentos_contratista) se asocian a un periodo mediante periodo_id.
"""

import datetime
from sqlalchemy import String, Date, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PeriodoEvaluacion(Base):
    __tablename__ = "periodos_evaluacion"

    id: Mapped[int] = mapped_column(primary_key=True)
    fecha: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True,
                                                comment="Primer día del mes, ej. 2026-08-01")
    nombre: Mapped[str] = mapped_column(String(50), nullable=False,
                                        comment="Ej: AGOSTO 2026")
    activo: Mapped[bool] = mapped_column(Boolean, default=True,
                                         comment="Periodo actual de evaluación")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
