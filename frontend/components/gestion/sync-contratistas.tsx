"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Check, CheckCircle2, CircleDashed, GitCompareArrows, Loader2, RefreshCcw, Search, X } from "lucide-react"
import { gcOrigenContratistas, gcSincronizarContratistas, ContratistaOrigen, VistaOrigen } from "@/lib/gestion-api"
import { Btn, Checkbox, Chip, EmptyState, Kbd, Panel, Shimmer, iniciales, inputCls } from "@/components/gestion/ui"
import { cn } from "@/lib/utils"

const VISTAS: { value: VistaOrigen; label: string }[] = [
  { value: "pendientes", label: "Pendientes" },
  { value: "desactualizados", label: "Con cambios" },
  { value: "sincronizados", label: "Sincronizados" },
  { value: "todos", label: "Todos" },
]

const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`

export function SincronizarContratistas() {
  const [vista, setVista] = useState<VistaOrigen>("pendientes")
  const [buscar, setBuscar] = useState("")
  const [rows, setRows] = useState<ContratistaOrigen[] | null>(null)
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())
  const [incluirContratos, setIncluirContratos] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const ultimoClick = useRef<number | null>(null)

  const cargar = useCallback(() => {
    setRows(null)
    gcOrigenContratistas({ buscar: buscar || undefined, vista })
      .then((r) => {
        setRows(r)
        setSeleccion((prev) => new Set([...prev].filter((id) => r.some((x) => x.id === id))))
      })
      .catch((e) => {
        toast.error(e.message)
        setRows([])
      })
  }, [buscar, vista])

  useEffect(() => {
    const t = setTimeout(cargar, buscar ? 250 : 0)
    return () => clearTimeout(t)
  }, [cargar, buscar])

  const visibles = rows || []
  const todosMarcados = visibles.length > 0 && visibles.every((r) => seleccion.has(r.id))
  const algunoMarcado = visibles.some((r) => seleccion.has(r.id))
  const sel = visibles.filter((r) => seleccion.has(r.id))
  const contratosSel = sel.reduce((s, r) => s + r.contratos, 0)

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

  const toggleTodos = () =>
    setSeleccion((prev) => {
      const next = new Set(prev)
      visibles.forEach((r) => (todosMarcados ? next.delete(r.id) : next.add(r.id)))
      return next
    })

  const sincronizar = async () => {
    setSyncing(true)
    try {
      const r = await gcSincronizarContratistas([...seleccion], incluirContratos)
      const partes = []
      if (r.creados) partes.push(`${plural(r.creados, "nuevo")}`)
      if (r.actualizados) partes.push(`${plural(r.actualizados, "actualizado")}`)
      if (r.sin_cambios) partes.push(`${r.sin_cambios} sin cambios`)
      if (r.contratos) {
        const c = r.contratos.creados + r.contratos.actualizados
        partes.push(`${plural(c, "contrato")} sincronizado${c === 1 ? "" : "s"}`)
      }
      toast.success("Contratistas sincronizados", { description: partes.join(" · ") })
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
            <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre o identificación" className={cn(inputCls, "pl-9")} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="w-12 py-3 pl-4">
                  <Checkbox checked={todosMarcados} indeterminate={!todosMarcados && algunoMarcado} onChange={toggleTodos} disabled={!visibles.length} />
                </th>
                <th className="py-3 pr-4 font-medium">Contratista</th>
                <th className="hidden py-3 pr-4 font-medium md:table-cell">Contacto</th>
                <th className="py-3 pr-4 text-right font-medium">Contratos</th>
                <th className="py-3 pr-4 font-medium">Sincronización</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td colSpan={5} className="px-4 py-3">
                      <Shimmer className="h-8" />
                    </td>
                  </tr>
                ))
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={vista === "pendientes" ? CheckCircle2 : CircleDashed}
                      title={vista === "pendientes" ? "Todo al día" : "Sin resultados"}
                      description={vista === "pendientes" ? "No hay contratistas pendientes por sincronizar." : "Prueba con otra búsqueda o cambia de vista."}
                    />
                  </td>
                </tr>
              ) : (
                visibles.map((r) => {
                  const marcado = seleccion.has(r.id)
                  return (
                    <tr
                      key={r.id}
                      onClick={(e) => toggle(r.id, e.shiftKey)}
                      className={cn(
                        "cursor-pointer select-none border-b border-gray-100 transition-colors last:border-0",
                        marcado ? "bg-emerald-500/[0.06]" : "hover:bg-gray-50"
                      )}
                    >
                      <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={marcado} onChange={(e) => toggle(r.id, (e.nativeEvent as MouseEvent).shiftKey)} />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600 ring-1 ring-gray-200">
                            {iniciales(r.nombre)}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[18rem] truncate font-medium text-gray-900">{r.nombre}</p>
                            <p className="text-xs tabular-nums text-gray-500">{r.identificacion}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden py-3 pr-4 text-xs text-gray-500 md:table-cell">
                        {r.correo || r.telefono ? (
                          <>
                            {r.correo && <p className="max-w-[14rem] truncate">{r.correo}</p>}
                            {r.telefono && <p className="tabular-nums">{r.telefono}</p>}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-gray-900">{r.contratos}</td>
                      <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                        {r.desactualizado ? (
                          <Chip tone="amber">
                            <RefreshCcw className="h-3 w-3" /> Cambios en origen
                          </Chip>
                        ) : r.sincronizado ? (
                          <Link href={`/gestion/contratistas/${r.gc_contratista_id}`} className="inline-flex">
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
            <span>{plural(rows.length, "contratista")}</span>
            <span className="hidden sm:inline">
              Consejo: <Kbd>Shift</Kbd> + clic para seleccionar un rango
            </span>
          </div>
        )}
      </Panel>

      <div
        className={cn(
          "fixed inset-x-0 bottom-6 z-30 flex justify-center px-4 transition-all duration-300 lg:pl-64",
          seleccion.size ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        )}
      >
        <div className="flex w-full max-w-2xl flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white/90 p-2 pl-4 shadow-2xl shadow-gray-900/10 backdrop-blur-xl">
          <div className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-emerald-600 px-2 text-xs font-semibold tabular-nums text-[#fff]">{seleccion.size}</div>
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
            <Checkbox checked={incluirContratos} onChange={() => setIncluirContratos((v) => !v)} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-900">Incluir sus contratos</span>
              <span className="block truncate text-xs text-gray-500">
                {incluirContratos ? `Se sincronizarán ${plural(contratosSel, "contrato")} del GESCO` : "Solo se copian los datos del contratista"}
              </span>
            </span>
          </label>
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
