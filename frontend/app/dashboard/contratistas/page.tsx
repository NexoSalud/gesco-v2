"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { buscarContratistas } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/ui/skeleton"
import { Search, User, Phone, MapPin, FileText, Plus } from "lucide-react"

export default function ContratistasPage() {
  const router = useRouter()
  const [contratistas, setContratistas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")

  const cargar = useCallback(async (q = "") => {
    setLoading(true)
    try {
      const data = await buscarContratistas(q)
      setContratistas(data)
    } catch (e) {
      console.error(e)
      setContratistas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    cargar(busqueda)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratistas</h1>
          <p className="text-gray-500 mt-1">
            {contratistas.length} contratista{contratistas.length !== 1 ? "s" : ""} registrado{contratistas.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Buscador */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o identificación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">Buscar</Button>
      </form>

      {/* Resultados */}
      {loading ? (
        <TableSkeleton rows={8} cols={4} />
      ) : contratistas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron contratistas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {contratistas.map((c: any) => (
            <Card
              key={c.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/contratistas/${encodeURIComponent(c.identificacion)}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{c.nombre}</h3>
                    <p className="text-xs text-gray-400">CC/NIT: {c.identificacion}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {c.telefono && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Phone className="w-3 h-3" /> {c.telefono}
                        </Badge>
                      )}
                      {c.tipo_persona && (
                        <Badge variant="default" className="text-[10px]">{c.tipo_persona}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
