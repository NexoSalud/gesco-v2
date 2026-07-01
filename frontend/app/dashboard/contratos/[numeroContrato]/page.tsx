"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  getContrato, createPago, getPagos, descargarDocx,
  descargarPdfSupervision, registrarCuota, anularContrato, getPlantillas,
  type Contrato, type Pago,
} from "@/lib/api"

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

const ESTADOS = ["EN_PROCESO", "ACTIVO", "FINALIZADO", "ANULADO"]

export default function ContratoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const numero = params.numeroContrato as string

  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [pagos, setPagos] = useState<Pago[]>([])
  const [plantillas, setPlantillas] = useState<any[]>([])
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

  // Modal anular
  const [showAnular, setShowAnular] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState("")
  const [otroMotivo, setOtroMotivo] = useState("")

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

  const loadData = async () => {
    try {
      const [c, p, pl] = await Promise.all([
        getContrato(numero),
        getPagos(numero),
        getPlantillas(),
      ])
      setContrato(c)
      setPagos(p)
      setPlantillas(pl)
    } catch (e) {
      alert("Error cargando contrato")
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [numero])

  const handleCreatePago = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createPago({
        contrato_id: numero,
        ...pagoForm,
        planillas: pagoPlantillas,
      })
      setShowPago(false)
      loadData()
      // Reset form
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
      alert("Error: " + err.message)
    }
  }

  const handleAnular = async () => {
    const motivo = motivoAnulacion === "Otro" ? otroMotivo : motivoAnulacion
    if (!motivo) return alert("Selecciona un motivo de anulación")
    try {
      await anularContrato(numero, motivo)
      setShowAnular(false)
      loadData()
    } catch (err: any) {
      alert("Error: " + err.message)
    }
  }

  const getBadgeColor = (estado: string) => {
    switch (estado) {
      case "ACTIVO": return "bg-emerald-100 text-emerald-800"
      case "EN_PROCESO": return "bg-amber-100 text-amber-800"
      case "FINALIZADO": return "bg-blue-100 text-blue-800"
      case "ANULADO": return "bg-red-100 text-red-800"
      default: return "bg-gray-100"
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>
  if (!contrato) return <div className="p-8 text-center text-red-500">Contrato no encontrado</div>

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <button onClick={() => router.back()} className="text-sm text-gray-500 mb-4 hover:text-gray-700">
        ← Volver
      </button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">Contrato {numero}</h1>
            <span className={`text-sm px-3 py-0.5 rounded-full ${getBadgeColor(contrato.estado)}`}>
              {contrato.estado}
            </span>
          </div>
          <p className="text-gray-500">{contrato.perfil || "—"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => descargarDocx(numero)}
            className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            📄 DOCX
          </button>
          {contrato.estado !== "ANULADO" && contrato.estado !== "FINALIZADO" && (
            <>
              <button onClick={() => setShowPago(true)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                + Pago
              </button>
              <button onClick={() => setShowAnular(true)}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                Anular
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info del contrato */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-3 rounded-lg border">
          <p className="text-xs text-gray-400">Contratista</p>
          <p className="font-medium text-sm">{contrato.contratista_rel?.nombre || "—"}</p>
          <p className="text-xs text-gray-400">CC {contrato.contratista_rel?.identificacion || "—"}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <p className="text-xs text-gray-400">Valor Total</p>
          <p className="font-bold">{fmt.format(contrato.monto_total)}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <p className="text-xs text-gray-400">Vigencia</p>
          <p className="text-sm">{contrato.fecha_inicio || "—"} → {contrato.fecha_fin || "—"}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <p className="text-xs text-gray-400">Cuotas</p>
          <p className="font-medium text-sm">{contrato.cuotas_pagadas}/{contrato.cuotas_total}</p>
          {contrato.estado !== "ANULADO" && contrato.cuotas_total > 0 && (
            <div className="flex gap-1 mt-1">
              <button onClick={() => registrarCuota(numero, "sumar").then(() => loadData())}
                disabled={contrato.cuotas_pagadas >= contrato.cuotas_total}
                className="text-xs px-2 py-0.5 bg-emerald-100 rounded hover:bg-emerald-200 disabled:opacity-30">
                +
              </button>
              <button onClick={() => registrarCuota(numero, "restar").then(() => loadData())}
                disabled={contrato.cuotas_pagadas <= 0}
                className="text-xs px-2 py-0.5 bg-red-100 rounded hover:bg-red-200 disabled:opacity-30">
                −
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Más datos */}
      <div className="bg-white p-4 rounded-xl border mb-6 text-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><span className="text-gray-400">Supervisor:</span> {contrato.supervisor || "—"}</div>
          <div><span className="text-gray-400">CDP:</span> {contrato.no_cdp || "—"}</div>
          <div><span className="text-gray-400">Unidad:</span> {contrato.unidad_atencion || "—"}</div>
          <div className="col-span-2"><span className="text-gray-400">Objeto:</span> {contrato.objeto || "—"}</div>
        </div>
      </div>

      {/* Pagos / Supervisiones */}
      <h2 className="text-lg font-semibold mb-3">
        Supervisiones y Pagos ({pagos.length})
      </h2>

      {pagos.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-white rounded-xl border">
          Sin pagos registrados. Crea el primer pago.
        </div>
      ) : (
        <div className="space-y-3">
          {pagos.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-xl border">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">Pago #{p.numero_pago}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {p.tipo_informe || "SUPERVISIÓN"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Período: {p.periodo_desde || "—"} → {p.periodo_hasta || "—"}
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    Valor: {fmt.format(p.valor_a_pagar)}
                  </p>
                  {p.observaciones && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.observaciones}</p>
                  )}
                </div>
                <button
                  onClick={() => descargarPdfSupervision(p.id)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Pago */}
      {showPago && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-10 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 mb-10 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Nuevo Pago / Supervisión</h2>
              <button onClick={() => setShowPago(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleCreatePago} className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-0.5">Período Desde</label>
                  <input type="date" className="w-full px-2 py-1.5 border rounded text-sm"
                    value={pagoForm.periodo_desde}
                    onChange={e => setPagoForm({ ...pagoForm, periodo_desde: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">Período Hasta</label>
                  <input type="date" className="w-full px-2 py-1.5 border rounded text-sm"
                    value={pagoForm.periodo_hasta}
                    onChange={e => setPagoForm({ ...pagoForm, periodo_hasta: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">Valor a Pagar</label>
                  <input type="number" className="w-full px-2 py-1.5 border rounded text-sm"
                    value={pagoForm.valor_a_pagar}
                    onChange={e => setPagoForm({ ...pagoForm, valor_a_pagar: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">Fecha Firma</label>
                  <input type="date" className="w-full px-2 py-1.5 border rounded text-sm"
                    value={pagoForm.fecha_firma}
                    onChange={e => setPagoForm({ ...pagoForm, fecha_firma: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">Cuentas de Cobro</label>
                  <input className="w-full px-2 py-1.5 border rounded text-sm"
                    value={pagoForm.cuentas_cobro}
                    onChange={e => setPagoForm({ ...pagoForm, cuentas_cobro: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">Folios</label>
                  <input className="w-full px-2 py-1.5 border rounded text-sm"
                    value={pagoForm.folios}
                    onChange={e => setPagoForm({ ...pagoForm, folios: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-0.5">Actividades</label>
                  <textarea rows={2} className="w-full px-2 py-1.5 border rounded text-sm"
                    value={pagoForm.actividades}
                    onChange={e => setPagoForm({ ...pagoForm, actividades: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-0.5">Observaciones</label>
                  <textarea rows={2} className="w-full px-2 py-1.5 border rounded text-sm"
                    value={pagoForm.observaciones}
                    onChange={e => setPagoForm({ ...pagoForm, observaciones: e.target.value })} />
                </div>
              </div>

              {/* Planillas */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-semibold text-gray-500">PLANILLAS DE SEGURIDAD SOCIAL</p>
                  <button type="button" onClick={addPlanillaRow}
                    className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                    + Planilla
                  </button>
                </div>
                {pagoPlantillas.map((pl, i) => (
                  <div key={i} className="border rounded-lg p-3 mb-2 bg-gray-50">
                    <p className="text-xs text-gray-400 mb-2">Planilla #{i + 1}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <input placeholder="Planilla No." className="px-2 py-1 border rounded text-xs"
                        value={pl.planilla_no} onChange={e => {
                          const npl = [...pagoPlantillas]; npl[i].planilla_no = e.target.value; setPagoPlantillas(npl)
                        }} />
                      <input placeholder="Período cotizado" className="px-2 py-1 border rounded text-xs"
                        value={pl.periodo_cotizado} onChange={e => {
                          const npl = [...pagoPlantillas]; npl[i].periodo_cotizado = e.target.value; setPagoPlantillas(npl)
                        }} />
                      <input placeholder="IBC" className="px-2 py-1 border rounded text-xs"
                        value={pl.ibc} onChange={e => {
                          const npl = [...pagoPlantillas]; npl[i].ibc = e.target.value; setPagoPlantillas(npl)
                        }} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      <select className="px-2 py-1 border rounded text-xs" value={pl.eps_nombre}
                        onChange={e => { const npl = [...pagoPlantillas]; npl[i].eps_nombre = e.target.value; setPagoPlantillas(npl) }}>
                        <option value="">EPS</option>
                        {EPS_OPCIONES.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input type="number" placeholder="EPS $" className="px-2 py-1 border rounded text-xs"
                        value={pl.eps_valor} onChange={e => {
                          const npl = [...pagoPlantillas]; npl[i].eps_valor = parseFloat(e.target.value) || 0; setPagoPlantillas(npl)
                        }} />
                      <select className="px-2 py-1 border rounded text-xs" value={pl.arl_nombre}
                        onChange={e => { const npl = [...pagoPlantillas]; npl[i].arl_nombre = e.target.value; setPagoPlantillas(npl) }}>
                        <option value="">ARL</option>
                        {ARL_OPCIONES.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input type="number" placeholder="ARL $" className="px-2 py-1 border rounded text-xs"
                        value={pl.arl_valor} onChange={e => {
                          const npl = [...pagoPlantillas]; npl[i].arl_valor = parseFloat(e.target.value) || 0; setPagoPlantillas(npl)
                        }} />
                      <select className="px-2 py-1 border rounded text-xs" value={pl.afp_nombre}
                        onChange={e => { const npl = [...pagoPlantillas]; npl[i].afp_nombre = e.target.value; setPagoPlantillas(npl) }}>
                        <option value="">AFP</option>
                        {AFP_OPCIONES.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input type="number" placeholder="AFP $" className="px-2 py-1 border rounded text-xs"
                        value={pl.afp_valor} onChange={e => {
                          const npl = [...pagoPlantillas]; npl[i].afp_valor = parseFloat(e.target.value) || 0; setPagoPlantillas(npl)
                        }} />
                      <select className="px-2 py-1 border rounded text-xs" value={pl.ccf_nombre}
                        onChange={e => { const npl = [...pagoPlantillas]; npl[i].ccf_nombre = e.target.value; setPagoPlantillas(npl) }}>
                        <option value="">CCF</option>
                        {CCF_OPCIONES.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input type="number" placeholder="CCF $" className="px-2 py-1 border rounded text-xs"
                        value={pl.ccf_valor} onChange={e => {
                          const npl = [...pagoPlantillas]; npl[i].ccf_valor = parseFloat(e.target.value) || 0; setPagoPlantillas(npl)
                        }} />
                    </div>
                  </div>
                ))}
              </div>

              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Registrar Pago
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Anular */}
      {showAnular && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold mb-4">Anular Contrato {numero}</h2>
            <div className="space-y-3">
              <select className="w-full px-3 py-2 border rounded-lg"
                value={motivoAnulacion}
                onChange={e => setMotivoAnulacion(e.target.value)}>
                <option value="">Seleccionar motivo...</option>
                {MOTIVOS_ANULACION.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {motivoAnulacion === "Otro" && (
                <input className="w-full px-3 py-2 border rounded-lg" placeholder="Especificar motivo..."
                  value={otroMotivo} onChange={e => setOtroMotivo(e.target.value)} />
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={handleAnular}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Anular
                </button>
                <button onClick={() => setShowAnular(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
