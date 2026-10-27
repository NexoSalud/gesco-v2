"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { toast } from "sonner"
import { KeyRound, Loader2, UserPlus, Users } from "lucide-react"
import { GcUsuario, RolGc, gcActualizarUsuario, gcCrearUsuario, gcUsuarios } from "@/lib/gestion-api"
import { useGcAuth } from "@/components/gestion/gc-auth-provider"
import { Btn, Chip, EmptyState, PageHeader, Panel, Shimmer, formatRelativo, iniciales, inputCls } from "@/components/gestion/ui"
import { cn } from "@/lib/utils"

const ROLES: { value: RolGc; label: string; desc: string }[] = [
  { value: "ADMIN", label: "Administrador", desc: "Todo, incluida la gestión de usuarios" },
  { value: "GESTOR", label: "Gestor", desc: "Sincroniza contratos y carga documentos" },
  { value: "CONSULTA", label: "Consulta", desc: "Solo ve, previsualiza y descarga" },
]

export default function UsuariosPage() {
  const { user, can } = useGcAuth()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<GcUsuario[] | null>(null)
  const [crear, setCrear] = useState(false)
  const [reset, setReset] = useState<GcUsuario | null>(null)

  useEffect(() => {
    if (!can("admin")) {
      router.replace("/gestion")
      return
    }
    gcUsuarios().then(setUsuarios).catch((e) => toast.error(e.message))
  }, [can, router])

  const actualizar = async (u: GcUsuario, data: Partial<GcUsuario>) => {
    try {
      const nuevo = await gcActualizarUsuario(u.id, data)
      setUsuarios((prev) => prev?.map((x) => (x.id === u.id ? nuevo : x)) || null)
      toast.success("Usuario actualizado")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Usuarios"
        description="Cuentas con acceso a Gestión Contractual. Son independientes de los usuarios del GESCO principal."
        actions={
          <Btn variant="primary" onClick={() => setCrear(true)}>
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </Btn>
        }
      />

      <Panel className="overflow-hidden">
        {usuarios === null ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Shimmer key={i} className="h-12" />
            ))}
          </div>
        ) : usuarios.length === 0 ? (
          <EmptyState icon={Users} title="Sin usuarios" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Usuario</th>
                  <th className="px-5 py-3 font-medium">Rol</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Último acceso</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuarios.map((u) => {
                  const yo = u.id === user?.id
                  return (
                    <tr key={u.id} className={cn(!u.activo && "opacity-60")}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                            {iniciales(u.nombre_completo || u.username)}
                          </div>
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 font-medium text-gray-900">
                              {u.nombre_completo || u.username}
                              {yo && <Chip tone="blue">Tú</Chip>}
                            </p>
                            <p className="text-xs text-gray-500">
                              @{u.username}
                              {u.correo ? ` · ${u.correo}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={u.rol}
                          disabled={yo}
                          onChange={(e) => actualizar(u, { rol: e.target.value as RolGc })}
                          className={cn(inputCls, "h-8 w-auto cursor-pointer text-xs disabled:cursor-not-allowed")}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="hidden px-5 py-3 text-xs text-gray-500 md:table-cell">
                        {u.ultimo_acceso ? formatRelativo(u.ultimo_acceso) : "Nunca"}
                        {u.debe_cambiar_password && <span className="ml-1.5 text-amber-600 dark:text-amber-400">· clave temporal</span>}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          role="switch"
                          aria-checked={u.activo}
                          disabled={yo}
                          onClick={() => actualizar(u, { activo: !u.activo })}
                          className={cn(
                            "relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                            u.activo ? "bg-emerald-600" : "bg-gray-300"
                          )}
                          title={u.activo ? "Activo" : "Inactivo"}
                        >
                          <span className={cn("inline-block h-4 w-4 rounded-full bg-[#fff] shadow transition-transform", u.activo ? "translate-x-4.5" : "translate-x-0.5")} />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Btn size="sm" variant="ghost" onClick={() => setReset(u)}>
                          <KeyRound className="h-3.5 w-3.5" /> Restablecer clave
                        </Btn>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r.value} className="rounded-2xl border border-dashed border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-900">{r.label}</p>
            <p className="mt-0.5 text-xs text-gray-500">{r.desc}</p>
          </div>
        ))}
      </div>

      <CrearUsuario open={crear} onClose={() => setCrear(false)} onCreado={(u) => setUsuarios((prev) => [...(prev || []), u])} />
      <RestablecerClave usuario={reset} onClose={() => setReset(null)} onListo={(u) => setUsuarios((prev) => prev?.map((x) => (x.id === u.id ? u : x)) || null)} />
    </div>
  )
}

function Modal({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-gray-900/30 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-scale-in">
          <Dialog.Title className="text-base font-semibold text-gray-900">{title}</Dialog.Title>
          {description && <Dialog.Description className="mt-1 text-sm text-gray-500">{description}</Dialog.Description>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CrearUsuario({ open, onClose, onCreado }: { open: boolean; onClose: () => void; onCreado: (u: GcUsuario) => void }) {
  const [form, setForm] = useState({ username: "", nombre_completo: "", correo: "", rol: "GESTOR" as RolGc, password: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ username: "", nombre_completo: "", correo: "", rol: "GESTOR", password: "" })
  }, [open])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const u = await gcCrearUsuario({ ...form, correo: form.correo || undefined, nombre_completo: form.nombre_completo || undefined })
      onCreado(u)
      toast.success("Usuario creado", { description: "Deberá cambiar la contraseña en su primer ingreso." })
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo usuario" description="Tendrá acceso solo al módulo de Gestión Contractual.">
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block">
            <span className="mb-1 block text-xs font-medium text-gray-700">Nombre completo</span>
            <input value={form.nombre_completo} onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">Usuario</span>
            <input required minLength={3} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">Correo</span>
            <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} className={inputCls} />
          </label>
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-gray-700">Rol</span>
          <div className="grid gap-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition",
                  form.rol === r.value ? "border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/10" : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <input type="radio" name="rol" className="accent-emerald-600" checked={form.rol === r.value} onChange={() => setForm({ ...form, rol: r.value })} />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{r.label}</span>
                  <span className="block text-xs text-gray-500">{r.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Contraseña temporal</span>
          <input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="Mínimo 8 caracteres" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" variant="primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Crear usuario
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

function RestablecerClave({ usuario, onClose, onListo }: { usuario: GcUsuario | null; onClose: () => void; onListo: (u: GcUsuario) => void }) {
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  useEffect(() => setPassword(""), [usuario])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario) return
    setSaving(true)
    try {
      onListo(await gcActualizarUsuario(usuario.id, { password }))
      toast.success("Contraseña restablecida", { description: "Se pedirá cambiarla en el próximo ingreso." })
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!usuario} onClose={onClose} title="Restablecer contraseña" description={usuario ? `Nueva contraseña temporal para @${usuario.username}.` : undefined}>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Mínimo 8 caracteres" />
        <div className="flex justify-end gap-2 pt-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" variant="primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Restablecer
          </Btn>
        </div>
      </form>
    </Modal>
  )
}
