"use client"

import { useState, useEffect, useCallback } from "react"
import { getPerfiles, updatePerfil } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { TableSkeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    </div>
  )
}
