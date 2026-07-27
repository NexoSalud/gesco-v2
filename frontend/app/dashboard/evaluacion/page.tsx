"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  Loader2, Search, Eye, CheckCircle2, XCircle, Clock,
  FileText, Image, MessageSquareText, Filter,
  AlertCircle, RefreshCw, X, Download, ChevronRight,
  ChevronDown, ChevronLeft, User, Phone, Mail, ShieldCheck,
  ExternalLink, Upload, HelpCircle, Lock, Info,
} from "lucide-react"
import {
  listarEvidencias, evaluarEvidencia, listarContratistasEvaluacion,
  getResumenContratista,
  listarDocumentosAdmin, evaluarDocumento,
  listarApoyosEvaluacion, buscarApoyoEvaluacion,
  getResumenApoyo, evaluarEvidenciaApoyo,
  getApoyos,
  TIPOS_DOCUMENTO,
  type Evidencia, type ResumenCumplimiento, type DocumentoContratista,
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
}

const TIPO_DOC_ICON: Record<string, string> = {
  CUENTA_COBRO: "📄",
  RETENCION: "🧾",
  LISTADO_ASISTENCIA: "📋",
  PLANILLA_SEGURIDAD: "🛡️",
  CERTIFICACION_BANCARIA: "🏦",
  ARL: "⚕️",
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

  // ─── Load contratistas + apoyos ───────────────────────────────────
  const loadContratistas = useCallback(async (q?: string) => {
    setLoadingContratistas(true)
    try {
      const [contratistasResult, apoyosResult] = await Promise.allSettled([
        listarContratistasEvaluacion(q || undefined),
        listarApoyosEvaluacion(q || undefined),
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
    } catch (err) {
      console.error("Error cargando contratistas/apoyos:", err)
    }
    setLoadingContratistas(false)
  }, [])

  useEffect(() => {
    loadContratistas()
  }, [loadContratistas])

  // ─── Select contratista ───────────────────────────────────────────
  const selectContratista = useCallback(async (c: ContratistaListItem) => {
    setSelectedContratista({
      id: c.id, nombre: c.nombre, identificacion: c.identificacion,
      telefono: c.telefono, correo: c.correo,
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
          buscarApoyoEvaluacion(c.identificacion),
          getResumenApoyo(c.id),
        ])
        setDashboard(dashRes)
        setResumen(resumenRes)
        setDocumentos([])  // Apoyo no tiene documentos contractuales
      } else {
        // Load Contratista data
        const [dashRes, resumenRes] = await Promise.all([
          fetch(`${API}/api/v1/evaluacion/buscar?cedula=${encodeURIComponent(c.identificacion)}`),
          getResumenContratista(c.id),
        ])
        if (dashRes.ok) {
          setDashboard(await dashRes.json())
        }
        setResumen(resumenRes)

        // Load documentos
        const docsRes = await listarDocumentosAdmin({ contratista_id: c.id })
        setDocumentos(docsRes)
      }
    } catch (err) {
      console.error("Error cargando datos:", err)
    }
    setLoadingData(false)
  }, [])

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
          setDashboard(await buscarApoyoEvaluacion(selectedContratista.identificacion))
          setResumen(await getResumenApoyo(selectedContratista.id))
        } else {
          const dashRes = await fetch(`${API}/api/v1/evaluacion/buscar?cedula=${encodeURIComponent(selectedContratista.identificacion)}`)
          if (dashRes.ok) setDashboard(await dashRes.json())
          if (resumen) setResumen(await getResumenContratista(selectedContratista.id))
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
        const docsRes = await listarDocumentosAdmin({ contratista_id: selectedContratista.id })
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
      // Abrir informe mensual de apoyo
      const url = `${API}/api/v1/apoyo/informe-mensual?mes=${new Date().getMonth() + 1}&anio=${new Date().getFullYear()}`
      const token = localStorage.getItem("token")
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
          link.click()
          URL.revokeObjectURL(link.href)
        }
      }
      xhr.send()
      return
    }
    const token = localStorage.getItem("token")
    const url = `${API}/api/v1/evaluacion/contratista/${selectedContratista.id}/informe?formato=${formato}`
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

  // ─── Count pendings per contratista ───────────────────────────────
  const countPendings = (dashboardData: any, docs: DocumentoContratista[]) => {
    let evPendientes = 0
    let docPendientes = 0
    for (const c of (dashboardData?.contratos || [])) {
      for (const act of (c.actividades || [])) {
        for (const ev of (act.evidencias || [])) {
          if (ev.estado === "PENDIENTE") evPendientes++
        }
      }
    }
    for (const d of docs) {
      if (d.estado === "PENDIENTE") docPendientes++
    }
    return { evPendientes, docPendientes }
  }

  // ─── Render ───────────────────────────────────────────────────────

  // ── CONTRATISTA SELECTED VIEW ──
  if (selectedContratista) {
    const pendings = countPendings(dashboard, documentos)
    const docsAprobados = documentos.filter(d => d.estado === "APROBADO").length
    const docsPendientes = documentos.filter(d => d.estado === "PENDIENTE").length
    const isApoyo = selectedContratista.tipo === "APOYO"

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
            {selectedContratista.tipo !== "APOYO" && (
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
        {resumen && (
          <>
            {/* Mobile: horizontal scroll */}
            <div className="flex sm:hidden gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
              {[
                { label: "Actividades", value: resumen.total_actividades, color: "bg-gray-100 text-gray-700" },
                { label: "Aprobadas", value: resumen.aprobadas, color: "bg-emerald-50 text-emerald-700" },
                { label: "Rechazadas", value: resumen.rechazadas, color: "bg-red-50 text-red-700" },
                { label: "Pendientes Ev.", value: pendings.evPendientes, color: "bg-yellow-50 text-yellow-700" },
                { label: "Cumplimiento", value: `${resumen.porcentaje_cumplimiento}%`, color: "bg-blue-50 text-blue-700" },
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
                { label: "Actividades", value: resumen.total_actividades, color: "bg-gray-100 text-gray-700" },
                { label: "Aprobadas", value: resumen.aprobadas, color: "bg-emerald-50 text-emerald-700" },
                { label: "Rechazadas", value: resumen.rechazadas, color: "bg-red-50 text-red-700" },
                { label: "Pendientes", value: pendings.evPendientes, color: "bg-yellow-50 text-yellow-700" },
                { label: "Cumplimiento", value: `${resumen.porcentaje_cumplimiento}%`, color: "bg-blue-50 text-blue-700" },
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
                          const aprobadas = evs.filter((e: Evidencia) => e.estado === "APROBADO")
                          const pendientes = evs.filter((e: Evidencia) => e.estado === "PENDIENTE")
                          const rechazadas = evs.filter((e: Evidencia) => e.estado === "RECHAZADO")
                          const actEstado = aprobadas.length > 0 ? "APROBADO" : pendientes.length > 0 ? "PENDIENTE" : rechazadas.length > 0 ? "RECHAZADO" : "SIN_EVIDENCIA"

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
                                                <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap line-clamp-2">{ev.contenido_texto}</p>
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
                                            {ev.estado === "PENDIENTE" && (
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
                {documentos.length > 0 && (
                  <span className="text-xs font-normal text-gray-400">({documentos.length})</span>
                )}
              </h2>
              {documentos.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No hay documentos contractuales para este contratista.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {documentos.map((doc) => {
                      const isExpanded = expandedDocumento === doc.id
                      const tipoInfo = TIPOS_DOCUMENTO.find((t) => t.valor === doc.tipo_documento)
                      return (
                        <div key={doc.id}>
                          <div className="flex items-start gap-2 p-2 sm:p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex-shrink-0 text-base sm:text-lg mt-0.5">{TIPO_DOC_ICON[doc.tipo_documento] || "📄"}</div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-xs sm:text-sm text-gray-800 break-words">{tipoInfo?.etiqueta || doc.tipo_documento}</span>
                                {ESTADO_BADGE(doc.estado)}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-gray-500">
                                <span className="truncate max-w-[100px] sm:max-w-[200px] block">{doc.archivo_nombre}</span>
                                <span className="hidden sm:inline">•</span>
                                <span className="whitespace-nowrap">{new Date(doc.created_at).toLocaleDateString("es-CO")}</span>
                                {doc.contrato_numero && <><span className="hidden sm:inline">•</span><span className="truncate max-w-[100px]">Contrato {doc.contrato_numero}</span></>}
                              </div>
                              {doc.observacion && (
                                <p className="text-[11px] text-yellow-700 mt-1 italic break-words">Obs: {doc.observacion}</p>
                              )}
                            </div>
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
                              {doc.estado === "PENDIENTE" && (
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
                              )}
                            </div>
                          </div>
                          {isExpanded && evaluatingId === doc.id && evaluatingType === "documento" && (
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
  return (
    <div className="space-y-5 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-800">Evaluación de Cumplimiento</h1>
          <p className="text-sm text-gray-500 mt-1">Selecciona un contratista para revisar y evaluar</p>
        </div>
        <button onClick={() => loadContratistas(search)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 flex-shrink-0">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

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

      {/* List */}
      {loadingContratistas ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : contratistas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No se encontraron contratistas con contratos activos.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {contratistas.map((c) => (
            <button
              key={c.id}
              onClick={() => selectContratista(c)}
              className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-emerald-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${c.tipo === "APOYO" ? "bg-purple-100" : "bg-emerald-100"}`}>
                  <User className={`w-4 h-4 ${c.tipo === "APOYO" ? "text-purple-600" : "text-emerald-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate flex items-center gap-1.5">
                    {c.nombre}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${c.tipo === "APOYO" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>{c.tipo === "APOYO" ? "APOYO" : "CONT"}</span>
                  </p>
                  <p className="text-xs text-gray-500 font-mono">{c.identificacion}</p>
                  {(c as any).perfil && <p className="text-xs text-gray-400 truncate mt-0.5">{(c as any).perfil}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.pendientes > 0 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                      <Clock className="w-3 h-3" />{c.pendientes} pend.
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      <FileText className="w-3 h-3" />{c.total_evidencias} total
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
