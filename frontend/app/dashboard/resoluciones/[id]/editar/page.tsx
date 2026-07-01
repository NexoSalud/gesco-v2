"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getResolucion, updateResolucion } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, Save } from "lucide-react"
import { toast } from "sonner"

export default function EditarResolucionPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [form, setForm] = useState({
    codigo: "",
    titulo: "",
    vigencia: new Date().getFullYear(),
    fuente: "",
    presupuesto: 0,
    indirect_percentage: 0,
    notas: "",
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getResolucion(id)
      .then((r) => {
        setForm({
          codigo: r.codigo,
          titulo: r.titulo || "",
          vigencia: r.vigencia || new Date().getFullYear(),
          fuente: "", // Si el backend no devuelve fuente, se deja vacío
          presupuesto: r.presupuesto,
          indirect_percentage: r.indirect_percentage,
          notas: r.notas || "",
        })
      })
      .catch(() => {
        toast.error("Error cargando resolución")
        router.push("/dashboard/resoluciones")
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updateResolucion(id, form)
      toast.success("Resolución actualizada")
      router.push(`/dashboard/resoluciones/${id}`)
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Editar Resolución</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Código</label>
                <Input value={form.codigo}
                  onChange={e => setForm({ ...form, codigo: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Vigencia</label>
                <Input type="number" value={form.vigencia}
                  onChange={e => setForm({ ...form, vigencia: parseInt(e.target.value) || 2026 })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Título</label>
              <Input value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })} />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Presupuesto</label>
                <Input type="number" value={form.presupuesto}
                  onChange={e => setForm({ ...form, presupuesto: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">% Costos Indirectos</label>
                <Input type="number" step="0.1" value={form.indirect_percentage}
                  onChange={e => setForm({ ...form, indirect_percentage: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas</label>
              <Textarea rows={3} value={form.notas}
                onChange={e => setForm({ ...form, notas: e.target.value })} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1 gap-2">
                <Save className="w-4 h-4" />
                {submitting ? "Guardando..." : "Guardar Cambios"}
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
