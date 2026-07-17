"use client"

import { useState } from "react"
import { login } from "@/lib/api"
import { useAuth } from "@/components/providers/auth-provider"
import { useTheme } from "@/components/providers/theme-provider"
import { toast } from "sonner"
import { Lock, User, Eye, EyeOff, Sun, Moon } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { loginUser } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error("Por favor completa todos los campos")
      return
    }

    setLoading(true)
    try {
      const response = await login({ username, password })
      toast.success(`¡Bienvenido de nuevo, ${response.user.nombre_completo || response.user.username}!`)
      loginUser(response.access_token, response.user)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Usuario o contraseña incorrectos")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 relative overflow-hidden transition-colors duration-300 ${
      theme === "dark" 
        ? "bg-gradient-to-br from-emerald-950 via-gray-950 to-black text-slate-100" 
        : "bg-gradient-to-br from-emerald-50 via-slate-100 to-gray-100 text-gray-900"
    }`}>
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-2.5 rounded-xl transition-all border cursor-pointer ${
          theme === "dark"
            ? "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50"
            : "bg-white border-gray-200 text-gray-600 hover:text-emerald-600 hover:bg-gray-50 shadow-sm"
        }`}
        title={theme === "light" ? "Modo Oscuro" : "Modo Claro"}
      >
        {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      {/* Background decoration */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-all duration-300 ${
        theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-200/40"
      }`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-all duration-300 ${
        theme === "dark" ? "bg-emerald-400/5" : "bg-emerald-300/20"
      }`} />

      <div className={`w-full max-w-md backdrop-blur-xl rounded-2xl p-8 shadow-2xl flex flex-col items-center border transition-all duration-300 ${
        theme === "dark" 
          ? "bg-slate-900/60 border-slate-800 shadow-emerald-950/20" 
          : "bg-white border-gray-200 shadow-emerald-950/5"
      }`}>
        {/* Brand Logo */}
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-lg p-2 transition-all duration-300 ${
          theme === "dark" ? "bg-white" : "bg-white border border-gray-100"
        }`}>
          <img
            src="/logo_es.png"
            alt="ESE Norte 3 Logo"
            className="w-full h-full object-contain"
          />
        </div>
        
        <h1 className={`text-2xl font-bold tracking-wide transition-colors ${
          theme === "dark" ? "text-slate-100" : "text-gray-900"
        }`}>GESCO V2</h1>
        <p className={`text-xs uppercase tracking-widest font-semibold mt-1 mb-8 transition-colors ${
          theme === "dark" ? "text-emerald-400" : "text-emerald-700"
        }`}>
          ESE Norte 3 — Gestión Contractual
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-1.5">
            <label className={`text-xs font-bold uppercase tracking-wider block transition-colors ${
              theme === "dark" ? "text-slate-300" : "text-gray-700"
            }`}>
              Nombre de Usuario
            </label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                theme === "dark" ? "text-slate-500" : "text-gray-400"
              }`}>
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className={`w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm ${
                  theme === "dark"
                    ? "bg-slate-950/50 border border-slate-800 text-slate-100 placeholder-slate-600"
                    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                }`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs font-bold uppercase tracking-wider block transition-colors ${
              theme === "dark" ? "text-slate-300" : "text-gray-700"
            }`}>
              Contraseña
            </label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                theme === "dark" ? "text-slate-500" : "text-gray-400"
              }`}>
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className={`w-full pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm font-mono ${
                  theme === "dark"
                    ? "bg-slate-950/50 border border-slate-800 text-slate-100 placeholder-slate-600"
                    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                  theme === "dark" 
                    ? "text-slate-500 hover:text-slate-300" 
                    : "text-gray-400 hover:text-emerald-600"
                }`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
              theme === "dark"
                ? "bg-emerald-500 hover:bg-emerald-400 text-emerald-950 hover:shadow-emerald-500/20"
                : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-600/10"
            }`}
          >
            {loading ? (
              <span className={`w-5 h-5 border-2 rounded-full animate-spin ${
                theme === "dark" ? "border-emerald-950 border-t-transparent" : "border-white border-t-transparent"
              }`} />
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className={`text-[10px] uppercase tracking-wider font-semibold transition-colors ${
            theme === "dark" ? "text-slate-600" : "text-gray-400"
          }`}>
            Plataforma Unificada ESE Norte 3
          </p>
        </div>
      </div>
    </div>
  )
}
