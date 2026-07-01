"""Pydantic schemas para importación masiva de contratos desde Excel."""

from pydantic import BaseModel, Field


class ImportResult(BaseModel):
    """Resumen de la importación."""
    total: int = 0
    created: int = 0
    skipped: int = 0
    errors: list[dict] = Field(default_factory=list)


class ImportRowError(BaseModel):
    """Error de una fila específica."""
    fila: int
    numero_contrato: str | None = None
    error: str
