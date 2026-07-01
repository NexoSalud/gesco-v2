"use client"

import { useState, useEffect } from "react"
import { getPlantillas } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/ui/skeleton"
import { FileSpreadsheet, FileText, Calendar } from "lucide-react"

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlantillas()
      .then(setPlantillas)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Observación</h1>
        </div>
        <TableSkeleton rows={4} cols={3} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plantillas</h1>
        <p className="text-gray-500 mt-1">
          Plantillas de observación para supervisiones
        </p>
      </div>

      {plantillas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay plantillas registradas</p>
            <p className="text-xs text-gray-400 mt-1">
              Las plantillas se usan en los informes de supervisión
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plantillas.map((plantilla: any, idx: number) => (
            <Card key={plantilla.id || idx} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {plantilla.nombre || `Plantilla #${idx + 1}`}
                    </h3>
                    {plantilla.tipo && (
                      <Badge variant="default" className="mt-1">{plantilla.tipo}</Badge>
                    )}
                    {plantilla.descripcion && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{plantilla.descripcion}</p>
                    )}
                    {plantilla.created_at && (
                      <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(plantilla.created_at).toLocaleDateString("es-CO")}
                      </div>
                    )}
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
