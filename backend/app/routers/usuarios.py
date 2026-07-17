"""Router para la administración de usuarios, roles y accesos (RBAC)."""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import Usuario, Role, Acceso
from app.schemas.auth import (
    UsuarioCreate, UsuarioUpdate, UsuarioResponse,
    RoleCreate, RoleResponse,
    AccesoCreate, AccesoResponse
)
from app.services.auth_service import hash_password
from app.routers.auth import get_current_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/seguridad", tags=["Seguridad y Accesos"])


# ─── USUARIOS (Solo Super Admin) ───

@router.get("/usuarios", response_model=List[UsuarioResponse])
async def obtener_usuarios(
    current_user: Usuario = Depends(require_role("SUPER_ADMIN")),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la lista de todos los usuarios en el sistema."""
    res = await db.execute(
        select(Usuario)
        .options(
            selectinload(Usuario.role)
            .selectinload(Role.accesos)
        )
        .order_by(Usuario.id)
    )
    return res.scalars().all()


@router.post("/usuarios", response_model=UsuarioResponse)
async def crear_usuario(
    payload: UsuarioCreate,
    current_user: Usuario = Depends(require_role("SUPER_ADMIN")),
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuevo usuario en el sistema."""
    # Verificar si el username ya existe
    existing_res = await db.execute(select(Usuario).where(Usuario.username == payload.username))
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El nombre de usuario '{payload.username}' ya está registrado"
        )
        
    # Verificar si el rol existe
    role_res = await db.execute(select(Role).where(Role.id == payload.role_id))
    role = role_res.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El rol con ID {payload.role_id} no existe"
        )

    db_user = Usuario(
        username=payload.username,
        nombre_completo=payload.nombre_completo,
        activo=payload.activo,
        role_id=payload.role_id,
        password_hash=hash_password(payload.password)
    )
    db.add(db_user)
    await db.commit()
    
    # Recargar con relaciones
    res = await db.execute(
        select(Usuario)
        .options(
            selectinload(Usuario.role)
            .selectinload(Role.accesos)
        )
        .where(Usuario.id == db_user.id)
    )
    return res.scalar_one()


@router.put("/usuarios/{usuario_id}", response_model=UsuarioResponse)
async def actualizar_usuario(
    usuario_id: int,
    payload: UsuarioUpdate,
    current_user: Usuario = Depends(require_role("SUPER_ADMIN")),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza datos de un usuario, incluyendo contraseña (solo por Super Admin)."""
    res = await db.execute(
        select(Usuario)
        .where(Usuario.id == usuario_id)
    )
    db_user = res.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    # Validar que no se duplique el username
    if payload.username and payload.username != db_user.username:
        dup_res = await db.execute(select(Usuario).where(Usuario.username == payload.username))
        if dup_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
            
    # Validar rol si se va a actualizar
    if payload.role_id and payload.role_id != db_user.role_id:
        role_res = await db.execute(select(Role).where(Role.id == payload.role_id))
        if not role_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="El rol no existe")

    # Actualizar campos
    if payload.username is not None:
        db_user.username = payload.username
    if payload.nombre_completo is not None:
        db_user.nombre_completo = payload.nombre_completo
    if payload.activo is not None:
        db_user.activo = payload.activo
    if payload.role_id is not None:
        db_user.role_id = payload.role_id
    if payload.password:  # Si se especificó una nueva contraseña
        db_user.password_hash = hash_password(payload.password)
        
    await db.commit()
    
    # Recargar con relaciones
    res_reload = await db.execute(
        select(Usuario)
        .options(
            selectinload(Usuario.role)
            .selectinload(Role.accesos)
        )
        .where(Usuario.id == usuario_id)
    )
    return res_reload.scalar_one()


@router.delete("/usuarios/{usuario_id}")
async def eliminar_usuario(
    usuario_id: int,
    current_user: Usuario = Depends(require_role("SUPER_ADMIN")),
    db: AsyncSession = Depends(get_db)
):
    """Elimina un usuario de forma permanente."""
    # Evitar que el Super Admin se elimine a sí mismo
    if current_user.id == usuario_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
        
    res = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    db_user = res.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    await db.delete(db_user)
    await db.commit()
    return {"message": "Usuario eliminado correctamente"}


# ─── ROLES Y ACCESOS (Super Admin y Admin) ───

@router.get("/roles", response_model=List[RoleResponse])
async def obtener_roles(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la lista de todos los roles disponibles (acceso para Admin y Super Admin)."""
    # Ambos roles tienen permitido ver y crear roles/accesos
    if current_user.role.nombre not in ["SUPER_ADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="No tiene permisos para ver roles")
        
    res = await db.execute(
        select(Role)
        .options(selectinload(Role.accesos))
        .order_by(Role.id)
    )
    return res.scalars().all()


@router.post("/roles", response_model=RoleResponse)
async def crear_rol(
    payload: RoleCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuevo rol en el sistema (Admin y Super Admin)."""
    if current_user.role.nombre not in ["SUPER_ADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="No tiene permisos para crear roles")
        
    # Verificar duplicado
    existing_res = await db.execute(select(Role).where(Role.nombre == payload.nombre))
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un rol con ese nombre")
        
    db_role = Role(
        nombre=payload.nombre,
        descripcion=payload.descripcion
    )
    db.add(db_role)
    await db.commit()
    await db.refresh(db_role)
    
    # Cargar accesos
    res = await db.execute(
        select(Role)
        .options(selectinload(Role.accesos))
        .where(Role.id == db_role.id)
    )
    return res.scalar_one()


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def actualizar_rol(
    role_id: int,
    payload: RoleCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza los datos básicos de un rol."""
    if current_user.role.nombre not in ["SUPER_ADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="No tiene permisos para editar roles")
        
    res = await db.execute(select(Role).where(Role.id == role_id))
    db_role = res.scalar_one_or_none()
    if not db_role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
        
    if db_role.nombre in ["SUPER_ADMIN", "ADMIN"] and payload.nombre != db_role.nombre:
        raise HTTPException(status_code=400, detail="No se puede cambiar el nombre de los roles del sistema")
        
    db_role.nombre = payload.nombre
    db_role.descripcion = payload.descripcion
    await db.commit()
    
    res_reload = await db.execute(
        select(Role)
        .options(selectinload(Role.accesos))
        .where(Role.id == role_id)
    )
    return res_reload.scalar_one()


@router.delete("/roles/{role_id}")
async def eliminar_rol(
    role_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina un rol del sistema."""
    if current_user.role.nombre not in ["SUPER_ADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar roles")
        
    res = await db.execute(select(Role).where(Role.id == role_id))
    db_role = res.scalar_one_or_none()
    if not db_role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
        
    if db_role.nombre in ["SUPER_ADMIN", "ADMIN"]:
        raise HTTPException(status_code=400, detail="No se pueden eliminar los roles del sistema")
        
    await db.delete(db_role)
    await db.commit()
    return {"message": "Rol eliminado correctamente"}


# ─── ACCESOS / PERMISOS POR ROL (Super Admin y Admin) ───

@router.post("/roles/{role_id}/accesos", response_model=List[AccesoResponse])
async def guardar_accesos_rol(
    role_id: int,
    payload: List[AccesoCreate],
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reemplaza y guarda todos los accesos/permisos para un rol en específico."""
    if current_user.role.nombre not in ["SUPER_ADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="No tiene permisos para gestionar accesos")
        
    res = await db.execute(select(Role).where(Role.id == role_id))
    db_role = res.scalar_one_or_none()
    if not db_role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
        
    # Impedir modificar accesos de SUPER_ADMIN para evitar bloqueos accidentales
    if db_role.nombre == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Los accesos del Super Administrador son fijos y no se pueden modificar")
        
    # Eliminar accesos existentes
    await db.execute(delete(Acceso).where(Acceso.role_id == role_id))
    
    # Insertar los nuevos
    nuevos_accesos = []
    for item in payload:
        acc = Acceso(
            role_id=role_id,
            vista=item.vista,
            crear=item.crear,
            leer=item.leer,
            actualizar=item.actualizar,
            eliminar=item.eliminar
        )
        db.add(acc)
        nuevos_accesos.append(acc)
        
    await db.commit()
    
    # Recargar accesos creados
    res_reload = await db.execute(select(Acceso).where(Acceso.role_id == role_id))
    return res_reload.scalars().all()
