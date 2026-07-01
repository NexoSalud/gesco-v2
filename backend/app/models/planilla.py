"""Planilla de seguridad social — asociada a un pago."""

from sqlalchemy import String, Float, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Planilla(Base):
    __tablename__ = "planillas"

    id: Mapped[int] = mapped_column(primary_key=True)
    pago_id: Mapped[int] = mapped_column(ForeignKey("pagos.id", ondelete="CASCADE"))

    planilla_no: Mapped[str | None] = mapped_column(String(50))
    periodo_cotizado: Mapped[str | None] = mapped_column(String(20))
    ibc: Mapped[str | None] = mapped_column(String(50), default="0")

    # EPS
    eps_nombre: Mapped[str | None] = mapped_column(String(100))
    eps_valor: Mapped[float] = mapped_column(Float, default=0)

    # ARL
    arl_nombre: Mapped[str | None] = mapped_column(String(100))
    arl_valor: Mapped[float] = mapped_column(Float, default=0)

    # AFP
    afp_nombre: Mapped[str | None] = mapped_column(String(100))
    afp_valor: Mapped[float] = mapped_column(Float, default=0)

    # CCF
    ccf_nombre: Mapped[str | None] = mapped_column(String(100))
    ccf_valor: Mapped[float] = mapped_column(Float, default=0)

    # SENA - ICBF
    sena_valor: Mapped[float] = mapped_column(Float, default=0)
    icbf_valor: Mapped[float] = mapped_column(Float, default=0)

    valor_total: Mapped[float] = mapped_column(Float, default=0)

    pago = relationship("Pago", back_populates="planillas")
