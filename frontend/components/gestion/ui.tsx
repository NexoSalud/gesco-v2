"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { gcMiniaturaBlob } from "@/lib/gestion-api"
import { Check, FileText, Image as ImageIcon, Minus, type LucideIcon } from "lucide-react"

// ─── Formato ─────────────────────────────────────────────────────────────────

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
export const formatCOP = (v: number | null | undefined) => cop.format(v || 0)

export function formatFecha(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!iso) return "—"
  // Las fechas "YYYY-MM-DD" se interpretan en hora local para no correr un día
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return d.toLocaleDateString("es-CO", opts)
}

export function formatRelativo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" })
  if (diff < 60) return "hace un momento"
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute")
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour")
  if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400), "day")
  return formatFecha(iso)
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B"
  const u = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), u.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`
}

export function diasRestantes(fechaFin: string | null) {
  if (!fechaFin) return null
  const fin = new Date(`${fechaFin}T00:00:00`)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.round((fin.getTime() - hoy.getTime()) / 86400000)
}

export function iniciales(nombre: string | null | undefined) {
  if (!nombre) return "?"
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}

// ─── Estado de gestión ───────────────────────────────────────────────────────

export const ESTADOS_GESTION: { value: string; label: string; dot: string; chip: string }[] = [
  { value: "VIGENTE", label: "Vigente", dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300" },
  { value: "SUSPENDIDO", label: "Suspendido", dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300" },
  { value: "TERMINADO", label: "Terminado", dot: "bg-gray-400", chip: "bg-gray-500/10 text-gray-600 ring-gray-500/20" },
  { value: "LIQUIDADO", label: "Liquidado", dot: "bg-violet-500", chip: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300" },
  { value: "ANULADO", label: "Anulado", dot: "bg-red-500", chip: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300" },
]

export function EstadoChip({ estado, className }: { estado: string; className?: string }) {
  const e = ESTADOS_GESTION.find((x) => x.value === estado) || ESTADOS_GESTION[2]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", e.chip, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", e.dot)} />
      {e.label}
    </span>
  )
}

export function Chip({ children, tone = "gray", className }: { children: React.ReactNode; tone?: "gray" | "amber" | "blue" | "red"; className?: string }) {
  const tones = {
    gray: "bg-gray-500/10 text-gray-600 ring-gray-500/20",
    amber: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
    blue: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
    red: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300",
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", tones[tone], className)}>
      {children}
    </span>
  )
}

// ─── Bloques de layout ───────────────────────────────────────────────────────

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-xs font-medium text-gray-500">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>{children}</div>
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
          <Icon className="h-5 w-5 text-emerald-600" />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-gray-100", className)} />
}

// ─── Botones del módulo ──────────────────────────────────────────────────────

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md"
}

export function Btn({ variant = "secondary", size = "md", className, ...props }: BtnProps) {
  const variants = {
    primary: "bg-emerald-600 text-[#fff] shadow-sm shadow-emerald-900/10 hover:bg-emerald-700 ring-1 ring-inset ring-white/10",
    secondary: "bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 shadow-sm",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    danger: "bg-red-600 text-[#fff] hover:bg-red-700 shadow-sm",
  }
  const sizes = { sm: "h-8 px-2.5 text-xs gap-1.5", md: "h-9 px-3.5 text-sm gap-2" }
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

export const inputCls =
  "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15"

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-gray-200 bg-gray-50 px-1 font-sans text-[10px] font-medium text-gray-500">
      {children}
    </kbd>
  )
}

// ─── Miniatura autenticada ───────────────────────────────────────────────────

export function Miniatura({ docId, tiene, mime, className }: { docId: number; tiene: boolean; mime: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!tiene) return
    let revoked = false
    let objectUrl: string | null = null
    gcMiniaturaBlob(docId)
      .then((b) => {
        if (revoked) return
        objectUrl = URL.createObjectURL(b)
        setUrl(objectUrl)
      })
      .catch(() => setError(true))
    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [docId, tiene])

  const Icon = mime.startsWith("image/") ? ImageIcon : FileText
  if (!tiene || error) {
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100", className)}>
        <Icon className="h-8 w-8 text-gray-300" />
      </div>
    )
  }
  if (!url) return <div className={cn("animate-pulse bg-gray-100", className)} />
  return <img src={url} alt="" className={cn("object-cover object-top", className)} draggable={false} />
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  disabled,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "flex h-4 w-4 cursor-pointer items-center justify-center rounded-[5px] border transition-all disabled:cursor-not-allowed disabled:opacity-40",
        checked || indeterminate ? "border-emerald-600 bg-emerald-600 text-[#fff]" : "border-gray-300 bg-white hover:border-gray-400"
      )}
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : indeterminate ? <Minus className="h-3 w-3" strokeWidth={3} /> : null}
    </button>
  )
}
