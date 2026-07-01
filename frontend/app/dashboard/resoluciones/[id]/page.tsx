"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  getResolucion, getContratos, getPerfilesPredefinidos,
  createContrato, descargarDocx, descargarExcelResolucion,
  descargarPdfsMasivos, registrarCuota, anularContrato,
  type Resolucion, type Contrato,
} from "@/lib/api"

const fmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

const ESTADOS = ["EN_PROCESO", "ACTIVO", "FINALIZADO", "ANULADO"]

export default function ResolucionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)

  const [resolucion, setResolucion] = useState<Resolucion | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [perfiles, setPerfiles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Modal nuevo contrato
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
      alert("Error cargando datos")
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createContrato({ ...newForm, resolucion_id: id })
      setShowModal(false)
      loadData()
      resetForm()
    } catch (err: any) {
      alert("Error: " + err.message)
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
  if (!resolucion) return <div className="p-8 text-center text-red-500">Resolución no encontrada</div>

  const totalComprometido = contratos
    .filter(c => c.estado !== "ANULADO")
    .reduce((s, c) => s + c.monto_total + c.monto_transporte, 0)

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <button onClick={() => router.push("/")} className="text-sm text-gray-500 mb-4 hover:text-gray-700">
        ← Dashboard
      </button>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{resolucion.codigo}</h1>
          {resolucion.titulo && <p className="text-gray-500">{resolucion.titulo}</p>}
          <p className="text-sm text-gray-400">Vigencia: {resolucion.vigencia || "—"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => descargarExcelResolucion(id)}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Excel
          </button>
          <button
            onClick={() => descargarPdfsMasivos(id)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            PDFs Masivos
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
          >
            + Contrato
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-3 rounded-lg border">
          <p className="text-xs text-gray-500">Presupuesto</p>
          <p className="font-bold">{fmt.format(resolucion.presupuesto)}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <p className="text-xs text-gray-500">Comprometido</p>
          <p className="font-bold text-amber-600">{fmt.format(totalComprometido)}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <p className="text-xs text-gray-500">Saldo</p>
          <p className="font-bold">{(resolucion.presupuesto - totalComprometido) >= 0
            ? fmt.format(resolucion.presupuesto - totalComprometido)
            : "⚠️ Excedido"}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <p className="text-xs text-gray-500">Contratos</p>
          <p className="font-bold">{contratos.length}</p>
        </div>
      </div>

      {/* Lista de Contratos */}
      <h2 className="text-lg font-semibold mb-3">Contratos</h2>
      {contratos.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          No hay contratos. Crea el primero.
        </div>
      ) : (
        <div className="space-y-3">
          {contratos.map((c) => (
            <div
              key={c.numero_contrato}
              className="bg-white p-4 rounded-xl border hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{c.numero_contrato}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeColor(c.estado)}`}>
                      {c.estado}
                    </span>
                    {c.perfil && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.perfil}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {c.contratista_rel?.nombre || "Sin contratista"}
                    {c.contratista_rel?.identificacion && ` — CC ${c.contratista_rel.identificacion}`}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Valor: {fmt.format(c.monto_total)}
                    {c.cuotas_total > 0 && ` — Cuotas: ${c.cuotas_pagadas}/${c.cuotas_total}`}
                  </p>
                </div>
                <div className="flex gap-1.5 ml-4">
                  <button
                    onClick={() => router.push(`/dashboard/contratos/${c.numero_contrato}`)}
                    className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Detalle
                  </button>
                  <button
                    onClick={() => descargarDocx(c.numero_contrato)}
                    className="px-3 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                  >
                    DOCX
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Contrato */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-10 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 mb-10 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Nuevo Contrato</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleCreateContract} className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-0.5">No. Contrato *</label>
                  <input required className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.numero_contrato}
                    onChange={e => setNewForm({ ...newForm, numero_contrato: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">Perfil</label>
                  <select className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.perfil}
                    onChange={e => setNewForm({ ...newForm, perfil: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {perfiles.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">DATOS DEL CONTRATISTA</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-0.5">Nombre</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.contratista_nombre}
                      onChange={e => setNewForm({ ...newForm, contratista_nombre: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Cédula</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.contratista_identificacion}
                      onChange={e => setNewForm({ ...newForm, contratista_identificacion: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Expedida en</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.contratista_expedida_en}
                      onChange={e => setNewForm({ ...newForm, contratista_expedida_en: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Teléfono</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.contratista_telefono}
                      onChange={e => setNewForm({ ...newForm, contratista_telefono: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Correo</label>
                    <input type="email" className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.contratista_correo}
                      onChange={e => setNewForm({ ...newForm, contratista_correo: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-0.5">Dirección</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.contratista_direccion}
                      onChange={e => setNewForm({ ...newForm, contratista_direccion: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">DATOS DEL CONTRATO</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Objeto</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.objeto}
                      onChange={e => setNewForm({ ...newForm, objeto: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Tipo Costo</label>
                    <select className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.costo_tipo}
                      onChange={e => setNewForm({ ...newForm, costo_tipo: e.target.value })}>
                      <option value="DIRECTO">DIRECTO</option>
                      <option value="INDIRECTO">INDIRECTO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Valor Total</label>
                    <input type="number" className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.monto_total}
                      onChange={e => setNewForm({ ...newForm, monto_total: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Valor Transporte</label>
                    <input type="number" className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.monto_transporte}
                      onChange={e => setNewForm({ ...newForm, monto_transporte: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">No. CDP</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.no_cdp}
                      onChange={e => setNewForm({ ...newForm, no_cdp: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Cuotas</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" placeholder="Ej: 2 o DOS (2)"
                      value={newForm.cuotas}
                      onChange={e => setNewForm({ ...newForm, cuotas: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Fecha Inicio</label>
                    <input type="date" className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.fecha_inicio}
                      onChange={e => setNewForm({ ...newForm, fecha_inicio: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Fecha Fin</label>
                    <input type="date" className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.fecha_fin}
                      onChange={e => setNewForm({ ...newForm, fecha_fin: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">SUPERVISIÓN</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Supervisor</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.supervisor}
                      onChange={e => setNewForm({ ...newForm, supervisor: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Cédula Supervisor</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.cedula_supervisor}
                      onChange={e => setNewForm({ ...newForm, cedula_supervisor: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Cargo Supervisor</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.cargo_supervisor}
                      onChange={e => setNewForm({ ...newForm, cargo_supervisor: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Unidad Atención</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.unidad_atencion}
                      onChange={e => setNewForm({ ...newForm, unidad_atencion: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-0.5">Lugar Ejecución</label>
                    <input className="w-full px-2 py-1.5 border rounded text-sm" value={newForm.lugar_ejecucion}
                      onChange={e => setNewForm({ ...newForm, lugar_ejecucion: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  {submitting ? "Creando..." : "Crear Contrato"}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
