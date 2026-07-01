import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Gesco V2 — Gestión de Contratos ESE",
  description: "Plataforma unificada de gestión de contratos, supervisiones y pagos ESE Norte 3",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  )
}
