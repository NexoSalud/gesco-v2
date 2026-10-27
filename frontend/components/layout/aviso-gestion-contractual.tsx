import Link from "next/link"
import { ArrowUpRight, FolderArchive } from "lucide-react"

/** Aviso de que los contratos se gestionan en Gestión Contractual; aquí solo se consultan. */
export function AvisoGestionContractual({ accion = "Crear, editar o anular contratos" }: { accion?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center">
      <FolderArchive className="h-5 w-5 shrink-0 text-emerald-700" />
      <p className="flex-1 text-sm text-emerald-900">
        {accion} se hace ahora en <strong>Gestión Contractual</strong>. Aquí la información es de solo consulta.
      </p>
      <Link
        href="/gestion/login"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-[#fff] transition-colors hover:bg-emerald-800"
      >
        Ir a Gestión Contractual <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
