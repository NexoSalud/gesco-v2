"use client"

import { usePathname } from "next/navigation"
import { Search, Wifi, WifiOff } from "lucide-react"
import { useState, useEffect } from "react"

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
        {/* Search */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Buscar"
        >
          <Search className="w-4 h-4 text-gray-500" />
        </button>

        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium">
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600">Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-500" />
              <span className="text-red-600">Sin conexión</span>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
