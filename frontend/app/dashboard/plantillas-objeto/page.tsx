"use client"

import { useState, useEffect } from "react"
import {
  getPlantillasObjeto, createPlantillaObjeto, updatePlantillaObjeto, deletePlantillaObjeto,
  type PlantillaObjeto,
} from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, FileText, Pencil, Trash2, BookTemplate } from "lucide-react"
import { toast } from "sonner"

export default function PlantillasObjetoPage() {
  const [plantillas, setPlantillas] = useState<PlantillaObjeto[]>([])
  const [loading, setLoading] = useState(true)

  // Modal create/edit
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<PlantillaObjeto | null>(null)
  const [form, setForm] = useState({ titulo: "", contenido: "" })
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog
  const [deleteItem, setDeleteItem] = useState<PlantillaObjeto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      const data = await getPlantillasObjeto()
      setPlantillas(data)
    } catch {
      toast.error("Error cargando plantillas de objeto")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const abrirNueva = () => {
    setEditando(null)
    setForm({ titulo: "", contenido: "" })
    setShowModal(true)
  }

  const abrirEditar = (p: PlantillaObjeto) => {
    setEditando(p)
    setForm({ titulo: p.titulo, contenido: p.contenido })
    setShowModal(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim()) { toast.error("El título es requerido"); return }
    if (!form.contenido.trim()) { toast.error("El contenido es requerido"); return }
    setSubmitting(true)
    try {
      if (editando) {
        await updatePlantillaObjeto(editando.id, form)
        toast.success("Plantilla actualizada")
      } else {
        await createPlantillaObjeto(form)
        toast.success("Plantilla creada")
      }
      setShowModal(false)
      load()
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEliminar = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await deletePlantillaObjeto(deleteItem.id)
      toast.success("Plantilla eliminada")
      setDeleteItem(null)
      load()
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
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Objeto</h1>
        </div>
        <KPISkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Objeto</h1>
          <p className="text-gray-500 mt-1">
            {plantillas.length} plantilla{plantillas.length !== 1 ? "s" : ""} registrada{plantillas.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Textos reutilizables para el objeto del contrato — se usan al crear/editar contratos
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
            <p className="text-gray-500 text-lg mb-2">No hay plantillas de objeto</p>
            <p className="text-xs text-gray-400 mb-4">
              Las plantillas de objeto se usan para precargar la descripción del objeto del contrato
            </p>
            <Button variant="outline" onClick={abrirNueva}>
              <Plus className="w-4 h-4 mr-1" />
              Crear primera plantilla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plantillas.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{p.titulo}</h3>
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
                    onClick={() => abrirEditar(p)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50 gap-1"
                    onClick={() => setDeleteItem(p)}
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
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) setShowModal(false) }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Plantilla" : "Nueva Plantilla"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardar} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Título <span className="text-red-500">*</span></label>
              <Input
                placeholder="Ej: Medicina General"
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contenido <span className="text-red-500">*</span></label>
              <Textarea
                rows={8}
                placeholder="Escribe la descripción del objeto del contrato..."
                value={form.contenido}
                onChange={e => setForm({ ...form, contenido: e.target.value })}
                className="resize-y"
              />
              <p className="text-xs text-gray-400">
                Este texto se usará como contenido predefinido del objeto del contrato.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando..." : editando ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteItem !== null} onOpenChange={(open) => { if (!open) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la plantilla <strong>{deleteItem?.titulo}</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleEliminar}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
