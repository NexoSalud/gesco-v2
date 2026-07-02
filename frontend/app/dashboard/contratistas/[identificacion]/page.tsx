"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { buscarContratistas } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { KPISkeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { User, Phone, MapPin, FileText, ChevronLeft, Save } from "lucide-react"
import { toast } from "sonner"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

export default function ContratistaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const identificacion = decodeURIComponent(params.identificacion as string)

  const [contratista, setContratista] = useState<any>(null)
  const [contratos, setContratos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    tipo_persona: "NATURAL",
    expedida_en: "",
    telefono: "",
    direccion: "",
    correo: "",
  })
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const list = await buscarContratistas(identificacion)
      const match = list.find((c: any) => c.identificacion === identificacion)
      if (match) {
        setContratista(match)
        setForm({
          nombre: match.nombre || "",
          tipo_persona: match.tipo_persona || "NATURAL",
          expedida_en: match.expedida_en || "",
          telefono: match.telefono || "",
          direccion: match.direccion || "",
          correo: match.correo || "",
        })
      }
      // Load contratos usando contratista_id
      if (match && match.id) {
        const res = await fetch(`${API}/api/v1/contratos?contratista_id=${match.id}`)
        const data = await res.json()
        setContratos(data || [])
      } else {
        setContratos([])
      }
    } catch (e) {
      toast.error("Error cargando contratista")
    } finally {
      setLoading(false)
    }
  }, [identificacion])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/v1/contratistas/${encodeURIComponent(identificacion)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Contratista actualizado")
      setEditMode(false)
      loadData()
    } catch (e: any) {
      toast.error("Error: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        <KPISkeleton />
      </div>
    )
  }

  if (!contratista) {
    return (
      <div className="text-center py-16">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Contratista no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/contratistas")}>
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/dashboard/contratistas")}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Contratistas
          </button>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold text-gray-900">{contratista.nombre}</h1>
            <Badge variant="default">{contratista.tipo_persona}</Badge>
          </div>
        </div>
        <Button
          variant={editMode ? "default" : "outline"}
          size="sm"
          onClick={() => editMode ? handleSave() : setEditMode(true)}
          disabled={saving}
        >
          <Save className="w-4 h-4 mr-1" />
          {editMode ? (saving ? "Guardando..." : "Guardar") : "Editar"}
        </Button>
      </div>

      {/* Datos del contratista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <User className="w-4 h-4 inline mr-2" />
            Datos del Contratista
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Identificación</label>
                <Input value={identificacion} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Nombre Completo</label>
                <Input value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Tipo de Persona</label>
                <Select value={form.tipo_persona}
                  onChange={e => setForm({ ...form, tipo_persona: e.target.value })}>
                  <option value="NATURAL">NATURAL</option>
                  <option value="JURIDICA">JURIDICA</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Expedida en</label>
                <Input value={form.expedida_en}
                  onChange={e => setForm({ ...form, expedida_en: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Teléfono</label>
                <Input value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Correo</label>
                <Input value={form.correo}
                  onChange={e => setForm({ ...form, correo: e.target.value })} />
              </div>
              <div className="col-span-2 md:col-span-3 space-y-1">
                <label className="text-xs font-medium text-gray-500">Dirección</label>
                <Input value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Identificación</p>
                <p className="font-medium">{contratista.identificacion}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Nombre</p>
                <p className="font-medium">{contratista.nombre}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Tipo</p>
                <Badge variant="default">{contratista.tipo_persona}</Badge>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Expedida en</p>
                <p className="font-medium">{contratista.expedida_en || "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Teléfono</p>
                <p className="font-medium">{contratista.telefono || "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Correo</p>
                <p className="font-medium">{contratista.correo || "—"}</p>
              </div>
              <div className="col-span-2 md:col-span-3">
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Dirección</p>
                <p className="font-medium">{contratista.direccion || "—"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contratos asociados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <FileText className="w-4 h-4 inline mr-2" />
            Contratos Asociados ({contratos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contratos.length === 0 ? (
            <p className="text-gray-400 text-center py-6 text-sm">Sin contratos registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Contrato</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vigencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((c: any) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/dashboard/contratos/${encodeURIComponent(c.numero_contrato)}`)}
                  >
                    <TableCell className="font-medium">{c.numero_contrato}</TableCell>
                    <TableCell>{c.perfil || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.estado === "ACTIVO" ? "success" : c.estado === "ANULADO" ? "danger" : "warning"}>
                        {c.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>${(c.monto_total || 0).toLocaleString("es-CO")}</TableCell>
                    <TableCell className="text-sm">
                      {c.fecha_inicio || "—"} → {c.fecha_fin || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
