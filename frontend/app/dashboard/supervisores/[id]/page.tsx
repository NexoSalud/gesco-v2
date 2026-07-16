"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { KPISkeleton } from "@/components/ui/skeleton"
import { User, Phone, Briefcase, Mail, ChevronLeft, Save, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

export default function SupervisorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supervisorId = Number(params.id)

  const [supervisor, setSupervisor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    cargo: "",
    nivel_profesional: "",
    telefono: "",
    correo: "",
  })
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/v1/supervisores/${supervisorId}`)
      if (!res.ok) throw new Error("Not found")
      const data = await res.json()
      setSupervisor(data)
      setForm({
        nombre: data.nombre || "",
        cargo: data.cargo || "",
        nivel_profesional: data.nivel_profesional || "",
        telefono: data.telefono || "",
        correo: data.correo || "",
      })
    } catch (e) {
      toast.error("Error cargando supervisor")
      router.push("/dashboard/supervisores")
    } finally {
      setLoading(false)
    }
  }, [supervisorId, router])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/v1/supervisores/${supervisorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Supervisor actualizado")
      setEditMode(false)
      loadData()
    } catch (e: any) {
      toast.error("Error: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/api/v1/supervisores/${supervisorId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Supervisor eliminado")
      router.push("/dashboard/supervisores")
    } catch (e: any) {
      toast.error("Error: " + e.message)
    } finally {
      setShowDelete(false)
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

  if (!supervisor) {
    return (
      <div className="text-center py-16">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Supervisor no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/supervisores")}>
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
            onClick={() => router.push("/dashboard/supervisores")}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Supervisores
          </button>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold text-gray-900">{supervisor.nombre}</h1>
            <Badge variant="default">CC: {supervisor.identificacion}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => editMode ? handleSave() : setEditMode(true)}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-1" />
            {editMode ? (saving ? "Guardando..." : "Guardar") : "Editar"}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-4 h-4 mr-1" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Datos del supervisor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <User className="w-4 h-4 inline mr-2" />
            Datos del Supervisor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-500">Nombre Completo</label>
                <Input value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Identificación</label>
                <Input value={supervisor.identificacion} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Cargo</label>
                <Input value={form.cargo}
                  onChange={e => setForm({ ...form, cargo: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Nivel Profesional</label>
                <Select value={form.nivel_profesional}
                  onChange={e => setForm({ ...form, nivel_profesional: e.target.value })}>
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
                <Input value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Correo</label>
                <Input type="email" value={form.correo}
                  onChange={e => setForm({ ...form, correo: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Identificación</p>
                <p className="font-medium">{supervisor.identificacion}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Nombre</p>
                <p className="font-medium">{supervisor.nombre}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Cargo</p>
                <p className="font-medium">{supervisor.cargo || "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Nivel Profesional</p>
                <p className="font-medium">{supervisor.nivel_profesional || "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Teléfono</p>
                <p className="font-medium">{supervisor.telefono || "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Correo</p>
                <p className="font-medium">{supervisor.correo || "—"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Eliminar */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Supervisor</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar a <strong>{supervisor.nombre}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
