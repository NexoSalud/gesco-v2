"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { toast } from "sonner"
import {
  LayoutGrid,
  BarChart3,
  FolderKanban,
  RefreshCcw,
  Users,
  LogOut,
  Search,
  Sun,
  Moon,
  KeyRound,
  ArrowUpRight,
  CornerDownLeft,
  Loader2,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/providers/theme-provider"
import { useGcAuth } from "@/components/gestion/gc-auth-provider"
import { gcCambiarPassword, gcContratos, GcContrato } from "@/lib/gestion-api"
import { Btn, EstadoChip, Kbd, iniciales, inputCls } from "@/components/gestion/ui"

const NAV = [
  { href: "/gestion", label: "Resumen", icon: LayoutGrid, exact: true },
  { href: "/gestion/contratos", label: "Contratos", icon: FolderKanban },
  { href: "/gestion/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/gestion/sincronizar", label: "Sincronizar", icon: RefreshCcw, permiso: "editar" as const },
  { href: "/gestion/usuarios", label: "Usuarios", icon: Users, permiso: "admin" as const },
]

const ROL_LABEL: Record<string, string> = { ADMIN: "Administrador", GESTOR: "Gestor", CONSULTA: "Consulta" }

export function GcShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, can } = useGcAuth()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => setMobileNav(false), [pathname])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))
  const items = NAV.filter((n) => !n.permiso || can(n.permiso))

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <img src="/logo_es.png" alt="ESE Norte 3" className="h-7 w-7 object-contain" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-gray-900">Gestión Contractual</p>
          <p className="text-[11px] text-gray-500">GESCO · ESE Norte 3</p>
        </div>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-400 shadow-sm transition hover:border-gray-300 hover:text-gray-600"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Buscar contrato…</span>
          <span className="hidden items-center gap-0.5 sm:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">Módulo</p>
        {items.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-100/70 hover:text-gray-900"
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-x-3 -translate-y-1/2 rounded-r-full bg-emerald-600" />}
              <item.icon className={cn("h-4 w-4", active ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 group-hover:text-gray-600")} />
              {item.label}
            </Link>
          )
        })}

        <p className="px-2.5 pb-1.5 pt-6 text-[11px] font-medium uppercase tracking-wider text-gray-400">Otros módulos</p>
        <Link
          href="/dashboard"
          className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100/70 hover:text-gray-900"
        >
          <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          GESCO principal
        </Link>
      </nav>

      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-2.5 rounded-xl p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[11px] font-semibold text-[#fff]">
            {iniciales(user.nombre_completo || user.username)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{user.nombre_completo || user.username}</p>
            <p className="truncate text-[11px] text-gray-500">{ROL_LABEL[user.rol]}</p>
          </div>
          <button onClick={toggleTheme} title={theme === "light" ? "Modo oscuro" : "Modo claro"} className="cursor-pointer rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button onClick={logout} title="Cerrar sesión" className="cursor-pointer rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-gray-200 bg-gray-50/80 backdrop-blur lg:block">{sidebar}</aside>

      {/* Navegación móvil */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setMobileNav(true)} className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100" aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-gray-900">Gestión Contractual</p>
        <button onClick={() => setPaletteOpen(true)} className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100" aria-label="Buscar">
          <Search className="h-5 w-5" />
        </button>
      </div>
      {mobileNav && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-gray-50 shadow-xl animate-slide-in">
            <button onClick={() => setMobileNav(false)} className="absolute right-3 top-4 rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="Cerrar menú">
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</div>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {user.debe_cambiar_password && <CambioPasswordObligatorio />}
    </div>
  )
}

// ─── Búsqueda rápida (⌘K) ────────────────────────────────────────────────────

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [contratos, setContratos] = useState<GcContrato[] | null>(null)
  const [idx, setIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setQ("")
    setIdx(0)
    gcContratos().then(setContratos).catch(() => setContratos([]))
  }, [open])

  const resultados = useMemo(() => {
    if (!contratos) return []
    const t = q.trim().toLowerCase()
    const list = t
      ? contratos.filter((c) =>
          [c.numero_contrato, c.contratista_nombre, c.contratista_identificacion, c.perfil].some((v) => v?.toLowerCase().includes(t))
        )
      : contratos
    return list.slice(0, 8)
  }, [q, contratos])

  useEffect(() => setIdx(0), [q])

  const ir = (c: GcContrato) => {
    onOpenChange(false)
    router.push(`/gestion/contratos/${c.id}`)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-gray-900/30 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed left-1/2 top-[14vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-scale-in"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setIdx((i) => Math.min(i + 1, resultados.length - 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setIdx((i) => Math.max(i - 1, 0))
            } else if (e.key === "Enter" && resultados[idx]) {
              e.preventDefault()
              ir(resultados[idx])
            }
          }}
        >
          <Dialog.Title className="sr-only">Buscar contrato</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-gray-200 px-4">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Número de contrato, contratista o cédula…"
              className="h-14 flex-1 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <Kbd>esc</Kbd>
          </div>
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
            {contratos === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : resultados.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-gray-500">Sin resultados</p>
            ) : (
              resultados.map((c, i) => (
                <button
                  key={c.id}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => ir(c)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    i === idx ? "bg-gray-100" : ""
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {iniciales(c.contratista_nombre)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{c.contratista_nombre || "Sin contratista"}</p>
                    <p className="truncate text-xs text-gray-500">{c.numero_contrato}</p>
                  </div>
                  <EstadoChip estado={c.estado_gestion} />
                  {i === idx && <CornerDownLeft className="h-3.5 w-3.5 text-gray-400" />}
                </button>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Cambio de contraseña en el primer ingreso ───────────────────────────────

function CambioPasswordObligatorio() {
  const { setUser } = useGcAuth()
  const [actual, setActual] = useState("")
  const [nueva, setNueva] = useState("")
  const [confirma, setConfirma] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nueva.length < 8) return toast.error("La nueva contraseña debe tener al menos 8 caracteres")
    if (nueva !== confirma) return toast.error("Las contraseñas no coinciden")
    setSaving(true)
    try {
      const u = await gcCambiarPassword(actual, nueva)
      setUser(u)
      toast.success("Contraseña actualizada")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm" />
        <Dialog.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-scale-in"
        >
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <Dialog.Title className="text-lg font-semibold tracking-tight text-gray-900">Define tu contraseña</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-500">
            Por seguridad, cambia la contraseña asignada antes de continuar.
          </Dialog.Description>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <input type="password" required value={actual} onChange={(e) => setActual(e.target.value)} placeholder="Contraseña actual" className={inputCls} />
            <input type="password" required value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva contraseña (mín. 8 caracteres)" className={inputCls} />
            <input type="password" required value={confirma} onChange={(e) => setConfirma(e.target.value)} placeholder="Confirmar nueva contraseña" className={inputCls} />
            <Btn variant="primary" type="submit" disabled={saving} className="mt-2 w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar y continuar
            </Btn>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
