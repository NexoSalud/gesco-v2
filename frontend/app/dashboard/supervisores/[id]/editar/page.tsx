"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { ChevronLeft, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

export default function EditarSupervisorPage() {
  const params = useParams()
  const router = useRouter()
  const supervisorId = Number(params.id)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    cargo: "",
    nivel_profesional: "",
    telefono: "",
    correo: "",
  })

  useEffect(() => {
    fetch(`${API}/api/v1/supervisores/${supervisorId}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then(data => {
        setForm({
          nombre: data.nombre || "",
          cargo: data.cargo || "",
          nivel_profesional: data.nivel_profesional || "",
          telefono: data.telefono || "",
          correo: data.correo || "",
        })
      })
      .catch(() => {
        toast.error("Error cargando supervisor")
        router.push("/dashboard/supervisores")
      })
      .finally(() => setLoading(false))
  }, [supervisorId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/v1/supervisores/${supervisorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.text()).slice(0, 200))
      toast.success("Supervisor actualizado")
      router.push(`/dashboard/supervisores/${supervisorId}`)
    } catch (e: any) {
      toast.error("Error: " + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Volver
      </button>
      <h1 className="text-2xl font-bold text-gray-900">Editar Supervisor</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del Supervisor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-500">Nombre *</label>
              <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Cargo</label>
              <Input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}
                placeholder="Ej: COORDINADOR EBS" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Nivel Profesional</label>
              <Select value={form.nivel_profesional} onChange={e => setForm({ ...form, nivel_profesional: e.target.value })}>
                <option value="">Seleccionar...</option>
                <option value="UNIVERSITARIO">UNIVERSITARIO</option>
                <option value="TECNÓLOGO">TECNÓLOGO</option>
                <option value="TÉCNICO">TÉCNICO</option>
                <option value="ESPECIALISTA">ESPECIALISTA</option>
                <option value="MAESTRÍA">MAESTRÍA</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Teléfono</label>
              <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Correo</label>
              <Input type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Guardar Cambios
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
