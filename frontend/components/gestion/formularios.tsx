"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { toast } from "sonner"
import { Check, ChevronsUpDown, Loader2, Plus, Search, UserPlus } from "lucide-react"
import {
  ContratoManualInput,
  EstadoGestion,
  GcCatalogos,
  GcFicha,
  GcContratista,
  GcContratistaInput,
  gcCatalogos,
  gcContratistas,
  gcCrearContratista,
  gcEditarContratista,
  gcResoluciones,
} from "@/lib/gestion-api"
import { Btn, Chip, ESTADOS_GESTION, formatCOP, iniciales, inputCls } from "@/components/gestion/ui"
import { cn } from "@/lib/utils"

export function Campo({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-500">{hint}</span>}
    </label>
  )
}

export function OrigenChip({ origen, className }: { origen: "SINCRONIZADO" | "MANUAL"; className?: string }) {
  return origen === "MANUAL" ? (
    <Chip tone="gray" className={className}>
      Creado aquí
    </Chip>
  ) : (
    <Chip tone="blue" className={className}>
      Sincronizado
    </Chip>
  )
}

// ─── Contratista: crear / editar ─────────────────────────────────────────────

const VACIO: GcContratistaInput = {
  identificacion: "",
  nombre: "",
  tipo_persona: "NATURAL",
  expedida_en: "",
  telefono: "",
  direccion: "",
  correo: "",
  banco: "",
  tipo_cuenta: "",
  numero_cuenta: "",
}

export function ContratistaDialog({
  open,
  onClose,
  contratista,
  onGuardado,
}: {
  open: boolean
  onClose: () => void
  contratista?: GcContratista | null
  onGuardado: (c: GcContratista) => void
}) {
  const [form, setForm] = useState<GcContratistaInput>(VACIO)
  const [saving, setSaving] = useState(false)
  const editando = !!contratista

  useEffect(() => {
    if (!open) return
    setForm(contratista ? { ...VACIO, ...Object.fromEntries(Object.entries(contratista).map(([k, v]) => [k, v ?? ""])) } as GcContratistaInput : VACIO)
  }, [open, contratista])

  const set = (k: keyof GcContratistaInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const limpio = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v])) as GcContratistaInput
    try {
      const c = editando ? await gcEditarContratista(contratista!.id, limpio) : await gcCrearContratista(limpio)
      toast.success(editando ? "Contratista actualizado" : "Contratista creado")
      onGuardado(c)
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-gray-900/30 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-scale-in">
          <Dialog.Title className="text-base font-semibold text-gray-900">{editando ? "Editar contratista" : "Nuevo contratista"}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-500">
            {editando ? "Los cambios se guardan aquí y en el GESCO principal." : "Se registra aquí y en el GESCO principal. Si ya existe allá, sincronízalo."}
          </Dialog.Description>
          <form onSubmit={submit} className="mt-5 space-y-5">
            <Seccion titulo="Identificación">
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                <Campo label="Nombre completo o razón social">
                  <input required minLength={2} value={form.nombre} onChange={set("nombre")} className={inputCls} />
                </Campo>
                <Campo label="Tipo de persona">
                  <select value={form.tipo_persona} onChange={set("tipo_persona")} className={cn(inputCls, "cursor-pointer")}>
                    <option value="NATURAL">Natural</option>
                    <option value="JURIDICA">Jurídica</option>
                  </select>
                </Campo>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo label={form.tipo_persona === "JURIDICA" ? "NIT" : "Cédula"}>
                  <input required minLength={3} value={form.identificacion} onChange={set("identificacion")} className={cn(inputCls, "tabular-nums")} />
                </Campo>
                <Campo label="Expedida en">
                  <input value={form.expedida_en || ""} onChange={set("expedida_en")} className={inputCls} />
                </Campo>
              </div>
            </Seccion>
            <Seccion titulo="Contacto">
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo label="Teléfono">
                  <input value={form.telefono || ""} onChange={set("telefono")} className={inputCls} />
                </Campo>
                <Campo label="Correo">
                  <input type="email" value={form.correo || ""} onChange={set("correo")} className={inputCls} />
                </Campo>
              </div>
              <Campo label="Dirección">
                <input value={form.direccion || ""} onChange={set("direccion")} className={inputCls} />
              </Campo>
            </Seccion>
            <Seccion titulo="Datos bancarios">
              <div className="grid gap-3 sm:grid-cols-3">
                <Campo label="Banco">
                  <input value={form.banco || ""} onChange={set("banco")} className={inputCls} />
                </Campo>
                <Campo label="Tipo de cuenta">
                  <select value={form.tipo_cuenta || ""} onChange={set("tipo_cuenta")} className={cn(inputCls, "cursor-pointer")}>
                    <option value="">—</option>
                    <option value="AHORROS">Ahorros</option>
                    <option value="CORRIENTE">Corriente</option>
                  </select>
                </Campo>
                <Campo label="Número de cuenta">
                  <input value={form.numero_cuenta || ""} onChange={set("numero_cuenta")} className={cn(inputCls, "tabular-nums")} />
                </Campo>
              </div>
            </Seccion>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <Btn type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Btn>
              <Btn type="submit" variant="primary" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editando ? "Guardar cambios" : "Crear contratista"}
              </Btn>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">{titulo}</legend>
      {children}
    </fieldset>
  )
}

// ─── Selector de contratista (combobox) ──────────────────────────────────────

export function SelectorContratista({ value, onChange }: { value: number | null; onChange: (c: GcContratista) => void }) {
  const [lista, setLista] = useState<GcContratista[]>([])
  const [abierto, setAbierto] = useState(false)
  const [q, setQ] = useState("")
  const [crear, setCrear] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gcContratistas().then(setLista).catch(() => {})
  }, [])

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener("mousedown", cerrar)
    return () => document.removeEventListener("mousedown", cerrar)
  }, [])

  const actual = lista.find((c) => c.id === value)
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (t ? lista.filter((c) => c.nombre.toLowerCase().includes(t) || c.identificacion.includes(t)) : lista).slice(0, 30)
  }, [lista, q])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((o) => !o)}
        className={cn(inputCls, "flex h-11 cursor-pointer items-center gap-3 text-left")}
      >
        {actual ? (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{iniciales(actual.nombre)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-gray-900">{actual.nombre}</span>
              <span className="block text-[11px] tabular-nums text-gray-500">{actual.identificacion}</span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-gray-400">Selecciona un contratista…</span>
        )}
        <ChevronsUpDown className="h-4 w-4 text-gray-400" />
      </button>

      {abierto && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl animate-scale-in">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o identificación" className="h-10 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" />
          </div>
          <ul className="max-h-64 overflow-y-auto p-1">
            {filtrados.length === 0 && <li className="px-3 py-4 text-center text-sm text-gray-500">Sin coincidencias</li>}
            {filtrados.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c)
                    setAbierto(false)
                    setQ("")
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-gray-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-gray-900">{c.nombre}</span>
                    <span className="block text-[11px] tabular-nums text-gray-500">
                      {c.identificacion} · {c.total_contratos} contrato{c.total_contratos === 1 ? "" : "s"}
                    </span>
                  </span>
                  {c.id === value && <Check className="h-4 w-4 text-emerald-600" />}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setCrear(true)
              setAbierto(false)
            }}
            className="flex w-full cursor-pointer items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-gray-50 dark:text-emerald-300"
          >
            <UserPlus className="h-4 w-4" /> Crear contratista nuevo
          </button>
        </div>
      )}

      <ContratistaDialog
        open={crear}
        onClose={() => setCrear(false)}
        onGuardado={(c) => {
          setLista((l) => [...l, c].sort((a, b) => a.nombre.localeCompare(b.nombre)))
          onChange(c)
        }}
      />
    </div>
  )
}

// ─── Formulario de contrato ──────────────────────────────────────────────────

export interface ContratoFormValues extends Omit<ContratoManualInput, "contratista_id">, GcFicha {
  contratista_id: number | null
}

const CAMPOS_TEXTO_FICHA: (keyof GcFicha)[] = [
  "obligaciones", "lugar_ejecucion", "no_cdp", "fecha_cdp", "valor_cdp", "rubro", "rp", "costo_tipo", "cuotas",
  "forma_pago", "cedula_supervisor", "cargo_supervisor", "unidad_atencion", "codigo_ciiu", "nivel_prof_supervisor",
  "interventor", "nivel_prof_interventor", "tiempo_adicion", "codigo_unspsc", "descripcion_unspsc",
]

export function ContratoForm({
  inicial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  inicial: ContratoFormValues
  submitLabel: string
  onSubmit: (v: ContratoManualInput & GcFicha) => Promise<void>
  onCancel: () => void
}) {
  const [v, setV] = useState<ContratoFormValues>(inicial)
  const [resoluciones, setResoluciones] = useState<{ id: number; codigo: string }[]>([])
  const [catalogos, setCatalogos] = useState<GcCatalogos>({ perfiles: [], plantillas_objeto: [], supervisores: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    gcResoluciones().then(setResoluciones).catch(() => {})
    gcCatalogos().then(setCatalogos).catch(() => {})
  }, [])

  const set = <K extends keyof ContratoFormValues>(k: K, val: ContratoFormValues[K]) => setV((p) => ({ ...p, [k]: val }))
  const texto = (k: keyof ContratoFormValues) => ({
    value: (v[k] as string | null | undefined) || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never),
  })
  const total = (v.valor_final ?? v.valor_total ?? 0) + (v.valor_transporte || 0)

  const elegirPerfil = (nombre: string) => {
    const anterior = catalogos.perfiles.find((p) => p.nombre === v.perfil)
    const nuevo = catalogos.perfiles.find((p) => p.nombre === nombre)
    setV((p) => ({
      ...p,
      perfil: nombre,
      // El objeto del perfil se propone solo si no se ha escrito uno propio
      objeto: !p.objeto?.trim() || p.objeto === anterior?.objeto ? nuevo?.objeto || p.objeto : p.objeto,
    }))
  }

  const elegirSupervisor = (nombre: string) => {
    const s = catalogos.supervisores.find((x) => x.nombre === nombre)
    setV((p) => ({
      ...p,
      supervisor: nombre,
      ...(s && {
        cedula_supervisor: s.identificacion,
        cargo_supervisor: s.cargo || p.cargo_supervisor,
        nivel_prof_supervisor: s.nivel_profesional || p.nivel_prof_supervisor,
      }),
    }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!v.contratista_id) return toast.error("Selecciona el contratista")
    if (!v.resolucion_id) return toast.error("Selecciona la resolución")
    if (v.fecha_inicio && v.fecha_fin && v.fecha_fin < v.fecha_inicio) return toast.error("La fecha de terminación es anterior a la de inicio")
    setSaving(true)
    try {
      const ficha: GcFicha = {}
      CAMPOS_TEXTO_FICHA.forEach((k) => (ficha[k] = (v[k] as string | null | undefined)?.trim() || null))
      await onSubmit({
        ...v,
        ...ficha,
        contratista_id: v.contratista_id,
        numero_contrato: v.numero_contrato.trim(),
        perfil: v.perfil || null,
        objeto: v.objeto?.trim() || null,
        supervisor: v.supervisor?.trim() || null,
        fecha_contrato: v.fecha_contrato || null,
        fecha_inicio: v.fecha_inicio || null,
        fecha_fin: v.fecha_fin || null,
        resolucion_id: v.resolucion_id || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Bloque titulo="Partes" desc="Número del contrato y contratista.">
          <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
            <Campo
              label="Número de contrato"
              hint={inicial.numero_contrato && v.numero_contrato.trim() !== inicial.numero_contrato ? "Se cambia también en el GESCO principal, con sus pagos y planillas." : undefined}
            >
              <input required value={v.numero_contrato} onChange={(e) => set("numero_contrato", e.target.value)} placeholder="Ej: 412 DEL 01 DE NOVIEMBRE DE 2026" className={cn(inputCls, "h-11")} />
            </Campo>
            <Campo label="Contratista">
              <SelectorContratista value={v.contratista_id} onChange={(c) => set("contratista_id", c.id)} />
            </Campo>
          </div>
        </Bloque>

        <Bloque titulo="Objeto" desc="Qué se contrata, bajo qué perfil y dónde.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Perfil" hint="Propone el objeto y el código UNSPSC del perfil.">
              <select value={v.perfil || ""} onChange={(e) => elegirPerfil(e.target.value)} className={cn(inputCls, "cursor-pointer")}>
                <option value="">—</option>
                {v.perfil && !catalogos.perfiles.some((p) => p.nombre === v.perfil) && <option value={v.perfil}>{v.perfil}</option>}
                {catalogos.perfiles.map((p) => (
                  <option key={p.nombre} value={p.nombre}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Lugar de ejecución">
              <input {...texto("lugar_ejecucion")} className={inputCls} />
            </Campo>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-gray-700">Objeto del contrato</span>
              {catalogos.plantillas_objeto.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const pl = catalogos.plantillas_objeto.find((p) => String(p.id) === e.target.value)
                    if (pl) set("objeto", pl.contenido)
                  }}
                  className="h-7 max-w-[14rem] cursor-pointer truncate rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-600"
                  aria-label="Cargar plantilla de objeto"
                >
                  <option value="">Usar plantilla…</option>
                  {catalogos.plantillas_objeto.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <textarea rows={4} {...texto("objeto")} aria-label="Objeto del contrato" className={cn(inputCls, "h-auto py-2")} />
          </div>
          <Campo label="Obligaciones específicas" hint="Opcional. Si se deja vacío se usan las del perfil en los documentos.">
            <textarea rows={3} {...texto("obligaciones")} className={cn(inputCls, "h-auto py-2")} />
          </Campo>
        </Bloque>

        <Bloque titulo="Plazo" desc="Fechas de suscripción y ejecución.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Fecha del contrato">
              <input type="date" value={v.fecha_contrato || ""} onChange={(e) => set("fecha_contrato", e.target.value)} className={inputCls} />
            </Campo>
            <Campo label="Inicio">
              <input type="date" value={v.fecha_inicio || ""} onChange={(e) => set("fecha_inicio", e.target.value)} className={inputCls} />
            </Campo>
            <Campo label="Terminación">
              <input type="date" value={v.fecha_fin || ""} min={v.fecha_inicio || undefined} onChange={(e) => set("fecha_fin", e.target.value)} className={inputCls} />
            </Campo>
          </div>
          <Campo label="Tiempo de adición" hint="Solo si el contrato tuvo prórroga.">
            <input {...texto("tiempo_adicion")} placeholder="Ej: 1 mes" className={inputCls} />
          </Campo>
        </Bloque>

        <Bloque titulo="Presupuesto y pago" desc="Disponibilidad, registro presupuestal y forma de pago.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="No. CDP">
              <input {...texto("no_cdp")} placeholder="Ej: 046" className={inputCls} />
            </Campo>
            <Campo label="Fecha CDP">
              <input type="date" {...texto("fecha_cdp")} className={inputCls} />
            </Campo>
            <Campo label="Valor CDP">
              <input {...texto("valor_cdp")} className={inputCls} />
            </Campo>
            <Campo label="Imputación presupuestal">
              <input {...texto("rubro")} placeholder="Ej: 3.1.1.01.002" className={inputCls} />
            </Campo>
            <Campo label="Registro presupuestal (RP)">
              <input {...texto("rp")} className={inputCls} />
            </Campo>
            <Campo label="Costo">
              <select value={v.costo_tipo || "DIRECTO"} onChange={(e) => set("costo_tipo", e.target.value)} className={cn(inputCls, "cursor-pointer")}>
                <option value="DIRECTO">Directo</option>
                <option value="INDIRECTO">Indirecto</option>
              </select>
            </Campo>
          </div>
          <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
            <Campo label="Cuotas">
              <input {...texto("cuotas")} placeholder="Ej: DOS (2)" className={inputCls} />
            </Campo>
            <Campo label="Forma de pago">
              <textarea rows={3} {...texto("forma_pago")} placeholder="Cláusula de forma de pago del contrato" className={cn(inputCls, "h-auto py-2")} />
            </Campo>
          </div>
        </Bloque>

        <Bloque titulo="Supervisión" desc="Quién vigila la ejecución. Elegir un supervisor registrado completa sus datos.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Supervisor">
              <input list="gc-supervisores" value={v.supervisor || ""} onChange={(e) => elegirSupervisor(e.target.value)} className={inputCls} />
              <datalist id="gc-supervisores">
                {catalogos.supervisores.map((s) => (
                  <option key={s.identificacion} value={s.nombre}>
                    {s.cargo || s.identificacion}
                  </option>
                ))}
              </datalist>
            </Campo>
            <Campo label="Cédula del supervisor">
              <input {...texto("cedula_supervisor")} className={inputCls} />
            </Campo>
            <Campo label="Cargo">
              <input {...texto("cargo_supervisor")} className={inputCls} />
            </Campo>
            <Campo label="Nivel profesional">
              <input {...texto("nivel_prof_supervisor")} className={inputCls} />
            </Campo>
            <Campo label="Unidad de atención">
              <input {...texto("unidad_atencion")} className={inputCls} />
            </Campo>
            <Campo label="Código CIIU">
              <input {...texto("codigo_ciiu")} className={inputCls} />
            </Campo>
            <Campo label="Interventor">
              <input {...texto("interventor")} className={inputCls} />
            </Campo>
            <Campo label="Nivel profesional del interventor">
              <input {...texto("nivel_prof_interventor")} className={inputCls} />
            </Campo>
          </div>
          <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
            <Campo label="Código UNSPSC">
              <input {...texto("codigo_unspsc")} className={inputCls} />
            </Campo>
            <Campo label="Descripción UNSPSC">
              <input {...texto("descripcion_unspsc")} className={inputCls} />
            </Campo>
          </div>
        </Bloque>
      </div>

      <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <Bloque titulo="Valor y presupuesto">
          <Campo label="Valor del contrato">
            <Moneda value={v.valor_total} onChange={(n) => set("valor_total", n ?? 0)} required />
          </Campo>
          <Campo label="Transporte">
            <Moneda value={v.valor_transporte} onChange={(n) => set("valor_transporte", n ?? 0)} />
          </Campo>
          <Campo label="Valor final" hint="Solo si hubo adiciones; reemplaza el valor del contrato.">
            <Moneda value={v.valor_final ?? null} onChange={(n) => set("valor_final", n)} placeholder="Opcional" />
          </Campo>
          <Campo label="Resolución *" hint="Define a qué presupuesto se carga, aquí y en el GESCO principal.">
            <select value={v.resolucion_id || ""} onChange={(e) => set("resolucion_id", e.target.value ? Number(e.target.value) : null)} className={cn(inputCls, "cursor-pointer")}>
              <option value="">Selecciona…</option>
              {resoluciones.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.codigo}
                </option>
              ))}
            </select>
          </Campo>
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-[11px] text-gray-500">Comprometido</p>
            <p className="text-xl font-semibold tabular-nums text-gray-900">{formatCOP(total)}</p>
          </div>
        </Bloque>

        <Bloque titulo="Estado">
          <select value={v.estado_gestion || "VIGENTE"} onChange={(e) => set("estado_gestion", e.target.value as EstadoGestion)} className={cn(inputCls, "cursor-pointer")}>
            {ESTADOS_GESTION.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </Bloque>

        <div className="flex gap-2">
          <Btn type="button" variant="ghost" className="flex-1" onClick={onCancel}>
            Cancelar
          </Btn>
          <Btn type="submit" variant="primary" className="flex-1" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitLabel}
          </Btn>
        </div>
      </div>
    </form>
  )
}

function Bloque({ titulo, desc, children }: { titulo: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
        {desc && <p className="text-xs text-gray-500">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

/** Campo de moneda con separador de miles (COP, sin decimales). */
function Moneda({ value, onChange, placeholder, required }: { value: number | null; onChange: (n: number | null) => void; placeholder?: string; required?: boolean }) {
  const texto = value === null || value === undefined ? "" : value.toLocaleString("es-CO")
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
      <input
        inputMode="numeric"
        required={required}
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, "")
          onChange(digitos ? Number(digitos) : null)
        }}
        className={cn(inputCls, "pl-7 text-right tabular-nums")}
      />
    </div>
  )
}
