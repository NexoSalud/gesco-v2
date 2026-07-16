"""Router para Contratos — incluye generación de DOCX."""

import json
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.templating import Jinja2Templates
from sqlalchemy import text, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.contrato import Contrato
from app.models.contratista import Contratista
from app.models.perfil import Perfil, ActividadPerfil
from app.schemas.contrato import ContratoCreate, ContratoUpdate, ContratoOut
from app.schemas.contratista import ContratistaCreate
from app.services.docx_generator import generar_contrato_docx
from app.services.numero_letras import numero_a_letras

router = APIRouter(prefix="/api/v1/contratos", tags=["Contratos"])

import os
templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
templates = Jinja2Templates(directory=templates_dir)

# Perfiles predefinidos (tomados de gestionContractos)
PERFILES_PREDEFINIDOS = [
    "MEDICINA", "ENFERMERIA", "PSICOLOGIA", "SALUD ORAL",
    "AUXILIAR ENFERMERIA", "AUXILIAR VACUNACION", "GESTOR COMUNITARIO",
    "TRANSPORTE", "SINDICATO", "OTRO",
]


@router.get("", response_model=list[ContratoOut])
async def listar_contratos(
    resolucion_id: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    buscar: Optional[str] = Query(None),
    contratista_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Lista contratos con filtros opcionales."""
    stmt = select(Contrato).options(
        selectinload(Contrato.contratista_rel),
        selectinload(Contrato.pagos),
    )

    if resolucion_id:
        stmt = stmt.where(Contrato.resolucion_id == resolucion_id)
    if estado:
        stmt = stmt.where(Contrato.estado == estado)
    if contratista_id is not None:
        stmt = stmt.where(Contrato.contratista_id == contratista_id)
    if buscar:
        stmt = stmt.where(
            or_(
                Contrato.numero_contrato.ilike(f"%{buscar}%"),
                Contrato.objeto.ilike(f"%{buscar}%"),
                Contrato.supervisor.ilike(f"%{buscar}%"),
            )
        )

    stmt = stmt.order_by(Contrato.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ContratoOut, status_code=201)
async def crear_contrato(data: ContratoCreate, db: AsyncSession = Depends(get_db)):
    """Crea un contrato. Si se pasan datos del contratista, lo crea o actualiza."""

    # 1. Manejar contratista
    contratista_id = data.contratista_id
    if data.contratista_identificacion:
        result = await db.execute(
            select(Contratista).where(
                Contratista.identificacion == data.contratista_identificacion
            )
        )
        contratista = result.scalar_one_or_none()
        if contratista:
            contratista_id = contratista.id
            # Actualizar datos
            if data.contratista_nombre:
                contratista.nombre = data.contratista_nombre.upper()
            if data.contratista_telefono:
                contratista.telefono = data.contratista_telefono
            if data.contratista_direccion:
                contratista.direccion = data.contratista_direccion.upper()
            if data.contratista_correo:
                contratista.correo = data.contratista_correo.lower()
            if data.contratista_expedida_en:
                contratista.expedida_en = data.contratista_expedida_en.upper()
        else:
            # Crear nuevo
            contratista = Contratista(
                identificacion=data.contratista_identificacion,
                nombre=(data.contratista_nombre or "").upper(),
                expedida_en=(data.contratista_expedida_en or "").upper(),
                telefono=data.contratista_telefono or "",
                direccion=(data.contratista_direccion or "").upper(),
                correo=(data.contratista_correo or "").lower(),
            )
            db.add(contratista)
            await db.flush()
            contratista_id = contratista.id

    # 2. Generar valor en letras
    valor_letras = numero_a_letras(data.monto_total)

    # 3. Obtener objeto y UNSPSC del perfil
    objeto = data.objeto
    codigo_unspsc = data.codigo_unspsc
    descripcion_unspsc = data.descripcion_unspsc
    if data.perfil:
        result = await db.execute(
            select(Perfil).where(Perfil.nombre == data.perfil)
        )
        perfil = result.scalar_one_or_none()
        if perfil:
            if not objeto and perfil.objeto:
                objeto = perfil.objeto
            if not codigo_unspsc and perfil.codigo_unspsc:
                codigo_unspsc = perfil.codigo_unspsc
            if not descripcion_unspsc and perfil.descripcion_unspsc:
                descripcion_unspsc = perfil.descripcion_unspsc

    # 4. Crear contrato
    contrato = Contrato(
        resolucion_id=data.resolucion_id,
        contratista_id=contratista_id,
        numero_contrato=data.numero_contrato,
        perfil=data.perfil,
        estado=data.estado,
        objeto=objeto or data.objeto,
        obligaciones=data.obligaciones,
        lugar_ejecucion=data.lugar_ejecucion,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        fecha_contrato=data.fecha_contrato or data.fecha_inicio,
        monto_total=data.monto_total,
        monto_transporte=data.monto_transporte,
        tiene_transporte=data.tiene_transporte,
        valor_letras=valor_letras,
        no_cdp=data.no_cdp,
        fecha_cdp=data.fecha_cdp,
        valor_cdp=data.valor_cdp,
        rubro=data.rubro,
        rp=data.rp,
        cpd=data.cpd,
        costo_tipo=data.costo_tipo,
        sub_tipo=data.sub_tipo,
        clasificacion=data.clasificacion,
        supervisor=data.supervisor,
        cedula_supervisor=data.cedula_supervisor,
        cargo_supervisor=data.cargo_supervisor,
        unidad_atencion=data.unidad_atencion,
        codigo_unspsc=codigo_unspsc,
        descripcion_unspsc=descripcion_unspsc,
        cuotas=data.cuotas,
        cuotas_total=data.cuotas_total or 0,
        cuotas_pagadas=0,
    )
    db.add(contrato)
    await db.commit()

    # Recargar con relaciones para serialización correcta
    result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.contratista_rel),
            selectinload(Contrato.pagos),
        )
        .where(Contrato.id == contrato.id)
    )
    return result.scalar_one()


@router.get("/{numero_contrato}", response_model=ContratoOut)
async def obtener_contrato(numero_contrato: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.contratista_rel),
            selectinload(Contrato.pagos),
        )
        .where(Contrato.numero_contrato == numero_contrato)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    return contrato


@router.put("/{numero_contrato}", response_model=ContratoOut)
async def actualizar_contrato(
    numero_contrato: str, data: ContratoUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Contrato).where(Contrato.numero_contrato == numero_contrato)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(contrato, field, value)
    await db.commit()
    await db.refresh(contrato)
    return contrato


@router.post("/{numero_contrato}/anular")
async def anular_contrato(
    numero_contrato: str,
    motivo: str = Query(..., description="Motivo de anulación"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contrato).where(Contrato.numero_contrato == numero_contrato)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    contrato.estado = "ANULADO"
    contrato.motivo_anulacion = motivo
    contrato.fecha_anulacion = date.today()
    # Auto-finalizar si todas las cuotas están pagadas
    if contrato.cuotas_pagadas >= contrato.cuotas_total and contrato.cuotas_total > 0:
        contrato.estado = "FINALIZADO"
    await db.commit()
    return {"message": "Contrato anulado", "motivo": motivo}


@router.post("/{numero_contrato}/cuotas")
async def registrar_cuota(
    numero_contrato: str,
    accion: str = Query("sumar", description="sumar|restar|set"),
    valor: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Registra avance de cuotas pagadas."""
    result = await db.execute(
        select(Contrato).where(Contrato.numero_contrato == numero_contrato)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    if accion == "sumar" and contrato.cuotas_pagadas < contrato.cuotas_total:
        contrato.cuotas_pagadas += 1
    elif accion == "restar" and contrato.cuotas_pagadas > 0:
        contrato.cuotas_pagadas -= 1
    elif accion == "set" and valor is not None:
        contrato.cuotas_pagadas = max(0, min(valor, contrato.cuotas_total))
    await db.commit()
    return {
        "cuotas_pagadas": contrato.cuotas_pagadas,
        "cuotas_total": contrato.cuotas_total,
    }


@router.get("/{numero_contrato}/imprimir", response_class=HTMLResponse)
async def imprimir_contrato(
    numero_contrato: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Vista imprimible HTML del contrato."""
    result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.contratista_rel),
            selectinload(Contrato.pagos),
        )
        .where(Contrato.numero_contrato == numero_contrato)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")

    # Obtener obligaciones del perfil
    obligaciones = []
    if contrato.perfil:
        result = await db.execute(
            select(Perfil).where(Perfil.nombre == contrato.perfil)
        )
        perfil = result.scalar_one_or_none()
        if perfil and perfil.obligaciones_json:
            try:
                obligaciones = json.loads(perfil.obligaciones_json)
            except Exception:
                pass

    contratista = contrato.contratista_rel

    context = {
        "request": request,
        "numero_contrato": contrato.numero_contrato,
        "nombre_contratista": contratista.nombre if contratista else "N/A",
        "cedula": contratista.identificacion if contratista else "N/A",
        "lugar_expedicion": contratista.expedida_en if contratista else "N/A",
        "telefono": contratista.telefono if contratista else "N/A",
        "direccion": contratista.direccion if contratista else "N/A",
        "correo": contratista.correo if contratista else "N/A",
        "perfil": contrato.perfil or "N/A",
        "valor_contrato": contrato.monto_total,
        "valor_letras": contrato.valor_letras or "",
        "fecha_inicio": str(contrato.fecha_inicio) if contrato.fecha_inicio else "_________",
        "fecha_fin": str(contrato.fecha_fin) if contrato.fecha_fin else "_________",
        "fecha_contrato": str(contrato.fecha_contrato or contrato.fecha_inicio or "_________"),
        "supervisor": contrato.supervisor or "N/A",
        "cedula_supervisor": contrato.cedula_supervisor or "N/A",
        "cargo_supervisor": contrato.cargo_supervisor or "N/A",
        "lugar_ejecucion": contrato.lugar_ejecucion or "Puerto Tejada – Cauca",
        "cuotas": contrato.cuotas or "1",
        "objeto": contrato.objeto or "",
        "unidad_atencion": contrato.unidad_atencion or "N/A",
        "obligaciones_esp": obligaciones,
    }

    return templates.TemplateResponse("contrato_imprimir.html", context)


@router.get("/{numero_contrato}/docx")
async def descargar_docx(numero_contrato: str, db: AsyncSession = Depends(get_db)):
    """Descarga el contrato en formato .docx."""
    result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.contratista_rel),
            selectinload(Contrato.pagos),
        )
        .where(Contrato.numero_contrato == numero_contrato)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")

    # Obtener actividades del perfil (GENERALES y ESPECÍFICAS)
    actividades_generales = []
    actividades_especificas = []
    if contrato.perfil:
        result_p = await db.execute(select(Perfil).where(Perfil.nombre == contrato.perfil))
        perfil_obj = result_p.scalar_one_or_none()
        if perfil_obj:
            result_acts = await db.execute(
                select(ActividadPerfil)
                .where(ActividadPerfil.perfil_id == perfil_obj.id)
                .order_by(ActividadPerfil.orden)
            )
            for act in result_acts.scalars().all():
                if act.tipo == "ESPECIFICA":
                    actividades_especificas.append(act.descripcion)
                else:
                    actividades_generales.append(act.descripcion)

    # Combinar todas como obligaciones
    todas_obligaciones = ["OBLIGACIONES GENERALES:"]
    num = 1
    for g in actividades_generales:
        todas_obligaciones.append(f"{num}. {g}")
        num += 1
    if actividades_especificas:
        todas_obligaciones.append("")
        todas_obligaciones.append("OBLIGACIONES ESPECÍFICAS:")
        for e in actividades_especificas:
            todas_obligaciones.append(f"{num}. {e}")
            num += 1

    contratista = contrato.contratista_rel
    docx_bytes = generar_contrato_docx(
        data={
            "numero_contrato": contrato.numero_contrato,
            "nombre_contratista": contratista.nombre if contratista else "N/A",
            "cedula": contratista.identificacion if contratista else "N/A",
            "lugar_expedicion": contratista.expedida_en if contratista else "N/A",
            "telefono": contratista.telefono if contratista else "N/A",
            "direccion": contratista.direccion if contratista else "N/A",
            "correo": contratista.correo if contratista else "N/A",
            "perfil": contrato.perfil or "N/A",
            "valor_contrato": contrato.monto_total,
            "valor_letras": contrato.valor_letras or "",
            "fecha_inicio": str(contrato.fecha_inicio) if contrato.fecha_inicio else "_________",
            "fecha_fin": str(contrato.fecha_fin) if contrato.fecha_fin else "_________",
            "fecha_contrato": str(contrato.fecha_contrato or contrato.fecha_inicio or "_________"),
            "supervisor": contrato.supervisor or "N/A",
            "cedula_supervisor": contrato.cedula_supervisor or "N/A",
            "cargo_supervisor": contrato.cargo_supervisor or "N/A",
            "lugar_ejecucion": contrato.lugar_ejecucion or "Puerto Tejada – Cauca",
            "cuotas": contrato.cuotas or "1",
            "no_cdp": contrato.no_cdp or "N/A",
            "fecha_cdp": str(contrato.fecha_cdp) if contrato.fecha_cdp else "",
            "valor_letras": contrato.valor_letras or "",
            "objeto": contrato.objeto or "",
            "unidad_atencion": contrato.unidad_atencion or "N/A",
            "rubro": contrato.rubro or "",
        },
        obligaciones_esp=todas_obligaciones,
    )

    filename = f"Contrato_{numero_contrato}.docx".replace("/", "_")
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/perfiles/predefinidos")
async def listar_perfiles_predefinidos():
    """Lista los perfiles predefinidos del sistema."""
    return {"perfiles": PERFILES_PREDEFINIDOS}


@router.get("/id/{contrato_id}", response_model=ContratoOut)
async def obtener_contrato_por_id(contrato_id: int, db: AsyncSession = Depends(get_db)):
    """Obtiene contrato por ID (ruta alternativa sin slashes)."""
    result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.contratista_rel),
            selectinload(Contrato.pagos),
        )
        .where(Contrato.id == contrato_id)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    return contrato


@router.put("/id/{contrato_id}", response_model=ContratoOut)
async def actualizar_contrato_por_id(
    contrato_id: int, data: ContratoUpdate, db: AsyncSession = Depends(get_db)
):
    """Actualiza contrato por ID (ruta alternativa sin slashes)."""
    result = await db.execute(
        select(Contrato)
        .options(selectinload(Contrato.contratista_rel), selectinload(Contrato.pagos))
        .where(Contrato.id == contrato_id)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(contrato, field, value)
    await db.commit()
    await db.refresh(contrato)
    result = await db.execute(
        select(Contrato)
        .options(selectinload(Contrato.contratista_rel), selectinload(Contrato.pagos))
        .where(Contrato.id == contrato.id)
    )
    return result.scalar_one()


@router.post("/id/{contrato_id}/anular")
async def anular_contrato_por_id(
    contrato_id: int,
    motivo: str = Query(..., description="Motivo de anulación"),
    db: AsyncSession = Depends(get_db),
):
    """Anula contrato por ID (ruta alternativa sin slashes)."""
    result = await db.execute(
        select(Contrato).where(Contrato.id == contrato_id)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    contrato.estado = "ANULADO"
    contrato.motivo_anulacion = motivo
    contrato.fecha_anulacion = date.today()
    if contrato.cuotas_pagadas >= contrato.cuotas_total and contrato.cuotas_total > 0:
        contrato.estado = "FINALIZADO"
    await db.commit()
    return {"message": "Contrato anulado", "motivo": motivo}


@router.post("/id/{contrato_id}/cuotas")
async def registrar_cuota_por_id(
    contrato_id: int,
    accion: str = Query("sumar", description="sumar|restar|set"),
    valor: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Registra cuota por ID (ruta alternativa sin slashes)."""
    result = await db.execute(
        select(Contrato).where(Contrato.id == contrato_id)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    if accion == "sumar" and contrato.cuotas_pagadas < contrato.cuotas_total:
        contrato.cuotas_pagadas += 1
    elif accion == "restar" and contrato.cuotas_pagadas > 0:
        contrato.cuotas_pagadas -= 1
    elif accion == "set" and valor is not None:
        contrato.cuotas_pagadas = max(0, min(valor, contrato.cuotas_total))
    await db.commit()
    return {
        "cuotas_pagadas": contrato.cuotas_pagadas,
        "cuotas_total": contrato.cuotas_total,
    }


@router.get("/id/{contrato_id}/docx")
async def descargar_docx_por_id(contrato_id: int, db: AsyncSession = Depends(get_db)):
    """Descarga contrato en .docx por ID (ruta alternativa sin slashes)."""
    result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.contratista_rel),
            selectinload(Contrato.pagos),
        )
        .where(Contrato.id == contrato_id)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")

    actividades_generales = []
    actividades_especificas = []
    if contrato.perfil:
        result_p = await db.execute(select(Perfil).where(Perfil.nombre == contrato.perfil))
        perfil_obj = result_p.scalar_one_or_none()
        if perfil_obj:
            result_acts = await db.execute(
                select(ActividadPerfil)
                .where(ActividadPerfil.perfil_id == perfil_obj.id)
                .order_by(ActividadPerfil.orden)
            )
            for act in result_acts.scalars().all():
                if act.tipo == "ESPECIFICA":
                    actividades_especificas.append(act.descripcion)
                else:
                    actividades_generales.append(act.descripcion)
    todas_obligaciones = ["OBLIGACIONES GENERALES:"]
    num = 1
    for g in actividades_generales:
        todas_obligaciones.append(f"{num}. {g}")
        num += 1
    if actividades_especificas:
        todas_obligaciones.append("")
        todas_obligaciones.append("OBLIGACIONES ESPECÍFICAS:")
        for e in actividades_especificas:
            todas_obligaciones.append(f"{num}. {e}")
            num += 1

    contratista = contrato.contratista_rel
    docx_bytes = generar_contrato_docx(
        data={
            "numero_contrato": contrato.numero_contrato,
            "nombre_contratista": contratista.nombre if contratista else "N/A",
            "cedula": contratista.identificacion if contratista else "N/A",
            "lugar_expedicion": contratista.expedida_en if contratista else "N/A",
            "telefono": contratista.telefono if contratista else "N/A",
            "direccion": contratista.direccion if contratista else "N/A",
            "correo": contratista.correo if contratista else "N/A",
            "perfil": contrato.perfil or "N/A",
            "valor_contrato": contrato.monto_total,
            "valor_letras": contrato.valor_letras or "",
            "fecha_inicio": str(contrato.fecha_inicio) if contrato.fecha_inicio else "_________",
            "fecha_fin": str(contrato.fecha_fin) if contrato.fecha_fin else "_________",
            "fecha_contrato": str(contrato.fecha_contrato or contrato.fecha_inicio or "_________"),
            "supervisor": contrato.supervisor or "N/A",
            "cedula_supervisor": contrato.cedula_supervisor or "N/A",
            "cargo_supervisor": contrato.cargo_supervisor or "N/A",
            "lugar_ejecucion": contrato.lugar_ejecucion or "Puerto Tejada – Cauca",
            "cuotas": contrato.cuotas or "1",
            "no_cdp": contrato.no_cdp or "N/A",
            "fecha_cdp": str(contrato.fecha_cdp) if contrato.fecha_cdp else "",
            "valor_letras": contrato.valor_letras or "",
            "objeto": contrato.objeto or "",
            "unidad_atencion": contrato.unidad_atencion or "N/A",
            "rubro": contrato.rubro or "",
        },
        obligaciones_esp=todas_obligaciones,
    )

    filename = f"Contrato_{contrato_id}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/id/{contrato_id}/documentos/{tipo}")
async def descargar_documento_contrato(
    contrato_id: int, tipo: str,
    db: AsyncSession = Depends(get_db),
):
    """Descarga un documento de contratación (inexistencia, estudios previos, etc.)
    para un contrato específico.
    
    Tipos: inexistencia, estudios_previos, solicitud_cdp, invitacion, idoneidad
    """
    from app.services.docx_generator import generar_documento_contrato
    
    result = await db.execute(
        select(Contrato)
        .options(selectinload(Contrato.contratista_rel), selectinload(Contrato.pagos))
        .where(Contrato.id == contrato_id)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, "Contrato no encontrado")
    
    tipos_validos = {"inexistencia", "estudios_previos", "solicitud_cdp", "invitacion", "idoneidad",
                     "designacion_supervision", "acta_inicio", "acta_liquidacion"}
    if tipo not in tipos_validos:
        raise HTTPException(400, f"Tipo de documento inválido. Válidos: {', '.join(sorted(tipos_validos))}")
    
    contratista = contrato.contratista_rel
    
    data = {
        "numero_contrato": contrato.numero_contrato,
        "nombre_contratista": contratista.nombre if contratista else "N/A",
        "cedula": contratista.identificacion if contratista else "N/A",
        "supervisor": contrato.supervisor or "N/A",
        "cedula_supervisor": contrato.cedula_supervisor or "N/A",
        "objeto": contrato.objeto or "",
        "perfil": contrato.perfil or "N/A",
        "monto_total": contrato.monto_total,
        "fecha_inicio": str(contrato.fecha_inicio) if contrato.fecha_inicio else "",
        "fecha_fin": str(contrato.fecha_fin) if contrato.fecha_fin else "",
        "fecha_contrato": str(contrato.fecha_contrato or contrato.fecha_inicio or ""),
        "unidad_atencion": contrato.unidad_atencion or "N/A",
        "correo": contratista.correo if contratista else "",
        "lugar_expedicion": contratista.expedida_en if contratista else "",
        "direccion": contratista.direccion if contratista else "",
        "telefono": contratista.telefono if contratista else "",
        "no_cdp": contrato.no_cdp or "",
        "fecha_cdp": str(contrato.fecha_cdp) if contrato.fecha_cdp else "",
        "valor_cdp": contrato.valor_cdp or "",
        "lugar_ejecucion": contrato.lugar_ejecucion or "Puerto Tejada - Cauca",
        "codigo_unspsc": contrato.codigo_unspsc or "",
        "descripcion_unspsc": contrato.descripcion_unspsc or "",
        "valor_letras": contrato.valor_letras or "",
        "rubro": contrato.rubro or "",
    }

    # Cargar actividades del perfil para llenar <<OBLIGACIONES>> en invitación
    actividades_obligaciones = []
    if contrato.perfil:
        result_perf = await db.execute(
            select(Perfil).where(Perfil.nombre == contrato.perfil)
        )
        perfil_obj = result_perf.scalar_one_or_none()
        if perfil_obj:
            result_acts = await db.execute(
                select(ActividadPerfil)
                .where(ActividadPerfil.perfil_id == perfil_obj.id)
                .order_by(ActividadPerfil.orden)
            )
            for ap in result_acts.scalars().all():
                actividades_obligaciones.append(ap.descripcion)
    if actividades_obligaciones:
        formatted = []
        for i, act in enumerate(actividades_obligaciones, 1):
            formatted.append(f"{i}. {act}")
        data["obligaciones"] = "\n".join(formatted)
    else:
        data["obligaciones"] = "Ver cláusula SEGUNDA del contrato."
    
    try:
        docx_bytes = generar_documento_contrato(tipo, data)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(500, str(e))
    
    filename = f"{tipo}_{contrato.numero_contrato}.docx".replace("/", "_")
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/admin/regenerar-letras")
async def regenerar_valor_letras(db: AsyncSession = Depends(get_db)):
    """Regenera el campo valor_letras de todos los contratos usando la
    función actualizada numero_a_letras (formato 'DE PESOS M/CTE')."""
    result = await db.execute(select(Contrato))
    contratos = result.scalars().all()
    actualizados = 0
    errores = 0
    for c in contratos:
        try:
            nuevo = numero_a_letras(c.monto_total or 0)
            c.valor_letras = nuevo
            actualizados += 1
        except Exception:
            errores += 1
    await db.commit()
    return {
        "total": len(contratos),
        "actualizados": actualizados,
        "errores": errores,
        "mensaje": "Valor en letras regenerado para todos los contratos"
    }
