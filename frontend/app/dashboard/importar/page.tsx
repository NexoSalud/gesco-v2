"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { getResoluciones, uploadImportExcel, API, type Resolucion } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Upload, FileSpreadsheet, X, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ImportResult {
  total: number
  created: number
  skipped: number
  errors: { fila: number; numero_contrato: string | null; error: string }[]
}

export default function ImportarPage() {
  const [resoluciones, setResoluciones] = useState<Resolucion[]>([])
  const [selectedResolucion, setSelectedResolucion] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getResoluciones().then(setResoluciones).catch(() => toast.error("Error al cargar resoluciones"))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.name.endsWith(".xlsx") || dropped.name.endsWith(".xls"))) {
      setFile(dropped)
      setResult(null)
    } else {
      toast.error("Solo se aceptan archivos .xlsx")
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
    }
  }

  const clearFile = () => {
    setFile(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleImport = async () => {
    if (!selectedResolucion) {
      toast.error("Selecciona una resolución destino")
      return
    }
    if (!file) {
      toast.error("Selecciona un archivo Excel")
      return
    }

    setImporting(true)
    setResult(null)

    try {
      const data = await uploadImportExcel(Number(selectedResolucion), file)
      setResult(data)
      if (data.created > 0) {
        toast.success(`${data.created} contratos importados exitosamente`)
      }
      if (data.errors.length > 0) {
        toast.warning(`${data.skipped} contratos omitidos — revisa los errores`)
      }
    } catch (err: any) {
      toast.error(err.message || "Error al importar")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar Contratos</h1>
        <p className="text-gray-500 mt-1">Carga masiva de contratos desde archivo Excel</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seleccionar resolución destino</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedResolucion}
                onChange={(e) => setSelectedResolucion(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">— Selecciona una resolución —</option>
                {resoluciones.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.codigo} {r.titulo ? `– ${r.titulo}` : ""}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subir archivo Excel</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-emerald-400 bg-emerald-50"
                    : file
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "border-gray-300 hover:border-emerald-300 hover:bg-gray-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearFile() }}
                      className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">Arrastra tu archivo Excel aquí</p>
                    <p className="text-sm text-gray-400 mt-1">o haz clic para seleccionar (.xlsx)</p>
                  </>
                )}
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Columnas esperadas
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                  {[
                    "NO. CONTRATO", "CONTRATISTA", "CEDULA DE CONTRATISTA",
                    "LUGAR DE EXPEDICIÓN", "TELEFONO", "DIRECCION",
                    "CORREO", "TÍTULO", "VALOR DEL CONTRATO",
                    "CUOTAS", "VIGENCIA DEL CONTRATO", "OBJETO DEL CONTRATO",
                    "SUPERVISOR", "CEDULA SUPERVISOR", "No. CDP",
                  ].map((col) => (
                    <p key={col} className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block" />
                      {col}
                    </p>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleImport}
                disabled={!selectedResolucion || !file || importing}
                className="w-full mt-4 gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importar Contratos
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Formato requerido</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>El archivo Excel debe contener los contratos a importar con los encabezados en la primera fila. Cada fila representa un contrato.</p>
              <button
                onClick={() => window.open(`${API}/api/v1/export/plantilla-importacion`, "_blank")}
                className="flex items-center gap-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 pt-2 border-t w-full"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar plantilla Excel para importación
              </button>
            </CardContent>
          </Card>

          {result && (
            <Card className={result.created > 0 ? "border-emerald-200" : "border-amber-200"}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {result.created > 0 ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  )}
                  <CardTitle className="text-sm">Resultado de importación</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 rounded-lg bg-emerald-50">
                    <p className="text-2xl font-bold text-emerald-700">{result.total}</p>
                    <p className="text-xs text-emerald-600">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-50">
                    <p className="text-2xl font-bold text-blue-700">{result.created}</p>
                    <p className="text-xs text-blue-600">Creados</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50">
                    <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                    <p className="text-xs text-amber-600">Omitidos</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Errores ({result.errors.length})</p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {result.errors.map((err, i) => (
                        <div key={i} className="p-2 rounded-lg bg-red-50 border border-red-100 text-xs">
                          <span className="font-medium text-red-700">Fila {err.fila}:</span>{" "}
                          <span className="text-red-600">{err.error}</span>
                          {err.numero_contrato && (
                            <Badge variant="outline" className="ml-1 text-[10px]">{err.numero_contrato}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
