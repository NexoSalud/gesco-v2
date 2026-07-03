/** API client for Gesco V2 backend */

// En producción usa rutas relativas (Next.js rewrites proxy /api al backend)
const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

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
    const text = await res.text()
    throw new Error(`Error ${res.status}: ${text.slice(0, 200)}`)
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
  activa: boolean
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

export const activarResolucion = (id: number) =>
  request<Resolucion>(`/api/v1/resoluciones/${id}/activar`, { method: "POST" })

export const cerrarResolucion = (id: number) =>
  request<Resolucion>(`/api/v1/resoluciones/${id}/cerrar`, { method: "POST" })

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
  fecha_contrato: string | null
  no_cdp: string | null
  rubro: string | null
  rp: string | null
  lugar_ejecucion: string | null
  supervisor: string | null
  cedula_supervisor: string | null
  cargo_supervisor: string | null
  unidad_atencion: string | null
  cuotas: string | null
  cuotas_total: number
  cuotas_pagadas: number
  valor_letras: string | null
  contratista_rel: { nombre: string; identificacion: string; tipo_persona?: string; expedida_en?: string; telefono?: string; direccion?: string; correo?: string } | null
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

export const getContrato = (numero: string): Promise<Contrato> =>
  request<Contrato[]>(`/api/v1/contratos?buscar=${encodeURIComponent(numero)}`)
  .then((list) => {
    if (!Array.isArray(list)) throw new Error(`Respuesta inválida al buscar contrato ${numero}`)
    const match = list.find((c) => c.numero_contrato === numero)
    if (!match) throw new Error(`Contrato ${numero} no encontrado`)
    return match
  })

export const getContratoById = (id: number) => request<Contrato>(`/api/v1/contratos/id/${id}`)

export const createContrato = (data: any) =>
  request<Contrato>("/api/v1/contratos", { method: "POST", body: JSON.stringify(data) })

export const descargarDocx = (numero: string) => {
  window.open(`${API}/api/v1/contratos/${numero}/docx`, "_blank")
}

export const descargarDocxById = (id: number) => {
  window.open(`${API}/api/v1/contratos/id/${id}/docx`, "_blank")
}

export const abrirVistaImprimible = (numero: string) => {
  window.open(`${API}/api/v1/contratos/${numero}/imprimir`, "_blank")
}

export const anularContrato = (numero: string, motivo: string) =>
  request(`/api/v1/contratos/${numero}/anular?motivo=${encodeURIComponent(motivo)}`, { method: "POST" })

export const anularContratoById = (id: number, motivo: string) =>
  request(`/api/v1/contratos/id/${id}/anular?motivo=${encodeURIComponent(motivo)}`, { method: "POST" })

export const registrarCuota = (numero: string, accion: string, valor?: number) => {
  let q = `accion=${accion}`
  if (valor !== undefined) q += `&valor=${valor}`
  return request(`/api/v1/contratos/${numero}/cuotas?${q}`, { method: "POST" })
}

export const registrarCuotaById = (id: number, accion: string, valor?: number) => {
  let q = `accion=${accion}`
  if (valor !== undefined) q += `&valor=${valor}`
  return request(`/api/v1/contratos/id/${id}/cuotas?${q}`, { method: "POST" })
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
  valor_pagado: number | null
  otro_si: string | null
  folios: string | null
  actividades: string | null
  observaciones: string | null
  act: string | null
  planillas: any[]
  created_at: string
}

export const getPagos = (contrato_id?: string) => {
  const q = contrato_id ? `?contrato_id=${contrato_id}` : ""
  return request<Pago[]>(`/api/v1/pagos${q}`)
}

export const getPlantillas = () => request<any[]>("/api/v1/plantillas")

export const createPlantilla = (data: { titulo: string; contenido: string }) =>
  request<any>("/api/v1/plantillas", { method: "POST", body: JSON.stringify(data) })

export const updatePlantilla = (id: number, data: { titulo: string; contenido: string }) =>
  request<any>(`/api/v1/plantillas/${id}`, { method: "PUT", body: JSON.stringify(data) })

export const deletePlantilla = (id: number) =>
  request<void>(`/api/v1/plantillas/${id}`, { method: "DELETE" })

export const createPago = (data: any) =>
  request<Pago>("/api/v1/pagos", { method: "POST", body: JSON.stringify(data) })

export const updatePago = (id: number, data: any) =>
  request<Pago>(`/api/v1/pagos/${id}`, { method: "PUT", body: JSON.stringify(data) })

export const deletePago = (id: number) =>
  request<void>(`/api/v1/pagos/${id}`, { method: "DELETE" })

export const descargarPdfSupervision = (pagoId: number) => {
  window.open(`${API}/api/v1/pagos/${pagoId}/pdf`, "_blank")
}

// ─── Contratistas ────────────────────────────────────────────────────────────

export const buscarContratistas = (q: string) =>
  request<any[]>(`/api/v1/contratistas?buscar=${encodeURIComponent(q)}`)

// ─── Perfiles ────────────────────────────────────────────────────────────────

export const getPerfiles = () => request<any[]>("/api/v1/perfiles")
export const getPerfil = (id: number) => request<any>(`/api/v1/perfiles/${id}`)
export const createPerfil = (data: any) =>
  request<any>("/api/v1/perfiles", { method: "POST", body: JSON.stringify(data) })
export const updatePerfil = (id: number, data: any) =>
  request<any>(`/api/v1/perfiles/${id}`, { method: "PUT", body: JSON.stringify(data) })
export const deletePerfil = (id: number) =>
  request<void>(`/api/v1/perfiles/${id}`, { method: "DELETE" })
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


export interface ResolucionAnalytics {
  total_contratos: number
  contratos_activos: number
  contratos_por_vencer: number
  contratos_vencidos: number
  total_anulados: number
  profesionales_por_tipo: Array<{ tipo: string; total: number; valor: number }>
  proximos_vencer: Array<{ numero_contrato: string; beneficiario: string; fecha_fin: string; dias_restantes: number }>
  motivos_anulacion: Array<{ motivo: string; total: number }>
  contratos_por_unidad: Array<{ municipio: string; total: number; activos: number; valor: number }>
}

export const getResolucionAnalytics = (resolucionId: number) =>
  request<ResolucionAnalytics>(`/api/v1/export/resolucion/${resolucionId}/analytics`)


// ─── Import ──────────────────────────────────────────────────────────────────

export interface ImportResult {
  total: number
  created: number
  skipped: number
  errors: Array<{ fila: number; numero_contrato: string | null; error: string }>
}

export async function uploadImportExcel(resolucionId: number, file: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch(`${API}/api/v1/import/excel?resolucion_id=${resolucionId}`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Error ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

// ─── Actividades ────────────────────────────────────────────────────────────────
export interface ActividadPerfil {
  id: number
  descripcion: string
  tipo?: string
  orden: number
}

export const getActividades = (perfilId: number) =>
  request<ActividadPerfil[]>(`/api/v1/perfiles/${perfilId}/actividades`)

export const createActividad = (perfilId: number, descripcion: string, orden: number = 0, tipo: string = "GENERAL") =>
  request<ActividadPerfil>(`/api/v1/perfiles/${perfilId}/actividades`, {
    method: "POST", body: JSON.stringify({ descripcion, orden, tipo }),
  })

export const updateActividad = (id: number, data: { descripcion?: string; tipo?: string; orden?: number }) =>
  request<ActividadPerfil>(`/api/v1/perfiles/actividades/${id}`, {
    method: "PUT", body: JSON.stringify(data),
  })

export const deleteActividad = (actividadId: number) =>
  request<void>(`/api/v1/actividades/${actividadId}`, { method: "DELETE" })


// ─── Actividades de Contrato ────────────────────────────────────────────────────
export interface ActividadContrato {
  id: number
  contrato_id: string
  descripcion: string
  tipo: string  // GENERAL | ESPECIFICA
  orden: number
}

export const getActividadesContrato = (numero: string) =>
  request<ActividadContrato[]>(`/api/v1/contratos/${encodeURIComponent(numero)}/actividades`)

export const getActividadesContratoById = (id: number) =>
  request<ActividadContrato[]>(`/api/v1/contratos/id/${id}/actividades`)

export const createActividadContrato = (numero: string, data: { descripcion: string; tipo?: string; orden?: number }) =>
  request<ActividadContrato>(`/api/v1/contratos/${encodeURIComponent(numero)}/actividades`, {
    method: "POST", body: JSON.stringify(data),
  })

export const updateActividadContrato = (id: number, data: any) =>
  request<ActividadContrato>(`/api/v1/contratos/actividades/${id}`, {
    method: "PUT", body: JSON.stringify(data),
  })

export const deleteActividadContrato = (id: number) =>
  request<void>(`/api/v1/contratos/actividades/${id}`, { method: "DELETE" })

export const heredarActividadesPerfil = (numero: string) =>
  request<{ message: string }>(`/api/v1/contratos/${encodeURIComponent(numero)}/actividades/heredar`, { method: "POST" })


// ─── Actividades de Supervisión ─────────────────────────────────────────────────
export interface ActividadSupervision {
  id: number
  pago_id: number
  actividad_contrato_id: number | null
  descripcion: string
  cumple: boolean | null
  orden: number
}

export const getActividadesSupervision = (pagoId: number) =>
  request<ActividadSupervision[]>(`/api/v1/pagos/${pagoId}/actividades`)

export const evaluarActividadesSupervision = (pagoId: number, actividades: { id: number; cumple: boolean | null }[]) =>
  request<{ message: string }>(`/api/v1/pagos/${pagoId}/actividades/evaluar`, {
    method: "POST", body: JSON.stringify({ actividades }),
  })
