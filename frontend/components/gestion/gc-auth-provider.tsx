"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { gcMe, getGcToken, setGcToken, GcUsuario, RolGc } from "@/lib/gestion-api"

interface GcAuthContext {
  user: GcUsuario | null
  loading: boolean
  login: (token: string, user: GcUsuario) => void
  logout: () => void
  setUser: (user: GcUsuario) => void
  can: (accion: "editar" | "admin") => boolean
}

const Ctx = createContext<GcAuthContext | undefined>(undefined)

const LOGIN_PATH = "/gestion/login"

export function GcAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<GcUsuario | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const logout = useCallback(() => {
    setGcToken(null)
    setUserState(null)
    router.replace(LOGIN_PATH)
  }, [router])

  useEffect(() => {
    let cancel = false
    async function check() {
      if (!getGcToken()) {
        setUserState(null)
        setLoading(false)
        if (pathname !== LOGIN_PATH) router.replace(LOGIN_PATH)
        return
      }
      try {
        const me = await gcMe()
        if (!cancel) setUserState(me)
      } catch {
        if (!cancel) {
          setGcToken(null)
          setUserState(null)
          if (pathname !== LOGIN_PATH) router.replace(LOGIN_PATH)
        }
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    // Solo se revalida al entrar o si aún no hay usuario
    if (!user || pathname === LOGIN_PATH) check()
    return () => {
      cancel = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    const onUnauthorized = () => logout()
    window.addEventListener("gc:unauthorized", onUnauthorized)
    return () => window.removeEventListener("gc:unauthorized", onUnauthorized)
  }, [logout])

  const login = (token: string, u: GcUsuario) => {
    setGcToken(token)
    setUserState(u)
    router.replace("/gestion")
  }

  const can = (accion: "editar" | "admin") => {
    if (!user) return false
    const permitidos: Record<string, RolGc[]> = { editar: ["ADMIN", "GESTOR"], admin: ["ADMIN"] }
    return permitidos[accion].includes(user.rol)
  }

  return (
    <Ctx.Provider value={{ user, loading, login, logout, setUser: setUserState, can }}>
      {children}
    </Ctx.Provider>
  )
}

export function useGcAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useGcAuth debe usarse dentro de GcAuthProvider")
  return ctx
}
