import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gray-100 text-gray-800",
        active: "border-transparent bg-emerald-100 text-emerald-800",
        proceso: "border-transparent bg-amber-100 text-amber-800",
        finalized: "border-transparent bg-blue-100 text-blue-800",
        anulado: "border-transparent bg-red-100 text-red-800",
        outline: "text-gray-700",
        success: "border-transparent bg-emerald-100 text-emerald-800",
        warning: "border-transparent bg-amber-100 text-amber-800",
        danger: "border-transparent bg-red-100 text-red-800",
        info: "border-transparent bg-blue-100 text-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

export function getEstadoBadgeVariant(estado: string): "active" | "proceso" | "finalized" | "anulado" | "default" {
  switch (estado) {
    case "ACTIVO": return "active"
    case "EN_PROCESO": return "proceso"
    case "FINALIZADO": return "finalized"
    case "ANULADO": return "anulado"
    default: return "default"
  }
}
