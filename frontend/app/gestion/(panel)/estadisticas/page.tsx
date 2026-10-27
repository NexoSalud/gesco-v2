"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, BarChart3, CalendarRange, Landmark, Layers, PiggyBank, Scale, Wallet } from "lucide-react"
import { gcEstadisticas, gcResoluciones, GcEstadisticas, EstadisticaGrupo, EstadisticaResolucion } from "@/lib/gestion-api"
import { ESTADOS_GESTION, EmptyState, PageHeader, Panel, Shimmer, formatCOP, inputCls } from "@/components/gestion/ui"
import { cn } from "@/lib/utils"

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

/** $ 124,5 M · $ 1,2 MM — para etiquetas de gráficos */
function cop(v: number) {
  const abs = Math.abs(v)
  const fmt = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 })
  if (abs >= 1e9) return `$ ${fmt(v / 1e9)} MM`
  if (abs >= 1e6) return `$ ${fmt(v / 1e6)} M`
  return formatCOP(v)
}

const pct = (a: number, b: number) => (b > 0 ? Math.min((a / b) * 100, 100) : 0)

export default function EstadisticasPage() {
  const [resoluciones, setResoluciones] = useState<{ id: number; codigo: string }[]>([])
  const [resolucionId, setResolucionId] = useState<number | "">("")
  const [data, setData] = useState<GcEstadisticas | null>(null)

  useEffect(() => {
    gcResoluciones().then(setResoluciones).catch(() => {})
  }, [])

  useEffect(() => {
    setData(null)
    gcEstadisticas(resolucionId || undefined)
      .then(setData)
      .catch((e) => toast.error(e.message))
  }, [resolucionId])

  const t = data?.totales

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Estadísticas"
        description="Contratos, presupuesto y resoluciones. Lo real es lo sincronizado en este módulo; lo registrado es lo que hay en el módulo de contratos."
        actions={
          <select value={resolucionId} onChange={(e) => setResolucionId(e.target.value ? Number(e.target.value) : "")} className={cn(inputCls, "w-auto min-w-52 cursor-pointer")}>
            <option value="">Todas las resoluciones</option>
            {resoluciones.map((r) => (
              <option key={r.id} value={r.id}>
                {r.codigo}
              </option>
            ))}
          </select>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile loading={!t} icon={Landmark} label="Presupuesto" value={t && cop(t.presupuesto)} hint={t && `${t.resoluciones} resolución${t.resoluciones === 1 ? "" : "es"}`} />
        <Tile
          loading={!t}
          icon={Wallet}
          label="Comprometido real"
          value={t && cop(t.comprometido_real)}
          hint={t && `${t.ejecucion_real_pct.toLocaleString("es-CO")}% del presupuesto`}
          bar={t ? pct(t.comprometido_real, t.presupuesto) : undefined}
        />
        <Tile loading={!t} icon={PiggyBank} label="Saldo disponible" value={t && cop(t.saldo_real)} hint="Presupuesto − comprometido real" warn={!!t && t.saldo_real < 0} />
        <Tile
          loading={!t}
          icon={Scale}
          label="Contratos reales"
          value={t?.contratos_reales}
          hint={t && `de ${t.contratos_registrados} registrados · ${t.cobertura_pct.toLocaleString("es-CO")}% cubiertos`}
          bar={t ? pct(t.contratos_reales, t.contratos_registrados) : undefined}
        />
      </div>

      {t && t.comprometido_registrado > t.comprometido_real && (
        <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-sm sm:flex-row sm:items-center">
          <span className="flex-1 text-gray-600">
            En el módulo de contratos hay <span className="font-medium text-gray-900 tabular-nums">{cop(t.comprometido_registrado - t.comprometido_real)}</span> registrados en{" "}
            <span className="font-medium text-gray-900 tabular-nums">{t.contratos_registrados - t.contratos_reales}</span> contrato(s) que aún no se han confirmado como reales.
          </span>
          <Link href="/gestion/sincronizar" className="shrink-0 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300">
            Revisar pendientes →
          </Link>
        </div>
      )}

      {/* Ejecución por resolución */}
      <Panel>
        <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Ejecución presupuestal por resolución</h2>
          </div>
          <Leyenda
            items={[
              { label: "Comprometido real", swatch: "bg-emerald-600" },
              { label: "Registrado en GESCO", swatch: "bg-emerald-500/25 dark:bg-emerald-400/45" },
              { label: "Presupuesto", swatch: "bg-gray-100 ring-1 ring-inset ring-gray-200" },
            ]}
          />
        </div>
        {!data ? (
          <div className="space-y-4 p-6">
            {[0, 1].map((i) => (
              <Shimmer key={i} className="h-16" />
            ))}
          </div>
        ) : data.por_resolucion.length === 0 ? (
          <EmptyState icon={Landmark} title="Sin resoluciones" description="Crea resoluciones en el módulo de contratos para ver su ejecución." />
        ) : (
          <div className="divide-y divide-gray-100">
            {data.por_resolucion.map((r) => (
              <FilaResolucion key={r.id} r={r} />
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <Titulo icon={BarChart3} titulo="Valor comprometido por perfil" sub="Contratos reales, sin anulados" />
          {!data ? <Shimmer className="mt-5 h-48" /> : <BarrasHorizontales grupos={data.por_perfil} />}
        </Panel>

        <Panel className="p-6">
          <Titulo icon={CalendarRange} titulo="Contratos por mes de inicio" sub="Últimos 12 meses con contratos" />
          {!data ? <Shimmer className="mt-5 h-48" /> : <Columnas grupos={data.por_mes} />}
        </Panel>
      </div>

      <Panel className="p-6">
        <Titulo icon={Scale} titulo="Contratos por estado de gestión" sub="Incluye anulados" />
        {!data ? <Shimmer className="mt-5 h-24" /> : <PorEstado grupos={data.por_estado} />}
      </Panel>
    </div>
  )
}

// ─── Piezas ──────────────────────────────────────────────────────────────────

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  bar,
  warn,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: React.ReactNode
  hint?: React.ReactNode
  bar?: number
  warn?: boolean
  loading?: boolean
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <Icon className="h-4 w-4 text-gray-300" />
      </div>
      {loading ? (
        <Shimmer className="mt-3 h-8 w-28" />
      ) : (
        <p className={cn("mt-2 text-[28px] font-semibold leading-tight tracking-tight tabular-nums", warn ? "text-red-600 dark:text-red-400" : "text-gray-900")}>{value ?? 0}</p>
      )}
      {bar !== undefined && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-emerald-600 transition-all duration-700" style={{ width: `${bar}%` }} />
        </div>
      )}
      {hint && <p className={cn("mt-1.5 text-xs", warn ? "text-red-600 dark:text-red-400" : "text-gray-500")}>{hint}</p>}
    </Panel>
  )
}

function Titulo({ icon: Icon, titulo, sub }: { icon: React.ComponentType<{ className?: string }>; titulo: string; sub: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">{titulo}</h2>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
    </div>
  )
}

function Leyenda({ items }: { items: { label: string; swatch: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className={cn("h-2.5 w-2.5 rounded-sm", i.swatch)} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg group-hover:block">
      {children}
    </div>
  )
}

function FilaResolucion({ r }: { r: EstadisticaResolucion }) {
  // La escala es el mayor entre presupuesto y registrado, para que un sobrecompromiso se vea
  const escala = Math.max(r.presupuesto, r.comprometido_registrado, r.comprometido_real, 1)
  const sobre = r.comprometido_real > r.presupuesto
  return (
    <div className="grid gap-4 px-6 py-5 lg:grid-cols-[14rem_1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">{r.codigo}</p>
          {r.activa && <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-300">Activa</span>}
        </div>
        <p className="truncate text-xs text-gray-500">{[r.titulo, r.vigencia].filter(Boolean).join(" · ") || "—"}</p>
      </div>

      <div className="group relative">
        <div className="relative h-3 overflow-hidden rounded-full bg-gray-100 ring-1 ring-inset ring-gray-200">
          {/* Presupuesto (cuando la escala lo supera) */}
          <div className="absolute inset-y-0 left-0 border-r-2 border-gray-400" style={{ width: `${(r.presupuesto / escala) * 100}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/25 dark:bg-emerald-400/45 transition-all duration-700" style={{ width: `${(r.comprometido_registrado / escala) * 100}%` }} />
          <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700", sobre ? "bg-red-500" : "bg-emerald-600")} style={{ width: `${(r.comprometido_real / escala) * 100}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-gray-500">
          <span>
            <span className="font-medium text-gray-900">{cop(r.comprometido_real)}</span> real · {cop(r.comprometido_registrado)} registrado
          </span>
          <span>{cop(r.presupuesto)}</span>
        </div>
        <Tooltip>
          <p className="mb-1 font-semibold text-gray-900">{r.codigo}</p>
          <p className="text-gray-600">Presupuesto: <span className="tabular-nums text-gray-900">{formatCOP(r.presupuesto)}</span></p>
          <p className="text-gray-600">Comprometido real: <span className="tabular-nums text-gray-900">{formatCOP(r.comprometido_real)}</span></p>
          <p className="text-gray-600">Registrado en GESCO: <span className="tabular-nums text-gray-900">{formatCOP(r.comprometido_registrado)}</span></p>
          <p className="text-gray-600">Saldo real: <span className="tabular-nums text-gray-900">{formatCOP(r.saldo_real)}</span></p>
        </Tooltip>
      </div>

      <dl className="grid grid-cols-3 gap-4 text-right lg:w-72">
        <div>
          <dt className="text-[11px] text-gray-500">Ejecución</dt>
          <dd className={cn("text-sm font-semibold tabular-nums", sobre ? "text-red-600 dark:text-red-400" : "text-gray-900")}>
            {sobre && <AlertTriangle className="mr-1 inline h-3 w-3" />}
            {r.ejecucion_real_pct.toLocaleString("es-CO")}%
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-gray-500">Contratos</dt>
          <dd className="text-sm font-semibold tabular-nums text-gray-900">
            {r.contratos_reales}
            <span className="font-normal text-gray-400">/{r.contratos_registrados}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-gray-500">Exp. completos</dt>
          <dd className="text-sm font-semibold tabular-nums text-gray-900">
            {r.expedientes_completos}
            <span className="font-normal text-gray-400">/{r.contratos_reales}</span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

function BarrasHorizontales({ grupos }: { grupos: EstadisticaGrupo[] }) {
  if (!grupos.length) return <p className="mt-6 text-sm text-gray-500">Sin contratos reales todavía.</p>
  const max = Math.max(...grupos.map((g) => g.valor), 1)
  return (
    <ul className="mt-5 space-y-3">
      {grupos.map((g) => (
        <li key={g.clave} className="group relative grid grid-cols-[8.5rem_1fr_auto] items-center gap-3">
          <span className="truncate text-xs text-gray-600" title={g.clave}>
            {g.clave}
          </span>
          <div className="h-5 rounded-r-[4px] bg-transparent">
            <div className="h-full rounded-r-[4px] bg-emerald-600 transition-all duration-700 group-hover:bg-emerald-700" style={{ width: `${Math.max((g.valor / max) * 100, 1)}%` }} />
          </div>
          <span className="text-xs tabular-nums text-gray-900">{cop(g.valor)}</span>
          <Tooltip>
            <p className="font-semibold text-gray-900">{g.clave}</p>
            <p className="text-gray-600">
              {g.contratos} contrato{g.contratos === 1 ? "" : "s"} · <span className="tabular-nums text-gray-900">{formatCOP(g.valor)}</span>
            </p>
          </Tooltip>
        </li>
      ))}
    </ul>
  )
}

function Columnas({ grupos }: { grupos: EstadisticaGrupo[] }) {
  if (!grupos.length) return <p className="mt-6 text-sm text-gray-500">Sin fechas de inicio registradas.</p>
  const max = Math.max(...grupos.map((g) => g.contratos), 1)
  return (
    <div className="mt-5">
      <div className="flex h-48 items-end gap-2 border-b border-gray-200">
        {grupos.map((g) => (
          <div key={g.clave} className="group relative flex h-full flex-1 flex-col items-center justify-end">
            <span className="mb-1 text-[11px] font-medium tabular-nums text-gray-900">{g.contratos}</span>
            <div
              className="w-full max-w-10 rounded-t-[4px] bg-emerald-600 transition-all duration-700 group-hover:bg-emerald-700"
              style={{ height: `${Math.max((g.contratos / max) * 82, 2)}%` }}
            />
            <Tooltip>
              <p className="font-semibold text-gray-900">{etiquetaMes(g.clave, true)}</p>
              <p className="text-gray-600">
                {g.contratos} contrato{g.contratos === 1 ? "" : "s"} · <span className="tabular-nums text-gray-900">{formatCOP(g.valor)}</span>
              </p>
            </Tooltip>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {grupos.map((g) => (
          <span key={g.clave} className="flex-1 text-center text-[11px] text-gray-500">
            {etiquetaMes(g.clave)}
          </span>
        ))}
      </div>
    </div>
  )
}

function etiquetaMes(clave: string, largo = false) {
  const [y, m] = clave.split("-").map(Number)
  if (!y || !m) return clave
  return largo ? `${MESES[m - 1]} ${y}` : `${MESES[m - 1]} ${String(y).slice(2)}`
}

function PorEstado({ grupos }: { grupos: EstadisticaGrupo[] }) {
  const total = grupos.reduce((s, g) => s + g.contratos, 0)
  if (!total) return <p className="mt-6 text-sm text-gray-500">Sin contratos todavía.</p>
  const filas = ESTADOS_GESTION.map((e) => ({ ...e, g: grupos.find((x) => x.clave === e.value) })).filter((e) => e.g)
  return (
    <div className="mt-5">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {filas.map((e) => (
          <div key={e.value} className={cn("h-full", e.dot)} style={{ width: `${(e.g!.contratos / total) * 100}%` }} title={`${e.label}: ${e.g!.contratos}`} />
        ))}
      </div>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500">
            <th className="py-1.5 font-medium">Estado</th>
            <th className="py-1.5 text-right font-medium">Contratos</th>
            <th className="py-1.5 pl-4 text-right font-medium">%</th>
            <th className="py-1.5 text-right font-medium">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filas.map((e) => (
            <tr key={e.value}>
              <td className="py-2">
                <Link href={`/gestion/contratos?estado=${e.value}`} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
                  <span className={cn("h-2 w-2 rounded-full", e.dot)} />
                  {e.label}
                </Link>
              </td>
              <td className="py-2 text-right tabular-nums text-gray-900">{e.g!.contratos}</td>
              <td className="py-2 pl-4 text-right tabular-nums text-gray-500">{Math.round((e.g!.contratos / total) * 100)}%</td>
              <td className="py-2 text-right tabular-nums text-gray-900">{formatCOP(e.g!.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
