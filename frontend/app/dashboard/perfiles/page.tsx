"use client"

import { useState, useEffect } from "react"
import { getPerfiles } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/ui/skeleton"
import { Users, Briefcase, Activity } from "lucide-react"

export default function PerfilesPage() {
  const [perfiles, setPerfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPerfiles()
      .then(setPerfiles)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfiles</h1>
        </div>
        <TableSkeleton rows={6} cols={3} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfiles</h1>
          <p className="text-gray-500 mt-1">
            {perfiles.length} perfil{perfiles.length !== 1 ? "es" : ""} registrado{perfiles.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {perfiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay perfiles registrados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {perfiles.map((perfil: any, idx: number) => (
            <Card key={perfil.id || idx} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {perfil.nombre || perfil.perfil || `Perfil #${idx + 1}`}
                    </h3>
                    {perfil.descripcion && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{perfil.descripcion}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="default" className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {(perfil.actividades?.length ?? 0)} actividades
                      </Badge>
                      {perfil.contratos_count !== undefined && (
                        <Badge variant="info">{perfil.contratos_count} contratos</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {perfil.actividades && perfil.actividades.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Actividades</p>
                    <ul className="space-y-1">
                      {perfil.actividades.slice(0, 5).map((act: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                          {act}
                        </li>
                      ))}
                      {perfil.actividades.length > 5 && (
                        <li className="text-xs text-gray-400 ml-3.5">
                          +{perfil.actividades.length - 5} más
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
