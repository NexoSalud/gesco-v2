"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import {
  getUsuarios, createUsuario, updateUsuario, deleteUsuario,
  getRoles, createRole, updateRole, deleteRole, saveRoleAccesos,
  Usuario, Role, Acceso
} from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TableSkeleton } from "@/components/ui/skeleton"
import {
  ShieldAlert, UserPlus, Shield, Key, Edit2, Trash2, Check, X,
  Save, AlertTriangle, ShieldCheck, RefreshCw, Plus
} from "lucide-react"

const VISTAS_SISTEMA = [
  { key: "dashboard", label: "Dashboard / Estadísticas" },
  { key: "resoluciones", label: "Resoluciones Presupuestales" },
  { key: "contratos", label: "Contratos de Prestación" },
  { key: "contratistas", label: "Contratistas (Personal)" },
  { key: "inventario", label: "Almacenes e Inventarios" },
  { key: "perfiles", label: "Perfiles de Actividades" },
  { key: "plantillas", label: "Plantillas de Documentos" },
  { key: "importar", label: "Importación de Datos" },
]

export default function UsuariosPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<"usuarios" | "roles">("usuarios")
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  
  // Matrix permissions state (vista -> permission flags)
  const [matrixPermissions, setMatrixPermissions] = useState<Record<string, { crear: boolean; leer: boolean; actualizar: boolean; eliminar: boolean }>>({})

  const [loading, setLoading] = useState(true)

  // Modals / forms state
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [userForm, setUserForm] = useState({
    username: "",
    nombre_completo: "",
    password: "",
    role_id: "",
    activo: true
  })

  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleForm, setRoleForm] = useState({
    nombre: "",
    descripcion: ""
  })

  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordUser, setPasswordUser] = useState<Usuario | null>(null)
  const [newPassword, setNewPassword] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role?.nombre !== "SUPER_ADMIN") {
      return // Will render access denied
    }

    fetchData()
  }, [authLoading, user])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersData, rolesData] = await Promise.all([
        getUsuarios(),
        getRoles()
      ])
      setUsuarios(usersData)
      setRoles(rolesData)
      
      // Auto-select first non-SUPER_ADMIN role for the permissions matrix if none selected
      const nonSuper = rolesData.find(r => r.nombre !== "SUPER_ADMIN")
      if (nonSuper) {
        handleSelectRole(nonSuper)
      } else if (rolesData.length > 0) {
        handleSelectRole(rolesData[0])
      }
    } catch (error: any) {
      toast.error("Error al cargar la información de seguridad: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role)
    
    // Initialize matrix
    const newMatrix: typeof matrixPermissions = {}
    VISTAS_SISTEMA.forEach(v => {
      const match = role.accesos.find(a => a.vista === v.key)
      newMatrix[v.key] = {
        crear: match ? match.crear : false,
        leer: match ? match.leer : true,
        actualizar: match ? match.actualizar : false,
        eliminar: match ? match.eliminar : false
      }
    })
    setMatrixPermissions(newMatrix)
  }

  // Toggles for the matrix checkboxes
  const handleMatrixToggle = (vistaKey: string, flag: 'crear' | 'leer' | 'actualizar' | 'eliminar') => {
    if (!selectedRole || selectedRole.nombre === "SUPER_ADMIN") return
    
    setMatrixPermissions(prev => ({
      ...prev,
      [vistaKey]: {
        ...prev[vistaKey],
        [flag]: !prev[vistaKey][flag]
      }
    }))
  }

  const handleSavePermissions = async () => {
    if (!selectedRole) return
    if (selectedRole.nombre === "SUPER_ADMIN") {
      toast.error("Los accesos del Super Administrador son fijos y no se pueden modificar")
      return
    }

    try {
      const payload = Object.entries(matrixPermissions).map(([vista, flags]) => ({
        vista,
        ...flags
      }))
      await saveRoleAccesos(selectedRole.id, payload)
      toast.success(`Permisos para el rol '${selectedRole.nombre}' guardados correctamente`)
      // Refresh to get updated roles
      const updatedRoles = await getRoles()
      setRoles(updatedRoles)
      const freshRole = updatedRoles.find(r => r.id === selectedRole.id)
      if (freshRole) setSelectedRole(freshRole)
    } catch (error: any) {
      toast.error("Error al guardar permisos: " + error.message)
    }
  }

  // ─── USER ACTIONS ───

  const handleOpenUserModal = (u: Usuario | null = null) => {
    setEditingUser(u)
    if (u) {
      setUserForm({
        username: u.username,
        nombre_completo: u.nombre_completo || "",
        password: "", // Keep password blank
        role_id: String(u.role_id),
        activo: u.activo
      })
    } else {
      setUserForm({
        username: "",
        nombre_completo: "",
        password: "",
        role_id: roles.length > 0 ? String(roles[0].id) : "",
        activo: true
      })
    }
    setUserModalOpen(true)
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userForm.username.trim() || (!editingUser && !userForm.password.trim())) {
      toast.error("Por favor completa los campos requeridos")
      return
    }

    try {
      const payload: any = {
        username: userForm.username,
        nombre_completo: userForm.nombre_completo,
        role_id: parseInt(userForm.role_id),
        activo: userForm.activo
      }
      if (userForm.password) {
        payload.password = userForm.password
      }

      if (editingUser) {
        await updateUsuario(editingUser.id, payload)
        toast.success("Usuario actualizado con éxito")
      } else {
        await createUsuario({
          ...payload,
          password: userForm.password
        })
        toast.success("Usuario creado con éxito")
      }
      setUserModalOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || "Error al procesar la operación")
    }
  }

  const handleDeleteUser = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este usuario de forma permanente?")) {
      try {
        await deleteUsuario(id)
        toast.success("Usuario eliminado")
        fetchData()
      } catch (error: any) {
        toast.error(error.message)
      }
    }
  }

  const handleOpenPasswordModal = (u: Usuario) => {
    setPasswordUser(u)
    setNewPassword("")
    setPasswordModalOpen(true)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordUser || !newPassword.trim()) return

    try {
      await updateUsuario(passwordUser.id, { password: newPassword })
      toast.success(`Contraseña de '${passwordUser.username}' actualizada correctamente`)
      setPasswordModalOpen(false)
    } catch (error: any) {
      toast.error("Error al actualizar contraseña: " + error.message)
    }
  }

  // ─── ROLE ACTIONS ───

  const handleOpenRoleModal = (r: Role | null = null) => {
    setEditingRole(r)
    if (r) {
      setRoleForm({
        nombre: r.nombre,
        descripcion: r.descripcion || ""
      })
    } else {
      setRoleForm({
        nombre: "",
        descripcion: ""
      })
    }
    setRoleModalOpen(true)
  }

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleForm.nombre.trim()) return

    try {
      if (editingRole) {
        await updateRole(editingRole.id, roleForm)
        toast.success("Rol actualizado")
      } else {
        await createRole(roleForm)
        toast.success("Rol creado con éxito")
      }
      setRoleModalOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDeleteRole = async (r: Role) => {
    if (r.nombre === "SUPER_ADMIN" || r.nombre === "ADMIN") {
      toast.error("No se pueden eliminar los roles reservados del sistema")
      return
    }
    if (confirm(`¿Estás seguro de eliminar el rol '${r.nombre}'?`)) {
      try {
        await deleteRole(r.id)
        toast.success("Rol eliminado")
        fetchData()
      } catch (error: any) {
        toast.error(error.message)
      }
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    )
  }

  if (!user || user.role?.nombre !== "SUPER_ADMIN") {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6 p-8 bg-white border border-red-100 rounded-2xl shadow-xl">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Acceso Denegado</h1>
          <p className="text-sm text-gray-500 mt-2">
            Lo sentimos, esta sección del sistema está restringida únicamente para usuarios con rol de <strong>Super Administrador</strong>.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard")} className="w-full">
          Volver al Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            Seguridad y Accesos (RBAC)
          </h1>
          <p className="text-gray-500 mt-1">Control de accesos, roles y usuarios del sistema</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "usuarios" ? (
            <Button onClick={() => handleOpenUserModal(null)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Nuevo Usuario
            </Button>
          ) : (
            <Button onClick={() => handleOpenRoleModal(null)} className="gap-2" variant="outline">
              <Plus className="w-4 h-4" />
              Nuevo Rol
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("usuarios")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "usuarios"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Gestión de Usuarios
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "roles"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Roles y Matrices de Acceso
        </button>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : (
        activeTab === "usuarios" ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Usuarios Registrados</CardTitle>
              <CardDescription>
                Lista de cuentas con acceso. El Super Administrador puede crear usuarios, cambiar contraseñas y modificar sus roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider text-xs">
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Nombre Completo</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Fecha Creación</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-gray-900">{u.username}</td>
                        <td className="py-3.5 px-4 text-gray-600">{u.nombre_completo || "—"}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            u.role?.nombre === "SUPER_ADMIN" ? "bg-purple-100 text-purple-800" :
                            u.role?.nombre === "ADMIN" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {u.role?.nombre.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.activo ? (
                            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              Activo
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 text-xs">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenPasswordModal(u)}
                            className="p-1 text-gray-400 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Cambiar Contraseña"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenUserModal(u)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Editar Datos"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={user.id === u.id}
                            className={`p-1 transition-colors cursor-pointer ${
                              user.id === u.id ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-red-600"
                            }`}
                            title="Eliminar Cuenta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles column */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Roles del Sistema</CardTitle>
                  <CardDescription>Selecciona un rol para ver y configurar su matriz de permisos.</CardDescription>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-1">
                    {roles.map(r => (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRole(r)}
                        className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          selectedRole?.id === r.id
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "hover:bg-gray-50 border border-transparent text-gray-700"
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-1.5">
                            <Shield className={`w-4 h-4 ${selectedRole?.id === r.id ? "text-emerald-600" : "text-gray-400"}`} />
                            {r.nombre.replace("_", " ")}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{r.descripcion || "Sin descripción"}</p>
                        </div>
                        {r.nombre !== "SUPER_ADMIN" && r.nombre !== "ADMIN" && (
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenRoleModal(r)}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRole(r)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Matrix column */}
            <div className="lg:col-span-2">
              {selectedRole ? (
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        Matriz de Permisos: <span className="text-emerald-700 font-bold">{selectedRole.nombre.replace("_", " ")}</span>
                      </CardTitle>
                      <CardDescription>
                        {selectedRole.nombre === "SUPER_ADMIN"
                          ? "El rol SUPER_ADMIN tiene acceso completo a todas las vistas y acciones. Sus permisos no son editables."
                          : "Define qué acciones puede realizar este rol en cada sección del sistema."
                        }
                      </CardDescription>
                    </div>
                    {selectedRole.nombre !== "SUPER_ADMIN" && (
                      <Button onClick={handleSavePermissions} size="sm" className="gap-1.5">
                        <Save className="w-4 h-4" />
                        Guardar Matriz
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-0 border-t border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-6">Sección / Vista</th>
                            <th className="py-3 px-4 text-center">Leer (R)</th>
                            <th className="py-3 px-4 text-center">Crear (C)</th>
                            <th className="py-3 px-4 text-center">Actualizar (U)</th>
                            <th className="py-3 px-4 text-center">Eliminar (D)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {VISTAS_SISTEMA.map(v => {
                            const perms = matrixPermissions[v.key] || { crear: false, leer: true, actualizar: false, eliminar: false }
                            const isSuper = selectedRole.nombre === "SUPER_ADMIN"
                            
                            return (
                              <tr key={v.key} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                                <td className="py-3.5 px-6 font-medium text-gray-700">{v.label}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSuper ? true : perms.leer}
                                    disabled={isSuper}
                                    onChange={() => handleMatrixToggle(v.key, "leer")}
                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSuper ? true : perms.crear}
                                    disabled={isSuper}
                                    onChange={() => handleMatrixToggle(v.key, "crear")}
                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSuper ? true : perms.actualizar}
                                    disabled={isSuper}
                                    onChange={() => handleMatrixToggle(v.key, "actualizar")}
                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSuper ? true : perms.eliminar}
                                    disabled={isSuper}
                                    onChange={() => handleMatrixToggle(v.key, "eliminar")}
                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
                  <ShieldCheck className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">Selecciona un rol de la lista para ver sus permisos</p>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ─── MODALS ─── */}

      {/* User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Completa los datos de la cuenta de acceso.</p>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Nombre de Usuario *
                </label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={e => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="ej. jgomez"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={userForm.nombre_completo}
                  onChange={e => setUserForm(prev => ({ ...prev, nombre_completo: e.target.value }))}
                  placeholder="ej. Juan Gómez"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              {!editingUser && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                    Contraseña Inicial *
                  </label>
                  <input
                    type="password"
                    required
                    value={userForm.password}
                    onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Contraseña segura"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Rol de Acceso *
                </label>
                <select
                  required
                  value={userForm.role_id}
                  onChange={e => setUserForm(prev => ({ ...prev, role_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={userForm.activo}
                  onChange={e => setUserForm(prev => ({ ...prev, activo: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="activo" className="text-sm text-gray-700 cursor-pointer select-none">
                  Cuenta de usuario activa
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingUser ? "Guardar Cambios" : "Crear Usuario"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModalOpen && passwordUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                Cambiar Contraseña
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Establece una nueva contraseña para el usuario <strong>{passwordUser.username}</strong>.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Nueva Contraseña *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Ingresa la nueva contraseña"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setPasswordModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-500">
                  Actualizar Contraseña
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {editingRole ? "Editar Rol" : "Crear Nuevo Rol"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Define el rol de usuario para estructurar los permisos.</p>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Nombre del Rol *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!(editingRole && (editingRole.nombre === "SUPER_ADMIN" || editingRole.nombre === "ADMIN"))}
                  value={roleForm.nombre}
                  onChange={e => setRoleForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="ej. AUDITOR"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm uppercase font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Descripción
                </label>
                <textarea
                  value={roleForm.descripcion}
                  onChange={e => setRoleForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe las funciones de este rol"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setRoleModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingRole ? "Guardar Cambios" : "Crear Rol"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
