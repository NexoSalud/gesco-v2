/** API client for Gesco V2 backend */

// En producción usa rutas relativas (Next.js rewrites proxy /api al backend)
export const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

export const api = {
  base: API,
  headers: { "Content-Type": "application/json" },
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const reqHeaders = { ...api.headers, ...(options?.headers || {}) } as any
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token")
    if (token) {
      reqHeaders["Authorization"] = `Bearer ${token}`
    }
  }
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: reqHeaders,
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
  fecha_cdp: string | null
  rubro: string | null
  rp: string | null
  lugar_ejecucion: string | null
  supervisor: string | null
  cedula_supervisor: string | null
  cargo_supervisor: string | null
  unidad_atencion: string | null
  costo_tipo: string | null
  sub_tipo: string | null
  clasificacion: string | null
  cuotas: string | null
  cuotas_total: number
  cuotas_pagadas: number
  valor_letras: string | null
  contratista_rel: { nombre: string; identificacion: string; tipo_persona?: string; expedida_en?: string; telefono?: string; direccion?: string; correo?: string } | null
  pagos: any[]
  created_at: string
  codigo_ciiu: string | null
  nivel_prof_supervisor: string | null
  interventor: string | null
  nivel_prof_interventor: string | null
  imputacion: string | null
  tiempo_adicion: string | null
  valor_final: number | null
  forma_pago: string | null
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

// ─── Plantillas de Objeto ────────────────────────────────────────────────────────

export interface PlantillaObjeto {
  id: number
  titulo: string
  contenido: string
  created_at: string
}

export const getPlantillasObjeto = () =>
  request<PlantillaObjeto[]>("/api/v1/plantillas-objeto")

export const createPlantillaObjeto = (data: { titulo: string; contenido: string }) =>
  request<PlantillaObjeto>("/api/v1/plantillas-objeto", {
    method: "POST", body: JSON.stringify(data),
  })

export const updatePlantillaObjeto = (id: number, data: { titulo: string; contenido: string }) =>
  request<PlantillaObjeto>(`/api/v1/plantillas-objeto/${id}`, {
    method: "PUT", body: JSON.stringify(data),
  })

export const deletePlantillaObjeto = (id: number) =>
  request<void>(`/api/v1/plantillas-objeto/${id}`, { method: "DELETE" })

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

// ─── Supervisores ────────────────────────────────────────────────────────────

export interface Supervisor {
  id: number
  nombre: string
  identificacion: string
  cargo: string | null
  nivel_profesional: string | null
  telefono: string | null
  correo: string | null
  created_at: string
}

export const getSupervisores = (buscar?: string) => {
  const q = buscar ? `?buscar=${encodeURIComponent(buscar)}` : ""
  return request<Supervisor[]>(`/api/v1/supervisores${q}`)
}

export const getSupervisor = (id: number) =>
  request<Supervisor>(`/api/v1/supervisores/${id}`)

export const createSupervisor = (data: any) =>
  request<Supervisor>("/api/v1/supervisores", { method: "POST", body: JSON.stringify(data) })

export const updateSupervisor = (id: number, data: any) =>
  request<Supervisor>(`/api/v1/supervisores/${id}`, { method: "PUT", body: JSON.stringify(data) })

export const deleteSupervisor = (id: number) =>
  request<void>(`/api/v1/supervisores/${id}`, { method: "DELETE" })

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


// ─── Inventario ──────────────────────────────────────────────────────────────
export interface Almacen {
  id: number
  nombre: string
  ubicacion?: string
  responsable?: string
  created_at: string
}

export interface Articulo {
  id: number
  categoria: string
  tipo_elemento: string
  elemento: string
  marca?: string
  modelo?: string
  requiere_serial: boolean
  stock_total: number
  stock_disponible: number
  almacen_id?: number
  resolucion_id?: number | null
}

export interface UnidadInventario {
  id: number
  articulo_id: number
  almacen_id?: number
  serial?: string
  imei2?: string
  estado: string
  contrato_actual_id?: number
  contratista_nombre?: string
  numero_contrato?: string
  fecha_ultima_entrega?: string
  fecha_ultima_devolucion?: string
  created_at: string
  articulo?: Articulo
  resolucion_id?: number | null
}

export interface Movimiento {
  id: number
  tipo: string
  contrato_id: number
  unidad_id?: number
  articulo_id?: number
  cantidad: number
  fecha: string
  estado_declarado?: string
  observaciones?: string
  recibido_por?: string
  acta_id?: number
  created_at: string
  articulo?: Articulo
  unidad?: UnidadInventario
  numero_contrato?: string
  nombre_contratista?: string
}

export interface Acta {
  id: number
  tipo: string
  categoria: string
  contrato_id: number
  fecha: string
  archivo_generado?: string
  firmado_por_contratista: boolean
  recibido_entregado_por?: string
  created_at: string
}

export const getAlmacenes = () => request<Almacen[]>("/api/v1/inventario/almacenes")
export const createAlmacen = (data: any) => request<Almacen>("/api/v1/inventario/almacenes", { method: "POST", body: JSON.stringify(data) })
export const updateAlmacen = (id: number, data: any) => request<Almacen>(`/api/v1/inventario/almacenes/${id}`, { method: "PUT", body: JSON.stringify(data) })
export const deleteAlmacen = (id: number) => request<{ message: string }>(`/api/v1/inventario/almacenes/${id}`, { method: "DELETE" })

export const getArticulos = (categoria?: string) => {
  const q = categoria ? `?categoria=${categoria}` : ""
  return request<Articulo[]>(`/api/v1/inventario/articulos${q}`)
}
export const createArticulo = (data: any) => request<Articulo>("/api/v1/inventario/articulo", { method: "POST", body: JSON.stringify(data) })

export const getUnidades = (params?: { articulo_id?: number; estado?: string; categoria?: string }) => {
  const q = new URLSearchParams()
  if (params?.articulo_id) q.set("articulo_id", String(params.articulo_id))
  if (params?.estado) q.set("estado", params.estado)
  if (params?.categoria) q.set("categoria", params.categoria)
  return request<UnidadInventario[]>(`/api/v1/inventario/unidades?${q}`)
}
export const createUnidad = (data: any) => request<UnidadInventario>("/api/v1/inventario/unidad", { method: "POST", body: JSON.stringify(data) })

export const uploadImportSerializado = async (file: File, almacenId?: number, resolucionId?: number, dryRun?: boolean): Promise<any> => {
  const formData = new FormData()
  formData.append("file", file)
  const params = new URLSearchParams()
  if (almacenId) params.set("almacen_id", String(almacenId))
  if (resolucionId) params.set("resolucion_id", String(resolucionId))
  if (dryRun !== undefined) params.set("dry_run", String(dryRun))
  const q = params.toString() ? `?${params.toString()}` : ""
  const res = await fetch(`${API}/api/v1/inventario/import/serializado${q}`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Error ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export const uploadImportCantidad = async (file: File, almacenId?: number, resolucionId?: number, dryRun?: boolean): Promise<any> => {
  const formData = new FormData()
  formData.append("file", file)
  const params = new URLSearchParams()
  if (almacenId) params.set("almacen_id", String(almacenId))
  if (resolucionId) params.set("resolucion_id", String(resolucionId))
  if (dryRun !== undefined) params.set("dry_run", String(dryRun))
  const q = params.toString() ? `?${params.toString()}` : ""
  const res = await fetch(`${API}/api/v1/inventario/import/cantidad${q}`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Error ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export const registrarEntrega = (data: any) => request<Acta[]>("/api/v1/inventario/entrega", { method: "POST", body: JSON.stringify(data) })
export const registrarDevolucion = (data: any) => request<Acta[]>("/api/v1/inventario/devolucion", { method: "POST", body: JSON.stringify(data) })

export const getInventarioContrato = (contratoId: number) => request<any>(`/api/v1/inventario/contrato/${contratoId}`)
export const getHistorialUnidad = (unidadId: number) => request<Movimiento[]>(`/api/v1/inventario/unidades/${unidadId}/historial`)
export const getDashboardInventario = () => request<any>("/api/v1/inventario/dashboard")

export const descargarActaDocx = (actaId: number) => {
  window.open(`${API}/api/v1/inventario/actas/${actaId}/download`, "_blank")
}

export const descargarExcelUnidades = (params?: { articulo_id?: number; almacen_id?: number; estado?: string; categoria?: string; elemento?: string; asignado_a_contrato?: string; search?: string }) => {
  const q = new URLSearchParams()
  if (params?.articulo_id) q.set("articulo_id", String(params.articulo_id))
  if (params?.almacen_id) q.set("almacen_id", String(params.almacen_id))
  if (params?.estado) q.set("estado", params.estado)
  if (params?.categoria) q.set("categoria", params.categoria)
  if (params?.elemento) q.set("elemento", params.elemento)
  if (params?.asignado_a_contrato) q.set("asignado_a_contrato", params.asignado_a_contrato)
  if (params?.search) q.set("search", params.search)
  window.open(`${API}/api/v1/inventario/unidades/export?${q}`, "_blank")
}

export const descargarExcelDisponibilidad = (params?: { categoria?: string; almacen_id?: number; elemento?: string; marca_modelo?: string; search?: string }) => {
  const q = new URLSearchParams()
  if (params?.categoria) q.set("categoria", params.categoria)
  if (params?.almacen_id) q.set("almacen_id", String(params.almacen_id))
  if (params?.elemento) q.set("elemento", params.elemento)
  if (params?.marca_modelo) q.set("marca_modelo", params.marca_modelo)
  if (params?.search) q.set("search", params.search)
  window.open(`${API}/api/v1/inventario/dashboard/export?${q}`, "_blank")
}

export const updateArticulo = (id: number, data: any) => request<any>(`/api/v1/inventario/articulo/${id}`, { method: "PUT", body: JSON.stringify(data) })
export const deleteArticulo = (id: number) => request<any>(`/api/v1/inventario/articulo/${id}`, { method: "DELETE" })
export const bulkDeleteArticulos = (ids: number[]) => request<any>("/api/v1/inventario/articulos/bulk-delete", { method: "POST", body: JSON.stringify({ ids }) })

export const updateUnidad = (id: number, data: any) => request<any>(`/api/v1/inventario/unidad/${id}`, { method: "PUT", body: JSON.stringify(data) })
export const deleteUnidad = (id: number) => request<any>(`/api/v1/inventario/unidad/${id}`, { method: "DELETE" })
export const bulkDeleteUnidades = (ids: number[]) => request<any>("/api/v1/inventario/unidades/bulk-delete", { method: "POST", body: JSON.stringify({ ids }) })

// ─── Seguridad y RBAC (Usuarios, Roles y Accesos) ───────────────────────────

export interface Acceso {
  id: number
  role_id: number
  vista: string
  crear: boolean
  leer: boolean
  actualizar: boolean
  eliminar: boolean
}

export interface Role {
  id: number
  nombre: string
  descripcion: string | null
  created_at: string
  accesos: Acceso[]
}

export interface Usuario {
  id: number
  username: string
  nombre_completo: string | null
  activo: boolean
  role_id: number
  created_at: string
  role: Role
}

export const login = (data: any) =>
  request<{ access_token: string; token_type: string; user: Usuario }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(data)
  })

export const getMe = () => request<Usuario>("/api/v1/auth/me")
export const updateMe = (data: { username?: string; nombre_completo?: string | null; password?: string }) =>
  request<{ access_token: string; token_type: string; user: Usuario }>("/api/v1/auth/me", {
    method: "PUT",
    body: JSON.stringify(data)
  })

// Usuarios CRUD (Solo Super Admin)
export const getUsuarios = () => request<Usuario[]>("/api/v1/seguridad/usuarios")
export const createUsuario = (data: any) =>
  request<Usuario>("/api/v1/seguridad/usuarios", { method: "POST", body: JSON.stringify(data) })
export const updateUsuario = (id: number, data: any) =>
  request<Usuario>(`/api/v1/seguridad/usuarios/${id}`, { method: "PUT", body: JSON.stringify(data) })
export const deleteUsuario = (id: number) =>
  request<any>(`/api/v1/seguridad/usuarios/${id}`, { method: "DELETE" })

// Roles CRUD (Super Admin y Admin)
export const getRoles = () => request<Role[]>("/api/v1/seguridad/roles")
export const createRole = (data: any) =>
  request<Role>("/api/v1/seguridad/roles", { method: "POST", body: JSON.stringify(data) })
export const updateRole = (id: number, data: any) =>
  request<Role>(`/api/v1/seguridad/roles/${id}`, { method: "PUT", body: JSON.stringify(data) })
export const deleteRole = (id: number) =>
  request<any>(`/api/v1/seguridad/roles/${id}`, { method: "DELETE" })

// Guardar accesos de un rol (Super Admin y Admin)
export const saveRoleAccesos = (roleId: number, data: any[]) =>
  request<Acceso[]>(`/api/v1/seguridad/roles/${roleId}/accesos`, {
    method: "POST",
    body: JSON.stringify(data)
  })


