"use client"

import { useState } from "react"
import { createResolucion } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function NuevaResolucionPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    codigo: "",
    titulo: "",
    vigencia: new Date().getFullYear(),
    fuente: "",
    presupuesto: 0,
    indirect_percentage: 0,
    notas: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const r = await createResolucion(form)
      router.push(`/dashboard/resoluciones/${r.id}`)
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button onClick={() => router.back()} className="text-sm text-gray-500 mb-4 hover:text-gray-700">
        ← Volver
      </button>
      <h1 className="text-2xl font-bold mb-6">Nueva Resolución</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Código *</label>
          <input
            required
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Ej: RES-001-2026"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Título</label>
          <input
            className="w-full px-3 py-2 border rounded-lg"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vigencia</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-lg"
              value={form.vigencia}
              onChange={(e) => setForm({ ...form, vigencia: parseInt(e.target.value) || 2026 })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fuente</label>
            <input
              className="w-full px-3 py-2 border rounded-lg"
              value={form.fuente}
              onChange={(e) => setForm({ ...form, fuente: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Presupuesto *</label>
          <input
            type="number"
            required
            className="w-full px-3 py-2 border rounded-lg"
            value={form.presupuesto}
            onChange={(e) => setForm({ ...form, presupuesto: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">% Costos Indirectos</label>
          <input
            type="number"
            step="0.1"
            className="w-full px-3 py-2 border rounded-lg"
            value={form.indirect_percentage}
            onChange={(e) => setForm({ ...form, indirect_percentage: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notas</label>
          <textarea
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "Creando..." : "Crear Resolución"}
        </button>
      </form>
    </div>
  )
}
