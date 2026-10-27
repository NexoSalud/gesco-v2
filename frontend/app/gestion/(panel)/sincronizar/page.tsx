"use client"

import Link from "next/link"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Check, CheckCircle2, CircleDashed, GitCompareArrows, Loader2, Minus, RefreshCcw, Search, X } from "lucide-react"
import { gcOrigen, gcResoluciones, gcSincronizar, ContratoOrigen, VistaOrigen } from "@/lib/gestion-api"
import { useGcAuth } from "@/components/gestion/gc-auth-provider"
import { Btn, Checkbox, Chip, EmptyState, Kbd, PageHeader, Panel, Shimmer, formatCOP, formatFecha, inputCls } from "@/components/gestion/ui"
import { cn } from "@/lib/utils"
import { SincronizarContratistas } from "@/components/gestion/sync-contratistas"

const VISTAS: { value: VistaOrigen; label: string }[] = [
  { value: "pendientes", label: "Pendientes" },
  { value: "desactualizados", label: "Con cambios" },
  { value: "sincronizados", label: "Sincronizados" },
  { value: "todos", label: "Todos" },
]

const ESTADOS_ORIGEN = ["ACTIVO", "EN_PROCESO", "FINALIZADO", "ANULADO"]

export default function SincronizarPage() {
  return (
    <Suspense>
      <Sincronizar />
    </Suspense>
  )
}

function Sincronizar() {
  const { can } = useGcAuth()
  const router = useRouter()
  const params = useSearchParams()
  const tipo = params.get("tipo") === "contratistas" ? "contratistas" : "contratos"

  useEffect(() => {
    if (!can("editar")) router.replace("/gestion")
  }, [can, router])

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <PageHeader
        title="Sincronizar"
        description="Elige qué registros del GESCO principal son reales y deben entrar al módulo. Solo se copian los que selecciones."
      />
      <div className="flex gap-6 border-b border-gray-200">
        {(
          [
            ["contratos", "Contratos"],
            ["contratistas", "Contratistas"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => router.replace(v === "contratos" ? "/gestion/sincronizar" : "/gestion/sincronizar?tipo=contratistas")}
            className={cn(
              "-mb-px cursor-pointer border-b-2 pb-2.5 text-sm font-medium transition-colors",
              tipo === v ? "border-emerald-600 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            {l}
          </button>
        ))}
      </div>
      {tipo === "contratos" ? <SincronizarContratos /> : <SincronizarContratistas />}
    </div>
  )
}

function SincronizarContratos() {
  const [vista, setVista] = useState<VistaOrigen>("pendientes")
  const [buscar, setBuscar] = useState("")
  const [estado, setEstado] = useState("")
  const [resolucionId, setResolucionId] = useState<number | "">("")
  const [resoluciones, setResoluciones] = useState<{ id: number; codigo: string }[]>([])
  const [rows, setRows] = useState<ContratoOrigen[] | null>(null)
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())
  const [syncing, setSyncing] = useState(false)
  const ultimoClick = useRef<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    gcResoluciones().then(setResoluciones).catch(() => {})
  }, [])

  const cargar = useCallback(() => {
    setRows(null)
    gcOrigen({ buscar: buscar || undefined, estado: estado || undefined, resolucion_id: resolucionId || undefined, vista })
      .then((r) => {
        setRows(r)
        setSeleccion((prev) => new Set([...prev].filter((id) => r.some((x) => x.id === id))))
      })
      .catch((e) => {
        toast.error(e.message)
        setRows([])
      })
  }, [buscar, estado, resolucionId, vista])

  useEffect(() => {
    const t = setTimeout(cargar, buscar ? 250 : 0)
    return () => clearTimeout(t)
  }, [cargar, buscar])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const visibles = rows || []
  const todosMarcados = visibles.length > 0 && visibles.every((r) => seleccion.has(r.id))
  const algunoMarcado = visibles.some((r) => seleccion.has(r.id))

  const toggle = (id: number, shift: boolean) => {
    const anterior = ultimoClick.current
    ultimoClick.current = id
    setSeleccion((prev) => {
      const next = new Set(prev)
      const marcar = !prev.has(id)
      if (shift && anterior !== null) {
        const a = visibles.findIndex((r) => r.id === anterior)
        const b = visibles.findIndex((r) => r.id === id)
        if (a >= 0 && b >= 0) {
          const [i, j] = a < b ? [a, b] : [b, a]
          visibles.slice(i, j + 1).forEach((r) => (marcar ? next.add(r.id) : next.delete(r.id)))
          return next
        }
      }
      marcar ? next.add(id) : next.delete(id)
      return next
    })
  }

  const toggleTodos = () => {
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (todosMarcados) visibles.forEach((r) => next.delete(r.id))
      else visibles.forEach((r) => next.add(r.id))
      return next
    })
  }

  const resumenSeleccion = useMemo(() => {
    const sel = visibles.filter((r) => seleccion.has(r.id))
    return {
      nuevos: sel.filter((r) => !r.sincronizado).length,
      actualizar: sel.filter((r) => r.desactualizado).length,
      valor: sel.reduce((s, r) => s + (r.valor_total || 0), 0),
    }
  }, [visibles, seleccion])

  const sincronizar = async () => {
    setSyncing(true)
    try {
      const r = await gcSincronizar([...seleccion])
      const partes = []
      if (r.creados) partes.push(`${r.creados} nuevo${r.creados === 1 ? "" : "s"}`)
      if (r.actualizados) partes.push(`${r.actualizados} actualizado${r.actualizados === 1 ? "" : "s"}`)
      if (r.sin_cambios) partes.push(`${r.sin_cambios} sin cambios`)
      toast.success("Sincronización completada", { description: partes.join(" · ") })
      setSeleccion(new Set())
      cargar()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <Panel>
        {/* Barra de filtros */}
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center">
          <div className="inline-flex max-w-full shrink-0 overflow-x-auto rounded-lg bg-gray-100 p-0.5">
            {VISTAS.map((v) => (
              <button
                key={v.value}
                onClick={() => setVista(v.value)}
                className={cn(
                  "cursor-pointer whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  vista === v.value ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-800"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Número, contratista o cédula"
              className={cn(inputCls, "pl-9 pr-10")}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <Kbd>/</Kbd>
            </span>
          </div>
          <div className="flex gap-2">
            <select value={resolucionId} onChange={(e) => setResolucionId(e.target.value ? Number(e.target.value) : "")} className={cn(inputCls, "w-auto min-w-40 cursor-pointer")}>
              <option value="">Todas las resoluciones</option>
              {resoluciones.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.codigo}
                </option>
              ))}
            </select>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className={cn(inputCls, "w-auto min-w-36 cursor-pointer")}>
              <option value="">Cualquier estado</option>
              {ESTADOS_ORIGEN.map((e) => (
                <option key={e} value={e}>
                  {e.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                <th className="w-12 py-3 pl-4">
                  <Checkbox checked={todosMarcados} indeterminate={!todosMarcados && algunoMarcado} onChange={toggleTodos} disabled={!visibles.length} />
                </th>
                <th className="py-3 pr-4 font-medium">Contrato</th>
                <th className="py-3 pr-4 font-medium">Contratista</th>
                <th className="hidden py-3 pr-4 font-medium md:table-cell">Vigencia</th>
                <th className="hidden py-3 pr-4 text-right font-medium sm:table-cell">Valor</th>
                <th className="py-3 pr-4 font-medium">Estado en GESCO</th>
                <th className="py-3 pr-4 font-medium">Sincronización</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td colSpan={7} className="px-4 py-3">
                      <Shimmer className="h-8" />
                    </td>
                  </tr>
                ))
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={vista === "pendientes" ? CheckCircle2 : CircleDashed}
                      title={vista === "pendientes" ? "Todo al día" : "Sin resultados"}
                      description={
                        vista === "pendientes"
                          ? "No hay contratos pendientes por sincronizar con estos filtros."
                          : "Prueba con otros filtros o cambia de vista."
                      }
                    />
                  </td>
                </tr>
              ) : (
                visibles.map((r) => {
                  const sel = seleccion.has(r.id)
                  return (
                    <tr
                      key={r.id}
                      onClick={(e) => toggle(r.id, e.shiftKey)}
                      className={cn(
                        "cursor-pointer select-none border-b border-gray-100 transition-colors last:border-0",
                        sel ? "bg-emerald-500/[0.06]" : "hover:bg-gray-50"
                      )}
                    >
                      <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={sel} onChange={(e) => toggle(r.id, (e.nativeEvent as MouseEvent).shiftKey)} />
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">{r.numero_contrato}</p>
                        <p className="text-xs text-gray-500">{[r.perfil, r.resolucion_codigo].filter(Boolean).join(" · ") || "—"}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="max-w-[16rem] truncate text-gray-900">{r.contratista_nombre || "—"}</p>
                        <p className="text-xs tabular-nums text-gray-500">{r.contratista_identificacion || ""}</p>
                      </td>
                      <td className="hidden py-3 pr-4 text-xs text-gray-600 md:table-cell">
                        {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}
                      </td>
                      <td className="hidden py-3 pr-4 text-right tabular-nums text-gray-900 sm:table-cell">{formatCOP(r.valor_total)}</td>
                      <td className="py-3 pr-4">
                        <Chip tone={r.estado === "ANULADO" ? "red" : "gray"}>{(r.estado || "—").replace("_", " ")}</Chip>
                      </td>
                      <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                        {r.desactualizado ? (
                          <Chip tone="amber">
                            <RefreshCcw className="h-3 w-3" /> Cambios en origen
                          </Chip>
                        ) : r.sincronizado ? (
                          <Link href={`/gestion/contratos/${r.gc_contrato_id}`} className="inline-flex">
                            <Chip tone="blue">
                              <Check className="h-3 w-3" /> Sincronizado
                            </Chip>
                          </Link>
                        ) : (
                          <span className="whitespace-nowrap text-xs text-gray-400">No sincronizado</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {rows && rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-xs text-gray-500">
            <span>
              {rows.length} contrato{rows.length === 1 ? "" : "s"}
            </span>
            <span className="hidden sm:inline">
              Consejo: <Kbd>Shift</Kbd> + clic para seleccionar un rango
            </span>
          </div>
        )}
      </Panel>

      {/* Barra flotante de acción */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-6 z-30 flex justify-center px-4 transition-all duration-300 lg:pl-64",
          seleccion.size ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        )}
      >
        <div className="flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-gray-200 bg-white/90 p-2 pl-4 shadow-2xl shadow-gray-900/10 backdrop-blur-xl">
          <div className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-emerald-600 px-2 text-xs font-semibold tabular-nums text-[#fff]">{seleccion.size}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {seleccion.size} seleccionado{seleccion.size === 1 ? "" : "s"}
            </p>
            <p className="truncate text-xs text-gray-500">
              {resumenSeleccion.nuevos} nuevo{resumenSeleccion.nuevos === 1 ? "" : "s"}
              {resumenSeleccion.actualizar ? ` · ${resumenSeleccion.actualizar} por actualizar` : ""} · {formatCOP(resumenSeleccion.valor)}
            </p>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setSeleccion(new Set())}>
            <X className="h-3.5 w-3.5" /> Limpiar
          </Btn>
          <Btn variant="primary" onClick={sincronizar} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />}
            Sincronizar
          </Btn>
        </div>
      </div>
    </>
  )
}
