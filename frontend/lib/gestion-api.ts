/** Cliente API del módulo de Gestión Contractual (login propio, token separado). */

import { API } from "@/lib/api"

const BASE = `${API}/api/v1/gestion-contractual`
export const GC_TOKEN_KEY = "gc_token"

export class GcApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getGcToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(GC_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setGcToken(token: string | null) {
  try {
    if (token) localStorage.setItem(GC_TOKEN_KEY, token)
    else localStorage.removeItem(GC_TOKEN_KEY)
  } catch {}
}

function authHeaders(): Record<string, string> {
  const token = getGcToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseError(res: Response): Promise<GcApiError> {
  let message = `Error ${res.status}`
  try {
    const data = await res.json()
    if (typeof data?.detail === "string") message = data.detail
    else if (Array.isArray(data?.detail) && data.detail[0]?.msg) message = data.detail[0].msg
    else if (typeof data?.message === "string") message = data.message
  } catch {}
  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("gc:unauthorized"))
  }
  return new GcApiError(res.status, message)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...authHeaders(),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return null as T
  return res.json()
}

async function requestBlob(path: string): Promise<Blob> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() })
  if (!res.ok) throw await parseError(res)
  return res.blob()
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type RolGc = "ADMIN" | "GESTOR" | "CONSULTA"
export type EstadoGestion = "VIGENTE" | "SUSPENDIDO" | "TERMINADO" | "LIQUIDADO" | "ANULADO"

export interface GcUsuario {
  id: number
  username: string
  nombre_completo: string | null
  correo: string | null
  rol: RolGc
  activo: boolean
  debe_cambiar_password: boolean
  ultimo_acceso: string | null
  created_at: string
}

export interface ContratoOrigen {
  id: number
  numero_contrato: string
  contratista_nombre: string | null
  contratista_identificacion: string | null
  perfil: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  valor_total: number
  estado: string | null
  resolucion_id: number | null
  resolucion_codigo: string | null
  sincronizado: boolean
  gc_contrato_id: number | null
  desactualizado: boolean
}

export interface GcContrato {
  id: number
  contrato_origen_id: number | null
  numero_contrato: string
  contratista_nombre: string | null
  contratista_identificacion: string | null
  perfil: string | null
  objeto: string | null
  fecha_contrato: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  valor_total: number
  valor_final: number | null
  supervisor: string | null
  resolucion_codigo: string | null
  estado_origen: string | null
  estado_gestion: EstadoGestion
  observaciones: string | null
  sincronizado_at: string
  sincronizado_por: string | null
  total_documentos: number
  categorias_cubiertas: string[]
  desactualizado: boolean
  origen_eliminado: boolean
}

export interface GcDocumento {
  id: number
  contrato_id: number
  categoria: string
  nombre: string
  descripcion: string | null
  archivo_nombre: string
  mime_type: string
  tamano: number
  paginas: number | null
  tiene_miniatura: boolean
  subido_por: string | null
  created_at: string
}

export interface GcEvento {
  id: number
  accion: string
  detalle: string | null
  contrato_id: number | null
  usuario: string | null
  created_at: string
}

export interface GcResumen {
  total_contratos: number
  por_estado: Record<string, number>
  total_documentos: number
  almacenamiento_bytes: number
  sin_documentos: number
  desactualizados: number
  pendientes_sincronizar: number
  proximos_vencer: GcContrato[]
  actividad: GcEvento[]
}

export interface Categoria {
  value: string
  label: string
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const gcLogin = (username: string, password: string) =>
  request<{ access_token: string; user: GcUsuario }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
export const gcMe = () => request<GcUsuario>("/auth/me")
export const gcCambiarPassword = (actual: string, nueva: string) =>
  request<GcUsuario>("/auth/password", { method: "PUT", body: JSON.stringify({ actual, nueva }) })

// ─── Usuarios ────────────────────────────────────────────────────────────────

export const gcUsuarios = () => request<GcUsuario[]>("/usuarios")
export const gcCrearUsuario = (data: {
  username: string
  nombre_completo?: string
  correo?: string
  rol: RolGc
  password: string
}) => request<GcUsuario>("/usuarios", { method: "POST", body: JSON.stringify(data) })
export const gcActualizarUsuario = (id: number, data: Partial<GcUsuario> & { password?: string }) =>
  request<GcUsuario>(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(data) })

// ─── Sincronización ──────────────────────────────────────────────────────────

export type VistaOrigen = "todos" | "pendientes" | "sincronizados" | "desactualizados"

export const gcOrigen = (params: { buscar?: string; estado?: string; resolucion_id?: number; vista?: VistaOrigen }) => {
  const qs = new URLSearchParams()
  if (params.buscar) qs.set("buscar", params.buscar)
  if (params.estado) qs.set("estado", params.estado)
  if (params.resolucion_id) qs.set("resolucion_id", String(params.resolucion_id))
  if (params.vista) qs.set("vista", params.vista)
  return request<ContratoOrigen[]>(`/origen?${qs}`)
}
export const gcResoluciones = () => request<{ id: number; codigo: string }[]>("/origen/resoluciones")
export const gcSincronizar = (contrato_ids: number[]) =>
  request<{ creados: number; actualizados: number; sin_cambios: number; no_encontrados: number[] }>(
    "/sincronizar",
    { method: "POST", body: JSON.stringify({ contrato_ids }) }
  )

// ─── Contratos ───────────────────────────────────────────────────────────────

export const gcResumen = () => request<GcResumen>("/resumen")
export const gcContratos = (params: { buscar?: string; estado?: string } = {}) => {
  const qs = new URLSearchParams()
  if (params.buscar) qs.set("buscar", params.buscar)
  if (params.estado) qs.set("estado", params.estado)
  return request<GcContrato[]>(`/contratos?${qs}`)
}
export const gcContrato = (id: number) => request<GcContrato>(`/contratos/${id}`)
export const gcActualizarContrato = (id: number, data: { estado_gestion?: EstadoGestion; observaciones?: string | null }) =>
  request<GcContrato>(`/contratos/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const gcResincronizar = (id: number) =>
  request<GcContrato>(`/contratos/${id}/resincronizar`, { method: "POST" })
export const gcDesvincular = (id: number) => request<void>(`/contratos/${id}`, { method: "DELETE" })

// ─── Documentos ──────────────────────────────────────────────────────────────

export const gcCategorias = () => request<Categoria[]>("/categorias")
export const gcDocumentos = (contratoId: number) => request<GcDocumento[]>(`/contratos/${contratoId}/documentos`)
export const gcActualizarDocumento = (id: number, data: { nombre?: string; categoria?: string; descripcion?: string | null }) =>
  request<GcDocumento>(`/documentos/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const gcEliminarDocumento = (id: number) => request<void>(`/documentos/${id}`, { method: "DELETE" })
export const gcArchivoBlob = (id: number) => requestBlob(`/documentos/${id}/archivo`)
export const gcMiniaturaBlob = (id: number) => requestBlob(`/documentos/${id}/miniatura`)
export const gcExpedienteBlob = (contratoId: number) => requestBlob(`/contratos/${contratoId}/documentos/zip`)

/** Sube un documento con progreso (XHR, porque fetch no reporta el avance de subida). */
export function gcSubirDocumento(
  contratoId: number,
  file: File,
  fields: { categoria: string; nombre?: string; descripcion?: string },
  onProgress?: (pct: number) => void
): { promise: Promise<GcDocumento>; abort: () => void } {
  const xhr = new XMLHttpRequest()
  const promise = new Promise<GcDocumento>((resolve, reject) => {
    const form = new FormData()
    form.append("archivo", file)
    form.append("categoria", fields.categoria)
    if (fields.nombre) form.append("nombre", fields.nombre)
    if (fields.descripcion) form.append("descripcion", fields.descripcion)

    xhr.open("POST", `${BASE}/contratos/${contratoId}/documentos`)
    const token = getGcToken()
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let data: any = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else {
        if (xhr.status === 401) window.dispatchEvent(new Event("gc:unauthorized"))
        reject(new GcApiError(xhr.status, typeof data?.detail === "string" ? data.detail : `Error ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new GcApiError(0, "Error de red al subir el archivo"))
    xhr.onabort = () => reject(new GcApiError(0, "Carga cancelada"))
    xhr.send(form)
  })
  return { promise, abort: () => xhr.abort() }
}

export function guardarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
