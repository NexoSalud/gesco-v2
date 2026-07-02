"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getPerfiles, getActividades, createActividad, deleteActividad,
  createPerfil, updatePerfil, deletePerfil,
  type ActividadPerfil,
} from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TableSkeleton } from "@/components/ui/skeleton"
import {
  Users, Briefcase, Activity, Plus, Trash2, Loader2, Save, X,
} from "lucide-react"
import { toast } from "sonner"

export default function PerfilesPage() {
  const [perfiles, setPerfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Edit modal
  const [selectedPerfil, setSelectedPerfil] = useState<any | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // New perfil
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newObj, setNewObj] = useState("")
  const [creating, setCreating] = useState(false)

  // Actividades
  const [actividades, setActividades] = useState<ActividadPerfil[]>([])
  const [nuevaActividad, setNuevaActividad] = useState("")
  const [addingActividad, setAddingActividad] = useState(false)

  const loadPerfiles = useCallback(() => {
    getPerfiles().then(setPerfiles).catch(() => {})
  }, [])

  useEffect(() => {
    loadPerfiles()
    setLoading(false)
  }, [loadPerfiles])

  const openModal = useCallback(async (perfil: any) => {
    setSelectedPerfil(perfil)
    setNuevaActividad("")
    setModalOpen(true)
    try { setActividades(await getActividades(perfil.id)) }
    catch { setActividades([]) }
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setSelectedPerfil(null)
    setActividades([])
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedPerfil) return
    setSaving(true)
    try {
      await updatePerfil(selectedPerfil.id, {
        nombre: selectedPerfil.nombre,
        objeto: selectedPerfil.objeto || "",
        obligaciones_json: selectedPerfil.obligaciones_json || "[]",
        notas_internas: selectedPerfil.notas_internas || "",
      })
      toast.success("Perfil actualizado")
      loadPerfiles()
    } catch { toast.error("Error al guardar perfil") }
    finally { setSaving(false) }
  }, [selectedPerfil, loadPerfiles])

  const handleDelete = useCallback(async () => {
    if (!selectedPerfil) return
    try {
      await deletePerfil(selectedPerfil.id)
      toast.success("Perfil eliminado")
      setShowDeleteConfirm(false)
      closeModal()
      loadPerfiles()
    } catch { toast.error("Error al eliminar perfil") }
  }, [selectedPerfil, closeModal, loadPerfiles])

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createPerfil({
        nombre: newName.trim().toUpperCase(),
        objeto: newObj || "",
        obligaciones_json: "[]",
      })
      toast.success("Perfil creado")
      setShowNewForm(false)
      setNewName("")
      setNewObj("")
      loadPerfiles()
    } catch { toast.error("Error al crear perfil") }
    finally { setCreating(false) }
  }, [newName, newObj, loadPerfiles])

  const handleAddAct = useCallback(async () => {
    if (!nuevaActividad.trim() || !selectedPerfil) return
    setAddingActividad(true)
    try {
      const nextOrden = actividades.length > 0 ? Math.max(...actividades.map(a => a.orden)) + 1 : 1
      const created = await createActividad(selectedPerfil.id, nuevaActividad.trim(), nextOrden)
      setActividades(p => [...p, created])
      setNuevaActividad("")
      loadPerfiles()
    } catch { console.error }
    finally { setAddingActividad(false) }
  }, [nuevaActividad, selectedPerfil, actividades, loadPerfiles])

  const handleDeleteAct = useCallback(async (id: number) => {
    try {
      await deleteActividad(id)
      setActividades(p => p.filter(a => a.id !== id))
      loadPerfiles()
    } catch { console.error }
  }, [loadPerfiles])

  const handleObjChange = useCallback((e: any) => {
    if (!selectedPerfil) return
    setSelectedPerfil({ ...selectedPerfil, objeto: e.target.value })
  }, [selectedPerfil])

  const getObligs = useCallback((): string[] => {
    if (!selectedPerfil?.obligaciones_json) return []
    try { const p = JSON.parse(selectedPerfil.obligaciones_json); return Array.isArray(p) ? p : [] }
    catch { return [] }
  }, [selectedPerfil])

  const handleObligChange = useCallback((i: number, v: string) => {
    if (!selectedPerfil) return
    const o = getObligs(); o[i] = v
    setSelectedPerfil({ ...selectedPerfil, obligaciones_json: JSON.stringify(o) })
  }, [selectedPerfil, getObligs])

  const handleAddOblig = useCallback(() => {
    if (!selectedPerfil) return
    const o = getObligs()
    setSelectedPerfil({ ...selectedPerfil, obligaciones_json: JSON.stringify([...o, ""]) })
  }, [selectedPerfil, getObligs])

  const handleRemoveOblig = useCallback((i: number) => {
    if (!selectedPerfil) return
    const o = getObligs(); o.splice(i, 1)
    setSelectedPerfil({ ...selectedPerfil, obligaciones_json: JSON.stringify(o) })
  }, [selectedPerfil, getObligs])

  if (loading) {
    return <div className="space-y-6 animate-fade-in"><div><h1 className="text-2xl font-bold text-gray-900">Perfiles</h1></div><TableSkeleton rows={6} cols={3} /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfiles</h1>
          <p className="text-gray-500 mt-1">{perfiles.length} perfil{perfiles.length !== 1 ? "es" : ""} registrado{perfiles.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowNewForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Perfil
        </Button>
      </div>

      {perfiles.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay perfiles registrados</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {perfiles.map((p: any, i: number) => (
            <Card key={p.id || i} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openModal(p)}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{p.nombre || `Perfil #${i + 1}`}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="default" className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />{(p.actividades?.length ?? 0)} actividades
                      </Badge>
                    </div>
                  </div>
                </div>
                {p.actividades?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Actividades</p>
                    <ul className="space-y-1">
                      {p.actividades.slice(0, 5).map((a: any, j: number) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                          {a.descripcion || a}
                        </li>
                      ))}
                      {p.actividades.length > 5 && <li className="text-xs text-gray-400 ml-3.5">+{p.actividades.length - 5} más</li>}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Modal editar ──────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>{selectedPerfil?.nombre || "Editar perfil"}</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Guardar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {selectedPerfil && (
            <Tabs defaultValue="objeto">
              <TabsList className="w-full">
                <TabsTrigger value="objeto" className="flex-1">Objeto del contrato</TabsTrigger>
                <TabsTrigger value="obligaciones" className="flex-1">Obligaciones</TabsTrigger>
                <TabsTrigger value="actividades" className="flex-1">Actividades</TabsTrigger>
              </TabsList>

              <TabsContent value="objeto" className="space-y-4">
                <Textarea value={selectedPerfil.objeto || ""} onChange={handleObjChange} rows={8} className="resize-y" />
              </TabsContent>

              <TabsContent value="obligaciones" className="space-y-4">
                {getObligs().length === 0 && <p className="text-sm text-gray-400 text-center py-6">No hay obligaciones.</p>}
                {getObligs().map((o: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-sm font-medium text-gray-400 mt-2.5 min-w-[1.5rem]">{i + 1}.</span>
                    <Textarea value={o} onChange={e => handleObligChange(i, e.target.value)} rows={2} className="flex-1 resize-y" />
                    <Button variant="ghost" size="icon" className="mt-1 text-red-500" onClick={() => handleRemoveOblig(i)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddOblig} className="w-full"><Plus className="w-4 h-4 mr-1" /> Agregar obligación</Button>
              </TabsContent>

              <TabsContent value="actividades" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input value={nuevaActividad} onChange={e => setNuevaActividad(e.target.value)}
                    placeholder="Nueva actividad..." onKeyDown={e => { if (e.key === "Enter" && !addingActividad) handleAddAct() }} />
                  <Button onClick={handleAddAct} disabled={!nuevaActividad.trim() || addingActividad} size="sm">
                    {addingActividad ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Agregar
                  </Button>
                </div>
                {actividades.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No hay actividades registradas.</p>
                ) : (
                  <ul className="space-y-2">
                    {actividades.map(a => (
                      <li key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 group">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">{a.orden}</span>
                        <span className="flex-1 text-sm text-gray-700">{a.descripcion}</span>
                        <Button variant="ghost" size="icon" className="text-red-400 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteAct(a.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Confirmar eliminacion ─────────────────────────────────────── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar perfil</AlertDialogTitle>
            <AlertDialogDescription>¿Estás seguro de eliminar el perfil <strong>{selectedPerfil?.nombre}</strong>? Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Modal nuevo perfil ────────────────────────────────────────── */}
      <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Perfil</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nombre del perfil</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: MEDICINA" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Objeto contractual</label>
              <Textarea value={newObj} onChange={e => setNewObj(e.target.value)} rows={4} placeholder="Describe el objeto del contrato..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Crear Perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
