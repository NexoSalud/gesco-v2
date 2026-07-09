"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  getContrato, getPagos, createPago, updatePago, deletePago,
  descargarDocx, descargarDocxById, descargarPdfSupervision,
  anularContrato, anularContratoById,
  getActividadesContratoById, getActividadesSupervision,
  evaluarActividadesSupervision,
  type Contrato, type Pago,
  type ActividadContrato,
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
import { KPISkeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  ChevronLeft, FileText, Plus, AlertTriangle,
  User, DollarSign, Calendar, MapPin,
  FileDown, X, Printer, Pencil, Trash2, ChevronDown,
} from "lucide-react"
import { toast } from "sonner"

const fmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

const EPS_OPCIONES = ["ALIANSALUD", "ASMET SALUD", "CAJACOPI", "CAPITAL SALUD", "COMFENALCO VALLE",
  "COMPENSAR", "COOSALUD", "EPS SANITAS", "FAMISANAR", "MUTUAL SER",
  "NUEVA EPS", "SALUD TOTAL", "SAVIA SALUD", "SOS", "SURA"]
const ARL_OPCIONES = ["ALFA", "AURORA", "BOLIVAR", "COLMENA", "EQUIDAD", "MAPFRE", "POSITIVA", "SURA"]
const AFP_OPCIONES = ["COLPENSIONES", "PORVENIR", "PROTECCION", "COLFONDOS", "SKANDIA"]
const CCF_OPCIONES = ["COMFACAUCA", "COMFENALCO"]

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

const MOTIVOS_ANULACION = [
  "Renuncia del contratista", "Incumplimiento contractual",
  "Terminación por mutuo acuerdo", "Decisión administrativa",
  "Fallecimiento del contratista", "Otro",
]

export default function ContratoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const numero = decodeURIComponent(params.numeroContrato as string)

  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)

  // Modal nuevo pago
  const [showPago, setShowPago] = useState(false)
  const [pagoForm, setPagoForm] = useState({
    tipo_informe: "PARCIAL",
    periodo_desde: "",
    periodo_hasta: "",
    fecha_firma: "",
    valor_a_pagar: 0,
    folios: "",
    actividades: "",
    observaciones: "",
    act: "",
  })
  const [pagoPlantillas, setPagoPlantillas] = useState([{
    planilla_no: "", periodo_cotizado: "", ibc: "0",
    eps_nombre: "", eps_valor: 0,
    arl_nombre: "", arl_valor: 0,
    afp_nombre: "", afp_valor: 0,
    ccf_nombre: "", ccf_valor: 0,
    sena_valor: 0, icbf_valor: 0,
  }])
  const [finalizarContrato, setFinalizarContrato] = useState(false)
  const [submittingPago, setSubmittingPago] = useState(false)
  const [pagoEditando, setPagoEditando] = useState<Pago | null>(null)
  const [actividadesEvaluacion, setActividadesEvaluacion] = useState<{ id: number | null; descripcion: string; cumple: boolean | null }[]>([])
  const [loadingActividades, setLoadingActividades] = useState(false)
  const [plantillasList, setPlantillasList] = useState<any[]>([])
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("")
  const [showDeletePago, setShowDeletePago] = useState<number | null>(null)
  const [showDocs, setShowDocs] = useState(false)

  const abrirNuevoPago = useCallback(() => {
    setPagoEditando(null)
    setPagoForm({
      tipo_informe: "PARCIAL", periodo_desde: "", periodo_hasta: "",
      fecha_firma: "", valor_a_pagar: 0,
      folios: "", actividades: "", observaciones: "", act: "",
    })
    setFinalizarContrato(false)
    setShowPago(true)
    // Cargar actividades del contrato para evaluación
    if (contrato?.id) {
      setLoadingActividades(true)
      getActividadesContratoById(contrato.id)
        .then((acts) => {
          setActividadesEvaluacion(
            acts.map((a: ActividadContrato) => ({
              id: null,
              descripcion: a.descripcion,
              cumple: null,
            }))
          )
        })
        .catch(() => setActividadesEvaluacion([]))
        .finally(() => setLoadingActividades(false))
    }
    // Cargar plantillas
    import("@/lib/api").then(({ getPlantillas }) =>
      getPlantillas().then(setPlantillasList).catch(() => {})
    )
    setPlantillaSeleccionada("")
  }, [contrato?.id])

  const abrirEditarPago = useCallback((p: Pago) => {
    setPagoEditando(p)
    setPagoForm({
      tipo_informe: p.tipo_informe || "PARCIAL",
      periodo_desde: p.periodo_desde || "",
      periodo_hasta: p.periodo_hasta || "",
      fecha_firma: p.fecha_firma || "",
      valor_a_pagar: p.valor_a_pagar,
      folios: p.folios || "",
      actividades: p.actividades || "",
      observaciones: p.observaciones || "",
      act: p.act || "",
    })
    setShowPago(true)
    // Cargar actividades de supervisión existentes
    setLoadingActividades(true)
    getActividadesSupervision(p.id)
      .then((acts) => {
        setActividadesEvaluacion(
          acts.map((a: any) => ({
            id: a.id,
            descripcion: a.descripcion,
            cumple: a.cumple,
          }))
        )
      })
      .catch(() => setActividadesEvaluacion([]))
      .finally(() => setLoadingActividades(false))
    // Cargar plantillas
    import("@/lib/api").then(({ getPlantillas }) =>
      getPlantillas().then(setPlantillasList).catch(() => {})
    )
    setPlantillaSeleccionada("")
  }, [])

  // Modal anular
  const [showAnular, setShowAnular] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState("")
  const [otroMotivo, setOtroMotivo] = useState("")

  const loadData = async () => {
    try {
      const c = await getContrato(numero)
      const p = await getPagos(numero)
      setContrato(c)
      setPagos(p)
    } catch (e) {
      toast.error("Error cargando contrato")
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [numero])

  const addPlanillaRow = () => {
    setPagoPlantillas([...pagoPlantillas, {
      planilla_no: "", periodo_cotizado: "", ibc: "0",
      eps_nombre: "", eps_valor: 0,
      arl_nombre: "", arl_valor: 0,
      afp_nombre: "", afp_valor: 0,
      ccf_nombre: "", ccf_valor: 0,
      sena_valor: 0, icbf_valor: 0,
    }])
  }

  const handleSavePago = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingPago(true)
    try {
      const body = { ...pagoForm, planillas: pagoPlantillas }
      if (pagoEditando) {
        await updatePago(pagoEditando.id, body)
        // Evaluar actividades existentes
        const evaluaciones = actividadesEvaluacion
          .filter(a => a.id !== null && a.cumple !== null)
          .map(a => ({ id: a.id!, cumple: a.cumple }))
        if (evaluaciones.length > 0) {
          await evaluarActividadesSupervision(pagoEditando.id, evaluaciones)
        }
        toast.success("Pago actualizado")
      } else {
        const pagoCreado = await createPago({
          contrato_id: numero,
          ...body,
          finalizar_contrato: finalizarContrato,
        }) as any
        // Obtener actividades de supervisión creadas y evaluarlas
        const actsSup = await getActividadesSupervision(pagoCreado.id)
        const evaluaciones = actividadesEvaluacion.map(ae => {
          const match = actsSup.find((as: any) => as.descripcion === ae.descripcion)
          return { id: match?.id, cumple: ae.cumple }
        }).filter(e => e.id !== null)
        if (evaluaciones.length > 0) {
          await evaluarActividadesSupervision(pagoCreado.id, evaluaciones as any)
        }
        toast.success("Pago registrado exitosamente")
      }
      setShowPago(false)
      setPagoEditando(null)
      setFinalizarContrato(false)
      setActividadesEvaluacion([])
      setPlantillasList([])
      setPlantillaSeleccionada("")
      setPagoForm({
        tipo_informe: "PARCIAL", periodo_desde: "", periodo_hasta: "",
        fecha_firma: "", valor_a_pagar: 0,
        folios: "", actividades: "", observaciones: "", act: "",
      })
      setPagoPlantillas([{
        planilla_no: "", periodo_cotizado: "", ibc: "0",
        eps_nombre: "", eps_valor: 0, arl_nombre: "", arl_valor: 0,
        afp_nombre: "", afp_valor: 0, ccf_nombre: "", ccf_valor: 0,
        sena_valor: 0, icbf_valor: 0,
      }])
      loadData()
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setSubmittingPago(false)
    }
  }

  const handleDeletePago = async () => {
    if (showDeletePago === null) return
    try {
      await deletePago(showDeletePago)
      setShowDeletePago(null)
      toast.success("Pago eliminado")
      loadData()
    } catch (err: any) {
      toast.error("Error: " + err.message)
    }
  }

  const handleAnular = async () => {
    const motivo = motivoAnulacion === "Otro" ? otroMotivo : motivoAnulacion
    if (!motivo) {
      toast.error("Selecciona un motivo de anulación")
      return
    }
    try {
      await (contrato ? anularContratoById(contrato.id, motivo) : anularContrato(numero, motivo))
      setShowAnular(false)
      toast.success("Contrato anulado")
      loadData()
    } catch (err: any) {
      toast.error("Error: " + err.message)
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

  if (!contrato) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Contrato no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Volver al Dashboard
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
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold text-gray-900">Contrato {numero}</h1>
            <Badge variant={getEstadoBadgeVariant(contrato.estado)}>
              {contrato.estado}
            </Badge>
            {contrato.perfil && (
              <Badge variant="default">{contrato.perfil}</Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => router.push(`/dashboard/contratos/${encodeURIComponent(numero)}/editar`)}>
            <Pencil className="w-4 h-4" />
            Editar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => contrato ? descargarDocxById(contrato.id) : descargarDocx(numero)}>
            <FileDown className="w-4 h-4" />
            Contrato
          </Button>
          {contrato && (
            <div className="relative">
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => setShowDocs(!showDocs)}>
                <FileText className="w-4 h-4" />
                Documentos
                <ChevronDown className="w-3 h-3" />
              </Button>
              {showDocs && (
                <div className="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-50 py-1"
                  onMouseLeave={() => setShowDocs(false)}>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => { window.open(`${API}/api/v1/contratos/id/${contrato.id}/documentos/inexistencia`, "_blank"); setShowDocs(false) }}>Inexistencia</button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => { window.open(`${API}/api/v1/contratos/id/${contrato.id}/documentos/estudios_previos`, "_blank"); setShowDocs(false) }}>Estudios Previos</button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => { window.open(`${API}/api/v1/contratos/id/${contrato.id}/documentos/solicitud_cdp`, "_blank"); setShowDocs(false) }}>Solicitud CDP</button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => { window.open(`${API}/api/v1/contratos/id/${contrato.id}/documentos/invitacion`, "_blank"); setShowDocs(false) }}>Invitación</button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => { window.open(`${API}/api/v1/contratos/id/${contrato.id}/documentos/idoneidad`, "_blank"); setShowDocs(false) }}>Idoneidad</button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => { window.open(`${API}/api/v1/contratos/id/${contrato.id}/documentos/designacion_supervision`, "_blank"); setShowDocs(false) }}>Designación</button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => { window.open(`${API}/api/v1/contratos/id/${contrato.id}/documentos/acta_inicio`, "_blank"); setShowDocs(false) }}>Acta Inicio</button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => { window.open(`${API}/api/v1/contratos/id/${contrato.id}/documentos/acta_liquidacion`, "_blank"); setShowDocs(false) }}>Acta Liquidación</button>
                </div>
              )}
            </div>
          )}
          {contrato.estado !== "ANULADO" && contrato.estado !== "FINALIZADO" && (
            <>
              <Button size="sm" className="gap-1.5" onClick={abrirNuevoPago}>
                <Plus className="w-4 h-4" />
                Pago
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowAnular(true)}
              >
                <AlertTriangle className="w-4 h-4" />
                Anular
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 uppercase">Contratista</p>
            </div>
            <p className="font-medium">{contrato.contratista_rel?.nombre || "—"}</p>
            {contrato.contratista_rel?.identificacion && (
              <p className="text-xs text-gray-400">{contrato.contratista_rel.identificacion}</p>
            )}
            {contrato.contratista_rel?.correo && (
              <p className="text-xs text-gray-400 mt-1">📧 {contrato.contratista_rel.correo}</p>
            )}
            {contrato.contratista_rel?.telefono && (
              <p className="text-xs text-gray-400">📞 {contrato.contratista_rel.telefono}</p>
            )}
            {contrato.contratista_rel?.direccion && (
              <p className="text-xs text-gray-400">📍 {contrato.contratista_rel.direccion}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 uppercase">Valor</p>
            </div>
            <p className="font-bold text-lg">{fmt.format(contrato.monto_total)}</p>
            {contrato.monto_transporte > 0 && (
              <p className="text-xs text-gray-400">+ {fmt.format(contrato.monto_transporte)} transporte</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 uppercase">Vigencia</p>
            </div>
            <p className="text-sm">
              {contrato.fecha_inicio || "—"} → {contrato.fecha_fin || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 uppercase">Unidad de Atención</p>
            </div>
            <p className="font-medium">{contrato.unidad_atencion || "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 uppercase">Progreso de Pago</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Pagado:</span>
                <span className="font-semibold text-emerald-600">{fmt.format(pagos.reduce((s, p) => s + p.valor_a_pagar, 0))}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Saldo:</span>
                <span className="font-semibold text-amber-600">{fmt.format(Math.max(0, contrato.monto_total - pagos.reduce((s, p) => s + p.valor_a_pagar, 0)))}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${contrato.monto_total > 0 ? Math.min(100, Math.round((pagos.reduce((s, p) => s + p.valor_a_pagar, 0) / contrato.monto_total) * 100)) : 0}%` }}
                />
              </div>
              <p className="text-xs text-center text-gray-400">
                {contrato.monto_total > 0
                  ? `${Math.min(100, Math.round((pagos.reduce((s, p) => s + p.valor_a_pagar, 0) / contrato.monto_total) * 100))}% completado`
                  : "Sin datos"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* More info */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Supervisor</p>
              <p className="font-medium">{contrato.supervisor || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">CDP</p>
              <p className="font-medium">{contrato.no_cdp || "—"}</p>
              {contrato.fecha_cdp && <p className="text-xs text-gray-500 mt-0.5">Fecha: {contrato.fecha_cdp}</p>}
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Tipología</p>
              <p className="font-medium">
                {contrato.costo_tipo || "—"}
                {contrato.sub_tipo ? ` — ${contrato.sub_tipo.replace("_", " ")}` : ""}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Cédula Supervisor</p>
              <p className="font-medium">{contrato.cedula_supervisor || "—"}</p>
            </div>
            <div className="col-span-2 md:col-span-4">
              <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Objeto</p>
              <p className="font-medium">{contrato.objeto || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagos / Supervisiones */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Pagos y Supervisiones ({pagos.length})
        </h2>
        {contrato.estado !== "ANULADO" && contrato.estado !== "FINALIZADO" && (
          <Button size="sm" className="gap-1.5" onClick={abrirNuevoPago}>
            <Plus className="w-4 h-4" />
            Nuevo Pago
          </Button>
        )}
      </div>

      {pagos.length === 0 ? (
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-10 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Sin pagos registrados</p>
            {contrato.estado !== "ANULADO" && contrato.estado !== "FINALIZADO" && (
              <Button className="mt-3" size="sm" onClick={abrirNuevoPago}>
                Registrar primer pago
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead># Pago</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Actividades</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">#{p.numero_pago}</TableCell>
                    <TableCell>
                      <Badge variant="info">{p.tipo_informe || "SUPERVISIÓN"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.periodo_desde || "—"} → {p.periodo_hasta || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt.format(p.valor_a_pagar)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {p.actividades || p.observaciones || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="text-blue-600"
                          onClick={() => descargarPdfSupervision(p.id)} title="PDF">
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-emerald-600"
                          onClick={() => abrirEditarPago(p)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500"
                          onClick={() => setShowDeletePago(p.id)} title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── MODAL: Nuevo/Editar Pago ── */}
      <Dialog open={showPago} onOpenChange={setShowPago}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pagoEditando ? "Editar Pago" : "Nuevo Pago / Supervisión"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePago} className="space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Información del Pago
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo de Informe</label>
                <Select value={pagoForm.tipo_informe}
                  onChange={e => setPagoForm({ ...pagoForm, tipo_informe: e.target.value })}>
                  <option value="PARCIAL">PARCIAL</option>
                  <option value="FINAL">FINAL</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Período Desde</label>
                <Input type="date" value={pagoForm.periodo_desde}
                  onChange={e => setPagoForm({ ...pagoForm, periodo_desde: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Período Hasta</label>
                <Input type="date" value={pagoForm.periodo_hasta}
                  onChange={e => setPagoForm({ ...pagoForm, periodo_hasta: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Valor a Pagar *</label>
                <Input type="number" required value={pagoForm.valor_a_pagar}
                  onChange={e => setPagoForm({ ...pagoForm, valor_a_pagar: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha Firma</label>
                <Input type="date" value={pagoForm.fecha_firma}
                  onChange={e => setPagoForm({ ...pagoForm, fecha_firma: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Folios</label>
                <Input value={pagoForm.folios}
                  onChange={e => setPagoForm({ ...pagoForm, folios: e.target.value })} />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Observaciones</label>
                <Textarea rows={4} value={pagoForm.observaciones}
                  onChange={e => setPagoForm({ ...pagoForm, observaciones: e.target.value })} />
                <div className="flex gap-2">
                  <select
                    value={plantillaSeleccionada}
                    onChange={e => setPlantillaSeleccionada(e.target.value)}
                    className="flex-1 text-xs rounded-lg border border-gray-200 px-3 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">— Cargar desde plantilla —</option>
                    {plantillasList.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.titulo}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const plant = plantillasList.find((p: any) => String(p.id) === plantillaSeleccionada)
                      if (!plant) {
                        toast.error("Selecciona una plantilla")
                        return
                      }
                      const current = pagoForm.observaciones || ""
                      const sep = current ? "\n\n" : ""
                      setPagoForm({ ...pagoForm, observaciones: current + sep + plant.contenido })
                      toast.success(`Observación cargada: ${plant.titulo}`)
                    }}
                    className="shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors border border-emerald-300"
                  >
                    <FileText className="w-3.5 h-3.5 inline mr-1" />
                    Cargar
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox para finalizar contrato - si el pago cubre el saldo */}
            {/* Evaluación de actividades */}
            {loadingActividades ? (
              <div className="col-span-2 py-4 text-center text-sm text-gray-400">
                Cargando actividades...
              </div>
            ) : actividadesEvaluacion.length > 0 && (
              <div className="col-span-2 space-y-3">
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Evaluación de Actividades
                  </p>
                  <button
                    type="button"
                    onClick={() => setActividadesEvaluacion(prev =>
                      prev.map(a => ({ ...a, cumple: true }))
                    )}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors border border-emerald-300"
                  >
                    ✅ Marcar todas como Cumple
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {actividadesEvaluacion.map((act, i) => {
                    const numColor = act.cumple === true
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : act.cumple === false
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : 'bg-gray-100 text-gray-500 border-gray-300'
                    return (
                    <div key={i} className={`rounded-xl border-2 p-4 transition-all ${
                      act.cumple === true
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : act.cumple === false
                        ? 'border-red-300 bg-red-50/30'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex items-start gap-3">
                        <span className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${numColor}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: act.descripcion }} />
                        </div>
                        <div className="flex gap-2 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setActividadesEvaluacion(prev =>
                              prev.map((a, j) => j === i ? { ...a, cumple: true } : a)
                            )}
                            className={`px-4 py-2 text-sm font-semibold rounded-xl border-2 transition-all ${
                              act.cumple === true
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200'
                                : 'bg-white border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-600'
                            }`}
                          >
                            ✅ Cumple
                          </button>
                          <button
                            type="button"
                            onClick={() => setActividadesEvaluacion(prev =>
                              prev.map((a, j) => j === i ? { ...a, cumple: false } : a)
                            )}
                            className={`px-4 py-2 text-sm font-semibold rounded-xl border-2 transition-all ${
                              act.cumple === false
                                ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-200'
                                : 'bg-white border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-600'
                            }`}
                          >
                            ❌ No Cumple
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}

            {contrato && (() => {
              const totalPagado = pagos.reduce((s, p) => s + p.valor_a_pagar, 0)
              return (totalPagado + (pagoForm.valor_a_pagar || 0) >= contrato.monto_total)
            })() && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={finalizarContrato}
                  onChange={(e) => setFinalizarContrato(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Finalizar contrato al registrar este pago</span>
              </label>
            )}

            <Separator />

            {/* Planillas */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Planillas de Seguridad Social
              </p>
              <Button type="button" variant="outline" size="sm" onClick={addPlanillaRow}>
                <Plus className="w-3 h-3 mr-1" />
                Planilla
              </Button>
            </div>

            {pagoPlantillas.map((pl, i) => (
              <Card key={i} className="bg-gray-50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-500">Planilla #{i + 1}</p>
                    {pagoPlantillas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPagoPlantillas(pagoPlantillas.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400">Planilla No.</label>
                      <Input className="h-8 text-xs" value={pl.planilla_no}
                        onChange={e => { const n = [...pagoPlantillas]; n[i].planilla_no = e.target.value; setPagoPlantillas(n) }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400">Período</label>
                      <Input className="h-8 text-xs" value={pl.periodo_cotizado}
                        onChange={e => { const n = [...pagoPlantillas]; n[i].periodo_cotizado = e.target.value; setPagoPlantillas(n) }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400">IBC</label>
                      <Input className="h-8 text-xs" value={pl.ibc}
                        onChange={e => { const n = [...pagoPlantillas]; n[i].ibc = e.target.value; setPagoPlantillas(n) }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400">EPS</label>
                      <Select className="h-8 text-xs" value={pl.eps_nombre}
                        onChange={e => { const n = [...pagoPlantillas]; n[i].eps_nombre = e.target.value; setPagoPlantillas(n) }}>
                        <option value="">Seleccionar...</option>
                        {EPS_OPCIONES.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400">EPS $</label>
                      <Input type="number" className="h-8 text-xs" value={pl.eps_valor}
                        onChange={e => { const n = [...pagoPlantillas]; n[i].eps_valor = parseFloat(e.target.value) || 0; setPagoPlantillas(n) }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400">ARL</label>
                      <Select className="h-8 text-xs" value={pl.arl_nombre}
                        onChange={e => { const n = [...pagoPlantillas]; n[i].arl_nombre = e.target.value; setPagoPlantillas(n) }}>
                        <option value="">Seleccionar...</option>
                        {ARL_OPCIONES.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400">ARL $</label>
                      <Input type="number" className="h-8 text-xs" value={pl.arl_valor}
                        onChange={e => { const n = [...pagoPlantillas]; n[i].arl_valor = parseFloat(e.target.value) || 0; setPagoPlantillas(n) }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400">AFP</label>
                      <Select className="h-8 text-xs" value={pl.afp_nombre}
                        onChange={e => { const n = [...pagoPlantillas]; n[i].afp_nombre = e.target.value; setPagoPlantillas(n) }}>
                        <option value="">Seleccionar...</option>
                        {AFP_OPCIONES.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400">AFP $</label>
                      <Input type="number" className="h-8 text-xs" value={pl.afp_valor}
                        onChange={e => { const n = [...pagoPlantillas]; n[i].afp_valor = parseFloat(e.target.value) || 0; setPagoPlantillas(n) }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400">CCF</label>
                      <Select className="h-8 text-xs" value={pl.ccf_nombre}
                        onChange={e => { const n = [...pagoPlantillas]; n[i].ccf_nombre = e.target.value; setPagoPlantillas(n) }}>
                        <option value="">Seleccionar...</option>
                        {CCF_OPCIONES.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-400">CCF $</label>
                      <Input type="number" className="h-8 text-xs" value={pl.ccf_valor}
                        onChange={e => { const n = [...pagoPlantillas]; n[i].ccf_valor = parseFloat(e.target.value) || 0; setPagoPlantillas(n) }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPago(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingPago}>
                {submittingPago ? "Registrando..." : "Registrar Pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Anular ── */}
      <AlertDialog open={showAnular} onOpenChange={setShowAnular}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Anular Contrato {numero}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Selecciona un motivo para la anulación.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <Select value={motivoAnulacion}
              onChange={e => setMotivoAnulacion(e.target.value)}>
              <option value="">Seleccionar motivo...</option>
              {MOTIVOS_ANULACION.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
            {motivoAnulacion === "Otro" && (
              <Input placeholder="Especificar motivo..." value={otroMotivo}
                onChange={e => setOtroMotivo(e.target.value)} />
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAnular} className="bg-red-600 hover:bg-red-700">
              Anular Contrato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL: Eliminar Pago ── */}
      <AlertDialog open={showDeletePago !== null} onOpenChange={() => setShowDeletePago(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Pago</AlertDialogTitle>
            <AlertDialogDescription>¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeletePago}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
