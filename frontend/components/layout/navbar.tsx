"use client"

import { usePathname } from "next/navigation"
import { Search, Wifi, WifiOff, LogOut, UserCog, X, KeyRound, User, Lock, Sun, Moon } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useTheme } from "@/components/providers/theme-provider"
import { updateMe } from "@/lib/api"
import { toast } from "sonner"

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  resoluciones: "Resoluciones",
  contratos: "Contratos",
  perfiles: "Perfiles",
  plantillas: "Plantillas",
  nuevo: "Nueva",
  editar: "Editar",
}

export default function Navbar() {
  const pathname = usePathname()
  const [isOnline, setIsOnline] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, logoutUser, updateUserSession } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editNombreCompleto, setEditNombreCompleto] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editPassword, setEditPassword] = useState("")
  const [editConfirmPassword, setEditConfirmPassword] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  // Initialize fields when modal opens
  useEffect(() => {
    if (showProfileModal && user) {
      setEditNombreCompleto(user.nombre_completo || "")
      setEditUsername(user.username || "")
      setEditPassword("")
      setEditConfirmPassword("")
    }
  }, [showProfileModal, user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUsername.trim()) {
      toast.error("El nombre de usuario no puede estar vacío")
      return
    }
    if (editPassword && editPassword !== editConfirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    try {
      setSavingProfile(true)
      const payload: any = {
        username: editUsername.trim(),
        nombre_completo: editNombreCompleto.trim() || null,
      }
      if (editPassword) {
        payload.password = editPassword
      }

      const res = await updateMe(payload)
      updateUserSession(res.access_token, res.user)
      toast.success("Perfil actualizado correctamente")
      setShowProfileModal(false)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Error al actualizar el perfil")
    } finally {
      setSavingProfile(false)
    }
  }

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Build breadcrumbs from pathname
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/")
    const label = BREADCRUMB_LABELS[seg] || seg
    return { label, href, isLast: i === segments.length - 1 }
  })

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumbs.length > 0 ? (
          breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-2">
              {i > 0 && <span className="text-gray-300">/</span>}
              {crumb.isLast ? (
                <span className="font-medium text-gray-900 capitalize">
                  {decodeURIComponent(crumb.label)}
                </span>
              ) : (
                <a
                  href={crumb.href}
                  className="text-gray-500 hover:text-gray-700 transition-colors capitalize"
                >
                  {crumb.label}
                </a>
              )}
            </span>
          ))
        ) : (
          <span className="font-medium text-gray-900">Dashboard</span>
        )}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-gray-800">{user.nombre_completo || user.username}</p>
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">{user.role?.nombre.replace("_", " ")}</p>
            </div>
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold flex items-center justify-center text-xs uppercase select-none transition-colors cursor-pointer"
              title="Editar Perfil"
            >
              {user.nombre_completo ? user.nombre_completo.substring(0, 2) : user.username.substring(0, 2)}
            </button>
            <button
              onClick={toggleTheme}
              className="text-gray-400 hover:text-emerald-600 transition-colors ml-1 cursor-pointer p-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-center"
              title={theme === "light" ? "Modo Oscuro" : "Modo Claro"}
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowProfileModal(true)}
              className="text-gray-400 hover:text-emerald-600 transition-colors ml-1 cursor-pointer p-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-center"
              title="Editar Perfil"
            >
              <UserCog className="w-4 h-4" />
            </button>
            <button
              onClick={logoutUser}
              className="text-gray-400 hover:text-red-600 transition-colors ml-1 cursor-pointer p-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-center"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>

    {/* Profile Modal */}
    {showProfileModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              <h3 className="font-bold text-lg">Mi Perfil</h3>
            </div>
            <button
              onClick={() => setShowProfileModal(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Nombre Completo
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={editNombreCompleto}
                  onChange={(e) => setEditNombreCompleto(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Nombre de Usuario (Login / Identificación)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  placeholder="ejemplo123"
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold text-emerald-600 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <KeyRound className="w-3.5 h-3.5" /> Cambiar Contraseña
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Dejar en blanco para conservar actual"
                      className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={editConfirmPassword}
                      onChange={(e) => setEditConfirmPassword(e.target.value)}
                      placeholder="Confirmar nueva contraseña"
                      className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                disabled={savingProfile}
                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingProfile ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
  )
}
