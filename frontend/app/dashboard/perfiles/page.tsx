"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getPerfiles,
  getActividades,
  createActividad,
  deleteActividad,
  type ActividadPerfil,
} from "@/lib/api"
import { getPerfiles, updatePerfil } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { TableSkeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
 feature/editor-plantillas
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,

} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Briefcase, Activity, Plus, Trash2, Loader2 } from "lucide-react"

  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Users, Briefcase, FileText, Plus, Trash2, Save } from "lucide-react"
import { toast } from "sonner"

interface Perfil {
  id: number
  nombre: string
  objeto: string | null
  obligaciones_json: string | null
  notas_internas: string | null
  actividades: { id: number; descripcion: string; orden: number }[]
}

export default function PerfilesPage() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [selectedPerfil, setSelectedPerfil] = useState<any | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Actividades state
  const [actividades, setActividades] = useState<ActividadPerfil[]>([])
  const [nuevaActividad, setNuevaActividad] = useState("")
  const [addingActividad, setAddingActividad] = useState(false)

  useEffect(() => {
  // Dialog state
  const [selectedPerfil, setSelectedPerfil] = useState<Perfil | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [objeto, setObjeto] = useState("")
  const [obligaciones, setObligaciones] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const loadPerfiles = useCallback(() => {
    setLoading(true)
    getPerfiles()
      .then(setPerfiles)
      .catch(() => toast.error("Error al cargar perfiles"))
      .finally(() => setLoading(false))
  }, [])

  const openModal = useCallback(async (perfil: any) => {
    setSelectedPerfil(perfil)
    setNuevaActividad("")
    setModalOpen(true)
    try {
      const acts = await getActividades(perfil.id)
      setActividades(acts)
    } catch {
      setActividades([])
    }
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setSelectedPerfil(null)
    setActividades([])
    setNuevaActividad("")
  }, [])

  const handleAddActividad = useCallback(async () => {
    if (!nuevaActividad.trim() || !selectedPerfil) return
    setAddingActividad(true)
    try {
      const nextOrden =
        actividades.length > 0
          ? Math.max(...actividades.map((a) => a.orden)) + 1
          : 1
      const created = await createActividad(
        selectedPerfil.id,
        nuevaActividad.trim(),
        nextOrden
      )
      setActividades((prev) => [...prev, created])
      setNuevaActividad("")
      // Refresh perfil list so cards show updated count
      getPerfiles().then(setPerfiles).catch(() => {})
    } catch (e) {
      console.error(e)
    } finally {
      setAddingActividad(false)
    }
  }, [nuevaActividad, selectedPerfil, actividades])

  const handleDeleteActividad = useCallback(
    async (actividadId: number) => {
      try {
        await deleteActividad(actividadId)
        setActividades((prev) => prev.filter((a) => a.id !== actividadId))
        // Refresh perfil list so cards show updated count
        getPerfiles().then(setPerfiles).catch(() => {})
      } catch (e) {
        console.error(e)
      }
    },
    []
  )

  const handleObligacionesChange = useCallback(
    (index: number, value: string) => {
      if (!selectedPerfil) return
      const obligs = getObligacionesArray()
      obligs[index] = value
      const updated = { ...selectedPerfil, obligaciones_json: JSON.stringify(obligs) }
      setSelectedPerfil(updated)
    },
    [selectedPerfil]
  )

  const handleAddObligacion = useCallback(() => {
    if (!selectedPerfil) return
    const obligs = getObligacionesArray()
    setSelectedPerfil({
      ...selectedPerfil,
      obligaciones_json: JSON.stringify([...obligs, ""]),
    })
  }, [selectedPerfil])

  const handleRemoveObligacion = useCallback(
    (index: number) => {
      if (!selectedPerfil) return
      const obligs = getObligacionesArray()
      obligs.splice(index, 1)
      setSelectedPerfil({
        ...selectedPerfil,
        obligaciones_json: JSON.stringify(obligs),
      })
    },
    [selectedPerfil]
  )

  const getObligacionesArray = useCallback((): string[] => {
    if (!selectedPerfil?.obligaciones_json) return []
    try {
      const parsed = JSON.parse(selectedPerfil.obligaciones_json)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [selectedPerfil])
  useEffect(() => {
    loadPerfiles()
  }, [loadPerfiles])

  // ── Open editor dialog ──────────────────────────────────────────────────

  const openEditor = (perfil: Perfil) => {
    setSelectedPerfil(perfil)
    setObjeto(perfil.objeto ?? "")

    // Parse obligaciones_json — may be JSON array, empty string, or null
    let parsed: string[] = []
    if (perfil.obligaciones_json) {
      try {
        const raw = JSON.parse(perfil.obligaciones_json)
        if (Array.isArray(raw)) parsed = raw.map(String)
      } catch {
        parsed = []
      }
    }
    setObligaciones(parsed)

    setDialogOpen(true)
  }

  const closeEditor = () => {
    setDialogOpen(false)
    setSelectedPerfil(null)
  }

  // ── Obligations management ──────────────────────────────────────────────

  const addObligacion = () => setObligaciones((prev) => [...prev, ""])

  const updateObligacion = (index: number, value: string) => {
    setObligaciones((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const removeObligacion = (index: number) => {
    setObligaciones((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedPerfil) return

    setSaving(true)
    try {
      // Filter out empty obligations
      const obligacionesFiltradas = obligaciones.filter((o) => o.trim() !== "")

      await updatePerfil(selectedPerfil.id, {
        nombre: selectedPerfil.nombre,
        objeto: objeto.trim(),
        obligaciones_json: JSON.stringify(obligacionesFiltradas),
        notas_internas: selectedPerfil.notas_internas,
      })

      toast.success("Perfil actualizado correctamente")
      closeEditor()
      loadPerfiles()
    } catch (err: any) {
      toast.error(err?.message ?? "Error al guardar el perfil")
    } finally {
      setSaving(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + "…" : text

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfiles</h1>
        </div>
        <TableSkeleton rows={6} cols={3} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfiles</h1>
          <p className="text-gray-500 mt-1">
            {perfiles.length} perfil{perfiles.length !== 1 ? "es" : ""} registrado
            {perfiles.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {perfiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay perfiles registrados</p>
          </CardContent>
        </Card>
      ) : (
        /* Grid of clickable cards */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {perfiles.map((perfil: any, idx: number) => (
            <Card
              key={perfil.id || idx}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openModal(perfil)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {perfil.nombre || perfil.perfil || `Perfil #${idx + 1}`}
                    </h3>
                    {perfil.descripcion && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {perfil.descripcion}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="default" className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {(perfil.actividades?.length ?? 0)} actividades
                      </Badge>
                      {perfil.contratos_count !== undefined && (
                        <Badge variant="info">{perfil.contratos_count} contratos</Badge>
          {perfiles.map((perfil) => {
            // Parse obligations for badge
            let obligacionesList: string[] = []
            if (perfil.obligaciones_json) {
              try {
                const raw = JSON.parse(perfil.obligaciones_json)
                if (Array.isArray(raw)) obligacionesList = raw.filter(Boolean)
              } catch {
                // ignore
              }
            }

            return (
              <Card
                key={perfil.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEditor(perfil)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {perfil.nombre}
                      </h3>

                      {/* Truncated object */}
                      {perfil.objeto && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {truncate(perfil.objeto, 120)}
                        </p>
                      )}

                      {/* Badges */}
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        <Badge
                          variant="default"
                          className="flex items-center gap-1 text-xs"
                        >
                          <FileText className="w-3 h-3" />
                          {perfil.actividades?.length ?? 0} actividades
                        </Badge>

                        {obligacionesList.length > 0 && (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 text-xs"
                          >
                            <FileText className="w-3 h-3" />
                            {obligacionesList.length} obligacione
                            {obligacionesList.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Existing activities */}
                  {perfil.actividades && perfil.actividades.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Actividades
                      </p>
                      <ul className="space-y-1">
                        {perfil.actividades.slice(0, 5).map((act) => (
                          <li
                            key={act.id}
                            className="flex items-start gap-2 text-xs text-gray-600"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                            {act.descripcion}
                          </li>
                        ))}
                        {perfil.actividades.length > 5 && (
                          <li className="text-xs text-gray-400 ml-3.5">
                            +{perfil.actividades.length - 5} más
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Editor Dialog ──────────────────────────────────────────────────── */}
      {selectedPerfil && (
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeEditor()}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Editor: {selectedPerfil.nombre}
              </DialogTitle>
              <DialogDescription>
                Configura el objeto del contrato y las obligaciones específicas
                para este perfil.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Objeto del contrato */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Objeto del contrato
                </label>
                <Textarea
                  value={objeto}
                  onChange={(e) => setObjeto(e.target.value)}
                  placeholder="Describe el objeto del contrato para este perfil…"
                  className="min-h-24 resize-y"
                />
              </div>

              {/* Obligaciones específicas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Obligaciones específicas
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addObligacion}
                    type="button"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar obligación
                  </Button>
                </div>

                {perfil.actividades && perfil.actividades.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Actividades
                    </p>
                    <ul className="space-y-1">
                      {perfil.actividades.slice(0, 5).map((act: string, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-gray-600"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                          {act}
                        </li>
                      ))}
                      {perfil.actividades.length > 5 && (
                        <li className="text-xs text-gray-400 ml-3.5">
                          +{perfil.actividades.length - 5} más
                        </li>
                      )}
                    </ul>
                  </div>
                {obligaciones.length === 0 && (
                  <p className="text-sm text-gray-400 italic py-3 text-center border border-dashed border-gray-200 rounded-lg">
                    No hay obligaciones registradas. Haz clic en &quot;Agregar obligación&quot; para añadir una.
                  </p>
                )}

                <div className="space-y-3">
                  {obligaciones.map((obl, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold mt-2 flex-shrink-0">
                        {i + 1}
                      </span>
                      <Textarea
                        value={obl}
                        onChange={(e) => updateObligacion(i, e.target.value)}
                        placeholder={`Obligación específica #${i + 1}…`}
                        className="min-h-16 resize-y text-sm flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeObligacion(i)}
                        type="button"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-1 flex-shrink-0"
                        title="Eliminar obligación"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeEditor} type="button">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} type="button">
                <Save className="w-4 h-4 mr-1.5" />
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de edición de perfil */}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPerfil?.nombre || "Editar perfil"}
            </DialogTitle>
          </DialogHeader>

          {selectedPerfil && (
            <Tabs defaultValue="objeto">
              <TabsList className="w-full">
                <TabsTrigger value="objeto" className="flex-1">
                  Objeto del contrato
                </TabsTrigger>
                <TabsTrigger value="obligaciones" className="flex-1">
                  Obligaciones
                </TabsTrigger>
                <TabsTrigger value="actividades" className="flex-1">
                  Actividades del perfil
                </TabsTrigger>
              </TabsList>

              {/* ─── Tab 1: Objeto del contrato ────────────────────────────── */}
              <TabsContent value="objeto" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Objeto contractual
                  </label>
                  <Textarea
                    value={selectedPerfil.objeto || ""}
                    onChange={(e) =>
                      setSelectedPerfil({
                        ...selectedPerfil,
                        objeto: e.target.value,
                      })
                    }
                    placeholder="Describe el objeto del contrato para este perfil..."
                    rows={8}
                    className="resize-y"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Este texto se usará como objeto predeterminado al crear contratos
                  con este perfil.
                </p>
              </TabsContent>

              {/* ─── Tab 2: Obligaciones específicas ──────────────────────── */}
              <TabsContent value="obligaciones" className="space-y-4">
                <div className="space-y-3">
                  {getObligacionesArray().length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">
                      No hay obligaciones registradas. Agrega la primera.
                    </p>
                  )}
                  {getObligacionesArray().map((obl: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-sm font-medium text-gray-400 mt-2.5 min-w-[1.5rem]">
                        {i + 1}.
                      </span>
                      <Textarea
                        value={obl}
                        onChange={(e) =>
                          handleObligacionesChange(i, e.target.value)
                        }
                        placeholder="Describe la obligación..."
                        rows={2}
                        className="flex-1 resize-y"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-1 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        onClick={() => handleRemoveObligacion(i)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddObligacion}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar obligación
                </Button>
              </TabsContent>

              {/* ─── Tab 3: Actividades del perfil ────────────────────────── */}
              <TabsContent value="actividades" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={nuevaActividad}
                    onChange={(e) => setNuevaActividad(e.target.value)}
                    placeholder="Nueva actividad..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !addingActividad) {
                        handleAddActividad()
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddActividad}
                    disabled={!nuevaActividad.trim() || addingActividad}
                    size="sm"
                  >
                    {addingActividad ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Agregar
                  </Button>
                </div>

                {actividades.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No hay actividades registradas. Agrega la primera usando el
                    campo de arriba.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {actividades.map((act) => (
                      <li
                        key={act.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group"
                      >
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          {act.orden}
                        </span>
                        <span className="flex-1 text-sm text-gray-700">
                          {act.descripcion}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => handleDeleteActividad(act.id)}
                        >
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
    </div>
  )
}
