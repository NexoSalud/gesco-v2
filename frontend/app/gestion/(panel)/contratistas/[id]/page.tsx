"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, ChevronRight, FolderKanban, Loader2, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react"
import {
  GcContratista,
  GcContrato,
  gcContratista,
  gcContratos,
  gcEliminarContratista,
  gcSincronizarContratistas,
} from "@/lib/gestion-api"
import { useGcAuth } from "@/components/gestion/gc-auth-provider"
import { Btn, EmptyState, EstadoChip, Panel, Shimmer, formatCOP, formatFecha, iniciales } from "@/components/gestion/ui"
import { ContratistaDialog, OrigenChip } from "@/components/gestion/formularios"

export default function ContratistaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { can } = useGcAuth()
  const [c, setC] = useState<GcContratista | null>(null)
  const [contratos, setContratos] = useState<GcContrato[] | null>(null)
  const [editar, setEditar] = useState(false)
  const [busy, setBusy] = useState(false)

  const cargar = () => {
    gcContratista(Number(id)).then(setC).catch((e) => toast.error(e.message))
    gcContratos({ contratista_id: Number(id) }).then(setContratos).catch(() => setContratos([]))
  }
  useEffect(cargar, [id])

  const actualizarDesdeOrigen = async () => {
    if (!c?.contratista_origen_id) return
    setBusy(true)
    try {
      await gcSincronizarContratistas([c.contratista_origen_id], false)
      toast.success("Datos actualizados desde el GESCO principal")
      cargar()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const eliminar = async () => {
    if (!c || !confirm(`¿Eliminar a ${c.nombre} del módulo?`)) return
    try {
      await gcEliminarContratista(c.id)
      toast.success("Contratista eliminado")
      router.replace("/gestion/contratistas")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const datos: [string, string | null | undefined][] = c
    ? [
        [c.tipo_persona === "JURIDICA" ? "NIT" : "Cédula", c.identificacion + (c.expedida_en ? ` · ${c.expedida_en}` : "")],
        ["Teléfono", c.telefono],
        ["Correo", c.correo],
        ["Dirección", c.direccion],
        ["Banco", [c.banco, c.tipo_cuenta?.toLowerCase(), c.numero_cuenta].filter(Boolean).join(" · ")],
      ]
    : []

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <nav className="mb-4 flex items-center gap-1 text-xs text-gray-500">
          <Link href="/gestion/contratistas" className="hover:text-gray-900">
            Contratistas
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate text-gray-900">{c?.nombre || "…"}</span>
        </nav>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-800 text-lg font-semibold text-[#fff] shadow-lg shadow-emerald-900/20">
              {c ? iniciales(c.nombre) : ""}
            </div>
            {c ? (
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900">{c.nombre}</h1>
                  <OrigenChip origen={c.origen} />
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  {c.total_contratos} contrato{c.total_contratos === 1 ? "" : "s"} · {formatCOP(c.valor_contratado)} contratados
                </p>
              </div>
            ) : (
              <Shimmer className="h-12 w-72" />
            )}
          </div>
          {c && can("editar") && (
            <div className="flex flex-wrap gap-2">
              {c.desactualizado && (
                <Btn onClick={actualizarDesdeOrigen} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Actualizar desde GESCO
                </Btn>
              )}
              <Btn onClick={() => setEditar(true)}>
                <Pencil className="h-4 w-4" /> Editar
              </Btn>
              <Link href={`/gestion/contratos/nuevo?contratista=${c.id}`}>
                <Btn variant="primary">
                  <Plus className="h-4 w-4" /> Nuevo contrato
                </Btn>
              </Link>
              {can("admin") && c.total_contratos === 0 && (
                <Btn variant="ghost" onClick={eliminar} title="Eliminar contratista">
                  <Trash2 className="h-4 w-4" />
                </Btn>
              )}
            </div>
          )}
        </div>
      </div>

      {c?.desactualizado && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm text-gray-700">
          <RefreshCcw className="h-4 w-4 shrink-0 text-amber-600" />
          Los datos de este contratista cambiaron en el GESCO principal. Usa «Actualizar desde GESCO» para traerlos.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-5">
          <h3 className="text-sm font-semibold text-gray-900">Datos del contratista</h3>
          <dl className="mt-4 space-y-3 text-sm">
            {datos.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[5.5rem_1fr] gap-2">
                <dt className="text-gray-500">{k}</dt>
                <dd className="min-w-0 break-words text-gray-900">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">Los cambios que hagas aquí se guardan también en el GESCO principal.</p>
        </Panel>

        <Panel className="lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
            <FolderKanban className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Contratos</h3>
          </div>
          {contratos === null ? (
            <div className="space-y-3 p-5">
              <Shimmer className="h-10" />
              <Shimmer className="h-10" />
            </div>
          ) : contratos.length === 0 ? (
            <EmptyState icon={FolderKanban} title="Sin contratos en el módulo" description="Crea uno nuevo o sincroniza sus contratos desde el GESCO principal." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {contratos.map((k) => (
                <li key={k.id}>
                  <Link href={`/gestion/contratos/${k.id}`} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{k.numero_contrato}</p>
                      <p className="truncate text-xs text-gray-500">
                        {[k.perfil, k.resolucion_codigo].filter(Boolean).join(" · ") || "—"} · {formatFecha(k.fecha_inicio)} → {formatFecha(k.fecha_fin)}
                      </p>
                    </div>
                    <span className="hidden text-sm tabular-nums text-gray-900 sm:block">{formatCOP((k.valor_final ?? k.valor_total) + k.valor_transporte)}</span>
                    <EstadoChip estado={k.estado_gestion} />
                    <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <ContratistaDialog open={editar} onClose={() => setEditar(false)} contratista={c} onGuardado={() => cargar()} />
    </div>
  )
}
