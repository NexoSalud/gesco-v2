"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowUpDown, FolderKanban, GitCompareArrows, Paperclip, Plus, RefreshCcw, Search } from "lucide-react"
import { gcContratos, GcContrato } from "@/lib/gestion-api"
import { useGcAuth } from "@/components/gestion/gc-auth-provider"
import {
  Btn,
  Chip,
  ESTADOS_GESTION,
  EmptyState,
  EstadoChip,
  PageHeader,
  Panel,
  Shimmer,
  diasRestantes,
  formatCOP,
  formatFecha,
  iniciales,
  inputCls,
} from "@/components/gestion/ui"
import { DOCUMENTOS_CLAVE } from "@/components/gestion/documentos"
import { cn } from "@/lib/utils"
import { OrigenChip } from "@/components/gestion/formularios"

type Orden = "reciente" | "vencimiento" | "valor" | "documentos"

export default function ContratosPage() {
  return (
    <Suspense>
      <ContratosInner />
    </Suspense>
  )
}

function ContratosInner() {
  const params = useSearchParams()
  const router = useRouter()
  const { can } = useGcAuth()
  const estado = params.get("estado") || ""
  const [buscar, setBuscar] = useState("")
  const [orden, setOrden] = useState<Orden>("reciente")
  const [todos, setTodos] = useState<GcContrato[] | null>(null)

  useEffect(() => {
    gcContratos()
      .then(setTodos)
      .catch((e) => {
        toast.error(e.message)
        setTodos([])
      })
  }, [])

  const conteo = useMemo(() => {
    const c: Record<string, number> = {}
    todos?.forEach((x) => (c[x.estado_gestion] = (c[x.estado_gestion] || 0) + 1))
    return c
  }, [todos])

  const lista = useMemo(() => {
    if (!todos) return null
    const t = buscar.trim().toLowerCase()
    let l = todos.filter((c) => !estado || c.estado_gestion === estado)
    if (t) {
      l = l.filter((c) =>
        [c.numero_contrato, c.contratista_nombre, c.contratista_identificacion, c.perfil, c.supervisor].some((v) => v?.toLowerCase().includes(t))
      )
    }
    const sorted = [...l]
    if (orden === "vencimiento") sorted.sort((a, b) => (a.fecha_fin || "9999").localeCompare(b.fecha_fin || "9999"))
    if (orden === "valor") sorted.sort((a, b) => (b.valor_final ?? b.valor_total) - (a.valor_final ?? a.valor_total))
    if (orden === "documentos") sorted.sort((a, b) => a.total_documentos - b.total_documentos)
    return sorted
  }, [todos, buscar, estado, orden])

  const setEstado = (e: string) => router.replace(e ? `/gestion/contratos?estado=${e}` : "/gestion/contratos")

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Contratos"
        description="Contratos reales, sincronizados o creados aquí, y el avance de su expediente documental."
        actions={
          can("editar") && (
            <>
              <Link href="/gestion/sincronizar">
                <Btn>
                  <GitCompareArrows className="h-4 w-4" /> Sincronizar
                </Btn>
              </Link>
              <Link href="/gestion/contratos/nuevo">
                <Btn variant="primary">
                  <Plus className="h-4 w-4" /> Nuevo contrato
                </Btn>
              </Link>
            </>
          )
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-wrap gap-1.5">
          <FiltroEstado activo={!estado} onClick={() => setEstado("")} label="Todos" n={todos?.length} />
          {ESTADOS_GESTION.map((e) => (
            <FiltroEstado key={e.value} activo={estado === e.value} onClick={() => setEstado(e.value)} label={e.label} n={conteo[e.value] || 0} dot={e.dot} />
          ))}
        </div>
        <div className="flex flex-1 gap-2 md:justify-end">
          <div className="relative w-full md:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Filtrar contratos…" className={cn(inputCls, "pl-9")} />
          </div>
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className={cn(inputCls, "w-auto cursor-pointer pl-8")}>
              <option value="reciente">Más recientes</option>
              <option value="vencimiento">Próximo vencimiento</option>
              <option value="valor">Mayor valor</option>
              <option value="documentos">Menos documentos</option>
            </select>
          </div>
        </div>
      </div>

      <Panel className="overflow-hidden">
        {lista === null ? (
          <div className="divide-y divide-gray-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Shimmer className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Shimmer className="h-4 w-1/3" />
                  <Shimmer className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : lista.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={todos?.length ? "Sin coincidencias" : "Aún no hay contratos"}
            description={todos?.length ? "Ajusta la búsqueda o el filtro de estado." : "Sincroniza desde el módulo de contratos los que hacen parte del expediente real."}
            action={
              !todos?.length && can("editar") ? (
                <Link href="/gestion/sincronizar">
                  <Btn variant="primary">
                    <GitCompareArrows className="h-4 w-4" /> Sincronizar contratos
                  </Btn>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {lista.map((c) => {
              const cubiertas = DOCUMENTOS_CLAVE.filter((k) => c.categorias_cubiertas.includes(k)).length
              const pct = Math.round((cubiertas / DOCUMENTOS_CLAVE.length) * 100)
              const dias = diasRestantes(c.fecha_fin)
              return (
                <li key={c.id}>
                  <Link href={`/gestion/contratos/${c.id}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50 sm:px-5 md:grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1fr)_6.5rem]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                      {iniciales(c.contratista_nombre)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-900">{c.contratista_nombre || "Sin contratista"}</p>
                        {c.origen === "MANUAL" && <OrigenChip origen="MANUAL" className="shrink-0" />}
                        {c.desactualizado && (
                          <Chip tone="amber" className="shrink-0">
                            <RefreshCcw className="h-3 w-3" /> Cambios
                          </Chip>
                        )}
                      </div>
                      <p className="truncate text-xs text-gray-500">
                        {c.numero_contrato}
                        {c.perfil ? ` · ${c.perfil}` : ""}
                      </p>
                    </div>
                    <div className="hidden min-w-0 md:block">
                      <p className="text-sm tabular-nums text-gray-900">{formatCOP((c.valor_final ?? c.valor_total) + c.valor_transporte)}</p>
                      <p className={cn("text-xs", c.estado_gestion === "VIGENTE" && dias !== null && dias <= 30 && dias >= 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-500")}>
                        {c.fecha_fin ? `Hasta ${formatFecha(c.fecha_fin)}` : "Sin fecha fin"}
                        {c.estado_gestion === "VIGENTE" && dias !== null && dias >= 0 && dias <= 30 ? ` · ${dias} d` : ""}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Paperclip className="h-3 w-3" /> {c.total_documentos}
                        </span>
                        <span className="tabular-nums text-gray-500">
                          {cubiertas}/{DOCUMENTOS_CLAVE.length} clave
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-sky-500" : pct > 0 ? "bg-amber-500" : "bg-transparent")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <EstadoChip estado={c.estado_gestion} />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function FiltroEstado({ activo, onClick, label, n, dot }: { activo: boolean; onClick: () => void; label: string; n?: number; dot?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-all",
        activo ? "bg-gray-900 text-gray-50 ring-gray-900" : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-50"
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
      {label}
      {n !== undefined && <span className={cn("tabular-nums", activo ? "opacity-70" : "text-gray-400")}>{n}</span>}
    </button>
  )
}
