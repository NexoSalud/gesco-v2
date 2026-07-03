"use client"

import { useState, useEffect } from "react"
import { getResoluciones, getDashboardGlobal, getAlertas, type Resolucion } from "@/lib/api"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { KPISkeleton, TableSkeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Plus,
  CalendarClock,
  ArrowRight,
  PieChart,
  Wallet,
} from "lucide-react"

const fmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

function DonutChart({ used, total }: { used: number; total: number }) {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{percentage.toFixed(1)}%</span>
          <span className="text-[10px] text-gray-500">ejecutado</span>
        </div>
      </div>
      <div className="flex gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-gray-500">Comprometido</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <span className="text-gray-500">Disponible</span>
        </div>
      </div>
    </div>
  )
}

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
    ])
      .then(([res, glob, al]) => {
        setResoluciones(res)
        setGlobal(glob)
        setAlertas(al)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Resumen general de gestión de contratos</p>
        </div>
        <KPISkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><TableSkeleton /></div>
          <div><div className="h-80 rounded-xl bg-gray-100 animate-pulse" /></div>
        </div>
      </div>
    )
  }

  const totalPresupuesto = global?.presupuesto_global || 0
  const totalComprometido = global?.total_comprometido || 0
  const saldoGlobal = totalPresupuesto - totalComprometido

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Resumen general de gestión de contratos</p>
        </div>
        <Link href="/dashboard/resoluciones/nuevo">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Resolución
          </Button>
        </Link>
      </div>

      {/* Global KPIs */}
      {global && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolución Activa</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold truncate" title={global.resolucion_activa_codigo || "—"}>
                {global.resolucion_activa_codigo || "Sin activa"}
              </p>
              {global.resolucion_activa_id && (
                <Link href={`/dashboard/resoluciones/${global.resolucion_activa_id}`} className="text-xs text-emerald-600 hover:underline mt-1 block">
                  Ver detalle →
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contratos</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold">{global.total_contratos}</p>
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-emerald-600">{global.activos} activos</span>
                <span className="text-xs text-blue-600">{global.total_finalizados} finalizados</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Presupuesto</p>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold">{fmt.format(totalPresupuesto)}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comprometido</p>
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-600">{fmt.format(totalComprometido)}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${saldoGlobal < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {fmt.format(saldoGlobal)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas */}
        <div className="lg:col-span-2 space-y-4">
          {alertas.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <CardTitle className="text-sm text-amber-800">
                    Alertas: Contratos próximos a vencer ({alertas.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alertas.slice(0, 5).map((a: any) => (
                    <Link
                      key={a.numero_contrato}
                      href={`/dashboard/contratos/${encodeURIComponent(a.numero_contrato)}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-white hover:bg-amber-50/50 transition-colors border border-amber-100"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarClock className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.numero_contrato}</p>
                          <p className="text-xs text-gray-500">{a.perfil || "N/A"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="warning">Vence: {a.fecha_fin}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
                {alertas.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    +{alertas.length - 5} más
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resoluciones Grid */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Resoluciones</h2>
            <Link
              href="/dashboard/resoluciones"
              className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[...resoluciones].sort((a, b) => (b.activa ? 1 : 0) - (a.activa ? 1 : 0)).map((r) => {
              const comprometido = r.comprometido || 0
              const saldo = r.saldo !== undefined ? r.saldo : r.presupuesto - comprometido
              const progreso = r.presupuesto > 0 ? (comprometido / r.presupuesto) * 100 : 0
              const isExceeded = saldo < 0

              return (
                <Link
                  key={r.id}
                  href={`/dashboard/resoluciones/${r.id}`}
                  className="group block"
                >
                  <Card className={`hover:shadow-lg hover:border-emerald-200 transition-all duration-200 ${r.activa ? "ring-2 ring-emerald-400" : ""}`}>
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                              {r.codigo}
                            </h3>
                            {r.activa && (
                              <Badge variant="success">Activa</Badge>
                            )}
                          </div>
                          {r.titulo && (
                            <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{r.titulo}</p>
                          )}
                        </div>
                        <Badge variant="info">{r.vigencia || "—"}</Badge>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Ejecución presupuestal</span>
                          <span className="font-medium">{progreso.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isExceeded ? "bg-red-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(progreso, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs">Presupuesto</p>
                          <p className="font-semibold text-gray-900">{fmt.format(r.presupuesto)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Comprometido</p>
                          <p className="font-semibold text-amber-600">{fmt.format(comprometido)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Saldo</p>
                          <p className={`font-semibold ${isExceeded ? "text-red-600" : "text-gray-900"}`}>
                            {isExceeded ? "Excedido" : fmt.format(saldo)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
            {resoluciones.length === 0 && (
              <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No hay resoluciones</p>
                <Link href="/dashboard/resoluciones/nuevo">
                  <Button variant="default" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Crear primera resolución
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-gray-500" />
                <CardTitle className="text-sm">Ejecución Presupuestal</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6">
              <DonutChart used={totalComprometido} total={totalPresupuesto} />
              <div className="w-full mt-4 space-y-2 text-sm border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Presupuesto total</span>
                  <span className="font-medium">{fmt.format(totalPresupuesto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Comprometido</span>
                  <span className="font-medium text-amber-600">{fmt.format(totalComprometido)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-500">Saldo disponible</span>
                  <span className={`font-medium ${saldoGlobal < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {fmt.format(saldoGlobal)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Estados de Contratos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm text-gray-600">Activos</span>
                  </div>
                  <span className="font-semibold">{global?.activos || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-sm text-gray-600">Finalizados</span>
                  </div>
                  <span className="font-semibold">{global?.total_finalizados || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-sm text-gray-600">Anulados</span>
                  </div>
                  <span className="font-semibold">{global?.total_anulados || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
