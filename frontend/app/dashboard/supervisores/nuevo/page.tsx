"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { ChevronLeft, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

export default function NuevoSupervisorPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    identificacion: "",
    cargo: "",
    nivel_profesional: "",
    telefono: "",
    correo: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.identificacion.trim()) {
      toast.error("Nombre e identificación son obligatorios")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/v1/supervisores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.text()).slice(0, 200))
      const data = await res.json()
      toast.success("Supervisor creado exitosamente")
      router.push(`/dashboard/supervisores/${data.id}`)
    } catch (e: any) {
      toast.error("Error: " + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Volver
      </button>
      <h1 className="text-2xl font-bold text-gray-900">Nuevo Supervisor</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del Supervisor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-500">Nombre *</label>
              <Input value={form.nombre} onChange={e => handleChange("nombre", e.target.value)}
                placeholder="Nombre completo" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Identificación *</label>
              <Input value={form.identificacion} onChange={e => handleChange("identificacion", e.target.value)}
                placeholder="Cédula" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Cargo</label>
              <Input value={form.cargo} onChange={e => handleChange("cargo", e.target.value)}
                placeholder="Ej: COORDINADOR EBS" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Nivel Profesional</label>
              <Select value={form.nivel_profesional} onChange={e => handleChange("nivel_profesional", e.target.value)}>
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
              <Input value={form.telefono} onChange={e => handleChange("telefono", e.target.value)}
                placeholder="Teléfono" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Correo</label>
              <Input type="email" value={form.correo} onChange={e => handleChange("correo", e.target.value)}
                placeholder="correo@ejemplo.com" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Crear Supervisor
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
