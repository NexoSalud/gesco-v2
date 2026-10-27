import { GcShell } from "@/components/gestion/shell"

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <GcShell>{children}</GcShell>
}
