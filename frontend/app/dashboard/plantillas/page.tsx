"use client"

import { useState, useEffect } from "react"
import {
  getPlantillas, createPlantilla, updatePlantilla, deletePlantilla,
} from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { KPISkeleton } from "@/components/ui/skeleton"
import { Plus, FileText, Calendar, Pencil, Trash2, BookTemplate } from "lucide-react"
import { toast } from "sonner"

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal create/edit
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<any | null>(null)
  const [form, setForm] = useState({ titulo: "", contenido: "" })
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Preview
  const [previewId, setPreviewId] = useState<number | null>(null)

  const loadPlantillas = async () => {
    try {
      const data = await getPlantillas()
      setPlantillas(data)
    } catch {
      toast.error("Error cargando plantillas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPlantillas() }, [])

  const abrirNueva = () => {
    setEditando(null)
    setForm({ titulo: "", contenido: "" })
    setShowModal(true)
  }

  const abrirEditar = (p: any) => {
    setEditando(p)
    setForm({ titulo: p.titulo, contenido: p.contenido })
    setShowModal(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim()) {
      toast.error("El título es requerido")
      return
    }
    if (!form.contenido.trim()) {
      toast.error("El contenido es requerido")
      return
    }
    setSubmitting(true)
    try {
      if (editando) {
        await updatePlantilla(editando.id, form)
        toast.success("Plantilla actualizada")
      } else {
        await createPlantilla(form)
        toast.success("Plantilla creada")
      }
      setShowModal(false)
      loadPlantillas()
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEliminar = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      await deletePlantilla(deleteId)
      toast.success("Plantilla eliminada")
      setDeleteId(null)
      loadPlantillas()
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Observación</h1>
        </div>
        <KPISkeleton />
      </div>
    )
  }

  const previewPlantilla = previewId !== null ? plantillas.find(p => p.id === previewId) : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Observación</h1>
          <p className="text-gray-500 mt-1">
            {plantillas.length} plantilla{plantillas.length !== 1 ? "s" : ""} registrada{plantillas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button className="gap-2" onClick={abrirNueva}>
          <Plus className="w-4 h-4" />
          Nueva Plantilla
        </Button>
      </div>

      {plantillas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BookTemplate className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No hay plantillas registradas</p>
            <p className="text-xs text-gray-400 mb-4">
              Las plantillas se usan para precargar observaciones en los informes de supervisión
            </p>
            <Button variant="outline" onClick={abrirNueva}>
              <Plus className="w-4 h-4 mr-1" />
              Crear primera plantilla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plantillas.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{p.titulo}</h3>
                    {p.created_at && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.created_at).toLocaleDateString("es-CO")}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-500 line-clamp-4 flex-1 whitespace-pre-line">
                  {p.contenido}
                </p>

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => setPreviewId(p.id)}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Vista
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => abrirEditar(p)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50 gap-1"
                    onClick={() => setDeleteId(p.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Create / Edit */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Plantilla" : "Nueva Plantilla"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardar} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Título <span className="text-red-500">*</span></label>
              <Input
                placeholder="Ej: Observación estándar mensual"
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contenido <span className="text-red-500">*</span></label>
              <Textarea
                rows={10}
                placeholder="Escribe el contenido de la plantilla..."
                value={form.contenido}
                onChange={e => setForm({ ...form, contenido: e.target.value })}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-400">
                El contenido se usará como texto predefinido en las observaciones de supervisión.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando..." : editando ? "Actualizar" : "Crear Plantilla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewId !== null} onOpenChange={(open) => { if (!open) setPreviewId(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewPlantilla?.titulo || "Vista previa"}</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-50 rounded-xl p-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {previewPlantilla?.contenido || ""}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewId(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La plantilla se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleEliminar}>
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
