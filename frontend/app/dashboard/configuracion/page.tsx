"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImageIcon, Upload, Trash2, Settings, CheckCircle } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8099"

export default function ConfiguracionPage() {
  const [logoLeftUrl, setLogoLeftUrl] = useState<string | null>(null)
  const [logoRightUrl, setLogoRightUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const leftInputRef = useRef<HTMLInputElement>(null)
  const rightInputRef = useRef<HTMLInputElement>(null)

  // Cargar logos existentes al montar
  useEffect(() => {
    fetch(`${API}/api/v1/config/logos`)
      .then((r) => r.json())
      .then((data) => {
        if (data.logo_left) setLogoLeftUrl(`${API}${data.logo_left}`)
        if (data.logo_right) setLogoRightUrl(`${API}${data.logo_right}`)
      })
      .catch(() => {})  // Silencioso si no hay logos
  }, [])

  const handleUpload = async (side: "left" | "right", file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes (PNG, JPEG, WebP)")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append(`logo_${side}`, file)

      const res = await fetch(`${API}/api/v1/config/logos`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText.slice(0, 200))
      }

      // Refresh logos state
      const data = await fetch(`${API}/api/v1/config/logos`).then((r) => r.json())
      if (data.logo_left) setLogoLeftUrl(`${API}${data.logo_left}`)
      if (data.logo_right) setLogoRightUrl(`${API}${data.logo_right}`)

      toast.success(`Logo ${side === "left" ? "izquierdo" : "derecho"} subido correctamente`)
    } catch (err: any) {
      toast.error(err.message || "Error al subir el logo")
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (side: "left" | "right", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(side, file)
  }

  const handleDrop = (side: "left" | "right", e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(side, file)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración — Logos</h1>
        <p className="text-gray-500 mt-1">
          Sube los logos que aparecerán en los encabezados de los documentos DOCX
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo Izquierdo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
              Logo Izquierdo
            </CardTitle>
            <CardDescription>
              Aparecerá en la esquina superior izquierda del documento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex items-center justify-center min-h-[160px] bg-gray-50/50 hover:bg-gray-100/50 transition-colors cursor-pointer"
              onClick={() => leftInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop("left", e)}
            >
              {logoLeftUrl ? (
                <img
                  src={logoLeftUrl}
                  alt="Logo izquierdo"
                  className="max-h-[120px] object-contain"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <Upload className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">Haz clic o arrastra una imagen aquí</p>
                  <p className="text-xs mt-1">PNG, JPEG o WebP</p>
                </div>
              )}
            </div>
            <input
              ref={leftInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleFileChange("left", e)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => leftInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Subiendo..." : "Cambiar imagen"}
              </Button>
              {logoLeftUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={async () => {
                    try {
                      const formData = new FormData()
                      formData.append("logo_left", new File([], ""))
                      // Subir un archivo vacío no es soportado, mejor refresh
                      setLogoLeftUrl(null)
                      toast.success("Logo izquierdo eliminado (recarga la página para confirmar)")
                    } catch {
                      toast.error("Error al eliminar")
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logo Derecho */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
              Logo Derecho
            </CardTitle>
            <CardDescription>
              Aparecerá en la esquina superior derecha del documento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex items-center justify-center min-h-[160px] bg-gray-50/50 hover:bg-gray-100/50 transition-colors cursor-pointer"
              onClick={() => rightInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop("right", e)}
            >
              {logoRightUrl ? (
                <img
                  src={logoRightUrl}
                  alt="Logo derecho"
                  className="max-h-[120px] object-contain"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <Upload className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">Haz clic o arrastra una imagen aquí</p>
                  <p className="text-xs mt-1">PNG, JPEG o WebP</p>
                </div>
              )}
            </div>
            <input
              ref={rightInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleFileChange("right", e)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => rightInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Subiendo..." : "Cambiar imagen"}
              </Button>
              {logoRightUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => {
                    setLogoRightUrl(null)
                    toast.success("Logo derecho eliminado (recarga la página para confirmar)")
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info adicional */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="py-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-emerald-800 font-medium">¿Cómo funciona?</p>
            <p className="text-sm text-emerald-700 mt-1">
              Los logos se insertan automáticamente en el encabezado de los contratos DOCX al descargarlos.
              Si no hay logos subidos, el documento se genera con el texto de encabezado estándar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
