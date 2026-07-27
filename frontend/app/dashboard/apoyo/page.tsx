"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  Loader2, Search, User, Plus, Pencil, Trash2, X,
  Save, Phone, Mail, RefreshCw, FileText, ListChecks,
  Upload, FileSpreadsheet, CheckCircle2, Download,
} from "lucide-react"
import {
  getApoyos, crearApoyo, actualizarApoyo, eliminarApoyo,
  getActividadesApoyo, crearActividadApoyo, eliminarActividadApoyo,
  importarApoyosExcel,
} from "@/lib/api"
import { toast } from "sonner"

interface Apoyo {
  id: number
  nombre: string
  identificacion: string
  telefono: string | null
  correo: string | null
  perfil: string | null
  activo: boolean
  created_at: string | null
}

interface Actividad {
  id: number
  apoyo_id: number
  descripcion: string
  tipo: string
  orden: number
}

// ─── Modal ────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

// ─── Activities Section ───────────────────────────────────────────────────

function ActivitiesPanel({ apoyoId }: { apoyoId: number }) {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)
  const [newDesc, setNewDesc] = useState("")
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const acts = await getActividadesApoyo(apoyoId)
      setActividades(acts)
    } catch { /* ignore */ }
    setLoading(false)
  }, [apoyoId])

  useEffect(() => { load() }, [load])

  const addActividad = async () => {
    if (!newDesc.trim()) return
    setAdding(true)
    try {
      await crearActividadApoyo(apoyoId, { descripcion: newDesc.trim(), orden: actividades.length + 1 })
      setNewDesc("")
      toast.success("Actividad agregada")
      load()
    } catch { toast.error("Error de conexión") }
    setAdding(false)
  }

  const deleteActividad = async (id: number) => {
    try {
      await eliminarActividadApoyo(id)
      toast.success("Actividad eliminada")
      load()
    } catch { toast.error("Error") }
  }

  return (
    <div>
      <p className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-1.5">
        <ListChecks className="w-4 h-4 text-emerald-600" />
        Actividades ({actividades.length})
      </p>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {actividades.map((a, i) => (
            <div key={a.id} className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
              <span className="font-bold text-gray-400 w-5 flex-shrink-0">#{i + 1}</span>
              <span className="flex-1 break-words">{a.descripcion}</span>
              <button onClick={() => deleteActividad(a.id)} className="p-0.5 hover:bg-red-100 rounded flex-shrink-0">
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addActividad()}
          placeholder="Nueva actividad..."
          className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button onClick={addActividad} disabled={adding || !newDesc.trim()}
          className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Agregar
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function ApoyoPage() {
  const [apoyos, setApoyos] = useState<Apoyo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedApoyo, setSelectedApoyo] = useState<Apoyo | null>(null)

  // Form state
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ nombre: "", identificacion: "", telefono: "", correo: "", perfil: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Import Excel
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const list = await getApoyos(q || undefined)
      setApoyos(list as Apoyo[])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm({ nombre: "", identificacion: "", telefono: "", correo: "", perfil: "" })
    setFormOpen(true)
  }

  const openEdit = (a: Apoyo) => {
    setEditingId(a.id)
    setForm({
      nombre: a.nombre,
      identificacion: a.identificacion,
      telefono: a.telefono || "",
      correo: a.correo || "",
      perfil: a.perfil || "",
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.nombre || !form.identificacion) {
      toast.error("Nombre e identificación son requeridos")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await actualizarApoyo(editingId, form)
        toast.success("Apoyo actualizado")
      } else {
        await crearApoyo(form)
        toast.success("Apoyo creado")
      }
      setFormOpen(false)
      load(search)
    } catch { toast.error("Error de conexión") }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await eliminarApoyo(deleteId)
      toast.success("Apoyo eliminado")
      setDeleteId(null)
      load(search)
    } catch { toast.error("Error") }
  }

  const handleImport = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error("Debes seleccionar un archivo Excel (.xlsx o .xls)")
      return
    }
    setImporting(true)
    setImportResult(null)
    try {
      const result = await importarApoyosExcel(file)
      setImportResult(result)
      toast.success(`Importación completada: ${result.creados} creados, ${result.actualizados} actualizados`)
      load(search)
    } catch {
      toast.error("Error al importar. Verifica el formato del archivo.")
    }
    setImporting(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImport(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-5 max-w-full pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Apoyo Administrativo
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona el personal de apoyo administrativo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(search)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200">
            <FileSpreadsheet className="w-4 h-4" /> Importar
          </button>
          <button
            onClick={() => {
              const token = localStorage.getItem("token")
              const url = `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/apoyo/informe-mensual?mes=${new Date().getMonth() + 1}&anio=${new Date().getFullYear()}`
              const xhr = new XMLHttpRequest()
              xhr.open("GET", url)
              xhr.setRequestHeader("Authorization", `Bearer ${token}`)
              xhr.responseType = "blob"
              xhr.onload = () => {
                if (xhr.status === 200) {
                  const link = document.createElement("a")
                  link.href = URL.createObjectURL(new Blob([xhr.response]))
                  link.download = `INFORME_ACTIVIDADES_APOYO_ADVO_EBS.docx`
                  link.click()
                  URL.revokeObjectURL(link.href)
                }
              }
              xhr.send()
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Informe
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && load(search)}
          placeholder="Buscar por nombre o identificación..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {apoyos.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No hay registros de apoyo administrativo.</p>
              <button onClick={openCreate} className="mt-3 text-sm text-purple-600 hover:underline">Crear primero</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium">Identificación</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Perfil</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contacto</th>
                    <th className="text-center px-4 py-3 font-medium">Estado</th>
                    <th className="text-right px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {apoyos.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{a.nombre}</p>
                            <p className="text-xs text-gray-400 sm:hidden">{a.perfil || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{a.identificacion}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        <span className="text-xs max-w-[200px] block truncate">{a.perfil || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                        {a.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{a.telefono}</span>}
                        {a.correo && <span className="flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{a.correo}</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {a.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(a)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => setSelectedApoyo(selectedApoyo?.id === a.id ? null : a)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Actividades"
                          >
                            <ListChecks className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => setDeleteId(a.id)}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Expanded activities panel */}
      {selectedApoyo && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-sm text-gray-800">{selectedApoyo.nombre}</span>
              <span className="text-xs text-gray-400">{selectedApoyo.perfil}</span>
            </div>
            <button onClick={() => setSelectedApoyo(null)} className="text-xs text-gray-500 hover:text-gray-700">Cerrar</button>
          </div>
          <ActivitiesPanel apoyoId={selectedApoyo.id} />
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? "Editar Apoyo" : "Nuevo Apoyo"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Nombre *</label>
            <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Identificación *</label>
            <input type="text" value={form.identificacion} onChange={e => setForm({ ...form, identificacion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Perfil / Rol</label>
            <input type="text" value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Teléfono</label>
              <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Correo</label>
              <input type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
            <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? "Actualizar" : "Crear"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Confirmar eliminación">
        <p className="text-sm text-gray-600">¿Estás seguro de eliminar este apoyo administrativo? Esta acción no se puede deshacer.</p>
        <div className="flex gap-3 justify-end pt-4">
          <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </div>
      </Modal>

      {/* Import Excel Modal */}
      <Modal open={importOpen} onClose={() => { setImportOpen(false); setImportResult(null) }} title="Importar desde Excel">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selecciona un archivo Excel con las columnas:{' '}
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">PERFIL | NOMBRE_COMPLETO | ORDEN | ACTIVIDAD</span>
          </p>
          <p className="text-xs text-gray-400">
            Si el apoyo ya existe, se actualizarán sus actividades. Si no existe, se creará automáticamente.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />

          {!importResult ? (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
              ) : (
                <><Upload className="w-4 h-4" /> Seleccionar archivo Excel</>
              )}
            </button>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 className="w-5 h-5" />
                Importación completada
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white rounded-lg p-2">
                  <p className="text-lg font-bold text-purple-600">{importResult.creados}</p>
                  <p className="text-xs text-gray-500">Creados</p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <p className="text-lg font-bold text-emerald-600">{importResult.actualizados}</p>
                  <p className="text-xs text-gray-500">Actualizados</p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <p className="text-lg font-bold text-blue-600">{importResult.total_actividades}</p>
                  <p className="text-xs text-gray-500">Actividades</p>
                </div>
              </div>
              <button
                onClick={() => { setImportOpen(false); setImportResult(null) }}
                className="w-full mt-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
