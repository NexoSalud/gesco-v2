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
} from "lucide-react"
import { useState } from "react"

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Resoluciones",
    icon: FileText,
    href: "/dashboard/resoluciones",
    children: [
      { label: "Todas las resoluciones", href: "/dashboard/resoluciones" },
      { label: "Nueva resolución", href: "/dashboard/resoluciones/nuevo" },
    ],
  },
  {
    label: "Contratos",
    href: "/dashboard/contratos",
    icon: Scale,
  },
  {
    label: "Perfiles",
    href: "/dashboard/perfiles",
    icon: Users,
  },
  {
    label: "Plantillas",
    href: "/dashboard/plantillas",
    icon: FileSpreadsheet,
  },
  {
    label: "Importar",
    href: "/dashboard/importar",
    icon: Upload,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [resolucionesOpen, setResolucionesOpen] = useState(
    pathname.startsWith("/dashboard/resoluciones")
  )

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-sidebar text-sidebar-text z-40 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Scale className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white text-sm tracking-wide">GESCO V2</h1>
          <p className="text-[10px] text-sidebar-text">Gestión de Contratos</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
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
