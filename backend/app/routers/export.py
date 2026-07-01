"""Router para exportaciones (Excel, PDFs masivos, alertas)."""

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import zipfile
import io

from app.database import get_db
from app.models.contrato import Contrato
from app.models.pago import Pago
from app.services.excel_service import exportar_resolucion_excel
from app.services.pdf_generator import generar_supervision_pdf

router = APIRouter(prefix="/api/v1/export", tags=["Exportación"])


@router.get("/resolucion/{resolucion_id}/excel")
async def exportar_resolucion_excel_endpoint(
    resolucion_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Exporta los contratos de una resolución a Excel."""
    result = await db.execute(
        text("""
            SELECT c.*, co.nombre as beneficiario, co.identificacion as cedula_contratista
            FROM contratos c
            LEFT JOIN contratistas co ON co.id = c.contratista_id
            WHERE c.resolucion_id = :rid
            ORDER BY c.numero_contrato
        """),
        {"rid": resolucion_id},
    )
    rows = [dict(r._mapping) for r in result.fetchall()]

    excel_bytes = exportar_resolucion_excel(rows)

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=contratos_resolucion_{resolucion_id}.xlsx"},
    )


@router.get("/resolucion/{resolucion_id}/pdfs-masivos")
async def generar_pdfs_masivos(
    resolucion_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Genera un ZIP con los PDFs de supervisión de todos los pagos de una resolución."""
    result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.contratista_rel),
            selectinload(Contrato.pagos).selectinload(Pago.planillas),
        )
        .where(Contrato.resolucion_id == resolucion_id, Contrato.estado != "ANULADO")
    )
    contratos = result.scalars().all()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for contrato in contratos:
            contratista = contrato.contratista_rel
            for pago in (contrato.pagos or []):
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
                    "cuentas_cobro": pago.cuentas_cobro or "",
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
                try:
                    pdf_bytes = generar_supervision_pdf(data_contrato, data_pago, planillas_list)
                    filename = f"Supervision_{contrato.numero_contrato}_Pago{pago.numero_pago}.pdf"
                    zf.writestr(filename, pdf_bytes)
                except Exception:
                    continue

    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=supervisiones_resolucion_{resolucion_id}.zip"},
    )


@router.get("/alertas")
async def alertas_vencimiento(
    dias: int = Query(30, description="Días para considerar próximo vencimiento"),
    db: AsyncSession = Depends(get_db),
):
    """Alertas de contratos próximos a vencerse."""
    hoy = date.today()
    limite = hoy + timedelta(days=dias)
    result = await db.execute(
        text("""
            SELECT numero_contrato, perfil, fecha_fin, estado
            FROM contratos
            WHERE estado = 'ACTIVO'
              AND fecha_fin IS NOT NULL
              AND fecha_fin BETWEEN :hoy AND :limite
            ORDER BY fecha_fin
        """),
        {"hoy": hoy.isoformat(), "limite": limite.isoformat()},
    )
    return [dict(r._mapping) for r in result.fetchall()]


@router.get("/dashboard-global")
async def dashboard_global(db: AsyncSession = Depends(get_db)):
    """KPIs globales multi-resolución."""
    stats = await db.execute(text("""
        SELECT
            COUNT(DISTINCT r.id) AS total_resoluciones,
            COUNT(c.id) AS total_contratos,
            COALESCE(SUM(CASE WHEN c.estado <> 'ANULADO' THEN c.monto_total + c.monto_transporte ELSE 0 END), 0) AS total_comprometido,
            COALESCE(SUM(r.presupuesto), 0) AS presupuesto_global,
            COUNT(CASE WHEN c.estado = 'ANULADO' THEN 1 END) AS total_anulados,
            COUNT(CASE WHEN c.estado = 'FINALIZADO' THEN 1 END) AS total_finalizados,
            COUNT(CASE WHEN c.estado = 'EN_PROCESO' THEN 1 END) AS en_proceso,
            COUNT(CASE WHEN c.estado = 'ACTIVO' THEN 1 END) AS activos,
            COALESCE(AVG(CASE WHEN c.estado <> 'ANULADO' THEN c.monto_total END), 0) AS promedio_valor,
            COALESCE(SUM(c.cuotas_total), 0) AS cuotas_totales_global,
            COALESCE(SUM(c.cuotas_pagadas), 0) AS cuotas_pagadas_global
        FROM resoluciones r
        LEFT JOIN contratos c ON c.resolucion_id = r.id
    """))
    s = stats.fetchone()
    return {
        "total_resoluciones": s.total_resoluciones,
        "total_contratos": s.total_contratos,
        "total_comprometido": float(s.total_comprometido),
        "presupuesto_global": float(s.presupuesto_global),
        "saldo_global": float(s.presupuesto_global - s.total_comprometido),
        "total_anulados": s.total_anulados,
        "total_finalizados": s.total_finalizados,
        "en_proceso": s.en_proceso,
        "activos": s.activos,
        "promedio_valor": float(s.promedio_valor),
        "cuotas_totales_global": s.cuotas_totales_global,
        "cuotas_pagadas_global": s.cuotas_pagadas_global,
    }
