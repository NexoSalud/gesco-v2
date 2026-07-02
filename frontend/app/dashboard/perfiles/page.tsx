"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getPerfiles,
  getActividades,
  createActividad,
  deleteActividad,
  type ActividadPerfil,
} from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Briefcase, Activity, Plus, Trash2, Loader2 } from "lucide-react"

export default function PerfilesPage() {
  const [perfiles, setPerfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [selectedPerfil, setSelectedPerfil] = useState<any | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Actividades state
  const [actividades, setActividades] = useState<ActividadPerfil[]>([])
  const [nuevaActividad, setNuevaActividad] = useState("")
  const [addingActividad, setAddingActividad] = useState(false)

  useEffect(() => {
    getPerfiles()
      .then(setPerfiles)
      .catch(() => {})
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
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfiles</h1>
          <p className="text-gray-500 mt-1">
            {perfiles.length} perfil{perfiles.length !== 1 ? "es" : ""} registrado
            {perfiles.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {perfiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay perfiles registrados</p>
          </CardContent>
        </Card>
      ) : (
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
                      )}
                    </div>
                  </div>
                </div>

                {perfil.actividades && perfil.actividades.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Actividades
                    </p>
                    <ul className="space-y-1">
                      {perfil.actividades.slice(0, 5).map((act: any, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-gray-600"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                          {act.descripcion || act}
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
          ))}
        </div>
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
