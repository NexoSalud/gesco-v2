"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  FileStack,
  FileUp,
  FolderKanban,
  FolderOpen,
  GitCompareArrows,
  Landmark,
  RefreshCcw,
  Activity,
  Trash2,
  UserPlus,
  Pencil,
  Download,
  Link2Off,
} from "lucide-react"
import { gcEstadisticas, gcResumen, GcEstadisticas, GcResumen } from "@/lib/gestion-api"
import { useGcAuth } from "@/components/gestion/gc-auth-provider"
import {
  Btn,
  ESTADOS_GESTION,
  EmptyState,
  EstadoChip,
  PageHeader,
  Panel,
  Shimmer,
  diasRestantes,
  formatCOP,
  formatFecha,
  formatRelativo,
} from "@/components/gestion/ui"
import { cn } from "@/lib/utils"

const ACCION_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  CONTRATO_SINCRONIZADO: { label: "Contrato sincronizado", icon: GitCompareArrows, tone: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300" },
  CONTRATO_ACTUALIZADO: { label: "Datos actualizados desde el origen", icon: RefreshCcw, tone: "text-sky-600 bg-sky-500/10" },
  CONTRATO_DESVINCULADO: { label: "Contrato retirado del módulo", icon: Link2Off, tone: "text-red-600 bg-red-500/10" },
  ESTADO_CAMBIADO: { label: "Cambio de estado", icon: Pencil, tone: "text-amber-600 bg-amber-500/10" },
  DOCUMENTO_CARGADO: { label: "Documento cargado", icon: FileUp, tone: "text-violet-600 bg-violet-500/10" },
  DOCUMENTO_ELIMINADO: { label: "Documento eliminado", icon: Trash2, tone: "text-red-600 bg-red-500/10" },
  EXPEDIENTE_DESCARGADO: { label: "Expediente descargado", icon: Download, tone: "text-gray-600 bg-gray-500/10" },
  USUARIO_CREADO: { label: "Usuario creado", icon: UserPlus, tone: "text-gray-600 bg-gray-500/10" },
  USUARIO_ACTUALIZADO: { label: "Usuario actualizado", icon: UserPlus, tone: "text-gray-600 bg-gray-500/10" },
}

export default function ResumenPage() {
  const { user, can } = useGcAuth()
  const [data, setData] = useState<GcResumen | null>(null)
  const [stats, setStats] = useState<GcEstadisticas | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    gcResumen().then(setData).catch((e) => setError(e.message))
    gcEstadisticas().then(setStats).catch(() => {})
  }, [])

  const saludo = (() => {
    const h = new Date().getHours()
    return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"
  })()
  const nombre = (user?.nombre_completo || user?.username || "").split(" ")[0]

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow={formatFecha(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long" })}
        title={`${saludo}, ${nombre}`}
        description="Este es el estado del expediente contractual de la entidad."
        actions={
          <>
            <Link href="/gestion/contratos">
              <Btn>
                <FolderKanban className="h-4 w-4" /> Ver contratos
              </Btn>
            </Link>
            {can("editar") && (
              <Link href="/gestion/sincronizar">
                <Btn variant="primary">
                  <GitCompareArrows className="h-4 w-4" /> Sincronizar contratos
                </Btn>
              </Link>
            )}
          </>
        }
      />

      {error && <Panel className="p-4 text-sm text-red-600">{error}</Panel>}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi loading={!data} label="Contratos gestionados" value={data?.total_contratos} icon={FolderKanban} hint={data ? `${data.por_estado.VIGENTE || 0} vigentes` : undefined} />
        <Kpi loading={!data} label="Documentos en expediente" value={data?.total_documentos} icon={FileStack} hint={data ? `${data.sin_documentos} contratos sin documentos` : undefined} warn={!!data?.sin_documentos} />
        <Kpi
          loading={!data}
          label="Pendientes por sincronizar"
          value={data?.pendientes_sincronizar}
          icon={GitCompareArrows}
          hint={data?.desactualizados ? `${data.desactualizados} con cambios en origen` : "Del módulo de contratos"}
          warn={!!data?.desactualizados}
        />
        <Link href="/gestion/estadisticas" className="block rounded-2xl transition hover:-translate-y-0.5">
          <Kpi
            loading={!stats}
            label="Ejecución presupuestal"
            value={stats ? `${stats.totales.ejecucion_real_pct.toLocaleString("es-CO")}%` : undefined}
            icon={Landmark}
            hint={stats ? `${formatCOP(stats.totales.comprometido_real)} de ${formatCOP(stats.totales.presupuesto)}` : undefined}
          />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Distribución por estado + próximos a vencer */}
        <div className="space-y-6 lg:col-span-3">
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Distribución por estado</h2>
              <span className="text-xs text-gray-500 tabular-nums">{data?.total_contratos ?? "—"} contratos</span>
            </div>
            {!data ? (
              <Shimmer className="mt-5 h-2.5 w-full" />
            ) : data.total_contratos === 0 ? (
              <p className="mt-4 text-sm text-gray-500">Aún no hay contratos sincronizados.</p>
            ) : (
              <>
                <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  {ESTADOS_GESTION.map((e) => {
                    const n = data.por_estado[e.value] || 0
                    if (!n) return null
                    return <div key={e.value} className={cn("h-full transition-all", e.dot)} style={{ width: `${(n / data.total_contratos) * 100}%` }} title={`${e.label}: ${n}`} />
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
                  {ESTADOS_GESTION.map((e) => (
                    <Link key={e.value} href={`/gestion/contratos?estado=${e.value}`} className="group flex items-center gap-2 text-sm">
                      <span className={cn("h-2 w-2 rounded-full", e.dot)} />
                      <span className="text-gray-600 group-hover:text-gray-900">{e.label}</span>
                      <span className="ml-auto font-medium tabular-nums text-gray-900">{data.por_estado[e.value] || 0}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">Próximos a vencer</h2>
              </div>
              <span className="text-xs text-gray-500">Próximos 30 días</span>
            </div>
            {!data ? (
              <div className="space-y-3 p-6">
                {[0, 1, 2].map((i) => <Shimmer key={i} className="h-10" />)}
              </div>
            ) : data.proximos_vencer.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Nada por vencer" description="Ningún contrato vigente termina en los próximos 30 días." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.proximos_vencer.map((c) => {
                  const dias = diasRestantes(c.fecha_fin) ?? 0
                  return (
                    <li key={c.id}>
                      <Link href={`/gestion/contratos/${c.id}`} className="group flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-gray-50">
                        <div className={cn("flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-center", dias <= 7 ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600")}>
                          <span className="text-sm font-semibold leading-none tabular-nums">{dias}</span>
                          <span className="text-[9px] font-medium uppercase">días</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{c.contratista_nombre}</p>
                          <p className="truncate text-xs text-gray-500">{c.numero_contrato} · vence {formatFecha(c.fecha_fin)}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* Actividad */}
        <Panel className="lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
            <Activity className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Actividad reciente</h2>
          </div>
          {!data ? (
            <div className="space-y-4 p-6">
              {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-9" />)}
            </div>
          ) : data.actividad.length === 0 ? (
            <EmptyState icon={Activity} title="Sin actividad" description="Aquí verás las sincronizaciones y cargas de documentos." />
          ) : (
            <ol className="relative px-6 py-5">
              <span className="absolute bottom-8 left-[39px] top-8 w-px bg-gray-200" />
              {data.actividad.map((ev) => {
                const meta = ACCION_META[ev.accion] || { label: ev.accion, icon: Activity, tone: "text-gray-600 bg-gray-500/10" }
                const Icon = meta.icon
                const body = (
                  <div className="relative flex gap-3 py-2.5">
                    <div className={cn("relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white", meta.tone)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900">{meta.label}</p>
                      {ev.detalle && <p className="truncate text-xs text-gray-500">{ev.detalle}</p>}
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {ev.usuario || "Sistema"} · {formatRelativo(ev.created_at)}
                      </p>
                    </div>
                  </div>
                )
                return (
                  <li key={ev.id}>
                    {ev.contrato_id ? (
                      <Link href={`/gestion/contratos/${ev.contrato_id}`} className="block rounded-lg transition-colors hover:bg-gray-50">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </Panel>
      </div>

      {data && data.total_contratos === 0 && can("editar") && (
        <Panel className="overflow-hidden">
          <div className="flex flex-col items-start gap-4 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent p-6 sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-[#fff] shadow-lg shadow-emerald-900/20">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Empieza sincronizando tus contratos reales</p>
              <p className="text-sm text-gray-500">Selecciona del módulo de contratos cuáles deben formar parte del expediente.</p>
            </div>
            <Link href="/gestion/sincronizar">
              <Btn variant="primary">
                Elegir contratos <ArrowRight className="h-4 w-4" />
              </Btn>
            </Link>
          </div>
        </Panel>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
  warn,
  loading,
}: {
  label: string
  value?: number | string
  icon: React.ComponentType<{ className?: string }>
  hint?: string
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
        <Shimmer className="mt-3 h-8 w-20" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">{value ?? 0}</p>
      )}
      {hint && (
        <p className={cn("mt-1 flex items-center gap-1 text-xs", warn ? "text-amber-600 dark:text-amber-400" : "text-gray-500")}>
          {warn && <AlertTriangle className="h-3 w-3" />}
          {hint}
        </p>
      )}
    </Panel>
  )
}
