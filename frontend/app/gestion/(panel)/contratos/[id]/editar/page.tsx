"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronRight } from "lucide-react"
import { gcContrato, gcEditarContrato, gcFicha, GcContrato, GcFicha } from "@/lib/gestion-api"
import { useGcAuth } from "@/components/gestion/gc-auth-provider"
import { PageHeader, Shimmer } from "@/components/gestion/ui"
import { ContratoForm } from "@/components/gestion/formularios"

export default function EditarContratoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { can } = useGcAuth()
  const [contrato, setContrato] = useState<GcContrato | null>(null)
  const [ficha, setFicha] = useState<GcFicha | null>(null)

  useEffect(() => {
    Promise.all([gcContrato(Number(id)), gcFicha(Number(id))])
      .then(([c, f]) => {
        if (c.origen_eliminado || !can("editar")) {
          toast.error(c.origen_eliminado ? "El contrato ya no existe en el GESCO principal" : "No tienes permiso para editar")
          router.replace(`/gestion/contratos/${id}`)
          return
        }
        setContrato(c)
        setFicha(f)
      })
      .catch((e) => toast.error(e.message))
  }, [id, can, router])


  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <nav className="mb-4 flex items-center gap-1 text-xs text-gray-500">
          <Link href="/gestion/contratos" className="hover:text-gray-900">
            Contratos
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/gestion/contratos/${id}`} className="hover:text-gray-900">
            {contrato?.numero_contrato || "…"}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900">Editar</span>
        </nav>
        <PageHeader title="Editar contrato" description="Los cambios se guardan aquí y en el módulo de contratos del GESCO principal." />
      </div>
      {!contrato || !ficha ? (
        <Shimmer className="h-96" />
      ) : (
        <ContratoForm
          inicial={{
            ...ficha,
            numero_contrato: contrato.numero_contrato,
            contratista_id: contrato.contratista_id,
            perfil: contrato.perfil,
            objeto: contrato.objeto,
            fecha_contrato: contrato.fecha_contrato,
            fecha_inicio: contrato.fecha_inicio,
            fecha_fin: contrato.fecha_fin,
            valor_total: contrato.valor_total,
            valor_transporte: contrato.valor_transporte,
            valor_final: contrato.valor_final,
            supervisor: contrato.supervisor,
            resolucion_id: contrato.resolucion_id,
            estado_gestion: contrato.estado_gestion,
          }}
          submitLabel="Guardar cambios"
          onCancel={() => router.back()}
          onSubmit={async (v) => {
            try {
              await gcEditarContrato(contrato.id, v)
              toast.success("Contrato actualizado")
              router.replace(`/gestion/contratos/${contrato.id}`)
            } catch (e: any) {
              toast.error(e.message)
            }
          }}
        />
      )}
    </div>
  )
}
