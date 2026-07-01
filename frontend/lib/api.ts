/** API client for Gesco V2 backend */

// En producción usa rutas relativas (Next.js rewrites proxy /api al backend)
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8099"

export const api = {
  base: API,
  headers: { "Content-Type": "application/json" },
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: api.headers,
    ...options,
  })
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try {
      const json = await res.json()
      detail = json.detail || JSON.stringify(json.errors || json)
    } catch {
      const text = await res.text()
      detail = text.slice(0, 300)
    }
    throw new Error(detail)
  }
  // Handle binary responses
  const ct = res.headers.get("content-type") || ""
  if (ct.includes("application/pdf") || ct.includes("application/zip") || ct.includes("application/vnd.openxmlformats")) {
    return res.blob() as any
  }
  if (res.status === 204) return null as any
  return res.json()
}

// ─── Resoluciones ────────────────────────────────────────────────────────────

export interface Resolucion {
  id: number
  codigo: string
  titulo: string | null
  vigencia: number | null
  presupuesto: number
  indirect_percentage: number
  notas: string | null
  created_at: string
  total_contratos?: number
  comprometido?: number
  saldo?: number
  activos?: number
  anulados?: number
}

export const getResoluciones = () => request<Resolucion[]>("/api/v1/resoluciones")
export const getResolucion = (id: number) => request<Resolucion>(`/api/v1/resoluciones/${id}`)
export const createResolucion = (data: any) =>
  request<Resolucion>("/api/v1/resoluciones", { method: "POST", body: JSON.stringify(data) })
export const updateResolucion = (id: number, data: any) =>
  request<Resolucion>(`/api/v1/resoluciones/${id}`, { method: "PUT", body: JSON.stringify(data) })
export const deleteResolucion = (id: number) =>
  request<void>(`/api/v1/resoluciones/${id}`, { method: "DELETE" })

// ─── Contratos ───────────────────────────────────────────────────────────────

export interface Contrato {
  id: number
  numero_contrato: string
  resolucion_id: number
  contratista_id: number | null
  perfil: string | null
  estado: string
  objeto: string | null
  monto_total: number
  monto_transporte: number
  fecha_inicio: string | null
  fecha_fin: string | null
  no_cdp: string | null
  supervisor: string | null
  unidad_atencion: string | null
  cuotas: string | null
  cuotas_total: number
  cuotas_pagadas: number
  contratista_rel: { nombre: string; identificacion: string } | null
  pagos: any[]
  created_at: string
}

export const getContratos = (params?: { resolucion_id?: number; estado?: string; buscar?: string }) => {
  const q = new URLSearchParams()
  if (params?.resolucion_id) q.set("resolucion_id", String(params.resolucion_id))
  if (params?.estado) q.set("estado", params.estado)
  if (params?.buscar) q.set("buscar", params.buscar)
  return request<Contrato[]>(`/api/v1/contratos?${q}`)
}

export const getContrato = (numero: string) => request<Contrato>(`/api/v1/contratos/${numero}`)

export const createContrato = (data: any) =>
  request<Contrato>("/api/v1/contratos", { method: "POST", body: JSON.stringify(data) })

export const descargarDocx = (numero: string) => {
  window.open(`${API}/api/v1/contratos/${numero}/docx`, "_blank")
}

export const anularContrato = (numero: string, motivo: string) =>
  request(`/api/v1/contratos/${numero}/anular?motivo=${encodeURIComponent(motivo)}`, { method: "POST" })

export const registrarCuota = (numero: string, accion: string, valor?: number) => {
  let q = `accion=${accion}`
  if (valor !== undefined) q += `&valor=${valor}`
  return request(`/api/v1/contratos/${numero}/cuotas?${q}`, { method: "POST" })
}

// ─── Pagos ───────────────────────────────────────────────────────────────────

export interface Pago {
  id: number
  contrato_id: string
  numero_pago: number
  tipo_informe: string | null
  periodo_desde: string | null
  periodo_hasta: string | null
  fecha_firma: string | null
  valor_a_pagar: number
  observaciones: string | null
  actividades: string | null
  planillas: any[]
  created_at: string
}

export const getPagos = (contrato_id?: string) => {
  const q = contrato_id ? `?contrato_id=${contrato_id}` : ""
  return request<Pago[]>(`/api/v1/pagos${q}`)
}

export const createPago = (data: any) =>
  request<Pago>("/api/v1/pagos", { method: "POST", body: JSON.stringify(data) })

export const descargarPdfSupervision = (pagoId: number) => {
  window.open(`${API}/api/v1/pagos/${pagoId}/pdf`, "_blank")
}

// ─── Contratistas ────────────────────────────────────────────────────────────

export const buscarContratistas = (q: string) =>
  request<any[]>(`/api/v1/contratistas?buscar=${encodeURIComponent(q)}`)

// ─── Perfiles ────────────────────────────────────────────────────────────────

export const getPerfiles = () => request<any[]>("/api/v1/perfiles")
export const getPerfilesPredefinidos = () => request<{ perfiles: string[] }>("/api/v1/contratos/perfiles/predefinidos")

// ─── Export ──────────────────────────────────────────────────────────────────

export const descargarExcelResolucion = (resolucionId: number) => {
  window.open(`${API}/api/v1/export/resolucion/${resolucionId}/excel`, "_blank")
}

export const descargarPdfsMasivos = (resolucionId: number) => {
  window.open(`${API}/api/v1/export/resolucion/${resolucionId}/pdfs-masivos`, "_blank")
}

export const getAlertas = (dias: number = 30) =>
  request<any[]>(`/api/v1/export/alertas?dias=${dias}`)

export const getDashboardGlobal = () => request<any>("/api/v1/export/dashboard-global")

// ─── Plantillas ──────────────────────────────────────────────────────────────

export const getPlantillas = () => request<any[]>("/api/v1/plantillas")
