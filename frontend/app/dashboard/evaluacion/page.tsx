"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  Loader2, Search, Eye, CheckCircle2, XCircle, Clock,
  FileText, Image, MessageSquareText, Filter,
  AlertCircle, RefreshCw, X, Download, ChevronRight,
  ChevronDown, ChevronLeft, User, Phone, Mail, ShieldCheck,
  ExternalLink, Upload, HelpCircle, Lock, Info,
  CalendarDays, Plus,
} from "lucide-react"
import {
  listarEvidencias, evaluarEvidencia, listarContratistasEvaluacion,
  getResumenContratista,
  listarDocumentosAdmin, evaluarDocumento,
  listarApoyosEvaluacion, buscarApoyoEvaluacion,
  getResumenApoyo, evaluarEvidenciaApoyo,
  getApoyos,
  listarEvidenciasPendientes,
  listarPeriodos, crearPeriodo,
  TIPOS_DOCUMENTO,
  getTiposDocumentoPorPerfil,
  type Evidencia, type ResumenCumplimiento, type DocumentoContratista,
  type EvidenciaPendiente, type PeriodoEvaluacion,
} from "@/lib/api"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

// ─── Helpers ──────────────────────────────────────────────────────────────

const ESTADO_BADGE = (estado: string) => {
  switch (estado) {
    case "APROBADO":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3" />Aprobado</span>
    case "RECHAZADO":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" />Rechazado</span>
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" />Pendiente</span>
  }
}

const TIPO_ICON = (tipo: string) => {
  switch (tipo) {
    case "IMAGEN": return <Image className="w-4 h-4 text-blue-500" />
    case "ARCHIVO": return <FileText className="w-4 h-4 text-orange-500" />
    case "TEXTO": return <MessageSquareText className="w-4 h-4 text-purple-500" />
    default: return <FileText className="w-4 h-4 text-gray-500" />
  }
}

const TIPO_DOC_LABEL: Record<string, string> = {
  CUENTA_COBRO: "Cuenta de Cobro",
  RETENCION: "Retención formato",
  LISTADO_ASISTENCIA: "Listado de asistencia",
  PLANILLA_SEGURIDAD: "Planilla de seguridad social",
  CERTIFICACION_BANCARIA: "Certificación bancaria",
  ARL: "ARL",
  CEDULA: "Cédula de ciudadanía",
}

const TIPO_DOC_ICON: Record<string, string> = {
  CUENTA_COBRO: "📄",
  RETENCION: "🧾",
  LISTADO_ASISTENCIA: "📋",
  PLANILLA_SEGURIDAD: "🛡️",
  CERTIFICACION_BANCARIA: "🏦",
  ARL: "⚕️",
  CEDULA: "🪪",
}

// ─── Inline Evaluation Form ───────────────────────────────────────────────

function InlineEvaluar({
  onEvaluar, onCancel, evaluating, observacion, setObservacion,
}: {
  onEvaluar: (estado: string) => void
  onCancel: () => void
  evaluating: boolean
  observacion: string
  setObservacion: (v: string) => void
}) {
  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
      <textarea
        value={observacion}
        onChange={(e) => setObservacion(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        placeholder="Observación (opcional)..."
        disabled={evaluating}
      />
      <div className="flex gap-1.5 justify-end flex-wrap">
        <button onClick={onCancel} className="px-2.5 sm:px-3 py-1.5 sm:py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg transition-colors" disabled={evaluating}>
          Cancelar
        </button>
        <button
          onClick={() => onEvaluar("RECHAZADO")}
          disabled={evaluating}
          className="px-2.5 sm:px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          {evaluating ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
          Rechazar
        </button>
        <button
          onClick={() => onEvaluar("APROBADO")}
          disabled={evaluating}
          className="px-2.5 sm:px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          {evaluating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Aprobar
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────

interface ContratistaListItem {
  id: number
  identificacion: string
  nombre: string
  telefono: string | null
  correo: string | null
  perfil?: string | null
  total_evidencias: number
  pendientes: number
  tipo?: string  // "CONTRATISTA" | "APOYO"
}

export default function EvaluacionDashboardPage() {
  const [search, setSearch] = useState("")
  const [contratistas, setContratistas] = useState<ContratistaListItem[]>([])
  const [loadingContratistas, setLoadingContratistas] = useState(true)

  // Contratista seleccionado
  const [selectedContratista, setSelectedContratista] = useState<{
    id: number; nombre: string; identificacion: string;
    telefono: string | null; correo: string | null; tipo?: string
  } | null>(null)

  // Data del contratista seleccionado
  const [dashboard, setDashboard] = useState<any>(null)
  const [documentos, setDocumentos] = useState<DocumentoContratista[]>([])
  const [resumen, setResumen] = useState<ResumenCumplimiento | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  // Evaluation states
  const [evaluatingId, setEvaluatingId] = useState<number | null>(null)
  const [evaluatingType, setEvaluatingType] = useState<"evidencia" | "documento">("evidencia")
  const [observacion, setObservacion] = useState("")
  const [evaluating, setEvaluating] = useState(false)

  // Expand states
  const [expandedActividades, setExpandedActividades] = useState<Set<number>>(new Set())
  const [expandedDocumento, setExpandedDocumento] = useState<number | null>(null)

  // ─── Tabs & Pendientes globales ──────────────────────────────────
  const [activeTab, setActiveTab] = useState<"contratistas" | "pendientes">("contratistas")
  const [evidenciasPendientes, setEvidenciasPendientes] = useState<EvidenciaPendiente[]>([])
  const [loadingPendientes, setLoadingPendientes] = useState(false)

  // ─── Periodos de evaluación ───────────────────────────────────────
  const [periodos, setPeriodos] = useState<PeriodoEvaluacion[]>([])
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<number | null>(null)
  const [loadingPeriodos, setLoadingPeriodos] = useState(true)
  const [showCrearPeriodo, setShowCrearPeriodo] = useState(false)
  const [fechaNuevoPeriodo, setFechaNuevoPeriodo] = useState("")
  const [creandoPeriodo, setCreandoPeriodo] = useState(false)
  const [errorPeriodo, setErrorPeriodo] = useState<string | null>(null)

  // Paginación (Por Contratista)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 12

  // ─── Cargar periodos ──────────────────────────────────────────────
  const loadPeriodos = useCallback(async () => {
    setLoadingPeriodos(true)
    try {
      const data = await listarPeriodos()
      setPeriodos(data)
      // Seleccionar el activo si no hay uno seleccionado o el actual ya no existe
      setPeriodoSeleccionado(prev => {
        if (prev && data.some(p => p.id === prev)) return prev
        const activo = data.find(p => p.activo)
        return activo ? activo.id : (data[0]?.id ?? null)
      })
    } catch (e) {
      console.error("Error cargando periodos:", e)
    }
    setLoadingPeriodos(false)
  }, [])

  useEffect(() => {
    loadPeriodos()
  }, [loadPeriodos])

  // ─── Crear nuevo periodo ──────────────────────────────────────────
  const handleCrearPeriodo = async () => {
    if (!fechaNuevoPeriodo) {
      setErrorPeriodo("Selecciona una fecha para el nuevo periodo.")
      return
    }
    setCreandoPeriodo(true)
    setErrorPeriodo(null)
    try {
      const nuevo = await crearPeriodo(fechaNuevoPeriodo)
      setShowCrearPeriodo(false)
      setFechaNuevoPeriodo("")
      await loadPeriodos()
      setPeriodoSeleccionado(nuevo.id)
      // Recargar listas con el nuevo periodo
      loadContratistas(search)
      if (activeTab === "pendientes") loadEvidenciasPendientes()
    } catch (e: any) {
      setErrorPeriodo(e?.message || "Error al crear el periodo.")
    }
    setCreandoPeriodo(false)
  }

  // ─── Load contratistas + apoyos ───────────────────────────────────
  const loadContratistas = useCallback(async (q?: string) => {
    setLoadingContratistas(true)
    try {
      const [contratistasResult, apoyosResult] = await Promise.allSettled([
        listarContratistasEvaluacion(q || undefined, periodoSeleccionado || undefined),
        listarApoyosEvaluacion(q || undefined, periodoSeleccionado || undefined),
      ])
      const items: ContratistaListItem[] = []
      if (contratistasResult.status === "fulfilled") {
        items.push(...(contratistasResult.value as any[]).map(c => ({ ...c, tipo: c.tipo || "CONTRATISTA" })))
      }
      if (apoyosResult.status === "fulfilled") {
        items.push(...(apoyosResult.value as any[]).map(a => ({ ...a, tipo: "APOYO" })))
      }
      items.sort((a, b) => a.nombre.localeCompare(b.nombre))
      setContratistas(items)
      setPage(1)
    } catch (err) {
      console.error("Error cargando contratistas/apoyos:", err)
    }
    setLoadingContratistas(false)
  }, [periodoSeleccionado])

  useEffect(() => {
    loadContratistas()
  }, [loadContratistas])

  // ─── Cargar evidencias pendientes (por periodo) ────────────────────
  const loadEvidenciasPendientes = useCallback(async (q?: string) => {
    setLoadingPendientes(true)
    try {
      const data = await listarEvidenciasPendientes(q, periodoSeleccionado || undefined)
      setEvidenciasPendientes(data)
    } catch (e) {
      console.error("Error cargando evidencias pendientes:", e)
    }
    setLoadingPendientes(false)
  }, [periodoSeleccionado])

  useEffect(() => {
    if (activeTab === "pendientes") {
      loadEvidenciasPendientes()
    }
  }, [activeTab, loadEvidenciasPendientes])

  // ─── Agrupar pendientes por contratista ───────────────────────────
  const pendientesPorContratista = useCallback((evs: EvidenciaPendiente[]) => {
    const mapa = new Map<number, { contratista: EvidenciaPendiente; count: number }>()
    for (const ev of evs) {
      const existente = mapa.get(ev.contratista_id)
      if (existente) {
        existente.count++
      } else {
        mapa.set(ev.contratista_id, { contratista: ev, count: 1 })
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.contratista.contratista_nombre.localeCompare(b.contratista.contratista_nombre))
  }, [])

  // ─── Select contratista ───────────────────────────────────────────
  const selectContratista = useCallback(async (c: ContratistaListItem) => {
    setSelectedContratista({
      id: c.id, nombre: c.nombre, identificacion: c.identificacion,
      telefono: c.telefono, correo: c.correo, tipo: c.tipo,
    })
    setLoadingData(true)
    setDashboard(null)
    setDocumentos([])
    setResumen(null)
    setExpandedActividades(new Set())
    setExpandedDocumento(null)
    setEvaluatingId(null)
    setObservacion("")

    try {
      if (c.tipo === "APOYO") {
        // Load Apoyo data
        const [dashRes, resumenRes] = await Promise.all([
          buscarApoyoEvaluacion(c.identificacion, periodoSeleccionado || undefined),
          getResumenApoyo(c.id, periodoSeleccionado || undefined),
        ])
        setDashboard(dashRes)
        setResumen(resumenRes)
        setDocumentos([])  // Apoyo no tiene documentos contractuales
      } else {
        // Load Contratista data — filtrado por periodo seleccionado
        const [dashRes, resumenRes] = await Promise.all([
          fetch(`${API}/api/v1/evaluacion/buscar?cedula=${encodeURIComponent(c.identificacion)}${periodoSeleccionado ? `&periodo_id=${periodoSeleccionado}` : ""}`),
          getResumenContratista(c.id, periodoSeleccionado || undefined),
        ])
        if (dashRes.ok) {
          setDashboard(await dashRes.json())
        }
        setResumen(resumenRes)

        // Load documentos del periodo
        const docsRes = await listarDocumentosAdmin({ contratista_id: c.id, periodo_id: periodoSeleccionado || undefined })
        setDocumentos(docsRes)
      }
    } catch (err) {
      console.error("Error cargando datos:", err)
    }
    setLoadingData(false)
  }, [periodoSeleccionado])

  // ─── Back to list ─────────────────────────────────────────────────
  const backToList = () => {
    setSelectedContratista(null)
    setDashboard(null)
    setDocumentos([])
    setResumen(null)
    loadContratistas(search)
  }

  // ─── Evaluar evidencia ────────────────────────────────────────────
  const handleEvaluarEvidencia = async (id: number, estado: string) => {
    setEvaluating(true)
    try {
      if (selectedContratista?.tipo === "APOYO") {
        await evaluarEvidenciaApoyo(id, { estado, observacion: observacion || undefined })
      } else {
        await evaluarEvidencia(id, { estado, observacion: observacion || undefined })
      }
      setObservacion("")
      setEvaluatingId(null)
      // Reload dashboard
      if (selectedContratista) {
        if (selectedContratista.tipo === "APOYO") {
          setDashboard(await buscarApoyoEvaluacion(selectedContratista.identificacion, periodoSeleccionado || undefined))
          setResumen(await getResumenApoyo(selectedContratista.id, periodoSeleccionado || undefined))
        } else {
          const dashRes = await fetch(`${API}/api/v1/evaluacion/buscar?cedula=${encodeURIComponent(selectedContratista.identificacion)}${periodoSeleccionado ? `&periodo_id=${periodoSeleccionado}` : ""}`)
          if (dashRes.ok) setDashboard(await dashRes.json())
          if (resumen) setResumen(await getResumenContratista(selectedContratista.id, periodoSeleccionado || undefined))
        }
      }
    } catch (err) {
      console.error("Error evaluando evidencia:", err)
    }
    setEvaluating(false)
  }

  // ─── Evaluar documento ────────────────────────────────────────────
  const handleEvaluarDocumento = async (id: number, estado: string) => {
    setEvaluating(true)
    try {
      await evaluarDocumento(id, { estado, observacion: observacion || undefined })
      setObservacion("")
      setEvaluatingId(null)
      setExpandedDocumento(null)
      if (selectedContratista) {
        const docsRes = await listarDocumentosAdmin({ contratista_id: selectedContratista.id, periodo_id: periodoSeleccionado || undefined })
        setDocumentos(docsRes)
      }
    } catch (err) {
      console.error("Error evaluando documento:", err)
    }
    setEvaluating(false)
  }

  // ─── Descargar informe ────────────────────────────────────────────
  const descargarInforme = (formato: "pdf" | "docx") => {
    if (!selectedContratista) return
    if (selectedContratista.tipo === "APOYO") {
      const token = localStorage.getItem("token")
      const url = `${API}/api/v1/apoyo/informe-mensual?mes=${new Date().getMonth() + 1}&anio=${new Date().getFullYear()}`
      const xhr = new XMLHttpRequest()
      xhr.open("GET", url)
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      xhr.responseType = "blob"
      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = new Blob([xhr.response])
          const link = document.createElement("a")
          link.href = URL.createObjectURL(blob)
          link.download = `INFORME_ACTIVIDADES_APOYO_ADVO_EBS.docx`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(link.href)
        } else {
          console.error("Error al descargar informe:", xhr.status, xhr.statusText)
          alert("Error al descargar el informe. Codigo: " + xhr.status)
        }
      }
      xhr.onerror = () => {
        console.error("Error de red al descargar informe")
        alert("Error de conexion al descargar el informe.")
      }
      xhr.send()
      return
    }
    const token = localStorage.getItem("token")
    const url = `${API}/api/v1/evaluacion/contratista/${selectedContratista.id}/informe?formato=${formato}${periodoSeleccionado ? `&periodo_id=${periodoSeleccionado}` : ""}`
    const xhr = new XMLHttpRequest()
    xhr.open("GET", url)
    xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    xhr.responseType = "blob"
    xhr.onload = () => {
      if (xhr.status === 200) {
        const blob = new Blob([xhr.response])
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = `informe_evaluacion_${selectedContratista.identificacion}.${formato}`
        link.click()
        URL.revokeObjectURL(link.href)
      }
    }
    xhr.send()
  }

  // ─── Estado de una actividad según sus evidencias ─────────────────
  // Prioridad: corrección pendiente > rechazada > aprobada > sin evidencia.
  // Una actividad rechazada NUNCA se muestra aprobada: queda RECHAZADO
  // hasta que el contratista suba corrección (→ PENDIENTE) y se apruebe (→ APROBADO).
  const getActividadEstado = (evs: Evidencia[]): string => {
    const pendientes = evs.filter(e => e.estado === "PENDIENTE")
    if (pendientes.length > 0) return "PENDIENTE"
    const rechazadas = evs.filter(e => e.estado === "RECHAZADO")
    if (rechazadas.length > 0) return "RECHAZADO"
    const aprobadas = evs.filter(e => e.estado === "APROBADO")
    if (aprobadas.length > 0) return "APROBADO"
    return "SIN_EVIDENCIA"
  }

  // ─── Resumen a nivel de ACTIVIDADES (no de evidencias) ────────────
  const calcularResumen = (dashboardData: any) => {
    const actividades = dashboardData?.contratos?.length
      ? dashboardData.contratos.flatMap((c: any) => c.actividades || [])
      : (dashboardData?.actividades || [])
    let total = 0, aprobadas = 0, rechazadas = 0, pendientes = 0
    for (const act of actividades) {
      total++
      const st = getActividadEstado(act.evidencias || [])
      if (st === "APROBADO") aprobadas++
      else if (st === "RECHAZADO") rechazadas++
      else pendientes++ // PENDIENTE o SIN_EVIDENCIA
    }
    const pct = total > 0 ? Math.round((aprobadas / total) * 1000) / 10 : 0
    return { total, aprobadas, rechazadas, pendientes, pct }
  }

  // ─── Render ───────────────────────────────────────────────────────

  // ── CONTRATISTA SELECTED VIEW ──
  if (selectedContratista) {
    const resumenAct = calcularResumen(dashboard)
    const isApoyo = selectedContratista.tipo === "APOYO"

    // ── Documentos esperados por contrato (incluye pendientes por subir) ──
    const expectedDocs: {
      tipo: { valor: string; etiqueta: string; icono: string }
      contratoNumero: string
      doc: DocumentoContratista | null
    }[] = []
    if (!isApoyo && dashboard?.contratos) {
      for (const c of dashboard.contratos) {
        for (const tipo of getTiposDocumentoPorPerfil(c.perfil)) {
          const doc = documentos.find(
            d => d.contrato_numero === c.numero_contrato && d.tipo_documento === tipo.valor
          ) || null
          expectedDocs.push({ tipo, contratoNumero: c.numero_contrato, doc })
        }
      }
      // Documentos subidos de contratos no activos (no perderlos)
      for (const d of documentos) {
        if (!expectedDocs.some(x => x.doc?.id === d.id)) {
          const tipo = TIPOS_DOCUMENTO.find(t => t.valor === d.tipo_documento)
            || { valor: d.tipo_documento, etiqueta: d.tipo_documento, icono: "📄" }
          expectedDocs.push({ tipo, contratoNumero: d.contrato_numero, doc: d })
        }
      }
    }
    const docsAprobados = expectedDocs.filter(x => x.doc?.estado === "APROBADO").length
    const docsPendientes = expectedDocs.filter(x => !x.doc || x.doc.estado === "PENDIENTE").length

    return (
      <div className="space-y-5 max-w-full overflow-x-hidden pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0 w-full sm:w-auto">
            <button
              onClick={backToList}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Todos los contratistas
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate max-w-full flex items-center gap-2">
              {selectedContratista.nombre}
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                selectedContratista.tipo === "APOYO"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {selectedContratista.tipo === "APOYO" ? "APOYO" : "CONTRATISTA"}
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500">
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded break-all">{selectedContratista.identificacion}</span>
              {selectedContratista.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3 flex-shrink-0" /><span className="truncate max-w-[120px]">{selectedContratista.telefono}</span></span>}
              {selectedContratista.correo && <span className="flex items-center gap-1"><Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate max-w-[150px]">{selectedContratista.correo}</span></span>}
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {selectedContratista.tipo === "APOYO" ? (
              <button onClick={() => descargarInforme("docx")} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                <FileText className="w-4 h-4 flex-shrink-0" /> Informe mensual
              </button>
            ) : (
              <>
                <button onClick={() => descargarInforme("pdf")} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                  <Download className="w-4 h-4 flex-shrink-0" /> PDF
                </button>
                <button onClick={() => descargarInforme("docx")} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <FileText className="w-4 h-4 flex-shrink-0" /> DOCX
                </button>
              </>
            )}
          </div>
        </div>

        {/* KPIs — scrollable horizontal en mobile, grid en desktop */}
        {dashboard && (
          <>
            {/* Mobile: horizontal scroll */}
            <div className="flex sm:hidden gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
              {[
                { label: "Actividades", value: resumenAct.total, color: "bg-gray-100 text-gray-700" },
                { label: "Aprobadas", value: resumenAct.aprobadas, color: "bg-emerald-50 text-emerald-700" },
                { label: "Rechazadas", value: resumenAct.rechazadas, color: "bg-red-50 text-red-700" },
                { label: "Pendientes", value: resumenAct.pendientes, color: resumenAct.pendientes > 0 ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-700" },
                { label: "Cumplimiento", value: `${resumenAct.pct}%`, color: "bg-blue-50 text-blue-700" },
                ...(isApoyo ? [] : [
                  { label: "Docs Pend.", value: docsPendientes, color: docsPendientes > 0 ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-700" },
                  { label: "Docs Aprob.", value: docsAprobados, color: "bg-emerald-50 text-emerald-700" },
                ]),
              ].map((k) => (
                <div key={k.label} className={`text-center p-2.5 rounded-xl min-w-[85px] snap-start flex-shrink-0 ${k.color}`}>
                  <p className="text-base font-bold">{k.value}</p>
                  <p className="text-[10px] mt-0.5 opacity-75 whitespace-nowrap">{k.label}</p>
                </div>
              ))}
            </div>
            {/* Desktop: grid */}
            <div className="hidden sm:grid sm:grid-cols-4 md:grid-cols-7 gap-2">
              {[
                { label: "Actividades", value: resumenAct.total, color: "bg-gray-100 text-gray-700" },
                { label: "Aprobadas", value: resumenAct.aprobadas, color: "bg-emerald-50 text-emerald-700" },
                { label: "Rechazadas", value: resumenAct.rechazadas, color: "bg-red-50 text-red-700" },
                { label: "Pendientes", value: resumenAct.pendientes, color: resumenAct.pendientes > 0 ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-700" },
                { label: "Cumplimiento", value: `${resumenAct.pct}%`, color: "bg-blue-50 text-blue-700" },
                ...(isApoyo ? [] : [
                  { label: "Docs Pend.", value: docsPendientes, color: docsPendientes > 0 ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-700" },
                  { label: "Docs Aprob.", value: docsAprobados, color: "bg-emerald-50 text-emerald-700" },
                ]),
              ].map((k) => (
                <div key={k.label} className={`text-center p-3 rounded-xl ${k.color}`}>
                  <p className="text-lg font-bold">{k.value}</p>
                  <p className="text-[11px] mt-0.5 opacity-75">{k.label}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            {/* ── ACTIVIDADES & EVIDENCIAS ── */}
            <section>
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Actividades y Evidencias
              </h2>
              {(() => {
                // Apoyo: actividades directas en dashboard.actividades
                // Contratista: actividades anidadas en dashboard.contratos[].actividades
                const actividades = isApoyo
                  ? (dashboard?.actividades || [])
                  : (dashboard?.contratos || []).length > 0
                    ? dashboard.contratos.flatMap((c: any) => (c.actividades || []).map((a: any) => ({ ...a, contrato: c })))
                    : []

                if (!dashboard || actividades.length === 0) {
                  return (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                      <p className="text-gray-500">No hay actividades registradas.</p>
                    </div>
                  )
                }

                return (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {actividades.map((act: any, ai: number) => {
                        // Add contrato_numero for display if available
                        const contratoNum = act.contrato?.numero_contrato
                        const contratoPerfil = act.contrato?.perfil
                          const isExpanded = expandedActividades.has(act.id)
                          const evs = act.evidencias || []
                          const actEstado = getActividadEstado(evs)

                          return (
                            <div key={act.id}>
                              {/* Actividad header */}
                              <button
                                onClick={() => {
                                  const next = new Set(expandedActividades)
                                  isExpanded ? next.delete(act.id) : next.add(act.id)
                                  setExpandedActividades(next)
                                }}
                                className="w-full flex items-center gap-1.5 px-3 sm:px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                              >
                                <span className="text-xs sm:text-sm font-bold text-gray-400 w-5 sm:w-6 flex-shrink-0">#{ai + 1}</span>
                                <span className="flex-1 text-xs sm:text-sm text-gray-700 min-w-0 break-words line-clamp-2">{act.descripcion}</span>
                                {act.tipo && (
                                  <span className={"text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 " + (act.tipo === "ESPECIFICA" ? "text-amber-700 bg-amber-50" : "text-blue-700 bg-blue-50")}>
                                    {act.tipo === "ESPECIFICA" ? "ESPECÍFICA" : "GENERAL"}
                                  </span>
                                )}
                                {ESTADO_BADGE(actEstado)}
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />}
                              </button>

                              {/* Evidencias (expandidas) */}
                              {isExpanded && (
                                <div className="px-2 sm:px-4 pb-3 space-y-1.5">
                                  {evs.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic pl-6 sm:pl-8">Sin evidencias.</p>
                                  ) : (
                                    evs.map((ev: Evidencia) => {
                                      const isEvaluating = evaluatingId === ev.id && evaluatingType === "evidencia"
                                      return (
                                        <div key={ev.id} className="pl-4 sm:pl-8">
                                          <div className="flex items-start gap-1.5 sm:gap-2">
                                            <div className="flex-shrink-0 mt-0.5 scale-75 sm:scale-100">{TIPO_ICON(ev.tipo)}</div>
                                            <div className="flex-1 min-w-0 overflow-hidden">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                {ESTADO_BADGE(ev.estado)}
                                                <span className="text-xs text-gray-500">
                                                  {new Date(ev.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                                                </span>
                                              </div>
                                              {ev.tipo === "TEXTO" && ev.contenido_texto && (
                                                <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{ev.contenido_texto}</p>
                                              )}
                                              {(ev.tipo === "ARCHIVO" || ev.tipo === "IMAGEN") && ev.archivo_ruta && (
                                                <div className="flex items-center gap-2 mt-1">
                                                  <a
                                                    href={`${API}${ev.archivo_ruta}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                                  >
                                                    <Eye className="w-3 h-3" />
                                                    {ev.archivo_nombre || "Ver archivo"}
                                                  </a>
                                                </div>
                                              )}
                                              {ev.observacion_coordinadora && (
                                                <p className="text-xs text-yellow-700 mt-1 italic">Obs: {ev.observacion_coordinadora}</p>
                                              )}
                                            </div>
                                            {ev.estado === "PENDIENTE" ? (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setEvaluatingId(ev.id)
                                                  setEvaluatingType("evidencia")
                                                  setObservacion("")
                                                }}
                                                className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                                              >
                                                Evaluar
                                              </button>
                                            ) : (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setEvaluatingId(ev.id)
                                                  setEvaluatingType("evidencia")
                                                  setObservacion(ev.observacion_coordinadora || "")
                                                }}
                                                className="px-3 py-1 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
                                              >
                                                Re-evaluar
                                              </button>
                                            )}
                                          </div>
                                          {isEvaluating && (
                                            <InlineEvaluar
                                              onEvaluar={(estado) => handleEvaluarEvidencia(ev.id, estado)}
                                              onCancel={() => { setEvaluatingId(null); setObservacion("") }}
                                              evaluating={evaluating}
                                              observacion={observacion}
                                              setObservacion={setObservacion}
                                            />
                                          )}
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                      )
                    })}
                      </div>
                    </div>
                  );
                })()}
            </section>

            {/* ── DOCUMENTOS CONTRACTUALES ── */}
            {!isApoyo && (
            <section>
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Documentos Contractuales
                {expectedDocs.length > 0 && (
                  <span className="text-xs font-normal text-gray-400">({expectedDocs.length})</span>
                )}
              </h2>
              {expectedDocs.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No hay documentos contractuales para este contratista.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {expectedDocs.map((item) => {
                      const doc = item.doc
                      const isExpanded = doc ? expandedDocumento === doc.id : false
                      return (
                        <div key={doc ? doc.id : `${item.contratoNumero}-${item.tipo.valor}`}>
                          <div className="flex items-start gap-2 p-2 sm:p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex-shrink-0 text-base sm:text-lg mt-0.5">{TIPO_DOC_ICON[item.tipo.valor] || "📄"}</div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-xs sm:text-sm text-gray-800 break-words">{item.tipo.etiqueta}</span>
                                {doc ? ESTADO_BADGE(doc.estado) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" />Pendiente por subir</span>
                                )}
                              </div>
                              {doc ? (
                                <>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-gray-500">
                                    <span className="truncate max-w-[100px] sm:max-w-[200px] block">{doc.archivo_nombre}</span>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="whitespace-nowrap">{new Date(doc.created_at).toLocaleDateString("es-CO")}</span>
                                    {doc.contrato_numero && <><span className="hidden sm:inline">•</span><span className="truncate max-w-[100px]">Contrato {doc.contrato_numero}</span></>}
                                  </div>
                                  {doc.observacion && (
                                    <p className="text-[11px] text-yellow-700 mt-1 italic break-words">Obs: {doc.observacion}</p>
                                  )}
                                </>
                              ) : (
                                <p className="text-[11px] text-gray-400 mt-0.5">Contrato {item.contratoNumero} — el contratista aún no ha subido este documento.</p>
                              )}
                            </div>
                            {doc && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <a
                                  href={`${API}${doc.archivo_ruta}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Descargar"
                                >
                                  <Download className="w-4 h-4 text-gray-500" />
                                </a>
                                {doc.estado === "PENDIENTE" ? (
                                  <button
                                    onClick={() => {
                                      setExpandedDocumento(isExpanded ? null : doc.id)
                                      setEvaluatingId(doc.id)
                                      setEvaluatingType("documento")
                                      setObservacion("")
                                    }}
                                    className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                                  >
                                    Evaluar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setExpandedDocumento(isExpanded ? null : doc.id)
                                      setEvaluatingId(doc.id)
                                      setEvaluatingType("documento")
                                      setObservacion(doc.observacion || "")
                                    }}
                                    className="px-3 py-1 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
                                  >
                                    Re-evaluar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {doc && isExpanded && evaluatingId === doc.id && evaluatingType === "documento" && (
                            <div className="px-4 sm:px-12 pb-3">
                              <InlineEvaluar
                                onEvaluar={(estado) => handleEvaluarDocumento(doc.id, estado)}
                                onCancel={() => { setExpandedDocumento(null); setEvaluatingId(null); setObservacion("") }}
                                evaluating={evaluating}
                                observacion={observacion}
                                setObservacion={setObservacion}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>
            )}
          </>
        )}
      </div>
    )
  }

  // ── CONTRATISTA LIST VIEW ──
  const pendingsGlobal = contratistas.reduce((sum, c) => sum + (c.pendientes || 0), 0)
  const totalPaginas = Math.max(1, Math.ceil(contratistas.length / PAGE_SIZE))
  const paginaActual = Math.min(page, totalPaginas)
  const contratistasPagina = contratistas.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE)
  const gruposPendientes = pendientesPorContratista(evidenciasPendientes)

  return (
    <div className="space-y-5 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-800">Evaluación de Cumplimiento</h1>
          <p className="text-sm text-gray-500 mt-1">Selecciona un periodo y un contratista para revisar y evaluar</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* Selector de periodo */}
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={periodoSeleccionado ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null
                setPeriodoSeleccionado(v)
                setPage(1)
              }}
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white min-w-[150px]"
              disabled={loadingPeriodos}
            >
              {loadingPeriodos ? (
                <option value="">Cargando periodos...</option>
              ) : periodos.length === 0 ? (
                <option value="">Sin periodos</option>
              ) : (
                periodos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}{p.activo ? " (Activo)" : ""}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            onClick={() => { setShowCrearPeriodo(true); setErrorPeriodo(null); setFechaNuevoPeriodo("") }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear periodo
          </button>
          <button onClick={() => { loadContratistas(search); if (activeTab === "pendientes") loadEvidenciasPendientes() }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 flex-shrink-0">
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        <button
          onClick={() => setActiveTab("contratistas")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "contratistas"
              ? "bg-white border border-gray-200 border-b-white text-emerald-700 -mb-[1px]"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Por Contratista
        </button>
        <button
          onClick={() => setActiveTab("pendientes")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "pendientes"
              ? "bg-white border border-gray-200 border-b-white text-emerald-700 -mb-[1px]"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Pendientes de Revisión
          {pendingsGlobal > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-yellow-500 text-white text-xs font-bold">
              {pendingsGlobal}
            </span>
          )}
        </button>
      </div>

      {activeTab === "contratistas" ? (
        <>
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o identificación..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              onKeyDown={(e) => e.key === "Enter" && loadContratistas(search)}
            />
          </div>

          {/* List — tabla con paginado (búsqueda server-side) */}
          {loadingContratistas ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : contratistas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No se encontraron contratistas con contratos activos en este periodo.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3 font-medium">Contratista</th>
                        <th className="px-4 py-3 font-medium">Identificación</th>
                        <th className="px-4 py-3 font-medium">Perfil</th>
                        <th className="px-4 py-3 font-medium text-center">Pendientes</th>
                        <th className="px-4 py-3 font-medium text-center">Evidencias</th>
                        <th className="px-4 py-3 font-medium text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {contratistasPagina.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => selectContratista(c)}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${c.tipo === "APOYO" ? "bg-purple-100" : "bg-emerald-100"}`}>
                                <User className={`w-4 h-4 ${c.tipo === "APOYO" ? "text-purple-600" : "text-emerald-600"}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-800 truncate flex items-center gap-1.5">
                                  {c.nombre}
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${c.tipo === "APOYO" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>{c.tipo === "APOYO" ? "APOYO" : "CONT"}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-mono">{c.identificacion}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{(c as any).perfil || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.pendientes > 0 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                              <Clock className="w-3 h-3" />{c.pendientes}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              <FileText className="w-3 h-3" />{c.total_evidencias}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <ChevronRight className="w-4 h-4 text-gray-300 inline" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginado */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-gray-500">
                    Mostrando {(paginaActual - 1) * PAGE_SIZE + 1}–{Math.min(paginaActual * PAGE_SIZE, contratistas.length)} de {contratistas.length}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={paginaActual <= 1}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`w-8 h-8 text-xs font-medium rounded-lg border transition-colors ${
                          n === paginaActual
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "text-gray-600 hover:bg-gray-100 border-gray-200"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual >= totalPaginas}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {/* Buscador pendientes */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrar por nombre o cédula..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              onChange={(e) => {
                const v = e.target.value
                setTimeout(() => loadEvidenciasPendientes(v || undefined), 300)
              }}
            />
          </div>

          {/* Lista de pendientes — agrupada por contratista (clic → detalle con periodo) */}
          {loadingPendientes ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : evidenciasPendientes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg">¡No hay evidencias pendientes en este periodo!</p>
              <p className="text-gray-400 text-sm mt-1">Todas las evidencias del periodo han sido revisadas.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {gruposPendientes.map((g) => {
                const ev = g.contratista
                return (
                  <button
                    key={ev.contratista_id}
                    onClick={() => selectContratista({
                      id: ev.contratista_id,
                      identificacion: ev.contratista_identificacion,
                      nombre: ev.contratista_nombre,
                      telefono: null,
                      correo: null,
                      tipo: "CONTRATISTA",
                      pendientes: g.count,
                      total_evidencias: g.count,
                    })}
                    className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-amber-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{ev.contratista_nombre}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{ev.contratista_identificacion}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <Clock className="w-3 h-3" />{g.count} pendientes
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: Crear nuevo periodo */}
      {showCrearPeriodo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCrearPeriodo(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Crear nuevo periodo de evaluación</h3>
              <p className="text-sm text-gray-500 mt-1">
                Se creará el mes de evaluación y se replicarán las actividades del perfil para todos los contratistas activos.
              </p>
            </div>
            <div className="p-5 space-y-4">
              {errorPeriodo && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {errorPeriodo}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha del periodo (mes)
                </label>
                <input
                  type="date"
                  value={fechaNuevoPeriodo}
                  onChange={(e) => setFechaNuevoPeriodo(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  disabled={creandoPeriodo}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Ej: 2026-08-01 para el periodo AGOSTO 2026.
                </p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowCrearPeriodo(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={creandoPeriodo}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearPeriodo}
                  disabled={creandoPeriodo}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {creandoPeriodo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Crear periodo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente: Evaluación rápida para la vista de pendientes ────────

function EvaluarRapido({ evidenciaId, onEvaluado }: { evidenciaId: number; onEvaluado: () => void }) {
  const [obs, setObs] = useState("")
  const [loading, setLoading] = useState(false)

  const evaluar = async (estado: string) => {
    setLoading(true)
    try {
      await evaluarEvidencia(evidenciaId, { estado, observacion: obs || undefined })
      setObs("")
      onEvaluado()
    } catch (e) {
      console.error("Error evaluando:", e)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-1.5 flex-shrink-0">
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        rows={2}
        className="text-xs border border-gray-200 rounded-lg p-1.5 w-44 focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
        placeholder="Obs. (opcional)"
        disabled={loading}
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => evaluar("APROBADO")}
          disabled={loading}
          className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Aprobar
        </button>
        <button
          onClick={() => evaluar("RECHAZADO")}
          disabled={loading}
          className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
          Rechazar
        </button>
      </div>
    </div>
  )
}
