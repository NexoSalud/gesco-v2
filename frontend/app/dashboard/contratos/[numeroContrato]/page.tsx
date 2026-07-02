"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  getContrato, getPagos, createPago, descargarDocx,
  descargarDocxById, descargarPdfSupervision,
  registrarCuota, registrarCuotaById,
  anularContrato, anularContratoById,
  type Contrato, type Pago,
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
  ChevronLeft, FileText, Plus, Minus, AlertTriangle,
  User, DollarSign, Calendar, Hash, MapPin,
  FileDown, X, Printer,
} from "lucide-react"
import { toast } from "sonner"

const fmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

const EPS_OPCIONES = ["ALIANSALUD", "ASMET SALUD", "CAJACOPI", "CAPITAL SALUD", "COMFENALCO VALLE",
  "COMPENSAR", "COOSALUD", "EPS SANITAS", "FAMISANAR", "MUTUAL SER",
  "NUEVA EPS", "SALUD TOTAL", "SAVIA SALUD", "SOS", "SURA"]
const ARL_OPCIONES = ["ALFA", "AURORA", "BOLIVAR", "COLMENA", "EQUIDAD", "MAPFRE", "POSITIVA", "SURA"]
const AFP_OPCIONES = ["COLPENSIONES", "PORVENIR", "PROTECCION", "COLFONDOS", "SKANDIA"]
const CCF_OPCIONES = ["COMFACAUCA", "COMFENALCO"]

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
    tipo_informe: "SUPERVISION",
    periodo_desde: "",
    periodo_hasta: "",
    fecha_firma: "",
    valor_a_pagar: 0,
    cuentas_cobro: "",
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
  const [submittingPago, setSubmittingPago] = useState(false)

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

  const handleCreatePago = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingPago(true)
    try {
      await createPago({
        contrato_id: numero,
        ...pagoForm,
        planillas: pagoPlantillas,
      })
      setShowPago(false)
      toast.success("Pago registrado exitosamente")
      loadData()
      setPagoForm({
        tipo_informe: "SUPERVISION", periodo_desde: "", periodo_hasta: "",
        fecha_firma: "", valor_a_pagar: 0, cuentas_cobro: "",
        folios: "", actividades: "", observaciones: "", act: "",
      })
      setPagoPlantillas([{
        planilla_no: "", periodo_cotizado: "", ibc: "0",
        eps_nombre: "", eps_valor: 0, arl_nombre: "", arl_valor: 0,
        afp_nombre: "", afp_valor: 0, ccf_nombre: "", ccf_valor: 0,
        sena_valor: 0, icbf_valor: 0,
      }])
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setSubmittingPago(false)
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => contrato ? descargarDocxById(contrato.id) : descargarDocx(numero)}
          >
            <FileDown className="w-4 h-4" />
            DOCX
          </Button>
          {contrato.estado !== "ANULADO" && contrato.estado !== "FINALIZADO" && (
            <>
              <Button size="sm" className="gap-1.5" onClick={() => setShowPago(true)}>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 uppercase">Contratista</p>
            </div>
            <p className="font-medium">{contrato.contratista_rel?.nombre || "—"}</p>
            {contrato.contratista_rel?.identificacion && (
              <p className="text-xs text-gray-400">CC {contrato.contratista_rel.identificacion}</p>
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
              <Hash className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 uppercase">Cuotas</p>
            </div>
            <p className="text-lg font-bold">
              {contrato.cuotas_pagadas} <span className="text-gray-400 text-sm">/ {contrato.cuotas_total}</span>
            </p>
            {contrato.estado !== "ANULADO" && contrato.cuotas_total > 0 && (
              <div className="flex gap-1 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={contrato.cuotas_pagadas >= contrato.cuotas_total}
                  onClick={() => (contrato ? registrarCuotaById(contrato.id, "sumar") : registrarCuota(numero, "sumar")).then(() => loadData())}
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={contrato.cuotas_pagadas <= 0}
                  onClick={() => (contrato ? registrarCuotaById(contrato.id, "restar") : registrarCuota(numero, "restar")).then(() => loadData())}
                >
                  <Minus className="w-3 h-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* More info */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Supervisor</p>
              <p className="font-medium">{contrato.supervisor || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">CDP</p>
              <p className="font-medium">{contrato.no_cdp || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Unidad</p>
              <p className="font-medium">{contrato.unidad_atencion || "—"}</p>
            </div>
            <div className="col-span-2 md:col-span-3">
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
          <Button size="sm" className="gap-1.5" onClick={() => setShowPago(true)}>
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
              <Button className="mt-3" size="sm" onClick={() => setShowPago(true)}>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600"
                        onClick={() => descargarPdfSupervision(p.id)}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── MODAL: Nuevo Pago ── */}
      <Dialog open={showPago} onOpenChange={setShowPago}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Pago / Supervisión</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreatePago} className="space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Información del Pago
            </p>
            <div className="grid grid-cols-2 gap-4">
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
                <label className="text-sm font-medium">Cuentas de Cobro</label>
                <Input value={pagoForm.cuentas_cobro}
                  onChange={e => setPagoForm({ ...pagoForm, cuentas_cobro: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Folios</label>
                <Input value={pagoForm.folios}
                  onChange={e => setPagoForm({ ...pagoForm, folios: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Actividades</label>
                <Textarea rows={2} value={pagoForm.actividades}
                  onChange={e => setPagoForm({ ...pagoForm, actividades: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Observaciones</label>
                <Textarea rows={2} value={pagoForm.observaciones}
                  onChange={e => setPagoForm({ ...pagoForm, observaciones: e.target.value })} />
              </div>
            </div>

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
    </div>
  )
}
