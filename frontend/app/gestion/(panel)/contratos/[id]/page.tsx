"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { toast } from "sonner"
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Download,
  FileStack,
  Link2Off,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
} from "lucide-react"
import {
  Categoria,
  EstadoGestion,
  GcContrato,
  GcDocumento,
  gcActualizarContrato,
  gcCategorias,
  gcContrato,
  gcDesvincular,
  gcDocumentos,
  gcExpedienteBlob,
  gcResincronizar,
  guardarBlob,
} from "@/lib/gestion-api"
import { useGcAuth } from "@/components/gestion/gc-auth-provider"
import { Btn, ESTADOS_GESTION, EmptyState, EstadoChip, Panel, Shimmer, diasRestantes, formatCOP, formatFecha, formatRelativo, iniciales } from "@/components/gestion/ui"
import { Cargador, DOCUMENTOS_CLAVE, ListaDocumentos } from "@/components/gestion/documentos"
import { cn } from "@/lib/utils"
import { OrigenChip } from "@/components/gestion/formularios"

export default function ContratoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const contratoId = Number(id)
  const router = useRouter()
  const { can } = useGcAuth()
  const [contrato, setContrato] = useState<GcContrato | null>(null)
  const [docs, setDocs] = useState<GcDocumento[] | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [error, setError] = useState<string | null>(null)
  const [solicitud, setSolicitud] = useState<{ categoria: string; n: number } | null>(null)
  const [busy, setBusy] = useState<"zip" | "sync" | null>(null)
  const [confirmarRetiro, setConfirmarRetiro] = useState(false)

  useEffect(() => {
    gcContrato(contratoId).then(setContrato).catch((e) => setError(e.message))
    gcDocumentos(contratoId).then(setDocs).catch(() => setDocs([]))
    gcCategorias().then(setCategorias).catch(() => {})
  }, [contratoId])

  const refrescarContrato = () => gcContrato(contratoId).then(setContrato).catch(() => {})

  const cambiarEstado = async (estado: EstadoGestion) => {
    try {
      setContrato(await gcActualizarContrato(contratoId, { estado_gestion: estado }))
      toast.success("Estado actualizado")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const resincronizar = async () => {
    setBusy("sync")
    try {
      setContrato(await gcResincronizar(contratoId))
      toast.success("Datos actualizados desde el módulo de contratos")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  const descargarExpediente = async () => {
    if (!contrato) return
    setBusy("zip")
    try {
      const blob = await gcExpedienteBlob(contratoId)
      guardarBlob(blob, `expediente_${contrato.numero_contrato.replace(/[^\w-]+/g, "_")}.zip`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  if (error) {
    return (
      <Panel>
        <EmptyState icon={AlertTriangle} title="No se pudo cargar el contrato" description={error} action={<Link href="/gestion/contratos"><Btn>Volver a contratos</Btn></Link>} />
      </Panel>
    )
  }

  const cubiertas = new Set(docs?.map((d) => d.categoria) || [])
  const label = (c: string) => categorias.find((x) => x.value === c)?.label || c
  const dias = diasRestantes(contrato?.fecha_fin ?? null)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div>
        <nav className="mb-4 flex items-center gap-1 text-xs text-gray-500">
          <Link href="/gestion/contratos" className="hover:text-gray-900">
            Contratos
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate text-gray-900">{contrato?.numero_contrato || "…"}</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-800 text-lg font-semibold text-[#fff] shadow-lg shadow-emerald-900/20">
              {contrato ? iniciales(contrato.contratista_nombre) : ""}
            </div>
            <div className="min-w-0">
              {contrato ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900">
                      {contrato.contratista_id ? (
                        <Link href={`/gestion/contratistas/${contrato.contratista_id}`} className="hover:underline hover:decoration-gray-300 hover:underline-offset-4">
                          {contrato.contratista_nombre || "Sin contratista"}
                        </Link>
                      ) : (
                        contrato.contratista_nombre || "Sin contratista"
                      )}
                    </h1>
                    <EstadoChip estado={contrato.estado_gestion} />
                    {contrato.origen === "MANUAL" && <OrigenChip origen="MANUAL" />}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {contrato.numero_contrato}
                    {contrato.contratista_identificacion ? ` · C.C. ${contrato.contratista_identificacion}` : ""}
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  <Shimmer className="h-7 w-72" />
                  <Shimmer className="h-4 w-48" />
                </div>
              )}
            </div>
          </div>
          {contrato && (
            <div className="flex flex-wrap gap-2">
              {can("editar") && (
                <select
                  value={contrato.estado_gestion}
                  onChange={(e) => cambiarEstado(e.target.value as EstadoGestion)}
                  className="h-9 cursor-pointer rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/15"
                  aria-label="Estado de gestión"
                >
                  {ESTADOS_GESTION.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              )}
              {can("editar") && contrato.origen === "MANUAL" && (
                <Link href={`/gestion/contratos/${contrato.id}/editar`}>
                  <Btn>
                    <Pencil className="h-4 w-4" /> Editar
                  </Btn>
                </Link>
              )}
              <Btn onClick={descargarExpediente} disabled={!docs?.length || busy === "zip"}>
                {busy === "zip" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Descargar expediente
              </Btn>
              {can("admin") && (
                <Btn variant="ghost" onClick={() => setConfirmarRetiro(true)} title="Retirar del módulo">
                  <Link2Off className="h-4 w-4" />
                </Btn>
              )}
            </div>
          )}
        </div>
      </div>

      {contrato?.desactualizado && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center">
          <RefreshCcw className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">El contrato cambió en el módulo de contratos</p>
            <p className="text-xs text-gray-600">Los datos aquí corresponden a la sincronización del {formatFecha(contrato.sincronizado_at)}. Actualízalos para reflejar los cambios.</p>
          </div>
          {can("editar") && (
            <Btn size="sm" onClick={resincronizar} disabled={busy === "sync"}>
              {busy === "sync" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
              Actualizar datos
            </Btn>
          )}
        </div>
      )}
      {contrato?.origen_eliminado && (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-100/60 p-4 text-sm text-gray-600">
          <Link2Off className="h-4 w-4 shrink-0" />
          El contrato de origen ya no existe en el módulo de contratos. Se conserva la última copia sincronizada y su expediente.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Documentos */}
        <div className="space-y-6 lg:col-span-2">
          <Panel className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Expediente documental</h2>
                <p className="text-sm text-gray-500">Documentos escaneados del contrato. Haz clic en uno para previsualizarlo.</p>
              </div>
            </div>

            {can("editar") && contrato && (
              <div className="mb-6">
                <Cargador
                  contratoId={contratoId}
                  categorias={categorias}
                  solicitud={solicitud}
                  onSubido={(d) => {
                    setDocs((prev) => [d, ...(prev || [])])
                    refrescarContrato()
                  }}
                />
              </div>
            )}

            {docs === null ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Shimmer key={i} className="aspect-[4/5]" />
                ))}
              </div>
            ) : docs.length === 0 ? (
              <EmptyState icon={FileStack} title="El expediente está vacío" description={can("editar") ? "Sube el contrato firmado y los demás soportes escaneados." : "Aún no se han cargado documentos."} />
            ) : (
              <ListaDocumentos
                documentos={docs}
                categorias={categorias}
                puedeEditar={can("editar")}
                onCambio={(d) => setDocs((prev) => prev?.map((x) => (x.id === d.id ? d : x)) || null)}
                onEliminado={(docId) => {
                  setDocs((prev) => prev?.filter((x) => x.id !== docId) || null)
                  refrescarContrato()
                }}
              />
            )}
          </Panel>
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Documentos clave</h3>
              <span className="text-xs tabular-nums text-gray-500">
                {DOCUMENTOS_CLAVE.filter((c) => cubiertas.has(c)).length}/{DOCUMENTOS_CLAVE.length}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(DOCUMENTOS_CLAVE.filter((c) => cubiertas.has(c)).length / DOCUMENTOS_CLAVE.length) * 100}%` }} />
            </div>
            <ul className="mt-4 space-y-1">
              {DOCUMENTOS_CLAVE.map((c) => {
                const ok = cubiertas.has(c)
                return (
                  <li key={c} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", ok ? "bg-emerald-500 text-[#fff]" : "border border-dashed border-gray-300")}>
                      {ok && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className={cn("flex-1 text-sm", ok ? "text-gray-900" : "text-gray-500")}>{label(c)}</span>
                    {!ok && can("editar") && (
                      <button
                        onClick={() => setSolicitud({ categoria: c, n: Date.now() })}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        <Plus className="h-3 w-3" /> Subir
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel className="p-5">
            <h3 className="text-sm font-semibold text-gray-900">Datos del contrato</h3>
            {!contrato ? (
              <div className="mt-4 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <Shimmer key={i} className="h-8" />
                ))}
              </div>
            ) : (
              <dl className="mt-4 space-y-3.5 text-sm">
                <Dato label="Valor">
                  <span className="font-medium tabular-nums">{formatCOP(contrato.valor_final ?? contrato.valor_total)}</span>
                  {contrato.valor_final != null && contrato.valor_final !== contrato.valor_total && (
                    <span className="ml-1 text-xs text-gray-500">(inicial {formatCOP(contrato.valor_total)})</span>
                  )}
                </Dato>
                <Dato label="Vigencia">
                  {formatFecha(contrato.fecha_inicio)} → {formatFecha(contrato.fecha_fin)}
                  {contrato.estado_gestion === "VIGENTE" && dias !== null && dias >= 0 && (
                    <span className={cn("ml-1.5 text-xs", dias <= 30 ? "text-amber-600 dark:text-amber-400" : "text-gray-500")}>· quedan {dias} días</span>
                  )}
                </Dato>
                <Dato label="Perfil">{contrato.perfil || "—"}</Dato>
                <Dato label="Supervisor">{contrato.supervisor || "—"}</Dato>
                <Dato label="Resolución">{contrato.resolucion_codigo || "—"}</Dato>
                <Dato label="Estado en GESCO">{(contrato.estado_origen || "—").replace("_", " ")}</Dato>
                {contrato.objeto && (
                  <Dato label="Objeto">
                    <span className="line-clamp-4 text-gray-700" title={contrato.objeto}>
                      {contrato.objeto}
                    </span>
                  </Dato>
                )}
                <div className="border-t border-gray-100 pt-3 text-xs text-gray-500">
                  Sincronizado {formatRelativo(contrato.sincronizado_at)}
                  {contrato.sincronizado_por ? ` por ${contrato.sincronizado_por}` : ""}
                  {contrato.contrato_origen_id && !contrato.desactualizado && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300">
                      · <Check className="h-3 w-3" /> al día
                    </span>
                  )}
                </div>
              </dl>
            )}
          </Panel>

          {contrato && <Observaciones contrato={contrato} editable={can("editar")} onGuardado={setContrato} />}
        </div>
      </div>

      <Dialog.Root open={confirmarRetiro} onOpenChange={setConfirmarRetiro}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-gray-900/30 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-scale-in">
            <Dialog.Title className="text-base font-semibold text-gray-900">¿Retirar este contrato del módulo?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-500">
              Se eliminará de Gestión Contractual junto con sus {docs?.length || 0} documento(s) escaneado(s).{" "}
              El contrato en el módulo de contratos del GESCO principal se conserva.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setConfirmarRetiro(false)}>
                Cancelar
              </Btn>
              <Btn
                variant="danger"
                onClick={async () => {
                  try {
                    await gcDesvincular(contratoId)
                    toast.success("Contrato retirado del módulo")
                    router.replace("/gestion/contratos")
                  } catch (e: any) {
                    toast.error(e.message)
                  }
                }}
              >
                Retirar contrato
              </Btn>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="min-w-0 text-gray-900">{children}</dd>
    </div>
  )
}

function Observaciones({ contrato, editable, onGuardado }: { contrato: GcContrato; editable: boolean; onGuardado: (c: GcContrato) => void }) {
  const [texto, setTexto] = useState(contrato.observaciones || "")
  const [saving, setSaving] = useState(false)
  const sucio = texto !== (contrato.observaciones || "")

  const guardar = async () => {
    setSaving(true)
    try {
      onGuardado(await gcActualizarContrato(contrato.id, { observaciones: texto.trim() || null }))
      toast.success("Observaciones guardadas")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel className="p-5">
      <h3 className="text-sm font-semibold text-gray-900">Observaciones</h3>
      {editable ? (
        <>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Notas internas sobre el contrato o su expediente…"
            className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/15"
          />
          {sucio && (
            <div className="mt-2 flex justify-end gap-2 animate-fade-in">
              <Btn size="sm" variant="ghost" onClick={() => setTexto(contrato.observaciones || "")}>
                Descartar
              </Btn>
              <Btn size="sm" variant="primary" onClick={guardar} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Guardar
              </Btn>
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">{contrato.observaciones || "Sin observaciones."}</p>
      )}
    </Panel>
  )
}
