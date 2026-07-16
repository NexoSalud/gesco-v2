"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/ui/skeleton"
import { Search, User, Phone, Briefcase, Plus } from "lucide-react"
import { toast } from "sonner"

const API = process.env.NEXT_PUBLIC_API_URL || "https://contratos.esenorte3.lat"

export default function SupervisoresPage() {
  const router = useRouter()
  const [supervisores, setSupervisores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")

  const cargar = useCallback(async (q = "") => {
    setLoading(true)
    try {
      const url = q ? `${API}/api/v1/supervisores?buscar=${encodeURIComponent(q)}` : `${API}/api/v1/supervisores`
      const res = await fetch(url)
      const data = await res.json()
      setSupervisores(data)
    } catch (e) {
      console.error(e)
      setSupervisores([])
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
          <h1 className="text-2xl font-bold text-gray-900">Supervisores</h1>
          <p className="text-gray-500 mt-1">
            {supervisores.length} supervisor{supervisores.length !== 1 ? "es" : ""} registrado{supervisores.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/supervisores/nuevo")} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nuevo Supervisor
        </Button>
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
      ) : supervisores.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron supervisores</p>
            <Button className="mt-3" size="sm" onClick={() => router.push("/dashboard/supervisores/nuevo")}>
              Crear primer supervisor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {supervisores.map((s: any) => (
            <Card
              key={s.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/supervisores/${s.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{s.nombre}</h3>
                    <p className="text-xs text-gray-400">CC: {s.identificacion}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {s.cargo && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Briefcase className="w-3 h-3" /> {s.cargo}
                        </Badge>
                      )}
                      {s.telefono && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Phone className="w-3 h-3" /> {s.telefono}
                        </Badge>
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
