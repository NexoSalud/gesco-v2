"""Router para autenticación y validación de tokens JWT."""

import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import Usuario, Role
from app.schemas.auth import UserLogin, TokenResponse, UsuarioResponse, PerfilUpdate
from app.services.auth_service import (
    verify_password,
    create_access_token,
    decode_access_token,
    hash_password,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login-form")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Usuario:
    """Dependencia para obtener el usuario autenticado desde el JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales o el token ha expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    # Cargar usuario con su rol y accesos
    res = await db.execute(
        select(Usuario)
        .options(
            selectinload(Usuario.role)
            .selectinload(Role.accesos)
        )
        .where(Usuario.username == username)
    )
    user = res.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    if not user.activo:
        raise HTTPException(status_code=400, detail="Usuario inactivo en el sistema")
    
    return user


def require_role(role_name: str):
    """Dependencia para forzar que el usuario tenga un rol específico."""
    async def role_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.role.nombre != role_name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Esta acción requiere el rol de {role_name}"
            )
        return current_user
    return role_checker


def require_permission(vista: str, accion: str):
    """Dependencia para validar permisos específicos por vista/acción."""
    async def permission_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        # SUPER_ADMIN tiene acceso completo a todo
        if current_user.role.nombre == "SUPER_ADMIN":
            return current_user
        
        # Buscar acceso en la lista del rol
        for acc in current_user.role.accesos:
            if acc.vista == vista:
                if getattr(acc, accion, False):
                    return current_user
                    
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No tiene permisos para realizar la acción '{accion}' en la sección '{vista}'"
        )
    return permission_checker


@router.post("/login", response_model=TokenResponse)
async def login_json(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """Inicio de sesión mediante payload JSON (ideal para el frontend)."""
    res = await db.execute(
        select(Usuario)
        .options(
            selectinload(Usuario.role)
            .selectinload(Role.accesos)
        )
        .where(Usuario.username == payload.username)
    )
    user = res.scalar_one_or_none()
    
    if not user or not verify_password(user.password_hash, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
        
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario está inactivo"
        )
        
    # Crear token JWT
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.nombre}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/login-form", response_model=TokenResponse)
async def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """Inicio de sesión mediante Form Data (ideal para Swagger UI)."""
    res = await db.execute(
        select(Usuario)
        .options(
            selectinload(Usuario.role)
            .selectinload(Role.accesos)
        )
        .where(Usuario.username == form_data.username)
    )
    user = res.scalar_one_or_none()
    
    if not user or not verify_password(user.password_hash, form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
        
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario está inactivo"
        )
        
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.nombre}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UsuarioResponse)
async def get_me(current_user: Usuario = Depends(get_current_user)):
    """Obtiene el perfil del usuario autenticado actual."""
    return current_user


@router.put("/me", response_model=TokenResponse)
async def update_me(
    payload: PerfilUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza el perfil (nombre de usuario, nombre completo, contraseña) del usuario actual."""
    # Si se cambia el nombre de usuario
    if payload.username and payload.username != current_user.username:
        # Verificar duplicados
        dup_res = await db.execute(select(Usuario).where(Usuario.username == payload.username))
        if dup_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
        current_user.username = payload.username
        
    if payload.nombre_completo is not None:
        current_user.nombre_completo = payload.nombre_completo
        
    if payload.password:
        current_user.password_hash = hash_password(payload.password)
        
    await db.commit()
    
    # Recargar con relaciones
    res_reload = await db.execute(
        select(Usuario)
        .options(
            selectinload(Usuario.role)
            .selectinload(Role.accesos)
        )
        .where(Usuario.id == current_user.id)
    )
    user = res_reload.scalar_one()
    
    # Siempre generar y retornar un token actualizado con el sub correcto
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.nombre}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }
