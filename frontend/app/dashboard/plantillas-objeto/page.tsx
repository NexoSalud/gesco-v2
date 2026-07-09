"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, FileText, Loader2 } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

interface PlantillaObjeto {
  id: number
  titulo: string
  contenido: string
}

export default function PlantillasObjetoPage() {
  const [plantillas, setPlantillas] = useState<PlantillaObjeto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ titulo: "", contenido: "" })

  const load = async () => {
    try {
      const res = await fetch(`${API}/api/v1/plantillas-objeto`)
      setPlantillas(await res.json())
    } catch { toast.error("Error cargando plantillas") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditId(null); setForm({ titulo: "", contenido: "" }); setModalOpen(true) }

  const openEdit = (p: PlantillaObjeto) => {
    setEditId(p.id); setForm({ titulo: p.titulo, contenido: p.contenido }); setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.contenido.trim()) {
      toast.error("Título y contenido son obligatorios"); return
    }
    setSaving(true)
    try {
      const url = editId
        ? `${API}/api/v1/plantillas-objeto/${editId}`
        : `${API}/api/v1/plantillas-objeto`
      const method = editId ? "PUT" : "POST"
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.text()).slice(0, 200))
      toast.success(editId ? "Plantilla actualizada" : "Plantilla creada")
      setModalOpen(false); load()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`${API}/api/v1/plantillas-objeto/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
      toast.success("Plantilla eliminada"); setDeleteId(null); load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Objeto</h1>
          <p className="text-gray-500 mt-1">Textos reutilizables para el objeto del contrato</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Nueva Plantilla</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : plantillas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">No hay plantillas de objeto</p>
          <Button variant="default" size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" />Crear primera plantilla
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plantillas.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-sm font-semibold">{p.titulo}</CardTitle>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Eliminar plantilla</AlertDialogTitle>
                          <AlertDialogDescription>¿Eliminar "{p.titulo}"?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 line-clamp-4 whitespace-pre-wrap">{p.contenido}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Editar Plantilla" : "Nueva Plantilla"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Título</label>
              <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Medicina General" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Contenido</label>
              <Textarea rows={8} value={form.contenido} onChange={e => setForm({ ...form, contenido: e.target.value })} className="resize-y" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editId ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
