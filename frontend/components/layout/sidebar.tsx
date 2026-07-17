"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  Users,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Scale,
  Upload,
  User,
  BadgeCheck,
  Package,
  Shield,
} from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard"
  },
  {
    label: "Resoluciones",
    icon: FileText,
    href: "/dashboard/resoluciones",
    permission: "resoluciones",
    children: [
      { label: "Todas las resoluciones", href: "/dashboard/resoluciones" },
      { label: "Nueva resolución", href: "/dashboard/resoluciones/nuevo" },
    ],
  },
  {
    label: "Contratos",
    href: "/dashboard/contratos",
    icon: Scale,
    permission: "contratos"
  },
  {
    label: "Contratistas",
    href: "/dashboard/contratistas",
    icon: User,
    permission: "contratistas"
  },
  {
    label: "Inventario",
    href: "/dashboard/inventario",
    icon: Package,
    permission: "inventario"
  },
  {
    label: "Supervisores",
    href: "/dashboard/supervisores",
    icon: BadgeCheck,
  },
  {
    label: "Perfiles",
    href: "/dashboard/perfiles",
    icon: Users,
    permission: "perfiles"
  },
  {
    label: "Plantillas",
    href: "/dashboard/plantillas",
    icon: FileSpreadsheet,
    permission: "plantillas"
  },
  {
    label: "Obj. Plantillas",
    href: "/dashboard/plantillas-objeto",
    icon: FileText,
    permission: "plantillas"
  },
  {
    label: "Importar",
    href: "/dashboard/importar",
    icon: Upload,
    permission: "importar"
  },
  {
    label: "Seguridad",
    href: "/dashboard/usuarios",
    icon: Shield,
    permission: "usuarios"
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const [resolucionesOpen, setResolucionesOpen] = useState(
    pathname.startsWith("/dashboard/resoluciones")
  )
  const { hasPermission, user } = useAuth()

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  // Filtrar ítems de navegación según permisos
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true
    if (item.permission === "usuarios") {
      return user?.role?.nombre === "SUPER_ADMIN"
    }
    return hasPermission(item.permission, "leer")
  })

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-sidebar text-sidebar-text z-40 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
        <img
          src="/logo_es.png"
          alt="ESE Norte 3"
          className="w-10 h-10 object-contain rounded-lg bg-white p-1 shadow-sm"
        />
        <div>
          <h1 className="font-bold text-white text-sm tracking-wide">GESCO V2</h1>
          <p className="text-[10px] text-sidebar-text">Gestión de Contratos</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          if (item.children) {
            const isExpanded = resolucionesOpen
            return (
              <div key={item.label}>
                <button
                  onClick={() => setResolucionesOpen(!resolucionesOpen)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                    "hover:bg-sidebar-hover hover:text-white",
                    isActive(item.href || "") && "bg-sidebar-active text-sidebar-text-active"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all",
                          pathname === child.href
                            ? "bg-sidebar-active text-sidebar-text-active"
                            : "hover:bg-sidebar-hover hover:text-white"
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          pathname === child.href ? "bg-emerald-400" : "bg-sidebar-text"
                        )} />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href || "#"}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                "hover:bg-sidebar-hover hover:text-white",
                isActive(item.href || "") && "bg-sidebar-active text-sidebar-text-active"
              )}
            >
              {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[10px] text-sidebar-text">v2.0.0</p>
        <p className="text-[10px] text-sidebar-text">ESE Norte 3</p>
      </div>
    </aside>
  )
}
