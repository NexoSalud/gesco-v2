"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { GitCompareArrows, RefreshCcw, Search, UserPlus, Users } from "lucide-react"
import { gcContratistas, GcContratista } from "@/lib/gestion-api"
import { useGcAuth } from "@/components/gestion/gc-auth-provider"
import { Btn, Chip, EmptyState, PageHeader, Panel, Shimmer, formatCOP, iniciales, inputCls } from "@/components/gestion/ui"
import { ContratistaDialog, OrigenChip } from "@/components/gestion/formularios"
import { cn } from "@/lib/utils"

type Filtro = "todos" | "SINCRONIZADO" | "MANUAL"

export default function ContratistasPage() {
  const { can } = useGcAuth()
  const router = useRouter()
  const [lista, setLista] = useState<GcContratista[] | null>(null)
  const [buscar, setBuscar] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [crear, setCrear] = useState(false)

  useEffect(() => {
    gcContratistas()
      .then(setLista)
      .catch((e) => {
        toast.error(e.message)
        setLista([])
      })
  }, [])

  const visibles = useMemo(() => {
    if (!lista) return null
    const t = buscar.trim().toLowerCase()
    return lista.filter(
      (c) => (filtro === "todos" || c.origen === filtro) && (!t || c.nombre.toLowerCase().includes(t) || c.identificacion.includes(t))
    )
  }, [lista, buscar, filtro])

  const n = (o: Filtro) => (o === "todos" ? lista?.length : lista?.filter((c) => c.origen === o).length)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Contratistas"
        description="Personas y empresas con contratos en el módulo, sincronizadas del GESCO principal o creadas aquí."
        actions={
          can("editar") && (
            <>
              <Link href="/gestion/sincronizar?tipo=contratistas">
                <Btn>
                  <GitCompareArrows className="h-4 w-4" /> Sincronizar
                </Btn>
              </Link>
              <Btn variant="primary" onClick={() => setCrear(true)}>
                <UserPlus className="h-4 w-4" /> Nuevo contratista
              </Btn>
            </>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex shrink-0 rounded-lg bg-gray-100 p-0.5">
          {(
            [
              ["todos", "Todos"],
              ["SINCRONIZADO", "Sincronizados"],
              ["MANUAL", "Creados aquí"],
            ] as [Filtro, string][]
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFiltro(v)}
              className={cn(
                "cursor-pointer whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                filtro === v ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-800"
              )}
            >
              {l} <span className="ml-0.5 tabular-nums opacity-60">{n(v) ?? ""}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:ml-auto sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre o identificación" className={cn(inputCls, "pl-9")} />
        </div>
      </div>

      <Panel className="overflow-hidden">
        {visibles === null ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Shimmer key={i} className="h-12" />
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <EmptyState
            icon={Users}
            title={lista?.length ? "Sin coincidencias" : "Aún no hay contratistas"}
            description={lista?.length ? "Ajusta la búsqueda o el filtro." : "Sincronízalos desde el GESCO principal o crea uno nuevo."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Contratista</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Contacto</th>
                  <th className="px-5 py-3 text-right font-medium">Contratos</th>
                  <th className="hidden px-5 py-3 text-right font-medium sm:table-cell">Valor contratado</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.map((c) => (
                  <tr key={c.id} onClick={() => router.push(`/gestion/contratistas/${c.id}`)} className="cursor-pointer transition-colors hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                          {iniciales(c.nombre)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{c.nombre}</p>
                          <p className="text-xs tabular-nums text-gray-500">
                            {c.tipo_persona === "JURIDICA" ? "NIT" : "C.C."} {c.identificacion}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 text-xs text-gray-500 md:table-cell">
                      {c.correo || c.telefono ? (
                        <>
                          {c.correo && <p className="truncate">{c.correo}</p>}
                          {c.telefono && <p className="tabular-nums">{c.telefono}</p>}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-900">
                      {c.total_contratos}
                      {c.contratos_vigentes > 0 && <span className="ml-1 hidden text-xs text-gray-500 sm:inline">({c.contratos_vigentes} vig.)</span>}
                    </td>
                    <td className="hidden px-5 py-3 text-right tabular-nums text-gray-900 sm:table-cell">{formatCOP(c.valor_contratado)}</td>
                    <td className="hidden px-5 py-3 sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <OrigenChip origen={c.origen} />
                        {c.desactualizado && (
                          <Chip tone="amber">
                            <RefreshCcw className="h-3 w-3" /> Cambios
                          </Chip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ContratistaDialog
        open={crear}
        onClose={() => setCrear(false)}
        onGuardado={(c) => router.push(`/gestion/contratistas/${c.id}`)}
      />
    </div>
  )
}
