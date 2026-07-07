"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getPerfiles, getResoluciones, buscarContratistas, createPago } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { User, Search, ChevronLeft, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"
const fmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

export default function NuevoContratoPage() {
  const router = useRouter()
  const [perfiles, setPerfiles] = useState<any[]>([])
  const [resoluciones, setResoluciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Buscador contratista
  const [busquedaCont, setBusquedaCont] = useState("")
  const [resultadosCont, setResultadosCont] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [contratistaSel, setContratistaSel] = useState<any | null>(null)
  const [buscando, setBuscando] = useState(false)

  // Form
  const [form, setForm] = useState({
    numero_contrato: "",
    resolucion_id: 0,
    perfil: "",
    monto_total: 0,
    fecha_inicio: "",
    fecha_fin: "",
    supervisor: "",
    objeto: "",
  })

  const [contratistaForm, setContratistaForm] = useState({
    nombre: "",
    identificacion: "",
    expedida_en: "",
    telefono: "",
    direccion: "",
  })

  useEffect(() => {
    Promise.all([
      getPerfiles(),
      getResoluciones(),
    ]).then(([p, r]) => {
      setPerfiles(p)
      setResoluciones(r || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Búsqueda de contratista (debounced)
  useEffect(() => {
    if (busquedaCont.length < 3) { setResultadosCont([]); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        const res = await buscarContratistas(busquedaCont)
        setResultadosCont(res || [])
        setShowDropdown(true)
      } catch { setResultadosCont([]) }
      finally { setBuscando(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [busquedaCont])

  const seleccionarContratista = (c: any) => {
    setContratistaSel(c)
    setContratistaForm({
      nombre: c.nombre || "",
      identificacion: c.identificacion || "",
      expedida_en: c.expedida_en || "",
      telefono: c.telefono || "",
      direccion: c.direccion || "",
    })
    setShowDropdown(false)
    setBusquedaCont("")
  }

  const limpiarContratista = () => {
    setContratistaSel(null)
    setContratistaForm({ nombre: "", identificacion: "", expedida_en: "", telefono: "", direccion: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.numero_contrato.trim() || !form.perfil) {
      toast.error("Completa los campos requeridos")
      return
    }
    setSubmitting(true)
    try {
      if (!form.resolucion_id) {
        toast.error("Debes seleccionar una resolución")
        setSubmitting(false)
        return
      }

      const body: any = {
        numero_contrato: form.numero_contrato.trim(),
        resolucion_id: form.resolucion_id,
        perfil: form.perfil,
        estado: "ACTIVO",
        monto_total: form.monto_total || 0,
        supervisor: form.supervisor || "",
        objeto: form.objeto || "",
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
      }

      if (contratistaSel) {
        body.contratista_id = contratistaSel.id
      } else if (contratistaForm.identificacion) {
        body.contratista_identificacion = contratistaForm.identificacion
        body.contratista_nombre = contratistaForm.nombre
        body.contratista_expedida_en = contratistaForm.expedida_en
        body.contratista_telefono = contratistaForm.telefono
        body.contratista_direccion = contratistaForm.direccion
      } else {
        toast.error("Debes seleccionar o crear un contratista")
        setSubmitting(false)
        return
      }

      const res = await fetch(`${API}/api/v1/contratos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.text()).slice(0, 200))
      const contrato = await res.json()
      toast.success("Contrato creado exitosamente")
      router.push(`/dashboard/contratos/${encodeURIComponent(contrato.numero_contrato)}`)
    } catch (e: any) {
      toast.error("Error: " + e.message)
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Volver
      </button>
      <h1 className="text-2xl font-bold text-gray-900">Nuevo Contrato</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* ─── CONTRATISTA ─── */}
        <Card>
          <CardHeader><CardTitle className="text-base"><User className="w-4 h-4 inline mr-2" />Contratista</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {contratistaSel ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div>
                  <p className="font-semibold text-emerald-800">{contratistaSel.nombre}</p>
                  <p className="text-sm text-emerald-600">CC: {contratistaSel.identificacion}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={limpiarContratista}>Cambiar</Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <label className="text-xs font-medium text-gray-500">Buscar contratista existente</label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input className="pl-9" placeholder="Escriba CC/NIT o nombre..." value={busquedaCont}
                        onChange={e => setBusquedaCont(e.target.value)} />
                    </div>
                    {buscando && <Loader2 className="w-5 h-5 animate-spin mt-2" />}
                  </div>
                  {showDropdown && resultadosCont.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {resultadosCont.map((c: any) => (
                        <div key={c.id} className="p-2 hover:bg-gray-50 cursor-pointer border-b"
                          onClick={() => seleccionarContratista(c)}>
                          <p className="font-medium text-sm">{c.nombre}</p>
                          <p className="text-xs text-gray-400">{c.identificacion} - {c.telefono || ""}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400 text-center">— O crea uno nuevo —</div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-gray-500">Nombre*</label>
                    <Input value={contratistaForm.nombre} onChange={e => setContratistaForm({ ...contratistaForm, nombre: e.target.value })}
                      placeholder="Nombre completo" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">CC/NIT*</label>
                    <Input value={contratistaForm.identificacion} onChange={e => setContratistaForm({ ...contratistaForm, identificacion: e.target.value })}
                      placeholder="Identificación" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Expedida en</label>
                    <Input value={contratistaForm.expedida_en} onChange={e => setContratistaForm({ ...contratistaForm, expedida_en: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Teléfono</label>
                    <Input value={contratistaForm.telefono} onChange={e => setContratistaForm({ ...contratistaForm, telefono: e.target.value })} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-gray-500">Dirección</label>
                    <Input value={contratistaForm.direccion} onChange={e => setContratistaForm({ ...contratistaForm, direccion: e.target.value })} />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── DATOS DEL CONTRATO ─── */}
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del Contrato</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-500">Número de Contrato*</label>
              <Input value={form.numero_contrato} onChange={e => setForm({ ...form, numero_contrato: e.target.value })} placeholder="Ej: 001 del 01/01/2026" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Resolución*</label>
              <Select value={form.resolucion_id} onChange={e => setForm({ ...form, resolucion_id: parseInt(e.target.value) || 0 })}>
                <option value={0}>Seleccionar...</option>
                {resoluciones.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.codigo}{r.vigencia ? ` — ${r.vigencia}` : ""}{r.activa ? " (ACTIVA)" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Perfil*</label>
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
              <label className="text-xs font-medium text-gray-500">Supervisor</label>
              <Input value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Fecha Inicio</label>
              <Input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Fecha Fin</label>
              <Input type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-500">Objeto</label>
              <Textarea rows={3} value={form.objeto} onChange={e => setForm({ ...form, objeto: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            Crear Contrato
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
