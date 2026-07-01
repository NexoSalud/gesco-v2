"use client"

import { useState, useEffect } from "react"
import { getResoluciones, getDashboardGlobal, getAlertas, type Resolucion } from "@/lib/api"
import Link from "next/link"

const fmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

export default function DashboardPage() {
  const [resoluciones, setResoluciones] = useState<Resolucion[]>([])
  const [global, setGlobal] = useState<any>(null)
  const [alertas, setAlertas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getResoluciones(),
      getDashboardGlobal(),
      getAlertas(30),
    ]).then(([res, glob, al]) => {
      setResoluciones(res)
      setGlobal(glob)
      setAlertas(al)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gesco V2</h1>
          <p className="text-gray-500">Gestión de Contratos — ESE Norte 3</p>
        </div>
        <Link
          href="/dashboard/resoluciones/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          + Nueva Resolución
        </Link>
      </div>

      {/* KPIs Globales */}
      {global && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-semibold">Resoluciones</p>
            <p className="text-2xl font-bold mt-1">{global.total_resoluciones}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-semibold">Contratos</p>
            <p className="text-2xl font-bold mt-1">{global.total_contratos}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-semibold">Activos</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{global.activos}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-semibold">Presupuesto Global</p>
            <p className="text-2xl font-bold mt-1">{fmt.format(global.presupuesto_global)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-semibold">Comprometido</p>
            <p className="text-lg font-bold mt-1 text-amber-600">{fmt.format(global.total_comprometido)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-semibold">Saldo</p>
            <p className="text-lg font-bold mt-1">{fmt.format(global.saldo_global)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-semibold">Finalizados</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{global.total_finalizados}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-semibold">Anulados</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{global.total_anulados}</p>
          </div>
        </div>
      )}

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h2 className="font-semibold text-amber-800 mb-2">
            ⚠️ Contratos próximos a vencer ({alertas.length})
          </h2>
          <div className="space-y-1">
            {alertas.slice(0, 5).map((a: any) => (
              <p key={a.numero_contrato} className="text-sm text-amber-700">
                {a.numero_contrato} — {a.perfil || "N/A"} — vence: {a.fecha_fin}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Resoluciones */}
      <h2 className="text-xl font-semibold mb-4">Resoluciones</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {resoluciones.map((r) => (
          <Link
            key={r.id}
            href={`/dashboard/resoluciones/${r.id}`}
            className="block bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">{r.codigo}</h3>
                {r.titulo && <p className="text-sm text-gray-500 line-clamp-1">{r.titulo}</p>}
              </div>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{r.vigencia || "—"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-gray-400">Presupuesto</p>
                <p className="font-semibold">{fmt.format(r.presupuesto)}</p>
              </div>
              <div>
                <p className="text-gray-400">Comprometido</p>
                <p className="font-semibold text-amber-600">{fmt.format(r.comprometido || 0)}</p>
              </div>
              <div>
                <p className="text-gray-400">Saldo</p>
                <p className="font-semibold">{(r.saldo || 0) >= 0 ? fmt.format(r.saldo || 0) : "⚠️ Negativo"}</p>
              </div>
            </div>
          </Link>
        ))}
        {resoluciones.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-400">
            No hay resoluciones. Crea la primera.
          </div>
        )}
      </div>
    </div>
  )
}
