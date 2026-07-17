"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { buscarContratistas, descargarActaDocx } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { KPISkeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { User, Phone, MapPin, FileText, ChevronLeft, Save, Package, Boxes, Plus, Eye, Download, Search, FileCheck, X } from "lucide-react"
import { toast } from "sonner"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

export default function ContratistaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const identificacion = decodeURIComponent(params.identificacion as string)

  const [contratista, setContratista] = useState<any>(null)
  const [contratos, setContratos] = useState<any[]>([])
  const [inventario, setInventario] = useState<{ unidades: any[]; dotacion: any[]; insumos: any[] }>({
    unidades: [],
    dotacion: [],
    insumos: [],
  })
  const [actas, setActas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Actas search & pagination
  const [actasSearch, setActasSearch] = useState("")
  const [actasPage, setActasPage] = useState(1)
  const actasPerPage = 5

  // Details Modal
  const [selectedActa, setSelectedActa] = useState<any | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const handleOpenDetails = async (actaId: number) => {
    setLoadingDetails(true)
    setShowDetailsModal(true)
    setSelectedActa(null)
    try {
      const res = await fetch(`${API}/api/v1/inventario/actas/${actaId}`)
      if (!res.ok) throw new Error("Error cargando los detalles del acta")
      const data = await res.json()
      setSelectedActa(data)
    } catch (e: any) {
      toast.error(e.message)
      setShowDetailsModal(false)
    } finally {
      setLoadingDetails(false)
    }
  }

  // Devolución selection state
  const [selectedUnidades, setSelectedUnidades] = useState<number[]>([])
  const [selectedDotaciones, setSelectedDotaciones] = useState<number[]>([])
  const [selectedInsumos, setSelectedInsumos] = useState<number[]>([])

  const handleDevolverSeleccion = () => {
    let contratoId: number | null = null
    
    if (selectedUnidades.length > 0) {
      const match = inventario.unidades.find((u) => u.id === selectedUnidades[0])
      if (match?.contrato_id) contratoId = match.contrato_id
    } else if (selectedDotaciones.length > 0) {
      const match = inventario.dotacion.find((d) => d.articulo_id === selectedDotaciones[0])
      if (match?.contrato_id) contratoId = match.contrato_id
    } else if (selectedInsumos.length > 0) {
      const match = (inventario.insumos || []).find((i) => i.articulo_id === selectedInsumos[0])
      if (match?.contrato_id) contratoId = match.contrato_id
    }

    if (!contratoId) {
      toast.error("Por favor, seleccione al menos un equipo, dotación o insumo para devolver.")
      return
    }

    const selectedContratoIds = new Set<number>()
    selectedUnidades.forEach((id) => {
      const match = inventario.unidades.find((u) => u.id === id)
      if (match?.contrato_id) selectedContratoIds.add(match.contrato_id)
    })
    selectedDotaciones.forEach((artId) => {
      const match = inventario.dotacion.find((d) => d.articulo_id === artId)
      if (match?.contrato_id) selectedContratoIds.add(match.contrato_id)
    })
    selectedInsumos.forEach((artId) => {
      const match = (inventario.insumos || []).find((i) => i.articulo_id === artId)
      if (match?.contrato_id) selectedContratoIds.add(match.contrato_id)
    })

    if (selectedContratoIds.size > 1) {
      toast.warning("Ha seleccionado elementos de diferentes contratos. Solo se procesarán los del contrato principal seleccionado.")
    }

    const unidadesParam = selectedUnidades
      .filter((id) => inventario.unidades.find((u) => u.id === id)?.contrato_id === contratoId)
      .join(",")
    
    const matchedDotaciones = selectedDotaciones.filter(
      (artId) => inventario.dotacion.find((d) => d.articulo_id === artId)?.contrato_id === contratoId
    )
    const matchedInsumos = selectedInsumos.filter(
      (artId) => (inventario.insumos || []).find((i) => i.articulo_id === artId)?.contrato_id === contratoId
    )
    const dotacionParam = [...matchedDotaciones, ...matchedInsumos].join(",")

    router.push(`/dashboard/inventario?contrato_id=${contratoId}&action=devolucion&selected_unidades=${unidadesParam}&selected_dotacion=${dotacionParam}`)
  }

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
      // Load contratos, inventario & actas usando contratista_id
      if (match && match.id) {
        const res = await fetch(`${API}/api/v1/contratos?contratista_id=${match.id}`)
        const data = await res.json()
        setContratos(data || [])

        const invRes = await fetch(`${API}/api/v1/inventario/contratista/${match.id}`)
        if (invRes.ok) {
          const invData = await invRes.json()
          setInventario(invData || { unidades: [], dotacion: [], insumos: [] })
        }

        const actasRes = await fetch(`${API}/api/v1/inventario/actas/contratista/${match.id}`)
        if (actasRes.ok) {
          const actasData = await actasRes.json()
          setActas(actasData || [])
        }
      } else {
        setContratos([])
        setInventario({ unidades: [], dotacion: [], insumos: [] })
        setActas([])
      }
    } catch (e) {
      toast.error("Error cargando contratista")
    } finally {
      setLoading(false)
    }
  }, [identificacion])

  useEffect(() => { loadData() }, [loadData])

  // Filter actas
  const filteredActas = actas.filter((a: any) => {
    const searchLower = actasSearch.toLowerCase()
    return (
      a.tipo.toLowerCase().includes(searchLower) ||
      a.categoria.toLowerCase().includes(searchLower) ||
      (a.numero_contrato || "").toLowerCase().includes(searchLower) ||
      a.fecha.includes(searchLower)
    )
  })

  const totalActasPages = Math.ceil(filteredActas.length / actasPerPage)
  const paginatedActas = filteredActas.slice(
    (actasPage - 1) * actasPerPage,
    actasPage * actasPerPage
  )


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
                  <TableHead className="text-right">Acciones de Inventario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((c: any) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-gray-50/75 transition-colors"
                    onClick={() => router.push(`/dashboard/contratos/${encodeURIComponent(c.numero_contrato)}`)}
                  >
                    <TableCell className="font-semibold text-gray-900">{c.numero_contrato}</TableCell>
                    <TableCell>{c.perfil || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.estado === "ACTIVO" ? "success" : c.estado === "ANULADO" ? "danger" : "warning"}>
                        {c.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-gray-800">${(c.monto_total || 0).toLocaleString("es-CO")}</TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {c.fecha_inicio || "—"} → {c.fecha_fin || "—"}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {c.estado === "ACTIVO" ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200 font-bold text-[10px] h-7 px-2.5 transition-all cursor-pointer"
                            onClick={() => router.push(`/dashboard/inventario?contrato_id=${c.id}&action=entrega`)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Entregar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200 font-bold text-[10px] h-7 px-2.5 transition-all cursor-pointer"
                            onClick={() => router.push(`/dashboard/inventario?contrato_id=${c.id}&action=devolucion`)}
                          >
                            <Boxes className="w-3 h-3 mr-1" />
                            Devolver
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs font-semibold">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Actas de Inventario */}
      <Card className="border border-gray-150 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              Actas de Inventario Generadas ({actas.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar acta..."
                value={actasSearch}
                onChange={(e) => {
                  setActasSearch(e.target.value)
                  setActasPage(1)
                }}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredActas.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No se encontraron actas generadas.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-600">Tipo de Acta</TableHead>
                      <TableHead className="font-semibold text-gray-600">Categoría</TableHead>
                      <TableHead className="font-semibold text-gray-600">Contrato Asociado</TableHead>
                      <TableHead className="font-semibold text-gray-600">Fecha</TableHead>
                      <TableHead className="font-semibold text-gray-600 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedActas.map((acta: any) => (
                      <TableRow key={acta.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="font-medium text-xs">
                          <Badge variant={acta.tipo === "ENTREGA" ? "success" : "warning"}>
                            {acta.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-gray-800">
                          {acta.categoria}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-700">
                          {acta.numero_contrato || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {acta.fecha}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200 font-bold text-[10px] h-7 px-2.5 transition-all cursor-pointer"
                              onClick={() => handleOpenDetails(acta.id)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Ver Detalles
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200 font-bold text-[10px] h-7 px-2.5 transition-all cursor-pointer"
                              onClick={() => descargarActaDocx(acta.id)}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Descargar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalActasPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 px-2">
                  <span className="text-xs font-semibold text-gray-500">
                    Mostrando página {actasPage} de {totalActasPages} ({filteredActas.length} actas en total)
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 cursor-pointer font-bold"
                      onClick={() => setActasPage((p) => Math.max(1, p - 1))}
                      disabled={actasPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 cursor-pointer font-bold"
                      onClick={() => setActasPage((p) => Math.min(totalActasPages, p + 1))}
                      disabled={actasPage === totalActasPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventario Asignado */}
      <Card className="border border-gray-150 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Equipos e Inventario Asignado
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold border border-blue-100">
                {inventario.unidades.length} Serializados
              </span>
              <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-semibold border border-purple-100">
                {inventario.dotacion.length} Dotación
              </span>
              <span className="text-xs bg-pink-50 text-pink-700 px-2.5 py-1 rounded-full font-semibold border border-pink-100">
                {(inventario.insumos || []).length} Insumos
              </span>
              {(selectedUnidades.length > 0 || selectedDotaciones.length > 0 || selectedInsumos.length > 0) && (
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 cursor-pointer font-bold ml-2 transition-all"
                  onClick={handleDevolverSeleccion}
                >
                  <Boxes className="w-3.5 h-3.5 mr-1" />
                  Devolver Selección ({selectedUnidades.length + selectedDotaciones.length + selectedInsumos.length})
                </Button>
              )}
              {contratos.some((c) => c.estado === "ACTIVO") && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 cursor-pointer font-bold ml-2"
                  onClick={() => {
                    const firstActive = contratos.find((c) => c.estado === "ACTIVO")
                    if (firstActive) {
                      router.push(`/dashboard/inventario?contrato_id=${firstActive.id}&action=entrega`)
                    }
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Asignar Inventario
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {inventario.unidades.length === 0 && inventario.dotacion.length === 0 && (!inventario.insumos || inventario.insumos.length === 0) ? (
            <div className="text-center py-10">
              <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Este contratista no tiene equipos, dotación ni insumos asignados actualmente.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sección 1: Equipos Serializados */}
              {inventario.unidades.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 border-b pb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Equipos Tecnológicos y Biomédicos
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow>
                          <TableHead className="w-12 text-center">
                            <input
                              type="checkbox"
                              className="cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              checked={inventario.unidades.length > 0 && selectedUnidades.length === inventario.unidades.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUnidades(inventario.unidades.map(u => u.id))
                                } else {
                                  setSelectedUnidades([])
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead className="font-semibold text-gray-600">Tipo</TableHead>
                          <TableHead className="font-semibold text-gray-600">Elemento</TableHead>
                          <TableHead className="font-semibold text-gray-600">Marca / Modelo</TableHead>
                          <TableHead className="font-semibold text-gray-600">Serial (IMEI 1)</TableHead>
                          <TableHead className="font-semibold text-gray-600">IMEI 2</TableHead>
                          <TableHead className="font-semibold text-gray-600">Contrato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventario.unidades.map((u: any) => (
                          <TableRow key={u.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                className="cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                checked={selectedUnidades.includes(u.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUnidades([...selectedUnidades, u.id])
                                  } else {
                                    setSelectedUnidades(selectedUnidades.filter(id => id !== u.id))
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium text-xs">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.tipo_elemento.includes("BIOMEDICO") 
                                  ? "bg-cyan-50 text-cyan-700 border border-cyan-150" 
                                  : "bg-blue-50 text-blue-700 border border-blue-150"
                              }`}>
                                {u.tipo_elemento}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-gray-800">{u.elemento}</TableCell>
                            <TableCell className="text-sm text-gray-600">{u.marca} / {u.modelo}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-700 font-semibold">{u.serial}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-500">{u.imei2 || "N/A"}</TableCell>
                            <TableCell className="text-sm">
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                                {u.numero_contrato}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Sección 2: Dotación */}
              {inventario.dotacion.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 border-b pb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Dotación
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow>
                          <TableHead className="w-12 text-center">
                            <input
                              type="checkbox"
                              className="cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              checked={inventario.dotacion.length > 0 && selectedDotaciones.length === inventario.dotacion.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDotaciones(inventario.dotacion.map(d => d.articulo_id))
                                } else {
                                  setSelectedDotaciones([])
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead className="font-semibold text-gray-600">Tipo</TableHead>
                          <TableHead className="font-semibold text-gray-600">Elemento</TableHead>
                          <TableHead className="font-semibold text-gray-600 text-center">Cantidad Asignada</TableHead>
                          <TableHead className="font-semibold text-gray-600">Contrato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventario.dotacion.map((d: any, idx: number) => (
                          <TableRow key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                className="cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                checked={selectedDotaciones.includes(d.articulo_id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDotaciones([...selectedDotaciones, d.articulo_id])
                                  } else {
                                    setSelectedDotaciones(selectedDotaciones.filter(artId => artId !== d.articulo_id))
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium text-xs">
                              <span className="bg-purple-50 text-purple-700 border border-purple-150 px-2 py-0.5 rounded text-[10px] font-bold">
                                {d.tipo_elemento || "DOTACION"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-gray-800">{d.elemento}</TableCell>
                            <TableCell className="text-sm font-bold text-center text-gray-900">
                              <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full text-xs">
                                {d.cantidad} ud
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                                {d.numero_contrato}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Sección 3: Insumos */}
              {inventario.insumos && inventario.insumos.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 border-b pb-1">
                    <span className="w-2 h-2 rounded-full bg-pink-500" />
                    Insumos
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow>
                          <TableHead className="w-12 text-center">
                            <input
                              type="checkbox"
                              className="cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              checked={inventario.insumos.length > 0 && selectedInsumos.length === inventario.insumos.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInsumos(inventario.insumos.map(i => i.articulo_id))
                                } else {
                                  setSelectedInsumos([])
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead className="font-semibold text-gray-600">Tipo</TableHead>
                          <TableHead className="font-semibold text-gray-600">Elemento</TableHead>
                          <TableHead className="font-semibold text-gray-600 text-center">Cantidad Asignada</TableHead>
                          <TableHead className="font-semibold text-gray-600">Contrato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventario.insumos.map((i: any, idx: number) => (
                          <TableRow key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                className="cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                checked={selectedInsumos.includes(i.articulo_id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedInsumos([...selectedInsumos, i.articulo_id])
                                  } else {
                                    setSelectedInsumos(selectedInsumos.filter(artId => artId !== i.articulo_id))
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium text-xs">
                              <span className="bg-pink-50 text-pink-700 border border-pink-150 px-2 py-0.5 rounded text-[10px] font-bold">
                                {i.tipo_elemento || "INSUMO"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-gray-800">{i.elemento}</TableCell>
                            <TableCell className="text-sm font-bold text-center text-gray-900">
                              <span className="bg-pink-100 text-pink-800 px-2.5 py-0.5 rounded-full text-xs">
                                {i.cantidad} ud
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                                {i.numero_contrato}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detalles de Acta */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Detalles del Acta
                </h3>
                {selectedActa && (
                  <p className="text-xs text-gray-500 mt-1">
                    Acta de {selectedActa.tipo} ({selectedActa.categoria}) — Contrato: {selectedActa.numero_contrato || "N/A"}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="text-xs text-gray-500">Cargando detalles de la transacción...</span>
              </div>
            ) : selectedActa ? (
              <div className="space-y-4">
                {/* Meta details grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-gray-400 block">Fecha de Generación</span>
                    <span className="font-semibold text-gray-800">{selectedActa.fecha}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Gestionado por (ESE)</span>
                    <span className="font-semibold text-gray-800">{selectedActa.recibido_entregado_por || "Coordinador"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Total Items Transados</span>
                    <span className="font-semibold text-gray-800">
                      {selectedActa.movimientos?.reduce((acc: number, m: any) => acc + m.cantidad, 0) || 0} unidades
                    </span>
                  </div>
                </div>

                {/* Table of items */}
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-600 text-xs">Elemento</TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs">Marca / Modelo</TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs">Serial / IMEI 2</TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs text-center">Cantidad</TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs">Estado</TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs">Observaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {selectedActa.movimientos?.map((mov: any) => (
                        <TableRow key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-bold text-gray-800">{mov.elemento}</TableCell>
                          <TableCell className="text-gray-600">
                            {mov.marca || mov.modelo ? `${mov.marca || "—"} / ${mov.modelo || "—"}` : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-gray-700">
                            {mov.serial ? (
                              <div className="space-y-0.5">
                                <div className="font-semibold">{mov.serial}</div>
                                {mov.imei2 && <div className="text-[10px] text-gray-400">IMEI 2: {mov.imei2}</div>}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-bold text-gray-900">{mov.cantidad}</TableCell>
                          <TableCell>
                            <Badge variant={mov.estado_declarado === "BUEN_ESTADO" || mov.estado_declarado === "DISPONIBLE" || mov.estado_declarado === "Excelente" ? "success" : "warning"}>
                              {mov.estado_declarado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500 max-w-xs truncate" title={mov.observaciones}>
                            {mov.observaciones || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 text-sm">
                No se pudo cargar el detalle del acta.
              </div>
            )}

            <div className="flex justify-end pt-2 border-t font-semibold">
              <Button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-4 py-2 cursor-pointer"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
