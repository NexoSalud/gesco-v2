"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { getContrato, getPerfiles, type Contrato } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

export default function EditarContratoPage() {
  const params = useParams()
  const router = useRouter()
  const numero = decodeURIComponent(params.numeroContrato as string)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [perfiles, setPerfiles] = useState<any[]>([])
  const [contrato, setContrato] = useState<Contrato | null>(null)

  const [form, setForm] = useState({
    estado: "",
    perfil: "",
    objeto: "",
    monto_total: 0,
    monto_transporte: 0,
    fecha_inicio: "",
    fecha_fin: "",
    supervisor: "",
    cedula_supervisor: "",
    cargo_supervisor: "",
    unidad_atencion: "",
    no_cdp: "",
    rubro: "",
    rp: "",
    lugar_ejecucion: "",
  })

  useEffect(() => {
    Promise.all([
      getContrato(numero),
      getPerfiles(),
    ]).then(([c, p]) => {
      setContrato(c)
      setPerfiles(p)
      setForm({
        estado: c.estado || "",
        perfil: c.perfil || "",
        objeto: c.objeto || "",
        monto_total: c.monto_total || 0,
        monto_transporte: c.monto_transporte || 0,
        fecha_inicio: c.fecha_inicio || "",
        fecha_fin: c.fecha_fin || "",
        supervisor: c.supervisor || "",
        cedula_supervisor: c.cedula_supervisor || "",
        cargo_supervisor: c.cargo_supervisor || "",
        unidad_atencion: c.unidad_atencion || "",
        no_cdp: c.no_cdp || "",
        rubro: c.rubro || "",
        rp: c.rp || "",
        lugar_ejecucion: c.lugar_ejecucion || "",
      })
    }).catch(() => {
      toast.error("Error cargando contrato")
      router.push("/dashboard/contratos")
    }).finally(() => setLoading(false))
  }, [numero, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body: any = {}
      for (const [key, val] of Object.entries(form)) {
        if (val !== "" && val !== null && val !== undefined) {
          body[key] = val
        }
      }
      const contratoId = contrato?.id
      if (!contratoId) { toast.error("Error: ID del contrato no disponible"); return }
      const res = await fetch(`${API}/api/v1/contratos/id/${contratoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.text()).slice(0, 200))
      toast.success("Contrato actualizado")
      router.push(`/dashboard/contratos/${encodeURIComponent(numero)}`)
    } catch (e: any) {
      toast.error("Error: " + e.message)
    } finally { setSaving(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
  }

  if (!contrato) return null

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Volver
      </button>
      <h1 className="text-2xl font-bold text-gray-900">Editar Contrato</h1>
      <p className="text-sm text-gray-500">{numero}</p>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Información General</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Estado</label>
              <Select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                <option value="ACTIVO">ACTIVO</option>
                <option value="EN_PROCESO">EN PROCESO</option>
                <option value="FINALIZADO">FINALIZADO</option>
                <option value="ANULADO">ANULADO</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Perfil</label>
              <Select value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value })}>
                <option value="">Seleccionar...</option>
                {perfiles.map((p: any) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Valor Total</label>
              <Input type="number" value={form.monto_total} onChange={e => setForm({ ...form, monto_total: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Valor Transporte</label>
              <Input type="number" value={form.monto_transporte} onChange={e => setForm({ ...form, monto_transporte: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Fecha Inicio</label>
              <Input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Fecha Fin</label>
              <Input type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Supervisor</label>
              <Input value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Cédula Supervisor</label>
              <Input value={form.cedula_supervisor} onChange={e => setForm({ ...form, cedula_supervisor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Cargo Supervisor</label>
              <Input value={form.cargo_supervisor} onChange={e => setForm({ ...form, cargo_supervisor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Unidad de Atención</label>
              <Input value={form.unidad_atencion} onChange={e => setForm({ ...form, unidad_atencion: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Presupuesto y CDP</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">CDP No.</label>
              <Input value={form.no_cdp} onChange={e => setForm({ ...form, no_cdp: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">CRP No.</label>
              <Input value={form.rp} onChange={e => setForm({ ...form, rp: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-500">Rubro</label>
              <Input value={form.rubro} onChange={e => setForm({ ...form, rubro: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-500">Lugar de Ejecución</label>
              <Input value={form.lugar_ejecucion} onChange={e => setForm({ ...form, lugar_ejecucion: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Objeto del Contrato</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={5} value={form.objeto} onChange={e => setForm({ ...form, objeto: e.target.value })} className="resize-y" />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Guardar Cambios
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
