"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Loader2, Search, Eye, CheckCircle2, XCircle, Clock,
  FileText, Image, MessageSquareText, Filter,
  AlertCircle, RefreshCw, X, Maximize2, Download,
  ChevronRight,
} from "lucide-react"
import {
  listarEvidencias, evaluarEvidencia, listarContratistasEvaluacion,
  getResumenContratista,
  type Evidencia, type ResumenCumplimiento,
} from "@/lib/api"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

// ─── Popup para ver contenido completo (soporta HTML) ─────────────────────

function ContentPopup({ open, onClose, title, content, type }: {
  open: boolean
  onClose: () => void
  title: string
  content: string | null
  type: "texto" | "html" | "imagen" | "archivo"
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-800 truncate pr-4">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          {type === "texto" && content && (
            <div className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </div>
          )}
          {type === "html" && content && (
            <div
              className="text-sm text-gray-700 leading-relaxed [&_*]:max-w-full [&_*]:overflow-x-hidden [&_img]:max-w-full [&_img]:h-auto [&_table]:w-full [&_pre]:whitespace-pre-wrap"
              style={{ overflowWrap: "break-word", wordBreak: "break-word", maxWidth: "100%" }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
          {type === "imagen" && content && (
            <div className="flex justify-center">
              <img
                src={content}
                alt="Evidencia"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
          {type === "archivo" && content && (
            <div className="text-center p-8">
              <a
                href={content}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <FileText className="w-5 h-5" />
                Descargar archivo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────

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

  // Popup state
  const [popup, setPopup] = useState<{
    open: boolean
    title: string
    content: string | null
    type: "texto" | "html" | "imagen" | "archivo"
  }>({ open: false, title: "", content: null, type: "texto" })

  const openContent = (title: string, content: string | null, type: "texto" | "html" | "imagen" | "archivo") => {
    setPopup({ open: true, title, content, type })
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const evs = await listarEvidencias({ estado: filterEstado })
      setEvidencias(evs)
    } catch (err) {
      console.error("Error cargando evidencias:", err)
    }
    try {
      const conts = await listarContratistasEvaluacion(searchTerm || undefined)
      setContratistas(conts)
    } catch (err) {
      console.error("Error cargando contratistas:", err)
    }
    setLoading(false)
  }, [filterEstado, searchTerm])

  const descargarInforme = (formato: "pdf" | "docx") => {
    if (!selectedContratista) return
    const token = localStorage.getItem("token")
    const url = `${API}/api/v1/evaluacion/contratista/${selectedContratista}/informe?formato=${formato}`
    // Abrir en nueva pestaña con auth header vía query param alternativo
    const xhr = new XMLHttpRequest()
    xhr.open("GET", url)
    xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    xhr.responseType = "blob"
    xhr.onload = () => {
      if (xhr.status === 200) {
        const blob = new Blob([xhr.response])
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = `informe_evaluacion_${selectedContratista}.${formato}`
        link.click()
        URL.revokeObjectURL(link.href)
      }
    }
    xhr.send()
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadResumen = async (contratistaId: number) => {
    setSelectedContratista(contratistaId)
    try {
      const r = await getResumenContratista(contratistaId)
      setResumen(r)
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
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex-shrink-0"><CheckCircle2 className="w-3 h-3" />Aprobado</span>
      case "RECHAZADO":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex-shrink-0"><XCircle className="w-3 h-3" />Rechazado</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 flex-shrink-0"><Clock className="w-3 h-3" />Pendiente</span>
    }
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-800 truncate">Evaluación de Cumplimiento</h1>
          <p className="text-sm text-gray-500 mt-1">Revisa y evalúa las evidencias subidas por los contratistas</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 flex-shrink-0">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab("evidencias")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "evidencias" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Evidencias
        </button>
        <button
          onClick={() => setActiveTab("contratistas")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "contratistas" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Contratistas
        </button>
      </div>

      {activeTab === "contratistas" && (
        <div className="space-y-4">
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

          {selectedContratista && resumen && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3 truncate">{resumen.contratista_nombre}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { label: "Actividades", value: resumen.total_actividades, color: "gray" },
                  { label: "Aprobadas", value: resumen.aprobadas, color: "emerald" },
                  { label: "Rechazadas", value: resumen.rechazadas, color: "red" },
                  { label: "Pendientes", value: resumen.pendientes, color: "yellow" },
                  { label: "Cumplimiento", value: `${resumen.porcentaje_cumplimiento}%`, color: "blue" },
                ].map((item) => (
                  <div key={item.label} className={`text-center p-3 bg-${item.color}-50 rounded-lg`}>
                    <p className="text-2xl font-bold text-gray-700">{item.value}</p>
                    <p className="text-xs text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => descargarInforme("pdf")}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => descargarInforme("docx")}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  DOCX
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              </div>
            ) : contratistas.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No se encontraron contratistas</div>
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
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="font-medium text-gray-800 truncate">{c.nombre}</p>
                      <p className="text-sm text-gray-500">{c.identificacion}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400 flex-shrink-0">
                      {c.total_evidencias !== undefined && (
                        <span className="bg-gray-100 px-2 py-1 rounded-lg whitespace-nowrap">
                          {c.total_evidencias} ev.
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
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {["PENDIENTE", "APROBADO", "RECHAZADO", ""].map((estado) => (
              <button
                key={estado}
                onClick={() => setFilterEstado(estado)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
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
                      <div className="flex-shrink-0 mt-0.5">{getTipoIcon(ev.tipo)}</div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-medium text-gray-800 truncate max-w-[250px] sm:max-w-md"
                            dangerouslySetInnerHTML={{ __html: ev.actividad_descripcion || `Actividad #${ev.actividad_contrato_id}` }}
                          />
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{ev.tipo}</span>
                          {getEstadoBadge(ev.estado)}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="truncate max-w-[200px] sm:max-w-xs">Contrato {ev.contrato_id}</span>
                          <span>•</span>
                          <span className="whitespace-nowrap">{new Date(ev.created_at).toLocaleDateString("es-CO")}</span>
                        </div>

                        {/* Preview - truncated */}
                        {ev.tipo === "TEXTO" && ev.contenido_texto && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded-lg border border-gray-100 break-words">
                              {ev.contenido_texto}
                            </p>
                            {ev.contenido_texto.length > 150 && (
                              <button
                                onClick={() => openContent("Texto de evidencia", ev.contenido_texto, "texto")}
                                className="text-xs text-emerald-600 hover:text-emerald-700 mt-1 flex items-center gap-1"
                              >
                                <Maximize2 className="w-3 h-3" /> Ver texto completo
                              </button>
                            )}
                          </div>
                        )}

                        {ev.observacion_coordinadora && (
                          <div className="mt-2 text-xs text-gray-500 bg-yellow-50 p-2 rounded-lg border border-yellow-100 break-words">
                            <span className="font-medium">Observación: </span>
                            {ev.observacion_coordinadora}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {ev.archivo_ruta && (
                          <button
                            onClick={() => {
                              if (ev.tipo === "IMAGEN") {
                                openContent("Imagen de evidencia", `${API}${ev.archivo_ruta}`, "imagen")
                              } else {
                                openContent(ev.archivo_nombre || "Archivo", `${API}${ev.archivo_ruta}`, "archivo")
                              }
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver archivo"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                        {ev.estado === "PENDIENTE" && (
                          <button
                            onClick={() => setSelectedEvidencia(ev)}
                            className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-x-hidden" onClick={() => { setSelectedEvidencia(null); setObservacion("") }}>
          <div className="bg-white rounded-2xl w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[95vh] sm:max-h-[90vh] shadow-xl flex flex-col overflow-x-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm sm:text-base font-semibold text-gray-800 line-clamp-2 break-words"
                    dangerouslySetInnerHTML={{ __html: selectedEvidencia.actividad_descripcion || `Actividad #${selectedEvidencia.actividad_contrato_id}` }}
                  />
                  <p className="text-xs text-gray-500 mt-0.5 truncate">Contrato {selectedEvidencia.contrato_id}</p>
                  {selectedEvidencia.contratista_nombre && (
                    <p className="text-xs text-gray-500 truncate">
                      Contratista: {selectedEvidencia.contratista_nombre}
                    </p>
                  )}
                </div>
                <button onClick={() => { setSelectedEvidencia(null); setObservacion("") }} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0 mt-0.5">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {/* Actividad completa */}
              {selectedEvidencia.actividad_descripcion && (
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 overflow-x-hidden">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Actividad</p>
                  <div
                    className="text-sm text-gray-700 leading-relaxed [&_*]:max-w-full [&_*]:overflow-x-hidden [&_img]:max-w-full [&_img]:h-auto [&_table]:w-full [&_table]:table-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words"
                    style={{
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                      maxWidth: "100%",
                    }}
                    dangerouslySetInnerHTML={{ __html: selectedEvidencia.actividad_descripcion }}
                  />
                </div>
              )}

              {/* Evidence preview */}
              {selectedEvidencia.tipo === "TEXTO" ? (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                  {selectedEvidencia.contenido_texto}
                </div>
              ) : selectedEvidencia.archivo_ruta ? (
                selectedEvidencia.tipo === "IMAGEN" ? (
                  <div className="flex justify-center">
                    <img
                      src={`${API}${selectedEvidencia.archivo_ruta}`}
                      alt="Evidencia"
                      className="max-w-full max-h-80 object-contain rounded-lg border border-gray-200"
                    />
                  </div>
                ) : (
                  <a
                    href={`${API}${selectedEvidencia.archivo_ruta}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-emerald-600 hover:text-emerald-700"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm truncate">{selectedEvidencia.archivo_nombre || "Descargar archivo"}</span>
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

              <div className="flex gap-3 justify-end pt-2 flex-wrap">
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

      {/* Content Popup */}
      <ContentPopup
        open={popup.open}
        onClose={() => setPopup({ ...popup, open: false })}
        title={popup.title}
        content={popup.content}
        type={popup.type}
      />

      {/* Missing imports for popup */}
    </div>
  )
}
