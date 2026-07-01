"use client"

import { useState, useEffect } from "react"
import { getResoluciones, type Resolucion } from "@/lib/api"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { KPISkeleton } from "@/components/ui/skeleton"
import { Plus, Search, FileText, Calendar } from "lucide-react"

const fmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

export default function ResolucionesPage() {
  const [resoluciones, setResoluciones] = useState<Resolucion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    getResoluciones()
      .then(setResoluciones)
      .finally(() => setLoading(false))
  }, [])

  const filtered = resoluciones.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.codigo.toLowerCase().includes(q) ||
      (r.titulo?.toLowerCase().includes(q) ?? false)
    )
  })

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resoluciones</h1>
          <p className="text-gray-500 mt-1">Lista de resoluciones de presupuesto</p>
        </div>
        <KPISkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resoluciones</h1>
          <p className="text-gray-500 mt-1">
            {resoluciones.length} resolución{resoluciones.length !== 1 ? "es" : ""} registrada{resoluciones.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/resoluciones/nuevo">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Resolución
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar resolución..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">
            {search ? "No se encontraron resoluciones" : "Aún no hay resoluciones"}
          </p>
          {!search && (
            <Link href="/dashboard/resoluciones/nuevo">
              <Button>
                <Plus className="w-4 h-4 mr-1" />
                Crear primera resolución
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const comprometido = r.comprometido || 0
            const saldo = r.saldo !== undefined ? r.saldo : r.presupuesto - comprometido
            const progreso = r.presupuesto > 0 ? (comprometido / r.presupuesto) * 100 : 0
            const isExceeded = saldo < 0

            return (
              <Link key={r.id} href={`/dashboard/resoluciones/${r.id}`} className="group block">
                <Card className="h-full hover:shadow-lg hover:border-emerald-200 transition-all duration-200">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                          {r.codigo}
                        </h3>
                        {r.titulo && (
                          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{r.titulo}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="info" className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {r.vigencia || "—"}
                      </Badge>
                      {r.total_contratos !== undefined && (
                        <Badge variant="default">
                          {r.total_contratos} contratos
                        </Badge>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Ejecución</span>
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

                    <div className="grid grid-cols-3 gap-2 text-sm mt-auto pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-gray-400 text-xs">Presupuesto</p>
                        <p className="font-semibold text-gray-900 text-xs">{fmt.format(r.presupuesto)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Comprometido</p>
                        <p className="font-semibold text-amber-600 text-xs">{fmt.format(comprometido)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Saldo</p>
                        <p className={`font-semibold text-xs ${isExceeded ? "text-red-600" : "text-gray-900"}`}>
                          {isExceeded ? "Excedido" : fmt.format(saldo)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
