"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getMe, Usuario } from "@/lib/api"
import { toast } from "sonner"

interface AuthContextType {
  user: Usuario | null
  loading: boolean
  loginUser: (token: string, userData: Usuario) => void
  logoutUser: () => void
  updateUserSession: (token: string, userData: Usuario) => void
  hasPermission: (vista: string, accion: 'crear' | 'leer' | 'actualizar' | 'eliminar') => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkAuth() {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      
      if (!token) {
        setUser(null)
        setLoading(false)
        if (pathname && pathname !== "/login") {
          router.push("/login")
        }
        return
      }

      try {
        const userData = await getMe()
        setUser(userData)
      } catch (error) {
        console.error("Auth check failed:", error)
        if (typeof window !== "undefined") {
          localStorage.removeItem("token")
        }
        setUser(null)
        if (pathname && pathname !== "/login") {
          router.push("/login")
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [pathname, router])

  const loginUser = (token: string, userData: Usuario) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token)
    }
    setUser(userData)
    router.push("/dashboard")
  }

  const logoutUser = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
    }
    setUser(null)
    toast.success("Sesión cerrada correctamente")
    router.push("/login")
  }

  const updateUserSession = (token: string, userData: Usuario) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token)
    }
    setUser(userData)
  }

  const hasPermission = (vista: string, accion: 'crear' | 'leer' | 'actualizar' | 'eliminar'): boolean => {
    if (!user) return false
    if (user.role.nombre === "SUPER_ADMIN") return true
    
    // Si la vista es usuarios, solo SUPER_ADMIN tiene acceso
    if (vista === "usuarios") return false

    const acc = user.role.accesos.find((a) => a.vista.toLowerCase() === vista.toLowerCase())
    if (!acc) return false
    return !!acc[accion]
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, updateUserSession, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
