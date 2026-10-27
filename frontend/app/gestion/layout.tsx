import type { Metadata } from "next"
import { Toaster } from "sonner"
import { GcAuthProvider } from "@/components/gestion/gc-auth-provider"

export const metadata: Metadata = {
  title: "Gestión Contractual — GESCO ESE Norte 3",
  description: "Expediente de contratos reales: sincronización selectiva y documentos escaneados",
}

export default function GestionLayout({ children }: { children: React.ReactNode }) {
  return (
    <GcAuthProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "12px",
            border: "1px solid var(--color-gray-200-theme)",
            background: "var(--color-white-theme)",
            color: "var(--color-gray-900-theme)",
            boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
          },
        }}
      />
    </GcAuthProvider>
  )
}
