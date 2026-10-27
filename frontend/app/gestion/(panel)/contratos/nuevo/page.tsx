"use client"

import Link from "next/link"
import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ChevronRight } from "lucide-react"
import { gcCrearContrato } from "@/lib/gestion-api"
import { useGcAuth } from "@/components/gestion/gc-auth-provider"
import { PageHeader } from "@/components/gestion/ui"
import { ContratoForm } from "@/components/gestion/formularios"

export default function NuevoContratoPage() {
  return (
    <Suspense>
      <NuevoContrato />
    </Suspense>
  )
}

function NuevoContrato() {
  const router = useRouter()
  const params = useSearchParams()
  const { can } = useGcAuth()
  const contratistaId = Number(params.get("contratista")) || null

  useEffect(() => {
    if (!can("editar")) router.replace("/gestion/contratos")
  }, [can, router])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <nav className="mb-4 flex items-center gap-1 text-xs text-gray-500">
          <Link href="/gestion/contratos" className="hover:text-gray-900">
            Contratos
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900">Nuevo</span>
        </nav>
        <PageHeader
          title="Nuevo contrato"
          description="Se registra en Gestión Contractual y también en el módulo de contratos del GESCO principal, enlazados entre sí. Si el contrato ya existe allá, sincronízalo."
        />
      </div>
      <ContratoForm
        inicial={{
          numero_contrato: "",
          contratista_id: contratistaId,
          valor_total: 0,
          valor_transporte: 0,
          valor_final: null,
          estado_gestion: "VIGENTE",
        }}
        submitLabel="Crear contrato"
        onCancel={() => router.back()}
        onSubmit={async (v) => {
          try {
            const c = await gcCrearContrato(v)
            toast.success("Contrato creado", { description: "Ahora puedes subir su expediente." })
            router.replace(`/gestion/contratos/${c.id}`)
          } catch (e: any) {
            toast.error(e.message)
          }
        }}
      />
    </div>
  )
}
