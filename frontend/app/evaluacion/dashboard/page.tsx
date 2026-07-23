"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Loader2, AlertCircle, ChevronDown, ChevronRight,
  Upload, FileText, Image, MessageSquareText,
  CheckCircle2, XCircle, Clock, ExternalLink,
  User, Phone, Mail, FileCheck, ShieldCheck, ArrowLeft,
  Eye, HelpCircle, Lock, Download, Trash2, Info, X,
} from "lucide-react"
import type { DashboardContratista, ContratoEvaluacion, ActividadConEvidencias, DocumentoContratista } from "@/lib/api"
import { TIPOS_DOCUMENTO } from "@/lib/api"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

export default function EvaluacionDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    }>
      <EvaluacionDashboard />
    </Suspense>
  )
}

function EvaluacionDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const cedula = searchParams.get("cedula")

  const [data, setData] = useState<DashboardContratista | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Expanded contracts
  const [expandedContratos, setExpandedContratos] = useState<Set<string>>(new Set())
  // Expanded activities
  const [expandedActividades, setExpandedActividades] = useState<Set<number>>(new Set())
  // Upload modals
  const [uploadModals, setUploadModals] = useState<{ activo: boolean; actividadId: number; contratoId: string; tipo: "ARCHIVO" | "IMAGEN" | "TEXTO" } | null>(null)
  const [textoEvidencia, setTextoEvidencia] = useState("")
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  // Document upload state
  const [documentos, setDocumentos] = useState<DocumentoContratista[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [docUploadModal, setDocUploadModal] = useState<{
    activo: boolean; contratoNumero: string; tipoDocumento: string
  } | null>(null)
  const [docArchivo, setDocArchivo] = useState<File | null>(null)
  const [docUploading, setDocUploading] = useState(false)
  const [docUploadError, setDocUploadError] = useState<string | null>(null)
  const [docUploadSuccess, setDocUploadSuccess] = useState(false)
  const [showPdfHelp, setShowPdfHelp] = useState(false)

  // Cargar documentos de todos los contratos
  const loadDocumentos = useCallback(async () => {
    if (!cedula || !data) return
    setLoadingDocs(true)
    try {
      const allDocs: DocumentoContratista[] = []
      for (const c of data.contratos) {
        const res = await fetch(
          `${API}/api/v1/documentos/contrato/${encodeURIComponent(c.numero_contrato)}?cedula=${encodeURIComponent(cedula)}`
        )
        if (res.ok) {
          const docs = await res.json()
          allDocs.push(...docs)
        }
      }
      setDocumentos(allDocs)
    } catch {
      // Silencioso
    }
    setLoadingDocs(false)
  }, [cedula, data])

  // Cargar documentos cuando se carguen los datos
  useEffect(() => {
    if (data) loadDocumentos()
  }, [data, loadDocumentos])

  const getDocumentoEstado = (contratoNumero: string, tipoDocumento: string): DocumentoContratista | null => {
    return documentos.find(
      d => d.contrato_numero === contratoNumero && d.tipo_documento === tipoDocumento
    ) || null
  }

  const handleDocUpload = async () => {
    if (!docUploadModal || !docArchivo) return

    if (!docArchivo.name.toLowerCase().endsWith(".pdf")) {
      setDocUploadError("Solo se aceptan archivos PDF.")
      return
    }

    setDocUploading(true)
    setDocUploadError(null)

    try {
      const formData = new FormData()
      formData.append("contratista_id", String(data!.contratista_id))
      formData.append("contrato_numero", docUploadModal.contratoNumero)
      formData.append("tipo_documento", docUploadModal.tipoDocumento)
      formData.append("archivo", docArchivo)

      const res = await fetch(`${API}/api/v1/documentos/subir`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text.slice(0, 300))
      }

      setDocUploadSuccess(true)
      setTimeout(() => {
        setDocUploadModal(null)
        setDocArchivo(null)
        setDocUploadSuccess(false)
        loadDocumentos()
      }, 1500)
    } catch (err: any) {
      setDocUploadError(err.message || "Error al subir el documento.")
    }
    setDocUploading(false)
  }

  const loadData = useCallback(async () => {
    if (!cedula) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/v1/evaluacion/buscar?cedula=${encodeURIComponent(cedula)}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError("No se encontró un contratista con esa cédula.")
        } else {
          setError("Error al consultar los datos.")
        }
        setLoading(false)
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setError("Error de conexión.")
    }
    setLoading(false)
  }, [cedula])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (!cedula) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">No se proporcionó un número de cédula.</p>
          <button onClick={() => router.push("/evaluacion")} className="mt-4 text-emerald-600 hover:underline">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-500">Cargando información...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-700 mb-4">{error || "No se pudieron cargar los datos."}</p>
          <button onClick={() => router.push("/evaluacion")} className="text-emerald-600 hover:underline">
            Volver e intentar de nuevo
          </button>
        </div>
      </div>
    )
  }

  const toggleContrato = (num: string) => {
    setExpandedContratos(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  const toggleActividad = (id: number) => {
    setExpandedActividades(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openSubirArchivo = (actividadId: number, contratoId: string) => {
    setUploadModals({ activo: true, actividadId, contratoId, tipo: "ARCHIVO" })
    setTextoEvidencia("")
    setArchivoEvidencia(null)
    setUploadError(null)
    setUploadSuccess(false)
  }

  const openSubirImagen = (actividadId: number, contratoId: string) => {
    setUploadModals({ activo: true, actividadId, contratoId, tipo: "IMAGEN" })
    setTextoEvidencia("")
    setArchivoEvidencia(null)
    setUploadError(null)
    setUploadSuccess(false)
  }

  const openSubirTexto = (actividadId: number, contratoId: string) => {
    setUploadModals({ activo: true, actividadId, contratoId, tipo: "TEXTO" })
    setTextoEvidencia("")
    setArchivoEvidencia(null)
    setUploadError(null)
    setUploadSuccess(false)
  }

  const handleUpload = async () => {
    if (!uploadModals) return

    if (uploadModals.tipo === "TEXTO" && !textoEvidencia.trim()) {
      setUploadError("Debes escribir un texto de evidencia.")
      return
    }
    if ((uploadModals.tipo === "ARCHIVO" || uploadModals.tipo === "IMAGEN") && !archivoEvidencia) {
      setUploadError("Debes seleccionar un archivo.")
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append("actividad_contrato_id", String(uploadModals.actividadId))
      formData.append("contratista_id", String(data.contratista_id))
      formData.append("contrato_id", uploadModals.contratoId)
      formData.append("tipo", uploadModals.tipo)
      if (uploadModals.tipo === "TEXTO") {
        formData.append("contenido_texto", textoEvidencia)
      }
      if (archivoEvidencia) {
        formData.append("archivo", archivoEvidencia)
      }

      const res = await fetch(`${API}/api/v1/evaluacion/evidencias`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text.slice(0, 200))
      }

      setUploadSuccess(true)
      // Reload data after successful upload
      setTimeout(() => {
        setUploadModals(null)
        loadData()
      }, 1500)
    } catch (err: any) {
      setUploadError(err.message || "Error al subir la evidencia.")
    }
    setUploading(false)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "APROBADO":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3 h-3" />
            Aprobado
          </span>
        )
      case "RECHAZADO":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Rechazado
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        )
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "IMAGEN": return <Image className="w-4 h-4 text-blue-500" />
      case "ARCHIVO": return <FileText className="w-4 h4 text-orange-500" />
      case "TEXTO": return <MessageSquareText className="w-4 h-4 text-purple-500" />
      default: return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push("/evaluacion")} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <img src="/logo_es.png" alt="ESE" className="w-9 h-9 object-contain rounded-lg bg-white p-1 border" />
          <div className="flex-1">
            <h1 className="text-base font-semibold text-gray-800">Evaluación de Cumplimiento</h1>
            <p className="text-xs text-gray-500">ESE Norte 3</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Contractor info card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-800 truncate">{data.nombre}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {data.identificacion}
                </span>
                {data.telefono && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {data.telefono}
                  </span>
                )}
                {data.correo && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {data.correo}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Botones de descarga */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
            <a
              href={`${API}/api/v1/evaluacion/publico/informe?cedula=${encodeURIComponent(data.identificacion)}&formato=pdf`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Descargar PDF
            </a>
            <a
              href={`${API}/api/v1/evaluacion/publico/informe?cedula=${encodeURIComponent(data.identificacion)}&formato=docx`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Descargar DOCX
            </a>
          </div>
        </div>

        {/* Contracts */}
        {data.contratos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No tienes contratos activos en este momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Mis Contratos ({data.contratos.length})
            </h3>
            {data.contratos.map((contrato) => (
              <ContratoCard
                key={contrato.numero_contrato}
                contrato={contrato}
                expanded={expandedContratos.has(contrato.numero_contrato)}
                onToggle={() => toggleContrato(contrato.numero_contrato)}
                expandedActividades={expandedActividades}
                onToggleActividad={toggleActividad}
                onSubirArchivo={openSubirArchivo}
                onSubirImagen={openSubirImagen}
                onSubirTexto={openSubirTexto}
                getEstadoBadge={getEstadoBadge}
                getTipoIcon={getTipoIcon}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DOCUMENTOS CONTRACTUALES
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Documentos Contractuales
          </h3>
          <button
            onClick={() => setShowPdfHelp(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            ¿Cómo quitar contraseña a un PDF?
          </button>
        </div>

        {data.contratos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No tienes contratos activos para gestionar documentos.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.contratos.map((contrato) => (
              <DocumentosContratoCard
                key={contrato.numero_contrato}
                contrato={contrato}
                documentos={documentos}
                cedula={cedula}
                loadingDocs={loadingDocs}
                getDocumentoEstado={getDocumentoEstado}
                onSubirDocumento={(contratoNumero, tipoDocumento) => {
                  setDocUploadModal({ activo: true, contratoNumero, tipoDocumento })
                  setDocArchivo(null)
                  setDocUploadError(null)
                  setDocUploadSuccess(false)
                }}
                onRefresh={loadDocumentos}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal (Evidencias de actividades) */}
      {uploadModals && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                {uploadModals.tipo === "ARCHIVO" && "Subir archivo"}
                {uploadModals.tipo === "IMAGEN" && "Subir imagen"}
                {uploadModals.tipo === "TEXTO" && "Agregar texto"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Evidencia para la actividad seleccionada
              </p>
            </div>

            <div className="p-5 space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Evidencia subida correctamente
                </div>
              )}

              {uploadModals.tipo === "TEXTO" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Describe la evidencia
                  </label>
                  <textarea
                    value={textoEvidencia}
                    onChange={(e) => setTextoEvidencia(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y text-sm leading-relaxed"
                    placeholder="Describe en detalle cómo se ejecutó la actividad, incluyendo lugar, fecha, beneficiarios, novedades o cualquier información relevante..."
                    disabled={uploading || uploadSuccess}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {uploadModals.tipo === "IMAGEN" ? "Seleccionar imagen" : "Seleccionar archivo"}
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById("file-input")?.click()}>
                    {archivoEvidencia ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                        <FileCheck className="w-5 h-5" />
                        {archivoEvidencia.name}
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          Haz clic para seleccionar o arrastra un archivo aquí
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {uploadModals.tipo === "IMAGEN" ? "JPG, PNG, WebP" : "PDF, DOCX, XLSX"} (máx 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    id="file-input"
                    type="file"
                    accept={uploadModals.tipo === "IMAGEN" ? "image/*" : undefined}
                    className="hidden"
                    onChange={(e) => setArchivoEvidencia(e.target.files?.[0] || null)}
                    disabled={uploading || uploadSuccess}
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setUploadModals(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || uploadSuccess}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Subir evidencia
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doc Upload Modal */}
      {docUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDocUploadModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                Subir {TIPOS_DOCUMENTO.find(t => t.valor === docUploadModal.tipoDocumento)?.etiqueta || docUploadModal.tipoDocumento}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Contrato: {docUploadModal.contratoNumero} — Solo archivos PDF sin contraseña
              </p>
            </div>

            <div className="p-5 space-y-4">
              {docUploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{docUploadError}</span>
                </div>
              )}
              {docUploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Documento subido correctamente
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar PDF
                </label>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("doc-file-input")?.click()}
                >
                  {docArchivo ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                      <FileCheck className="w-5 h-5" />
                      <span className="truncate max-w-[300px]">{docArchivo.name}</span>
                      <span className="text-xs text-gray-400">
                        ({(docArchivo.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Haz clic para seleccionar o arrastra un PDF aquí
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PDF sin contraseña (máx 15 MB)
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="doc-file-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setDocArchivo(e.target.files?.[0] || null)}
                  disabled={docUploading || docUploadSuccess}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Validación automática</p>
                  <p className="text-xs mt-0.5">
                    Los PDFs protegidos con contraseña serán rechazados automáticamente.
                    {' '}<button onClick={() => { setShowPdfHelp(true); }} className="underline font-medium">
                      ¿Cómo quitar la contraseña?
                    </button>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setDocUploadModal(null)
                    setDocArchivo(null)
                    setDocUploadError(null)
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={docUploading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDocUpload}
                  disabled={!docArchivo || docUploading || docUploadSuccess}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {docUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Subir documento
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Help Popup — Cómo quitar contraseña a un PDF */}
      {showPdfHelp && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowPdfHelp(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      ¿Cómo quitar la contraseña a un PDF?
                    </h3>
                    <p className="text-sm text-gray-500">
                      Sigue estos pasos para subir tus documentos sin problemas
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowPdfHelp(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Método 1: Chrome/Edge */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <h4 className="font-semibold text-blue-900">Usando Chrome, Edge o cualquier navegador</h4>
                </div>
                <ol className="space-y-2 text-sm text-blue-800 ml-8 list-decimal">
                  <li>Abre el PDF protegido en tu navegador (Chrome, Edge, etc.)</li>
                  <li>Ingresa la contraseña para ver el documento</li>
                  <li>Haz clic en el <strong>icono de impresora</strong> (🖨️) o presiona <kbd className="px-1.5 py-0.5 bg-blue-100 rounded text-xs font-mono">Ctrl+P</kbd></li>
                  <li>En destino, selecciona <strong>&quot;Guardar como PDF&quot;</strong></li>
                  <li>Haz clic en <strong>&quot;Guardar&quot;</strong> — el nuevo PDF ya <strong>no tendrá contraseña</strong></li>
                  <li>Sube ese nuevo archivo al sistema</li>
                </ol>
                <div className="mt-3 p-3 bg-white rounded-lg border border-blue-100 text-xs text-blue-700">
                  💡 <strong>Consejo:</strong> Esta técnica funciona porque al &quot;imprimir a PDF&quot; el navegador genera un archivo nuevo sin las restricciones del original.
                </div>
              </div>

              {/* Método 2: Herramientas online */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <h4 className="font-semibold text-emerald-900">Usando herramientas online gratuitas</h4>
                </div>
                <ol className="space-y-2 text-sm text-emerald-800 ml-8 list-decimal">
                  <li>Ve a <a href="https://www.ilovepdf.com/es/quitar-contrasena-pdf" target="_blank" rel="noopener noreferrer" className="underline font-medium">iLovePDF — Quitar contraseña</a></li>
                  <li>Selecciona el archivo PDF protegido</li>
                  <li>Ingresa la contraseña cuando te la pida</li>
                  <li>Haz clic en <strong>&quot;Quitar contraseña&quot;</strong></li>
                  <li>Descarga el PDF sin contraseña</li>
                  <li>Sube ese archivo al sistema</li>
                </ol>
                <div className="mt-2">
                  <p className="text-xs text-emerald-700">Otras opciones recomendadas:</p>
                  <div className="flex gap-3 mt-1">
                    <a href="https://smallpdf.com/es/quitar-proteccion-pdf" target="_blank" rel="noopener noreferrer" className="text-xs underline text-emerald-700 hover:text-emerald-800">Smallpdf</a>
                    <a href="https://www.adobe.com/es/acrobat/online/remove-pdf-password.html" target="_blank" rel="noopener noreferrer" className="text-xs underline text-emerald-700 hover:text-emerald-800">Adobe Acrobat Online</a>
                    <a href="https://pdfcandy.com/es/unlock-pdf.html" target="_blank" rel="noopener noreferrer" className="text-xs underline text-emerald-700 hover:text-emerald-800">PDF Candy</a>
                  </div>
                </div>
              </div>

              {/* Método 3: Adobe Acrobat (escritorio) */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <h4 className="font-semibold text-purple-900">Usando Adobe Acrobat Reader (escritorio)</h4>
                </div>
                <ol className="space-y-2 text-sm text-purple-800 ml-8 list-decimal">
                  <li>Abre el PDF en Adobe Acrobat Reader</li>
                  <li>Ingresa la contraseña para verlo</li>
                  <li>Ve a <strong>Archivo &gt; Imprimir</strong> o presiona <kbd className="px-1.5 py-0.5 bg-purple-100 rounded text-xs font-mono">Ctrl+P</kbd></li>
                  <li>Selecciona <strong>&quot;Microsoft Print to PDF&quot;</strong> o <strong>&quot;Adobe PDF&quot;</strong> como impresora</li>
                  <li>Haz clic en <strong>&quot;Imprimir&quot;</strong> y guarda el archivo</li>
                  <li>El PDF resultante no tendrá contraseña</li>
                </ol>
              </div>

              {/* Resumen */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <h4 className="font-semibold text-gray-700 text-sm">Importante</h4>
                </div>
                <ul className="space-y-1 text-sm text-gray-600 list-disc ml-5">
                  <li>Solo se aceptan archivos <strong>PDF sin contraseña</strong></li>
                  <li>Tamaño máximo: <strong>15 MB</strong> por archivo</li>
                  <li>Una vez subido, un coordinador revisará y aprobará el documento</li>
                  <li>Si el documento es rechazado, podrás ver la observación y subir uno corregido</li>
                </ul>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowPdfHelp(false)}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors text-sm"
              >
                Entendido, ¡a subir documentos!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          ESE Norte 3 — Sistema de Gestión de Contratos v2.0
        </div>
      </footer>
    </div>
  )
}

// ─── Documentos Contractuales Card Component ───────────────────────────────

function DocumentosContratoCard({
  contrato, documentos, cedula, loadingDocs,
  getDocumentoEstado, onSubirDocumento, onRefresh,
}: {
  contrato: ContratoEvaluacion
  documentos: DocumentoContratista[]
  cedula: string
  loadingDocs: boolean
  getDocumentoEstado: (contratoNumero: string, tipoDocumento: string) => DocumentoContratista | null
  onSubirDocumento: (contratoNumero: string, tipoDocumento: string) => void
  onRefresh: () => void
}) {
  const [expandedDocs, setExpandedDocs] = useState(false)

  const docsCompletos = TIPOS_DOCUMENTO.filter(
    t => getDocumentoEstado(contrato.numero_contrato, t.valor)
  ).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpandedDocs(!expandedDocs)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-shrink-0">
          {expandedDocs ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-800">{contrato.numero_contrato}</span>
          {contrato.perfil && (
            <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
              {contrato.perfil}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
          <span className={`px-2 py-1 rounded-lg font-medium ${
            docsCompletos === TIPOS_DOCUMENTO.length
              ? "bg-emerald-100 text-emerald-700"
              : docsCompletos > 0
              ? "bg-amber-100 text-amber-700"
              : "bg-gray-100 text-gray-500"
          }`}>
            {docsCompletos}/{TIPOS_DOCUMENTO.length} docs
          </span>
        </div>
      </button>

      {expandedDocs && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {loadingDocs ? (
            <div className="p-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : (
            TIPOS_DOCUMENTO.map((tipo) => {
              const doc = getDocumentoEstado(contrato.numero_contrato, tipo.valor)
              return (
                <DocumentoRow
                  key={tipo.valor}
                  tipo={tipo}
                  documento={doc}
                  contratoNumero={contrato.numero_contrato}
                  cedula={cedula}
                  onSubir={() => onSubirDocumento(contrato.numero_contrato, tipo.valor)}
                  onRefresh={onRefresh}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}


// ─── Documento Row Component ─────────────────────────────────────────────────

function DocumentoRow({
  tipo, documento, contratoNumero, cedula, onSubir, onRefresh,
}: {
  tipo: { valor: string; etiqueta: string; icono: string }
  documento: DocumentoContratista | null
  contratoNumero: string
  cedula: string
  onSubir: () => void
  onRefresh: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!documento) return
    if (!confirm("¿Estás seguro de eliminar este documento?")) return
    setDeleting(true)
    try {
      await fetch(`${API}/api/v1/documentos/${documento.id}`, { method: "DELETE" })
      onRefresh()
    } catch {}
    setDeleting(false)
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "APROBADO":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case "RECHAZADO":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const getEstadoClass = (estado: string) => {
    switch (estado) {
      case "APROBADO": return "bg-emerald-50 border-emerald-200"
      case "RECHAZADO": return "bg-red-50 border-red-200"
      default: return "bg-yellow-50 border-yellow-200"
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case "APROBADO": return "Aprobado"
      case "RECHAZADO": return "Rechazado"
      default: return "Pendiente"
    }
  }

  return (
    <div className={`p-3 pl-8 pr-4 flex items-center gap-3 ${
      documento ? getEstadoClass(documento.estado) : ""
    }`}>
      <span className="text-base flex-shrink-0">{tipo.icono}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{tipo.etiqueta}</p>
        {documento ? (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500 truncate max-w-[200px]">
              {documento.archivo_nombre}
            </span>
            <span className="text-xs text-gray-400">
              ({(documento.archivo_tamano / 1024 / 1024).toFixed(1)} MB)
            </span>
            {getEstadoIcon(documento.estado)}
            <span className={`text-xs font-medium ${
              documento.estado === "APROBADO" ? "text-emerald-600" :
              documento.estado === "RECHAZADO" ? "text-red-600" :
              "text-yellow-600"
            }`}>
              {getEstadoLabel(documento.estado)}
            </span>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">Sin subir</p>
        )}
        {documento?.observacion && (
          <div className={`mt-1 p-2 rounded-lg border text-xs ${
            documento.estado === "RECHAZADO"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-gray-50 border-gray-200 text-gray-600"
          }`}>
            <strong>Observación:</strong> {documento.observacion}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {documento ? (
          <>
            <a
              href={`${API}${documento.archivo_ruta}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Ver documento"
            >
              <Eye className="w-4 h-4" />
            </a>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </>
        ) : (
          <button
            onClick={onSubir}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
          >
            <Upload className="w-3.5 h-3.5" />
            Subir
          </button>
        )}
      </div>
    </div>
  )
}


// ─── Contract Card Component ─────────────────────────────────────────────────

function ContratoCard({
  contrato, expanded, onToggle,
  expandedActividades, onToggleActividad,
  onSubirArchivo, onSubirImagen, onSubirTexto,
  getEstadoBadge, getTipoIcon,
}: {
  contrato: ContratoEvaluacion
  expanded: boolean
  onToggle: () => void
  expandedActividades: Set<number>
  onToggleActividad: (id: number) => void
  onSubirArchivo: (actividadId: number, contratoId: string) => void
  onSubirImagen: (actividadId: number, contratoId: string) => void
  onSubirTexto: (actividadId: number, contratoId: string) => void
  getEstadoBadge: (estado: string) => React.ReactNode
  getTipoIcon: (tipo: string) => React.ReactNode
}) {
  const totalEvidencias = contrato.actividades.reduce(
    (sum, act) => sum + act.evidencias.length, 0
  )
  const aprobadas = contrato.actividades.reduce(
    (sum, act) => sum + act.evidencias.filter(e => e.estado === "APROBADO").length, 0
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Contract header */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left">
        <div className="flex-shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">{contrato.numero_contrato}</span>
            {contrato.perfil && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                {contrato.perfil}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate mt-0.5">
            {contrato.objeto || "Sin objeto definido"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
          <span className="bg-gray-100 px-2 py-1 rounded-lg">
            {aprobadas}/{totalEvidencias} ev.
          </span>
          {contrato.fecha_fin && (
            <span className="hidden sm:block">Vence: {contrato.fecha_fin}</span>
          )}
        </div>
      </button>

      {/* Expanded: activities */}
      {expanded && (
        <div className="border-t border-gray-100">
          {contrato.actividades.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              Este contrato no tiene actividades registradas.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {contrato.actividades.map((actividad) => (
                <ActividadRow
                  key={actividad.id}
                  actividad={actividad}
                  contratoId={contrato.numero_contrato}
                  expanded={expandedActividades.has(actividad.id)}
                  onToggle={() => onToggleActividad(actividad.id)}
                  onSubirArchivo={onSubirArchivo}
                  onSubirImagen={onSubirImagen}
                  onSubirTexto={onSubirTexto}
                  getEstadoBadge={getEstadoBadge}
                  getTipoIcon={getTipoIcon}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Activity Row Component ──────────────────────────────────────────────────

function ActividadRow({
  actividad, contratoId, expanded, onToggle,
  onSubirArchivo, onSubirImagen, onSubirTexto,
  getEstadoBadge, getTipoIcon,
}: {
  actividad: ActividadConEvidencias
  contratoId: string
  expanded: boolean
  onToggle: () => void
  onSubirArchivo: (actividadId: number, contratoId: string) => void
  onSubirImagen: (actividadId: number, contratoId: string) => void
  onSubirTexto: (actividadId: number, contratoId: string) => void
  getEstadoBadge: (estado: string) => React.ReactNode
  getTipoIcon: (tipo: string) => React.ReactNode
}) {
  const ultimoEstado = actividad.evidencias.length > 0
    ? actividad.evidencias[actividad.evidencias.length - 1].estado
    : "SIN_EVIDENCIA"

  return (
    <div>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 pl-8 hover:bg-gray-50 transition-colors text-left">
        <div className="flex-shrink-0">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-700" dangerouslySetInnerHTML={{ __html: actividad.descripcion }} />
          <span className="ml-2 text-xs text-gray-400">({actividad.tipo})</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {ultimoEstado !== "SIN_EVIDENCIA" ? (
            getEstadoBadge(ultimoEstado)
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Sin evidencia
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="pl-8 pr-4 pb-4 space-y-3">
          {/* Evidence list */}
          {actividad.evidencias.length > 0 && (
            <div className="space-y-2 mt-2">
              {actividad.evidencias.map((ev) => (
                <div key={ev.id} className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  {/* Fila principal: icono + contenido + badge */}
                  <div className="flex items-center gap-3">
                    {getTipoIcon(ev.tipo)}
                    <div className="flex-1 min-w-0">
                      {ev.tipo === "TEXTO" ? (
                        <p className="text-sm text-gray-700 line-clamp-2 break-words">{ev.contenido_texto}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 truncate">{ev.archivo_nombre || "Archivo"}</span>
                          {ev.archivo_ruta && (
                            <a
                              href={`${API}${ev.archivo_ruta}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(ev.created_at).toLocaleDateString("es-CO", {
                          day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    {getEstadoBadge(ev.estado)}
                  </div>
                  {/* Fila separada para la observación */}
                  {ev.observacion_coordinadora && (
                    <div className={`p-3 rounded-lg border text-sm ${
                      ev.estado === "RECHAZADO"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : ev.estado === "APROBADO"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-gray-50 border-gray-200 text-gray-700"
                    }`}>
                      <div className="flex items-start gap-2">
                        <MessageSquareText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          ev.estado === "RECHAZADO" ? "text-red-500" : "text-emerald-500"
                        }`} />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs uppercase tracking-wider">
                            {ev.estado === "RECHAZADO" ? "Observación del coordinador" : "Observación"}
                          </p>
                          <p className="mt-1 leading-relaxed break-words whitespace-pre-wrap">{ev.observacion_coordinadora}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => onSubirImagen(actividad.id, contratoId)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <Image className="w-3.5 h-3.5" />
              Subir imagen
            </button>
            <button
              onClick={() => onSubirArchivo(actividad.id, contratoId)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
            >
              <FileText className="w-3.5 h-3.5" />
              Subir archivo
            </button>
            <button
              onClick={() => onSubirTexto(actividad.id, contratoId)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              Agregar texto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
