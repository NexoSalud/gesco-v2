"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Loader2, Search, Eye, CheckCircle2, XCircle, Clock,
  FileText, Image, MessageSquareText, Filter, Download,
  ChevronDown, ChevronRight, AlertCircle, RefreshCw,
} from "lucide-react"
import {
  listarEvidencias, evaluarEvidencia, listarContratistasEvaluacion,
  getResumenContratista,
  type Evidencia, type ResumenCumplimiento,
} from "@/lib/api"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

export default function EvaluacionDashboardPage() {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([])
  const [contratistas, setContratistas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState<string>("PENDIENTE")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEvidencia, setSelectedEvidencia] = useState<Evidencia | null>(null)
  const [observacion, setObservacion] = useState("")
  const [evaluating, setEvaluating] = useState(false)
  const [selectedContratista, setSelectedContratista] = useState<number | null>(null)
  const [resumen, setResumen] = useState<ResumenCumplimiento | null>(null)
  const [activeTab, setActiveTab] = useState<"evidencias" | "contratistas">("evidencias")

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [evs, conts] = await Promise.all([
        listarEvidencias({ estado: filterEstado }),
        listarContratistasEvaluacion(searchTerm || undefined),
      ])
      setEvidencias(evs)
      setContratistas(conts)
    } catch (err) {
      console.error("Error loading data:", err)
    }
    setLoading(false)
  }, [filterEstado, searchTerm])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadResumen = async (contratistaId: number) => {
    setSelectedContratista(contratistaId)
    try {
      const r = await getResumenContratista(contratistaId)
      setResumen(r)
      // Load evidencias for this contractor
      const evs = await listarEvidencias({ contratista_id: contratistaId })
      setEvidencias(evs)
      setActiveTab("evidencias")
    } catch (err) {
      console.error(err)
    }
  }

  const handleEvaluar = async (id: number, estado: string) => {
    setEvaluating(true)
    try {
      await evaluarEvidencia(id, { estado, observacion: observacion || undefined })
      setObservacion("")
      setSelectedEvidencia(null)
      await loadData()
      if (selectedContratista) {
        const r = await getResumenContratista(selectedContratista)
        setResumen(r)
      }
    } catch (err) {
      console.error(err)
    }
    setEvaluating(false)
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "IMAGEN": return <Image className="w-5 h-5 text-blue-500" />
      case "ARCHIVO": return <FileText className="w-5 h-5 text-orange-500" />
      case "TEXTO": return <MessageSquareText className="w-5 h-5 text-purple-500" />
      default: return <FileText className="w-5 h-5 text-gray-500" />
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "APROBADO":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3" />Aprobado</span>
      case "RECHAZADO":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" />Rechazado</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" />Pendiente</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Evaluación de Cumplimiento</h1>
          <p className="text-sm text-gray-500 mt-1">Revisa y evalúa las evidencias subidas por los contratistas</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("evidencias")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "evidencias" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Evidencias
        </button>
        <button
          onClick={() => setActiveTab("contratistas")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "contratistas" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Contratistas
        </button>
      </div>

      {activeTab === "contratistas" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar contratista..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          {/* Summary card */}
          {selectedContratista && resumen && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">{resumen.contratista_nombre}</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-700">{resumen.total_actividades}</p>
                  <p className="text-xs text-gray-500">Actividades</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">{resumen.aprobadas}</p>
                  <p className="text-xs text-emerald-600">Aprobadas</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{resumen.rechazadas}</p>
                  <p className="text-xs text-red-600">Rechazadas</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{resumen.pendientes}</p>
                  <p className="text-xs text-yellow-600">Pendientes</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{resumen.porcentaje_cumplimiento}%</p>
                  <p className="text-xs text-blue-600">Cumplimiento</p>
                </div>
              </div>
            </div>
          )}

          {/* Contractor list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              </div>
            ) : contratistas.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No se encontraron contratistas
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {contratistas.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => loadResumen(c.id)}
                    className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left ${
                      selectedContratista === c.id ? "bg-emerald-50" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-800">{c.nombre}</p>
                      <p className="text-sm text-gray-500">{c.identificacion}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      {c.total_evidencias !== undefined && (
                        <span className="bg-gray-100 px-2 py-1 rounded-lg">
                          {c.total_evidencias} evidencias
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "evidencias" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-400" />
            {["PENDIENTE", "APROBADO", "RECHAZADO", ""].map((estado) => (
              <button
                key={estado}
                onClick={() => setFilterEstado(estado)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterEstado === estado
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {estado || "TODOS"}
              </button>
            ))}
          </div>

          {/* Evidence list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              </div>
            ) : evidencias.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No hay evidencias {filterEstado ? `en estado "${filterEstado}"` : ""}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {evidencias.map((ev) => (
                  <div key={ev.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      {getTipoIcon(ev.tipo)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800 truncate">
                            {ev.actividad_descripcion || `Actividad #${ev.actividad_contrato_id}`}
                          </span>
                          {getEstadoBadge(ev.estado)}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>Contrato {ev.contrato_id}</span>
                          <span>•</span>
                          <span>{new Date(ev.created_at).toLocaleDateString("es-CO")}</span>
                        </div>
                        {ev.tipo === "TEXTO" && (
                          <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            {ev.contenido_texto}
                          </p>
                        )}
                        {ev.observacion_coordinadora && (
                          <div className="mt-2 text-xs text-gray-500 bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                            <span className="font-medium">Observación: </span>
                            {ev.observacion_coordinadora}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {ev.archivo_ruta && (
                          <a
                            href={`${API}${ev.archivo_ruta}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver archivo"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </a>
                        )}
                        {ev.estado === "PENDIENTE" && (
                          <button
                            onClick={() => setSelectedEvidencia(ev)}
                            className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            Evaluar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {selectedEvidencia && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Evaluar evidencia</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedEvidencia.actividad_descripcion || `Actividad #${selectedEvidencia.actividad_contrato_id}`}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Evidence preview */}
              {selectedEvidencia.tipo === "TEXTO" ? (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-700">
                  {selectedEvidencia.contenido_texto}
                </div>
              ) : selectedEvidencia.archivo_ruta ? (
                selectedEvidencia.tipo === "IMAGEN" ? (
                  <img
                    src={`${API}${selectedEvidencia.archivo_ruta}`}
                    alt="Evidencia"
                    className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
                  />
                ) : (
                  <a
                    href={`${API}${selectedEvidencia.archivo_ruta}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-emerald-600 hover:text-emerald-700"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">{selectedEvidencia.archivo_nombre || "Descargar archivo"}</span>
                  </a>
                )
              ) : null}

              {/* Observation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observación (opcional)
                </label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                  placeholder="Escribe una observación para el contratista..."
                  disabled={evaluating}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => { setSelectedEvidencia(null); setObservacion("") }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={evaluating}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleEvaluar(selectedEvidencia.id, "RECHAZADO")}
                  disabled={evaluating}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Rechazar
                </button>
                <button
                  onClick={() => handleEvaluar(selectedEvidencia.id, "APROBADO")}
                  disabled={evaluating}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Aprobar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
