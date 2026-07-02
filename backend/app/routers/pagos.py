"""Router para Pagos y planillas de seguridad social."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.contrato import Contrato
from app.models.pago import Pago
from app.models.planilla import Planilla
from app.schemas.pago import PagoCreate, PagoOut
from app.services.pdf_generator import generar_supervision_pdf

router = APIRouter(prefix="/api/v1/pagos", tags=["Pagos"])


@router.get("", response_model=list[PagoOut])
async def listar_pagos(
    contrato_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Pago).options(
        selectinload(Pago.planillas),
        selectinload(Pago.contrato),
    ).order_by(Pago.created_at.desc())

    if contrato_id:
        stmt = stmt.where(Pago.contrato_id == contrato_id)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=PagoOut, status_code=201)
async def crear_pago(data: PagoCreate, db: AsyncSession = Depends(get_db)):
    """Crea un pago con sus planillas. Actualiza cuotas_pagadas del contrato."""
    # Verificar que el contrato existe
    result = await db.execute(
        select(Contrato).where(Contrato.numero_contrato == data.contrato_id)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(404, f"Contrato {data.contrato_id} no encontrado")

    # Calcular número de pago
    result = await db.execute(
        select(Pago).where(Pago.contrato_id == data.contrato_id).order_by(Pago.numero_pago.desc()).limit(1)
    )
    ultimo = result.scalar_one_or_none()
    numero_pago = (ultimo.numero_pago + 1) if ultimo else 1

    # Crear pago
    pago = Pago(
        contrato_id=data.contrato_id,
        numero_pago=numero_pago,
        tipo_informe=data.tipo_informe or "SUPERVISION",
        periodo_desde=data.periodo_desde,
        periodo_hasta=data.periodo_hasta,
        fecha_firma=data.fecha_firma,
        valor_a_pagar=data.valor_a_pagar,
        otro_si=data.otro_si,
        folios=data.folios,
        actividades=data.actividades,
        observaciones=data.observaciones,
        act=data.act,
    )
    db.add(pago)
    await db.flush()

    # Crear planillas
    for pl_data in data.planillas:
        planilla = Planilla(
            pago_id=pago.id,
            **pl_data.model_dump(),
        )
        db.add(planilla)

    # Actualizar cuotas pagadas
    contrato.cuotas_pagadas = min(contrato.cuotas_pagadas + 1, contrato.cuotas_total)
    if contrato.cuotas_pagadas >= contrato.cuotas_total:
        contrato.estado = "FINALIZADO"

    await db.commit()
    await db.refresh(pago)
    # Recargar con relaciones para evitar MissingGreenlet
    result = await db.execute(
        select(Pago)
        .options(selectinload(Pago.planillas), selectinload(Pago.contrato))
        .where(Pago.id == pago.id)
    )
    return result.scalar_one()


@router.get("/{pago_id}", response_model=PagoOut)
async def obtener_pago(pago_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Pago)
        .options(selectinload(Pago.planillas), selectinload(Pago.contrato))
        .where(Pago.id == pago_id)
    )
    pago = result.scalar_one_or_none()
    if not pago:
        raise HTTPException(404, "Pago no encontrado")
    return pago


@router.get("/{pago_id}/pdf")
async def descargar_pdf_supervision(pago_id: int, db: AsyncSession = Depends(get_db)):
    """Descarga PDF de supervisión para un pago específico."""
    result = await db.execute(
        select(Pago)
        .options(
            selectinload(Pago.planillas),
            selectinload(Pago.contrato).selectinload(Contrato.contratista_rel),
        )
        .where(Pago.id == pago_id)
    )
    pago = result.scalar_one_or_none()
    if not pago:
        raise HTTPException(404, "Pago no encontrado")

    contrato = pago.contrato
    contratista = contrato.contratista_rel

    data_contrato = {
        "numero_contrato": contrato.numero_contrato,
        "perfil": contrato.perfil or "",
        "nombre_contratista": contratista.nombre if contratista else "",
        "identificacion": contratista.identificacion if contratista else "",
        "supervisor": contrato.supervisor or "",
        "cedula_supervisor": contrato.cedula_supervisor or "",
        "cargo_supervisor": contrato.cargo_supervisor or "",
        "unidad_atencion": contrato.unidad_atencion or "",
    }
    data_pago = {
        "numero_pago": pago.numero_pago,
        "periodo_desde": str(pago.periodo_desde) if pago.periodo_desde else "",
        "periodo_hasta": str(pago.periodo_hasta) if pago.periodo_hasta else "",
        "valor_a_pagar": pago.valor_a_pagar,
        "actividades": pago.actividades or "",
        "observaciones": pago.observaciones or "",
    }
    planillas_list = [
        {
            "planilla_no": pl.planilla_no or "",
            "periodo_cotizado": pl.periodo_cotizado or "",
            "ibc": pl.ibc or "0",
            "eps_nombre": pl.eps_nombre or "",
            "eps_valor": pl.eps_valor or 0,
            "arl_nombre": pl.arl_nombre or "",
            "arl_valor": pl.arl_valor or 0,
            "afp_nombre": pl.afp_nombre or "",
            "afp_valor": pl.afp_valor or 0,
            "ccf_nombre": pl.ccf_nombre or "",
            "ccf_valor": pl.ccf_valor or 0,
        }
        for pl in pago.planillas
    ]

    pdf_bytes = generar_supervision_pdf(data_contrato, data_pago, planillas_list)

    filename = f"Supervision_{contrato.numero_contrato}_Pago{pago.numero_pago}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{pago_id}", status_code=204)
async def eliminar_pago(pago_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pago).where(Pago.id == pago_id))
    pago = result.scalar_one_or_none()
    if not pago:
        raise HTTPException(404, "Pago no encontrado")
    await db.delete(pago)
    await db.commit()
