"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, ShieldCheck, FileCheck } from "lucide-react"

export default function EvaluacionPage() {
  const [cedula, setCedula] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cedula.trim()) return

    setLoading(true)
    setError(null)

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"
      const res = await fetch(`${API}/api/v1/evaluacion/buscar?cedula=${encodeURIComponent(cedula.trim())}`)

      if (!res.ok) {
        if (res.status === 404) {
          setError("No se encontró un contratista con esa cédula. Verifica el número e intenta de nuevo.")
        } else {
          setError("Error al consultar. Intenta de nuevo más tarde.")
        }
        setLoading(false)
        return
      }

      router.push(`/evaluacion/dashboard?cedula=${encodeURIComponent(cedula.trim())}`)
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            Evaluación de Cumplimiento
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Portal de evidencias para contratistas
          </p>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/logo_es.png"
            alt="ESE Norte 3"
            className="w-16 h-16 object-contain rounded-xl bg-white p-2 shadow-sm border"
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ingresa tu número de cédula
          </label>
          <div className="relative">
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ej: 1234567890"
              className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg transition-all"
              disabled={loading}
              autoFocus
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !cedula.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                Consultar mis contratos
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          ESE Norte 3 — Sistema de Gestión de Contratos
        </p>
      </div>
    </div>
  )
}
