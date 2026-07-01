"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  getResolucion, getContratos, getPerfilesPredefinidos,
  createContrato, descargarDocx, descargarExcelResolucion,
  descargarPdfsMasivos, registrarCuota, anularContrato,
  type Resolucion, type Contrato, type ResolucionAnalytics,
  getResolucionAnalytics,
} from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge, getEstadoBadgeVariant } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { KPISkeleton, TableSkeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft, Plus, FileDown, FileText, AlertTriangle,
  Wallet, TrendingUp, DollarSign, Users, Download,
  ChevronLeft, X, Search, Filter,
} from "lucide-react"
import { toast } from "sonner"

const fmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

export default function ResolucionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)

  const [resolucion, setResolucion] = useState<Resolucion | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [perfiles, setPerfiles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<ResolucionAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("contratos")
  const [filterEstado, setFilterEstado] = useState("")
  const [filterBuscar, setFilterBuscar] = useState("")

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [newForm, setNewForm] = useState({
    numero_contrato: "",
    contratista_identificacion: "",
    contratista_nombre: "",
    contratista_expedida_en: "",
    contratista_telefono: "",
    contratista_direccion: "",
    contratista_correo: "",
    perfil: "",
    objeto: "",
    monto_total: 0,
    monto_transporte: 0,
    no_cdp: "",
    fecha_inicio: "",
    fecha_fin: "",
    fecha_contrato: "",
    supervisor: "",
    cedula_supervisor: "",
    cargo_supervisor: "",
    unidad_atencion: "",
    cuotas: "1",
    cuotas_total: 1,
    lugar_ejecucion: "",
    costo_tipo: "DIRECTO",
  })
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const [res, cons, perf] = await Promise.all([
        getResolucion(id),
        getContratos({ resolucion_id: id }),
        getPerfilesPredefinidos(),
      ])
      setResolucion(res)
      setContratos(cons)
      setPerfiles(perf.perfiles)
    } catch (e) {
      toast.error("Error cargando datos")
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

  // Load analytics when the analytics tab is active
  useEffect(() => {
    if (activeTab === "analytics") {
      setAnalyticsLoading(true)
      getResolucionAnalytics(id)
        .then(setAnalytics)
        .catch(() => toast.error("Error cargando analytics"))
        .finally(() => setAnalyticsLoading(false))
    }
  }, [activeTab, id])

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createContrato({ ...newForm, resolucion_id: id })
      setShowModal(false)
      toast.success("Contrato creado exitosamente")
      loadData()
      resetForm()
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setNewForm({
      numero_contrato: "", contratista_identificacion: "", contratista_nombre: "",
      contratista_expedida_en: "", contratista_telefono: "", contratista_direccion: "",
      contratista_correo: "", perfil: "", objeto: "", monto_total: 0,
      monto_transporte: 0, no_cdp: "", fecha_inicio: "", fecha_fin: "",
      fecha_contrato: "", supervisor: "", cedula_supervisor: "",
      cargo_supervisor: "", unidad_atencion: "", cuotas: "1", cuotas_total: 1,
      lugar_ejecucion: "", costo_tipo: "DIRECTO",
    })
  }

  const refreshContracts = () => {
    getContratos({ resolucion_id: id }).then(setContratos)
  }

  const handleAnular = async (numero: string) => {
    try {
      await anularContrato(numero, "Anulado desde resolución")
      toast.success(`Contrato ${numero} anulado`)
      refreshContracts()
    } catch (err: any) {
      toast.error("Error: " + err.message)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <KPISkeleton />
        <TableSkeleton rows={8} cols={6} />
      </div>
    )
  }

  if (!resolucion) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Resolución no encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Volver al Dashboard
        </Button>
      </div>
    )
  }

  const totalComprometido = contratos
    .filter(c => c.estado !== "ANULADO")
    .reduce((s, c) => s + c.monto_total + (c.monto_transporte || 0), 0)

  const saldo = resolucion.presupuesto - totalComprometido
  const activos = contratos.filter(c => c.estado === "ACTIVO").length
  const anulados = contratos.filter(c => c.estado === "ANULADO").length
  const enProceso = contratos.filter(c => c.estado === "EN_PROCESO").length
  const finalizados = contratos.filter(c => c.estado === "FINALIZADO").length

  // Filter contracts for table
  const filteredContratos = contratos.filter((c) => {
    if (filterEstado && c.estado !== filterEstado) return false
    if (filterBuscar) {
      const q = filterBuscar.toLowerCase()
      return (
        c.numero_contrato.toLowerCase().includes(q) ||
        (c.contratista_rel?.nombre?.toLowerCase().includes(q) ?? false) ||
        (c.perfil?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  // Analytics: profesionales por tipo
  const perfilesMap = new Map<string, number>()
  contratos.forEach((c) => {
    if (c.perfil) {
      perfilesMap.set(c.perfil, (perfilesMap.get(c.perfil) || 0) + 1)
    }
  })
  const perfilesAnalytics = Array.from(perfilesMap.entries()).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/dashboard/resoluciones")}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver a resoluciones
          </button>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold text-gray-900">{resolucion.codigo}</h1>
            <Badge variant="info">{resolucion.vigencia || "—"}</Badge>
            <Badge
              variant={
                saldo >= 0 ? "success" : "danger"
              }
            >
              {saldo >= 0 ? "Con saldo" : "Excedido"}
            </Badge>
          </div>
          {resolucion.titulo && (
            <p className="text-gray-500">{resolucion.titulo}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Link href={`/dashboard/resoluciones/${id}/editar`}>
            <Button variant="outline" size="sm">Editar</Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => descargarExcelResolucion(id)}
          >
            <FileDown className="w-4 h-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => descargarPdfsMasivos(id)}
          >
            <Download className="w-4 h-4" />
            PDFs Masivos
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            Contrato
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Presupuesto</p>
              <Wallet className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold">{fmt.format(resolucion.presupuesto)}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comprometido</p>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-amber-600">{fmt.format(totalComprometido)}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo</p>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <p className={`text-xl font-bold ${saldo < 0 ? "text-red-600" : "text-emerald-600"}`}>
              {saldo < 0 ? `- ${fmt.format(Math.abs(saldo))}` : fmt.format(saldo)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contratos</p>
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold">{contratos.length}</p>
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-emerald-600">{activos} activos</span>
              <span className="text-gray-400">·</span>
              <span className="text-amber-600">{enProceso} en proceso</span>
              <span className="text-gray-400">·</span>
              <span className="text-red-600">{anulados} anulados</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contratos">
            Contratos ({contratos.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="exportar">Exportar</TabsTrigger>
        </TabsList>

        {/* ── TAB: Contratos ── */}
        <TabsContent value="contratos" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar contrato..."
                className="pl-10"
                value={filterBuscar}
                onChange={(e) => setFilterBuscar(e.target.value)}
              />
            </div>
            <Select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-40"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="FINALIZADO">Finalizados</option>
              <option value="ANULADO">Anulados</option>
            </Select>
            {(filterEstado || filterBuscar) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterEstado(""); setFilterBuscar("") }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          {/* Table */}
          {filteredContratos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {contratos.length === 0
                  ? "No hay contratos en esta resolución"
                  : "No se encontraron contratos con los filtros actuales"}
              </p>
              {contratos.length === 0 && (
                <Button className="mt-3" size="sm" onClick={() => setShowModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Crear primer contrato
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Contrato</TableHead>
                      <TableHead>Contratista</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Cuotas</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContratos.map((c) => (
                      <TableRow key={c.numero_contrato}>
                        <TableCell className="font-medium">{c.numero_contrato}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{c.contratista_rel?.nombre || "—"}</p>
                            {c.contratista_rel?.identificacion && (
                              <p className="text-xs text-gray-400">CC {c.contratista_rel.identificacion}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{c.perfil || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={getEstadoBadgeVariant(c.estado)}>{c.estado}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {fmt.format(c.monto_total + (c.monto_transporte || 0))}
                        </TableCell>
                        <TableCell>
                          {c.cuotas_total > 0 ? (
                            <span className="text-sm">
                              {c.cuotas_pagadas}/{c.cuotas_total}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dashboard/contratos/${c.numero_contrato}`)}
                            >
                              Ver
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600"
                              onClick={() => descargarDocx(c.numero_contrato)}
                            >
                              DOCX
                            </Button>
                            {c.estado !== "ANULADO" && c.estado !== "FINALIZADO" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                                onClick={() => handleAnular(c.numero_contrato)}
                              >
                                Anular
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── TAB: Analytics ── */}
        <TabsContent value="analytics" className="space-y-6">
          {analyticsLoading ? (
            <KPISkeleton />
          ) : !analytics ? (
            <p className="text-gray-400 text-sm text-center py-8">Cargando datos de analytics...</p>
          ) : (
            <>
              {/* KPIs extendidos */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-gray-800">{analytics.total_contratos}</p>
                    <p className="text-xs text-gray-500 mt-1">Total Contratos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{analytics.contratos_activos}</p>
                    <p className="text-xs text-gray-500 mt-1">Activos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-amber-500">{analytics.contratos_por_vencer}</p>
                    <p className="text-xs text-gray-500 mt-1">Por Vencer (30d)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-red-500">{analytics.contratos_vencidos}</p>
                    <p className="text-xs text-gray-500 mt-1">Vencidos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-rose-600">{analytics.total_anulados}</p>
                    <p className="text-xs text-gray-500 mt-1">Anulados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-gray-800">{analytics.contratos_por_unidad.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Unidades</p>
                  </CardContent>
                </Card>
              </div>

              {/* Profesionales por tipo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Profesionales por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.profesionales_por_tipo.length === 0 ? (
                    <p className="text-gray-400 text-sm">Sin datos</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.profesionales_por_tipo.map((p: any) => (
                          <TableRow key={p.tipo}>
                            <TableCell className="font-medium">{p.tipo}</TableCell>
                            <TableCell className="text-right">{p.total}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt.format(p.valor)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Proximos a vencer */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Contratos Proximos a Vencer (30 dias)</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.proximos_vencer.length === 0 ? (
                    <p className="text-gray-400 text-sm">No hay contratos proximos a vencer</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contrato</TableHead>
                          <TableHead>Beneficiario</TableHead>
                          <TableHead>Fecha Fin</TableHead>
                          <TableHead className="text-right">Dias Restantes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.proximos_vencer.map((c: any) => (
                          <TableRow key={c.numero_contrato}>
                            <TableCell className="font-medium">{c.numero_contrato}</TableCell>
                            <TableCell>{c.beneficiario}</TableCell>
                            <TableCell>{c.fecha_fin}</TableCell>
                            <TableCell className="text-right">
                              {c.dias_restantes <= 5 ? (
                                <Badge variant="danger">{c.dias_restantes} dias</Badge>
                              ) : c.dias_restantes <= 15 ? (
                                <Badge variant="warning">{c.dias_restantes} dias</Badge>
                              ) : (
                                <Badge variant="info">{c.dias_restantes} dias</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Motivos de anulacion */}
              {analytics.motivos_anulacion.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Motivos de Anulacion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.motivos_anulacion.map((m: any) => (
                        <div key={m.motivo} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{m.motivo}</span>
                          <Badge variant="default">{m.total}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contratos por unidad de atencion */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Contratos por Unidad de Atencion</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.contratos_por_unidad.length === 0 ? (
                    <p className="text-gray-400 text-sm">Sin datos</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Municipio / Unidad</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Activos</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.contratos_por_unidad.map((u: any) => (
                          <TableRow key={u.municipio}>
                            <TableCell className="font-medium">{u.municipio}</TableCell>
                            <TableCell className="text-right">{u.total}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={u.activos > 0 ? "success" : "default"}>
                                {u.activos}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt.format(u.valor)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── TAB: Exportar ── */}
        <TabsContent value="exportar" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="hover:border-emerald-200 transition-colors cursor-pointer"
              onClick={() => descargarExcelResolucion(id)}>
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <FileDown className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold">Excel Resolución</p>
                  <p className="text-xs text-gray-500 mt-1">Descargar datos en Excel</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-blue-200 transition-colors cursor-pointer"
              onClick={() => descargarPdfsMasivos(id)}>
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Download className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">PDFs Masivos</p>
                  <p className="text-xs text-gray-500 mt-1">Descargar supervisiones en PDF</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-amber-200 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold">Estadísticas de Anulación</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {anulados} de {contratos.length} contratos anulados ({contratos.length > 0 ? ((anulados / contratos.length) * 100).toFixed(1) : 0}%)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── MODAL: Nuevo Contrato ── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Contrato</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateContract} className="space-y-4">
            {/* Datos básicos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">No. Contrato *</label>
                <Input required value={newForm.numero_contrato}
                  onChange={e => setNewForm({ ...newForm, numero_contrato: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Perfil</label>
                <Select value={newForm.perfil}
                  onChange={e => setNewForm({ ...newForm, perfil: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {perfiles.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Datos del Contratista</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Nombre</label>
                <Input value={newForm.contratista_nombre}
                  onChange={e => setNewForm({ ...newForm, contratista_nombre: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cédula</label>
                <Input value={newForm.contratista_identificacion}
                  onChange={e => setNewForm({ ...newForm, contratista_identificacion: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Expedida en</label>
                <Input value={newForm.contratista_expedida_en}
                  onChange={e => setNewForm({ ...newForm, contratista_expedida_en: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Teléfono</label>
                <Input value={newForm.contratista_telefono}
                  onChange={e => setNewForm({ ...newForm, contratista_telefono: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Correo</label>
                <Input type="email" value={newForm.contratista_correo}
                  onChange={e => setNewForm({ ...newForm, contratista_correo: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Dirección</label>
                <Input value={newForm.contratista_direccion}
                  onChange={e => setNewForm({ ...newForm, contratista_direccion: e.target.value })} />
              </div>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Datos del Contrato</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Objeto</label>
                <Input value={newForm.objeto}
                  onChange={e => setNewForm({ ...newForm, objeto: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo Costo</label>
                <Select value={newForm.costo_tipo}
                  onChange={e => setNewForm({ ...newForm, costo_tipo: e.target.value })}>
                  <option value="DIRECTO">DIRECTO</option>
                  <option value="INDIRECTO">INDIRECTO</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Valor Total</label>
                <Input type="number" value={newForm.monto_total}
                  onChange={e => setNewForm({ ...newForm, monto_total: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Valor Transporte</label>
                <Input type="number" value={newForm.monto_transporte}
                  onChange={e => setNewForm({ ...newForm, monto_transporte: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">No. CDP</label>
                <Input value={newForm.no_cdp}
                  onChange={e => setNewForm({ ...newForm, no_cdp: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cuotas</label>
                <Input placeholder="Ej: 2 o DOS (2)" value={newForm.cuotas}
                  onChange={e => setNewForm({ ...newForm, cuotas: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha Inicio</label>
                <Input type="date" value={newForm.fecha_inicio}
                  onChange={e => setNewForm({ ...newForm, fecha_inicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha Fin</label>
                <Input type="date" value={newForm.fecha_fin}
                  onChange={e => setNewForm({ ...newForm, fecha_fin: e.target.value })} />
              </div>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Supervisión</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Supervisor</label>
                <Input value={newForm.supervisor}
                  onChange={e => setNewForm({ ...newForm, supervisor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cédula Supervisor</label>
                <Input value={newForm.cedula_supervisor}
                  onChange={e => setNewForm({ ...newForm, cedula_supervisor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cargo Supervisor</label>
                <Input value={newForm.cargo_supervisor}
                  onChange={e => setNewForm({ ...newForm, cargo_supervisor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Unidad Atención</label>
                <Input value={newForm.unidad_atencion}
                  onChange={e => setNewForm({ ...newForm, unidad_atencion: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Lugar Ejecución</label>
                <Input value={newForm.lugar_ejecucion}
                  onChange={e => setNewForm({ ...newForm, lugar_ejecucion: e.target.value })} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creando..." : "Crear Contrato"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
