"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Eye, EyeOff, FileStack, GitCompareArrows, Loader2, Lock, Moon, ShieldCheck, Sun, User } from "lucide-react"
import { useTheme } from "@/components/providers/theme-provider"
import { useGcAuth } from "@/components/gestion/gc-auth-provider"
import { gcLogin } from "@/lib/gestion-api"
import { cn } from "@/lib/utils"

const FEATURES = [
  { icon: GitCompareArrows, title: "Sincronización selectiva", text: "Elige qué contratos del módulo actual son contratos reales." },
  { icon: FileStack, title: "Expediente digital", text: "Sube los documentos escaneados y previsualízalos al instante." },
  { icon: ShieldCheck, title: "Acceso independiente", text: "Usuarios, roles y sesión propios, separados del GESCO principal." },
]

export default function GestionLoginPage() {
  const { user, loading: checking, login } = useGcAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!checking && user) router.replace("/gestion")
  }, [checking, user, router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await gcLogin(username.trim(), password)
      toast.success(`Bienvenido, ${res.user.nombre_completo || res.user.username}`)
      login(res.access_token, res.user)
    } catch (err: any) {
      setError(err.message || "No fue posible iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden bg-[#041b31] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%)",
          }}
        />
        <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#005696] opacity-50 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[26rem] w-[26rem] rounded-full bg-[#50a3db] opacity-25 blur-[130px]" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg">
            <img src="/logo_es.png" alt="ESE Norte 3" className="h-full w-full object-contain" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-[#fff]">GESCO</p>
            <p className="text-xs text-[#9eb3c2]">ESE Norte 3</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-[#b8daf0]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#50a3db]" />
            Módulo de Gestión Contractual
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-[#fff]">
            El expediente de cada contrato, <span className="bg-gradient-to-r from-[#88c2e7] to-white bg-clip-text text-transparent">en un solo lugar.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#9eb3c2]">
            Control preciso de los contratos reales de la entidad, con sus documentos firmados y escaneados siempre a mano.
          </p>

          <div className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <f.icon className="h-4 w-4 text-[#88c2e7]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#fff]">{f.title}</p>
                  <p className="text-sm text-[#9eb3c2]">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-[#5d7a91]">© {new Date().getFullYear()} ESE Norte 3 · Plataforma unificada</p>
      </div>

      {/* Formulario */}
      <div className="relative flex items-center justify-center px-6 py-12 sm:px-12">
        <button
          onClick={toggleTheme}
          title={theme === "light" ? "Modo oscuro" : "Modo claro"}
          className="absolute right-6 top-6 cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow ring-1 ring-gray-200">
              <img src="/logo_es.png" alt="ESE Norte 3" className="h-full w-full object-contain" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Gestión Contractual</p>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Inicia sesión</h2>
          <p className="mt-1.5 text-sm text-gray-500">Usa tu cuenta del módulo de Gestión Contractual.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Usuario" icon={User}>
              <input
                autoFocus
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="usuario"
                className="h-11 w-full bg-transparent pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </Field>
            <Field label="Contraseña" icon={Lock}>
              <input
                required
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full bg-transparent pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-700"
                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-600 animate-fade-in dark:text-red-400">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-[#fff] shadow-lg shadow-emerald-900/20 ring-1 ring-inset ring-white/10 transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  Continuar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-gray-400">
            ¿Buscas el GESCO principal?{" "}
            <a href="/login" className="font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline">
              Ir al inicio de sesión general
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-700">{label}</span>
      <div
        className={cn(
          "relative rounded-xl border border-gray-200 bg-white shadow-sm transition",
          "focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/15"
        )}
      >
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        {children}
      </div>
    </label>
  )
}
