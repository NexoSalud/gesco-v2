"use client"

import { useState } from "react"
import { createResolucion } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, Save } from "lucide-react"
import { toast } from "sonner"

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
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.codigo.trim()) errs.codigo = "El código es requerido"
    if (form.presupuesto <= 0) errs.presupuesto = "El presupuesto debe ser mayor a 0"
    if (form.indirect_percentage < 0 || form.indirect_percentage > 100)
      errs.indirect_percentage = "Debe estar entre 0 y 100"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const r = await createResolucion(form)
      toast.success("Resolución creada exitosamente")
      router.push(`/dashboard/resoluciones/${r.id}`)
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Nueva Resolución</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Crea una nueva resolución de presupuesto para la vigencia
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Código y Vigencia */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Código <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ej: RES-001-2026"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  className={errors.codigo ? "border-red-500" : ""}
                />
                {errors.codigo && <p className="text-xs text-red-500">{errors.codigo}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Vigencia</label>
                <Input
                  type="number"
                  value={form.vigencia}
                  onChange={(e) => setForm({ ...form, vigencia: parseInt(e.target.value) || new Date().getFullYear() })}
                />
              </div>
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Título</label>
              <Input
                placeholder="Descripción de la resolución"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>

            <Separator />

            {/* Presupuesto */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Presupuesto <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.presupuesto}
                  onChange={(e) => setForm({ ...form, presupuesto: parseFloat(e.target.value) || 0 })}
                  className={errors.presupuesto ? "border-red-500" : ""}
                />
                {errors.presupuesto && <p className="text-xs text-red-500">{errors.presupuesto}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">% Costos Indirectos</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={form.indirect_percentage}
                  onChange={(e) => setForm({ ...form, indirect_percentage: parseFloat(e.target.value) || 0 })}
                  className={errors.indirect_percentage ? "border-red-500" : ""}
                />
                {errors.indirect_percentage && <p className="text-xs text-red-500">{errors.indirect_percentage}</p>}
              </div>
            </div>

            {/* Fuente */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fuente</label>
              <Input
                placeholder="Fuente de financiación"
                value={form.fuente}
                onChange={(e) => setForm({ ...form, fuente: e.target.value })}
              />
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                rows={3}
                placeholder="Notas adicionales..."
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1 gap-2">
                <Save className="w-4 h-4" />
                {submitting ? "Creando..." : "Crear Resolución"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
