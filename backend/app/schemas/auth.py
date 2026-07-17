"""Esquemas de validación Pydantic para el sistema RBAC."""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class AccesoBase(BaseModel):
    vista: str
    crear: bool = False
    leer: bool = True
    actualizar: bool = False
    eliminar: bool = False


class AccesoCreate(AccesoBase):
    pass


class AccesoResponse(AccesoBase):
    id: int
    role_id: int

    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    id: int
    created_at: datetime
    accesos: List[AccesoResponse] = []

    class Config:
        from_attributes = True


class UsuarioBase(BaseModel):
    username: str
    nombre_completo: Optional[str] = None
    activo: bool = True
    role_id: int


class UsuarioCreate(UsuarioBase):
    password: str


class UsuarioUpdate(BaseModel):
    username: Optional[str] = None
    nombre_completo: Optional[str] = None
    activo: Optional[bool] = None
    role_id: Optional[int] = None
    password: Optional[str] = None  # Contraseña opcional para actualizaciones


class UsuarioResponse(BaseModel):
    id: int
    username: str
    nombre_completo: Optional[str] = None
    activo: bool
    role_id: int
    created_at: datetime
    role: RoleResponse

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UsuarioResponse


class PerfilUpdate(BaseModel):
    username: Optional[str] = None
    nombre_completo: Optional[str] = None
    password: Optional[str] = None
