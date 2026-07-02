"use client"

import { useState, useEffect } from "react"
import { getContratos, type Contrato } from "@/lib/api"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, getEstadoBadgeVariant } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { TableSkeleton } from "@/components/ui/skeleton"
import { Search, Scale, ArrowRight, Plus } from "lucide-react"

const fmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

export default function ContratosGlobalPage() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterEstado, setFilterEstado] = useState("")

  useEffect(() => {
    getContratos()
      .then(setContratos)
      .finally(() => setLoading(false))
  }, [])

  const filtered = contratos.filter((c) => {
    if (filterEstado && c.estado !== filterEstado) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.numero_contrato.toLowerCase().includes(q) ||
        (c.contratista_rel?.nombre?.toLowerCase().includes(q) ?? false) ||
        (c.perfil?.toLowerCase().includes(q) ?? false) ||
        (c.objeto?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-500 mt-1">Lista global de contratos</p>
        </div>
        <TableSkeleton rows={10} cols={7} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
        <p className="text-gray-500 mt-1">
          {contratos.length} contrato{contratos.length !== 1 ? "s" : ""} registrado{contratos.length !== 1 ? "s" : ""}
        </p>
        <Link href="/dashboard/contratos/nuevo" className="ml-auto">
          <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nuevo Contrato</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar contrato..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        {(filterEstado || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterEstado(""); setSearch("") }}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {search || filterEstado ? "No se encontraron contratos" : "Aún no hay contratos registrados"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Contrato</TableHead>
                  <TableHead>Contratista</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Resolución</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.numero_contrato}>
                    <TableCell className="font-medium">{c.numero_contrato}</TableCell>
                    <TableCell>
                      <p className="text-sm">{c.contratista_rel?.nombre || "—"}</p>
                      {c.contratista_rel?.identificacion && (
                        <p className="text-xs text-gray-400">CC {c.contratista_rel.identificacion}</p>
                      )}
                    </TableCell>
                    <TableCell>{c.perfil || "—"}</TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">
                        ID: {c.resolucion_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEstadoBadgeVariant(c.estado)}>{c.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt.format(c.monto_total + (c.monto_transporte || 0))}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {c.fecha_inicio || "—"} <br /> {c.fecha_fin || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/contratos/${encodeURIComponent(c.numero_contrato)}`}
                        className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                      >
                        Ver <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
