"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import {
  Package,
  Boxes,
  Plus,
  Upload,
  Calendar,
  User,
  Users,
  Search,
  CheckCircle,
  AlertTriangle,
  History,
  FileText,
  Building,
  PlusCircle,
  MinusCircle,
  FileSpreadsheet,
  Download,
  Filter,
  Eye,
  Trash2,
  Settings,
  ArrowRight,
  TrendingUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Sparkles,
  Info,
  Check,
} from "lucide-react"

import {
  getAlmacenes,
  createAlmacen,
  updateAlmacen,
  deleteAlmacen,
  getArticulos,
  createArticulo,
  updateArticulo,
  deleteArticulo,
  bulkDeleteArticulos,
  getUnidades,
  createUnidad,
  updateUnidad,
  deleteUnidad,
  bulkDeleteUnidades,
  uploadImportSerializado,
  uploadImportCantidad,
  registrarEntrega,
  registrarDevolucion,
  getInventarioContrato,
  getDashboardInventario,
  descargarActaDocx,
  getContratos,
  descargarExcelUnidades,
  descargarExcelDisponibilidad,
  getResoluciones,
  type Almacen,
  type Articulo,
  type UnidadInventario,
  type Acta,
  type Resolucion,
} from "@/lib/api"

export default function InventarioPage() {
  const { user } = useAuth()
  const getResolucionCodigo = (resId?: number | null) => {
    if (!resId) return "—"
    const res = resoluciones.find((r) => r.id === resId)
    return res ? res.codigo : `ID: ${resId}`
  }
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "catalogo" | "asignar" | "almacenes">("dashboard")
  
  // Data States
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [unidades, setUnidades] = useState<UnidadInventario[]>([])
  const [contratosActivos, setContratosActivos] = useState<any[]>([])
  const [resoluciones, setResoluciones] = useState<Resolucion[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Search filters
  const [searchArticulo, setSearchArticulo] = useState("")
  const [searchUnidad, setSearchUnidad] = useState("")
  const [searchAlmacen, setSearchAlmacen] = useState("")

  // Specific filters for Unidades Físicas (Serials)
  const [filterUnidadElemento, setFilterUnidadElemento] = useState("")
  const [filterUnidadEstado, setFilterUnidadEstado] = useState("")
  const [filterUnidadAsignado, setFilterUnidadAsignado] = useState("")
  const [showUnidadFilters, setShowUnidadFilters] = useState(false)

  // Specific filters for Disponibilidad General
  const [filterArticuloCategoria, setFilterArticuloCategoria] = useState("")
  const [filterArticuloElemento, setFilterArticuloElemento] = useState("")
  const [filterArticuloMarcaModelo, setFilterArticuloMarcaModelo] = useState("")
  const [showArticuloFilters, setShowArticuloFilters] = useState(false)

  // Pagination states
  const [currentPageArticulo, setCurrentPageArticulo] = useState(1)
  const itemsPerPageArticulo = 10

  const [currentPageUnidad, setCurrentPageUnidad] = useState(1)
  const itemsPerPageUnidad = 15

  const [currentPageAlmacen, setCurrentPageAlmacen] = useState(1)
  const itemsPerPageAlmacen = 9

  // Form Modals / Toggles
  const [showAddAlmacen, setShowAddAlmacen] = useState(false)
  const [editingAlmacen, setEditingAlmacen] = useState<Almacen | null>(null)
  const [showEditAlmacen, setShowEditAlmacen] = useState(false)
  const [selectedAlmacenDetalle, setSelectedAlmacenDetalle] = useState<Almacen | null>(null)
  const [almacenDetalleTab, setAlmacenDetalleTab] = useState<"stock" | "serials">("stock")

  // Warehouse detail modal filtering & pagination states
  const [searchDetalleArticulo, setSearchDetalleArticulo] = useState("")
  const [filterDetalleArticuloCategoria, setFilterDetalleArticuloCategoria] = useState("")
  const [filterDetalleArticuloElemento, setFilterDetalleArticuloElemento] = useState("")
  const [filterDetalleArticuloMarcaModelo, setFilterDetalleArticuloMarcaModelo] = useState("")
  const [showDetalleArticuloFilters, setShowDetalleArticuloFilters] = useState(false)
  const [currentPageDetalleArticulo, setCurrentPageDetalleArticulo] = useState(1)

  const [searchDetalleUnidad, setSearchDetalleUnidad] = useState("")
  const [filterDetalleUnidadElemento, setFilterDetalleUnidadElemento] = useState("")
  const [filterDetalleUnidadEstado, setFilterDetalleUnidadEstado] = useState("")
  const [filterDetalleUnidadAsignado, setFilterDetalleUnidadAsignado] = useState("")
  const [showDetalleUnidadFilters, setShowDetalleUnidadFilters] = useState(false)
  const [currentPageDetalleUnidad, setCurrentPageDetalleUnidad] = useState(1)

  // Selection states for checkboxes
  const [selectedArticulos, setSelectedArticulos] = useState<number[]>([])
  const [selectedUnidades, setSelectedUnidades] = useState<number[]>([])

  // Edit Modals for Articulos and Unidades
  const [showEditArticulo, setShowEditArticulo] = useState(false)
  const [editingArticulo, setEditingArticulo] = useState<any>(null)
  
  const [showEditUnidad, setShowEditUnidad] = useState(false)
  const [editingUnidad, setEditingUnidad] = useState<any>(null)

  useEffect(() => {
    if (selectedAlmacenDetalle) {
      setSearchDetalleArticulo("")
      setFilterDetalleArticuloCategoria("")
      setFilterDetalleArticuloElemento("")
      setFilterDetalleArticuloMarcaModelo("")
      setShowDetalleArticuloFilters(false)
      setCurrentPageDetalleArticulo(1)

      setSearchDetalleUnidad("")
      setFilterDetalleUnidadElemento("")
      setFilterDetalleUnidadEstado("")
      setFilterDetalleUnidadAsignado("")
      setShowDetalleUnidadFilters(false)
      setCurrentPageDetalleUnidad(1)
    }
  }, [selectedAlmacenDetalle])

  const [showAddArticulo, setShowAddArticulo] = useState(false)
  const [showAddUnidad, setShowAddUnidad] = useState(false)
  const [showImportSerializado, setShowImportSerializado] = useState(false)
  const [showImportCantidad, setShowImportCantidad] = useState(false)
  const [importType, setImportType] = useState<"serializado" | "cantidad" | null>(null)
  const [importResolucionId, setImportResolucionId] = useState<number | undefined>(undefined)
  const [showAccionesDropdown, setShowAccionesDropdown] = useState(false)

  // Form Inputs
  const [newAlmacen, setNewAlmacen] = useState({ nombre: "", ubicacion: "", responsable: "" })
  const [newArticulo, setNewArticulo] = useState({
    categoria: "TECNOLOGICO",
    tipo_elemento: "",
    elemento: "",
    marca: "",
    modelo: "",
    requiere_serial: true,
    almacen_id: "",
    stock_total: 0,
    resolucion_id: "",
  })
  const [newUnidad, setNewUnidad] = useState({
    articulo_id: "",
    almacen_id: "",
    serial: "",
    imei2: "",
    observaciones: "",
    resolucion_id: "",
  })

  // File Uploads
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [selectedAlmacenUpload, setSelectedAlmacenUpload] = useState("")
  const [importResult, setImportResult] = useState<any>(null)

  // Asignación (Entrega/Devolución) state
  const [selectedContratoId, setSelectedContratoId] = useState<number | "">("")
  const [contratoSearch, setContratoSearch] = useState("")
  const [operationType, setOperationType] = useState<"ENTREGA" | "DEVOLUCION">("ENTREGA")
  const [contratoDetalle, setContratoDetalle] = useState<any>(null)
  const [loadingContratoDetalle, setLoadingContratoDetalle] = useState(false)

  // Entrega Items Cart
  const [entregaCart, setEntregaCart] = useState<any[]>([])
  const [cartArticuloId, setCartArticuloId] = useState<number | "">("")
  const [cartCategoria, setCartCategoria] = useState<string>("")
  const [cartAlmacenId, setCartAlmacenId] = useState<number | "">("")
  const [articuloSearchQuery, setArticuloSearchQuery] = useState("")
  const [showArticuloSuggestions, setShowArticuloSuggestions] = useState(false)
  const [cartUnidadId, setCartUnidadId] = useState<number | "">("")
  const [cartCantidad, setCartCantidad] = useState(1)
  const [cartEstado, setCartEstado] = useState("Se entrega en excelente estado funcional")
  const [cartObs, setCartObs] = useState("")
  const [disponiblesParaCart, setDisponiblesParaCart] = useState<UnidadInventario[]>([])
  const [pendingUnidadId, setPendingUnidadId] = useState<number | "">("")

  // Keep the article search query, category, and warehouse in sync with cartArticuloId
  useEffect(() => {
    if (cartArticuloId) {
      const art = articulos.find((a) => a.id === Number(cartArticuloId))
      if (art) {
        setArticuloSearchQuery(`${art.elemento} (${art.categoria})`)
        setCartCategoria(art.categoria)
        if (art.almacen_id) {
          setCartAlmacenId(art.almacen_id)
        }
      }
    } else {
      setArticuloSearchQuery("")
    }
  }, [cartArticuloId, articulos])
  
  // Delivery Header Inputs
  const [recibidoPor, setRecibidoPor] = useState("")
  const [recibidoEntregadoPor, setRecibidoEntregadoPor] = useState("")
  const [fechaOperacion, setFechaOperacion] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    if (user && !recibidoEntregadoPor) {
      setRecibidoEntregadoPor(user.nombre_completo || user.username)
    }
  }, [user, recibidoEntregadoPor])

  // Devolución Items selection
  const [devolucionesCart, setDevolucionesCart] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [almData, artData, unData, dashData, contData, resData] = await Promise.all([
        getAlmacenes(),
        getArticulos(),
        getUnidades(),
        getDashboardInventario(),
        getContratos({ estado: "ACTIVO" }),
        getResoluciones(),
      ])
      setAlmacenes(almData)
      setArticulos(artData)
      setUnidades(unData)
      setDashboard(dashData)
      setContratosActivos(contData)
      setResoluciones(resData)
    } catch (e: any) {
      toast.error("Error al cargar datos del inventario: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Pre-select contract from URL query params (e.g. from contractor profile details)
  useEffect(() => {
    if (typeof window !== "undefined" && contratosActivos.length > 0) {
      const params = new URLSearchParams(window.location.search)
      const paramContratoId = params.get("contrato_id")
      const paramAction = params.get("action")
      if (paramContratoId) {
        const cid = Number(paramContratoId)
        if (!isNaN(cid)) {
          setSelectedContratoId(cid)
          const match = contratosActivos.find((c) => c.id === cid)
          if (match) {
            setContratoSearch(`${match.numero_contrato} - ${match.contratista_rel?.nombre || ""}`)
          } else {
            setContratoSearch(`Contrato ID: ${cid}`)
          }
          setActiveTab("asignar")
          if (paramAction === "devolucion") {
            setOperationType("DEVOLUCION")
          } else {
            setOperationType("ENTREGA")
          }
        }
      }
    }
  }, [contratosActivos])

  const handleAssignUnit = (u: UnidadInventario) => {
    if (u.estado !== "DISPONIBLE") {
      toast.error(`El equipo con serial ${u.serial || u.id} no está disponible (Estado: ${u.estado})`)
      return
    }
    setPendingUnidadId(u.id)
    setCartArticuloId(u.articulo_id)
    setOperationType("ENTREGA")
    setActiveTab("asignar")
  }

  // Load physical units when an article is selected in delivery cart
  useEffect(() => {
    if (cartArticuloId) {
      const art = articulos.find((a) => a.id === Number(cartArticuloId))
      if (art && art.requiere_serial) {
        getUnidades({ articulo_id: Number(cartArticuloId), estado: "DISPONIBLE" })
          .then((res) => {
            setDisponiblesParaCart(res)
            if (pendingUnidadId && res.some((item) => item.id === Number(pendingUnidadId))) {
              setCartUnidadId(Number(pendingUnidadId))
              setPendingUnidadId("") // clear pre-selection
            } else if (res.length > 0) {
              setCartUnidadId(res[0].id)
            } else {
              setCartUnidadId("")
            }
          })
          .catch((e) => toast.error("Error al obtener unidades: " + e.message))
      } else {
        setDisponiblesParaCart([])
        setCartUnidadId("")
      }
    } else {
      setDisponiblesParaCart([])
      setCartUnidadId("")
    }
  }, [cartArticuloId, articulos])

  // Load contract inventory when selected contract changes in Assignment
  useEffect(() => {
    if (selectedContratoId) {
      setLoadingContratoDetalle(true)
      getInventarioContrato(Number(selectedContratoId))
        .then((res) => {
          setContratoDetalle(res)
          // Pre-populate ESE staff and receiver
          setRecibidoPor(res.contratista || "")
          
          // Pre-select items from URL query params if matching
          const params = new URLSearchParams(window.location.search)
          const paramSelectedUnidades = params.get("selected_unidades")
          const paramSelectedDotacion = params.get("selected_dotacion")
          
          let initialCart: any[] = []
          
          if (paramSelectedUnidades) {
            const ids = paramSelectedUnidades.split(",").map(Number)
            res.equipos_asignados?.forEach((eq: any) => {
              if (ids.includes(eq.id)) {
                initialCart.push({
                  unidad_id: eq.id,
                  elemento: eq.elemento,
                  serial: eq.serial,
                  categoria: eq.categoria || "TECNOLOGICO",
                  estado_declarado: "Excelente estado",
                  observaciones: "",
                })
              }
            })
          }
          
          if (paramSelectedDotacion) {
            const ids = paramSelectedDotacion.split(",").map(Number)
            res.dotaciones_asignadas?.forEach((dot: any) => {
              if (ids.includes(dot.articulo_id)) {
                initialCart.push({
                  articulo_id: dot.articulo_id,
                  elemento: dot.elemento,
                  categoria: dot.categoria || "DOTACION",
                  cantidad: dot.cantidad_neta || dot.cantidad || 1,
                  reutilizable: true,
                  estado_declarado: "Excelente estado",
                  observaciones: "",
                })
              }
            })
          }
          
          setDevolucionesCart(initialCart)
        })
        .catch((e) => toast.error("Error al cargar inventario del contrato: " + e.message))
        .finally(() => setLoadingContratoDetalle(false))
    } else {
      setContratoDetalle(null)
    }
  }, [selectedContratoId])

  // Manual creations
  const handleCreateAlmacen = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAlmacen.nombre) return
    try {
      await createAlmacen(newAlmacen)
      toast.success("Almacén creado exitosamente")
      setShowAddAlmacen(false)
      setNewAlmacen({ nombre: "", ubicacion: "", responsable: "" })
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleUpdateAlmacen = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAlmacen || !editingAlmacen.nombre) return
    try {
      await updateAlmacen(editingAlmacen.id, {
        nombre: editingAlmacen.nombre,
        ubicacion: editingAlmacen.ubicacion,
        responsable: editingAlmacen.responsable,
      })
      toast.success("Almacén actualizado exitosamente")
      setShowEditAlmacen(false)
      setEditingAlmacen(null)
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDeleteAlmacen = async (id: number) => {
    if (!confirm("¿Está seguro de que desea eliminar este almacén?")) return
    try {
      await deleteAlmacen(id)
      toast.success("Almacén de inventario eliminado exitosamente")
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleCreateArticulo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newArticulo.elemento || !newArticulo.tipo_elemento) return
    try {
      const payload = {
        ...newArticulo,
        almacen_id: newArticulo.almacen_id ? Number(newArticulo.almacen_id) : undefined,
        stock_total: Number(newArticulo.stock_total),
        resolucion_id: newArticulo.resolucion_id ? Number(newArticulo.resolucion_id) : undefined,
      }
      await createArticulo(payload)
      toast.success("Artículo creado en catálogo maestro")
      setShowAddArticulo(false)
      setNewArticulo({
        categoria: "TECNOLOGICO",
        tipo_elemento: "",
        elemento: "",
        marca: "",
        modelo: "",
        requiere_serial: true,
        almacen_id: "",
        stock_total: 0,
        resolucion_id: "",
      })
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleCreateUnidad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUnidad.articulo_id) return
    try {
      const payload = {
        ...newUnidad,
        articulo_id: Number(newUnidad.articulo_id),
        almacen_id: newUnidad.almacen_id ? Number(newUnidad.almacen_id) : undefined,
        resolucion_id: newUnidad.resolucion_id ? Number(newUnidad.resolucion_id) : undefined,
      }
      await createUnidad(payload)
      toast.success("Unidad física registrada exitosamente")
      setShowAddUnidad(false)
      setNewUnidad({
        articulo_id: "",
        almacen_id: "",
        serial: "",
        imei2: "",
        observaciones: "",
        resolucion_id: "",
      })
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleUpdateArticulo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingArticulo || !editingArticulo.elemento) return
    try {
      await updateArticulo(editingArticulo.id, {
        categoria: editingArticulo.categoria,
        tipo_elemento: editingArticulo.tipo_elemento,
        elemento: editingArticulo.elemento,
        marca: editingArticulo.marca,
        modelo: editingArticulo.modelo,
        stock_total: Number(editingArticulo.stock_total),
        almacen_id: editingArticulo.almacen_id ? Number(editingArticulo.almacen_id) : undefined,
        resolucion_id: editingArticulo.resolucion_id ? Number(editingArticulo.resolucion_id) : undefined,
      })
      toast.success("Artículo actualizado exitosamente")
      setShowEditArticulo(false)
      setEditingArticulo(null)
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDeleteArticulo = async (id: number) => {
    if (!confirm("¿Está seguro de que desea eliminar este artículo? Esto también eliminará todas sus unidades físicas y movimientos asociados.")) return
    try {
      await deleteArticulo(id)
      toast.success("Artículo eliminado exitosamente")
      setSelectedArticulos(prev => prev.filter(x => x !== id))
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleBulkDeleteArticulos = async () => {
    if (selectedArticulos.length === 0) return
    if (!confirm(`¿Está seguro de que desea eliminar los ${selectedArticulos.length} artículos seleccionados? Esto también eliminará todas sus unidades físicas y movimientos asociados.`)) return
    try {
      await bulkDeleteArticulos(selectedArticulos)
      toast.success("Artículos eliminados exitosamente")
      setSelectedArticulos([])
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleUpdateUnidad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUnidad) return
    try {
      await updateUnidad(editingUnidad.id, {
        serial: editingUnidad.serial,
        imei2: editingUnidad.imei2,
        estado: editingUnidad.estado,
        observaciones: editingUnidad.observaciones,
        almacen_id: editingUnidad.almacen_id ? Number(editingUnidad.almacen_id) : undefined,
        resolucion_id: editingUnidad.resolucion_id ? Number(editingUnidad.resolucion_id) : undefined,
      })
      toast.success("Unidad física actualizada exitosamente")
      setShowEditUnidad(false)
      setEditingUnidad(null)
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDeleteUnidad = async (id: number) => {
    if (!confirm("¿Está seguro de que desea eliminar esta unidad física? Esto también eliminará su historial de movimientos.")) return
    try {
      await deleteUnidad(id)
      toast.success("Unidad física eliminada exitosamente")
      setSelectedUnidades(prev => prev.filter(x => x !== id))
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleBulkDeleteUnidades = async () => {
    if (selectedUnidades.length === 0) return
    if (!confirm(`¿Está seguro de que desea eliminar las ${selectedUnidades.length} unidades físicas seleccionadas? Esto también eliminará su historial de movimientos.`)) return
    try {
      await bulkDeleteUnidades(selectedUnidades)
      toast.success("Unidades físicas eliminadas exitosamente")
      setSelectedUnidades([])
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Excel Upload Imports
  const handleImportSerializado = async (dryRun: boolean) => {
    if (!uploadFile) {
      toast.error("Por favor seleccione un archivo excel.")
      return
    }
    try {
      const msg = dryRun 
        ? "Simulando y verificando archivo de serializados..." 
        : "Procesando importación de serializados..."
      toast.loading(msg, { id: "import" })
      const res = await (uploadImportSerializado as any)(uploadFile, undefined, importResolucionId, dryRun)
      
      if (dryRun) {
        toast.success("Verificación finalizada con éxito", { id: "import" })
      } else {
        toast.success("Importación completada con éxito", { id: "import" })
        setUploadFile(null)
        setImportResolucionId(undefined)
        setShowImportSerializado(false)
        fetchData()
      }
      setImportResult(res)
    } catch (e: any) {
      toast.error(e.message, { id: "import" })
    }
  }

  const handleImportCantidad = async (dryRun: boolean) => {
    if (!uploadFile) {
      toast.error("Por favor seleccione un archivo excel.")
      return
    }
    try {
      const msg = dryRun 
        ? "Simulando y verificando archivo de dotación..." 
        : "Procesando importación de dotación..."
      toast.loading(msg, { id: "import" })
      const res = await (uploadImportCantidad as any)(uploadFile, undefined, importResolucionId, dryRun)
      
      if (dryRun) {
        toast.success("Verificación finalizada con éxito", { id: "import" })
      } else {
        toast.success("Importación completada con éxito", { id: "import" })
        setUploadFile(null)
        setImportResolucionId(undefined)
        setShowImportCantidad(false)
        fetchData()
      }
      setImportResult(res)
    } catch (e: any) {
      toast.error(e.message, { id: "import" })
    }
  }

  const executeRealImportFromPreview = async () => {
    if (!uploadFile) return
    try {
      toast.loading("Procesando importación definitiva...", { id: "import" })
      let res;
      if (importType === "serializado") {
        res = await (uploadImportSerializado as any)(uploadFile, undefined, importResolucionId, false)
        setShowImportSerializado(false)
      } else {
        res = await (uploadImportCantidad as any)(uploadFile, undefined, importResolucionId, false)
        setShowImportCantidad(false)
      }
      toast.success("Importación definitiva completada con éxito", { id: "import" })
      setImportResult(res)
      setUploadFile(null)
      setImportResolucionId(undefined)
      fetchData()
    } catch (e: any) {
      toast.error(e.message, { id: "import" })
    }
  }

  // Delivery Cart Actions
  const addToEntregaCart = () => {
    if (!cartArticuloId) return
    const art = articulos.find((a) => a.id === Number(cartArticuloId))
    if (!art) return

    let serial = ""
    let imei2 = ""
    let unitObj = null

    if (art.requiere_serial) {
      if (!cartUnidadId) {
        toast.error("No hay unidades físicas disponibles para este artículo")
        return
      }
      // Check if already in cart
      if (entregaCart.some((i) => i.unidad_id === Number(cartUnidadId))) {
        toast.error("Esta unidad física ya está agregada al carrito")
        return
      }
      const unit = disponiblesParaCart.find((u) => u.id === Number(cartUnidadId))
      if (unit) {
        serial = unit.serial || ""
        imei2 = unit.imei2 || ""
        unitObj = unit
      }
    } else {
      // Check if already in cart for quantity, just update quantity or error
      if (entregaCart.some((i) => i.articulo_id === art.id)) {
        toast.error("Este artículo ya está en el carrito. Elimínelo si desea cambiar la cantidad.")
        return
      }
      if (cartCantidad <= 0) return
      if (art.stock_disponible < cartCantidad) {
        toast.error(`Stock disponible insuficiente. Disponible: ${art.stock_disponible}`)
        return
      }
    }

    const cartItem = {
      articulo_id: art.id,
      elemento: art.elemento,
      categoria: art.categoria,
      marca: art.marca,
      modelo: art.modelo,
      requiere_serial: art.requiere_serial,
      unidad_id: unitObj ? unitObj.id : null,
      serial,
      imei2,
      cantidad: art.requiere_serial ? 1 : cartCantidad,
      estado_declarado: cartEstado,
      observaciones: cartObs,
    }

    setEntregaCart([...entregaCart, cartItem])
    // Reset inputs
    setCartArticuloId("")
    setCartCategoria("")
    setCartAlmacenId("")
    setCartEstado("Se entrega en excelente estado funcional")
    setCartObs("")
    setCartCantidad(1)
  }

  const removeFromEntregaCart = (index: number) => {
    setEntregaCart(entregaCart.filter((_, i) => i !== index))
  }

  const submitEntrega = async () => {
    if (!selectedContratoId || entregaCart.length === 0) {
      toast.error("Por favor seleccione un contrato y agregue elementos al carrito")
      return
    }

    const payload = {
      contrato_id: Number(selectedContratoId),
      items: entregaCart.map((i) => ({
        articulo_id: i.articulo_id,
        unidad_id: i.unidad_id,
        cantidad: i.cantidad,
        estado_declarado: i.estado_declarado,
        observaciones: i.observaciones,
      })),
      fecha: fechaOperacion,
      recibido_por: recibidoPor,
      recibido_entregado_por: recibidoEntregadoPor,
    }

    try {
      toast.loading("Registrando entrega y generando actas...", { id: "entrega" })
      const actas = await registrarEntrega(payload)
      toast.success("Entrega registrada con éxito!", { id: "entrega" })
      
      // Auto-download each generated acta
      actas.forEach((acta: Acta) => {
        descargarActaDocx(acta.id)
      })

      // Clear states
      setEntregaCart([])
      setSelectedContratoId("")
      fetchData()
    } catch (e: any) {
      toast.error(e.message, { id: "entrega" })
    }
  }

  // Devolución selection handlers
  const toggleDevolucionItem = (item: any, type: "SERIAL" | "DOTACION") => {
    const isSelected = type === "SERIAL" 
      ? devolucionesCart.some((d) => d.unidad_id === item.id)
      : devolucionesCart.some((d) => d.articulo_id === item.articulo_id)

    if (isSelected) {
      setDevolucionesCart(type === "SERIAL" 
        ? devolucionesCart.filter((d) => d.unidad_id !== item.id)
        : devolucionesCart.filter((d) => d.articulo_id !== item.articulo_id)
      )
    } else {
      const newItem = type === "SERIAL"
        ? {
            unidad_id: item.id,
            elemento: item.elemento,
            serial: item.serial,
            categoria: item.categoria,
            estado_declarado: "Excelente estado",
            observaciones: "",
          }
        : {
            articulo_id: item.articulo_id,
            elemento: item.elemento,
            categoria: item.categoria,
            cantidad: item.cantidad_neta,
            reutilizable: true,
            estado_declarado: "Excelente estado",
            observaciones: "",
          }

      setDevolucionesCart([...devolucionesCart, newItem])
    }
  }

  const updateDevolucionCartItem = (index: number, field: string, value: any) => {
    const updated = [...devolucionesCart]
    updated[index] = { ...updated[index], [field]: value }
    setDevolucionesCart(updated)
  }

  const submitDevolucion = async () => {
    if (!selectedContratoId || devolucionesCart.length === 0) {
      toast.error("Por favor seleccione un contrato y marque los elementos a devolver")
      return
    }

    const payload = {
      contrato_id: Number(selectedContratoId),
      items: devolucionesCart.map((d) => ({
        unidad_id: d.unidad_id || null,
        articulo_id: d.articulo_id || null,
        cantidad: d.cantidad || 1,
        estado_declarado: d.estado_declarado,
        reutilizable: d.reutilizable !== undefined ? d.reutilizable : true,
        observaciones: d.observaciones,
      })),
      fecha: fechaOperacion,
      recibido_por: recibidoPor, // who receives the return
      recibido_entregado_por: recibidoEntregadoPor,
    }

    try {
      toast.loading("Registrando devolución y generando actas...", { id: "devolucion" })
      const actas = await registrarDevolucion(payload)
      toast.success("Devolución registrada con éxito!", { id: "devolucion" })

      // Auto-download actas
      actas.forEach((acta: Acta) => {
        descargarActaDocx(acta.id)
      })

      // Clear states
      setDevolucionesCart([])
      setSelectedContratoId("")
      fetchData()
    } catch (e: any) {
      toast.error(e.message, { id: "devolucion" })
    }
  }

  // Resets pagination on search input changes
  useEffect(() => {
    setCurrentPageArticulo(1)
  }, [searchArticulo, filterArticuloCategoria, filterArticuloElemento, filterArticuloMarcaModelo])

  useEffect(() => {
    setCurrentPageUnidad(1)
  }, [searchUnidad, filterUnidadElemento, filterUnidadEstado, filterUnidadAsignado])

  useEffect(() => {
    setCurrentPageAlmacen(1)
  }, [searchAlmacen])

  useEffect(() => {
    setCurrentPageDetalleArticulo(1)
  }, [searchDetalleArticulo, filterDetalleArticuloCategoria, filterDetalleArticuloElemento, filterDetalleArticuloMarcaModelo])

  useEffect(() => {
    setCurrentPageDetalleUnidad(1)
  }, [searchDetalleUnidad, filterDetalleUnidadElemento, filterDetalleUnidadEstado, filterDetalleUnidadAsignado])

  // Filters for warehouse detail modal
  const filteredDetalleArticulos = selectedAlmacenDetalle
    ? articulos
        .filter((art) => art.almacen_id === selectedAlmacenDetalle.id)
        .filter((art) => {
          if (filterDetalleArticuloCategoria && art.categoria !== filterDetalleArticuloCategoria) {
            return false
          }
          if (filterDetalleArticuloElemento) {
            const elSearch = filterDetalleArticuloElemento.toLowerCase()
            if (!art.elemento.toLowerCase().includes(elSearch)) {
              return false
            }
          }
          if (filterDetalleArticuloMarcaModelo) {
            const brandModelSearch = filterDetalleArticuloMarcaModelo.toLowerCase()
            const brandMatch = art.marca && art.marca.toLowerCase().includes(brandModelSearch)
            const modelMatch = art.modelo && art.modelo.toLowerCase().includes(brandModelSearch)
            if (!brandMatch && !modelMatch) {
              return false
            }
          }
          if (searchDetalleArticulo) {
            const s = searchDetalleArticulo.toLowerCase()
            const matchesSearch = (
              art.elemento.toLowerCase().includes(s) ||
              art.tipo_elemento.toLowerCase().includes(s) ||
              (art.marca && art.marca.toLowerCase().includes(s))
            )
            if (!matchesSearch) return false
          }
          return true
        })
    : []

  const itemsPerPageDetalleArticulo = 5
  const paginatedDetalleArticulos = filteredDetalleArticulos.slice(
    (currentPageDetalleArticulo - 1) * itemsPerPageDetalleArticulo,
    currentPageDetalleArticulo * itemsPerPageDetalleArticulo
  )
  const totalPagesDetalleArticulo = Math.ceil(filteredDetalleArticulos.length / itemsPerPageDetalleArticulo) || 1

  const filteredDetalleUnidades = selectedAlmacenDetalle
    ? unidades
        .filter((u) => u.almacen_id === selectedAlmacenDetalle.id)
        .filter((u) => {
          if (filterDetalleUnidadElemento) {
            const elSearch = filterDetalleUnidadElemento.toLowerCase()
            if (!u.articulo?.elemento?.toLowerCase().includes(elSearch)) {
              return false
            }
          }
          if (filterDetalleUnidadEstado && u.estado !== filterDetalleUnidadEstado) {
            return false
          }
          if (filterDetalleUnidadAsignado) {
            if (filterDetalleUnidadAsignado === "SI" && !u.contrato_actual_id) {
              return false
            }
            if (filterDetalleUnidadAsignado === "NO" && u.contrato_actual_id) {
              return false
            }
          }
          if (searchDetalleUnidad) {
            const s = searchDetalleUnidad.toLowerCase().trim()
            const matchesSearch = (
              (u.serial && u.serial.toLowerCase().includes(s)) ||
              (u.imei2 && u.imei2.toLowerCase().includes(s)) ||
              (u.articulo?.elemento && u.articulo.elemento.toLowerCase().includes(s)) ||
              (u.articulo?.categoria && u.articulo.categoria.toLowerCase().includes(s)) ||
              (u.estado && u.estado.toLowerCase().includes(s)) ||
              (u.resolucion_id && String(u.resolucion_id).includes(s)) ||
              (u.articulo?.resolucion_id && String(u.articulo.resolucion_id).includes(s)) ||
              (getResolucionCodigo(u.resolucion_id).toLowerCase().includes(s)) ||
              (u.articulo && getResolucionCodigo(u.articulo.resolucion_id).toLowerCase().includes(s)) ||
              (u.contrato_actual_id && String(u.contrato_actual_id).includes(s)) ||
              (u.contrato_actual_id && `id contrato: ${u.contrato_actual_id}`.toLowerCase().includes(s)) ||
              ("disponible".includes(s) && (u.estado === "DISPONIBLE" || u.estado === "BUEN_ESTADO" || u.estado === "REGULAR")) ||
              ("asignado a contrato".includes(s) && !!u.contrato_actual_id)
            )
            if (!matchesSearch) return false
          }
          return true
        })
    : []

  const itemsPerPageDetalleUnidad = 5
  const paginatedDetalleUnidades = filteredDetalleUnidades.slice(
    (currentPageDetalleUnidad - 1) * itemsPerPageDetalleUnidad,
    currentPageDetalleUnidad * itemsPerPageDetalleUnidad
  )
  const totalPagesDetalleUnidad = Math.ceil(filteredDetalleUnidades.length / itemsPerPageDetalleUnidad) || 1

  // Filters for tables
  const filteredDashboardArticulos = (dashboard?.articulos || []).filter((art: any) => {
    // Category filter
    if (filterArticuloCategoria && art.categoria !== filterArticuloCategoria) {
      return false
    }
    // Element filter
    if (filterArticuloElemento) {
      const elSearch = filterArticuloElemento.toLowerCase()
      if (!art.elemento.toLowerCase().includes(elSearch)) {
        return false
      }
    }
    // Brand/Model filter
    if (filterArticuloMarcaModelo) {
      const brandModelSearch = filterArticuloMarcaModelo.toLowerCase()
      const brandMatch = art.marca && art.marca.toLowerCase().includes(brandModelSearch)
      const modelMatch = art.modelo && art.modelo.toLowerCase().includes(brandModelSearch)
      if (!brandMatch && !modelMatch) {
        return false
      }
    }
    // Global search
    if (searchArticulo) {
      const s = searchArticulo.toLowerCase()
      const matchesSearch = (
        art.elemento.toLowerCase().includes(s) ||
        art.tipo_elemento.toLowerCase().includes(s) ||
        (art.marca && art.marca.toLowerCase().includes(s))
      )
      if (!matchesSearch) return false
    }
    return true
  })

  const paginatedDashboardArticulos = filteredDashboardArticulos.slice(
    (currentPageArticulo - 1) * itemsPerPageArticulo,
    currentPageArticulo * itemsPerPageArticulo
  )

  const totalPagesArticulo = Math.ceil(filteredDashboardArticulos.length / itemsPerPageArticulo) || 1

  const filteredUnidades = unidades.filter((u) => {
    // Element filter
    if (filterUnidadElemento) {
      const elSearch = filterUnidadElemento.toLowerCase()
      if (!u.articulo?.elemento?.toLowerCase().includes(elSearch)) {
        return false
      }
    }
    // Status filter
    if (filterUnidadEstado && u.estado !== filterUnidadEstado) {
      return false
    }
    // Assigned to contract filter
    if (filterUnidadAsignado) {
      if (filterUnidadAsignado === "SI" && !u.contrato_actual_id) {
        return false
      }
      if (filterUnidadAsignado === "NO" && u.contrato_actual_id) {
        return false
      }
    }
    // Global search
    if (searchUnidad) {
      const s = searchUnidad.toLowerCase().trim()
      const matchesSearch = (
        (u.serial && u.serial.toLowerCase().includes(s)) ||
        (u.imei2 && u.imei2.toLowerCase().includes(s)) ||
        (u.articulo?.elemento && u.articulo.elemento.toLowerCase().includes(s)) ||
        (u.articulo?.categoria && u.articulo.categoria.toLowerCase().includes(s)) ||
        (u.estado && u.estado.toLowerCase().includes(s)) ||
        (u.resolucion_id && String(u.resolucion_id).includes(s)) ||
        (u.articulo?.resolucion_id && String(u.articulo.resolucion_id).includes(s)) ||
        (getResolucionCodigo(u.resolucion_id).toLowerCase().includes(s)) ||
        (u.articulo && getResolucionCodigo(u.articulo.resolucion_id).toLowerCase().includes(s)) ||
        (u.contrato_actual_id && String(u.contrato_actual_id).includes(s)) ||
        (u.contrato_actual_id && `id contrato: ${u.contrato_actual_id}`.toLowerCase().includes(s)) ||
        ("disponible".includes(s) && (u.estado === "DISPONIBLE" || u.estado === "BUEN_ESTADO" || u.estado === "REGULAR")) ||
        ("asignado a contrato".includes(s) && !!u.contrato_actual_id)
      )
      if (!matchesSearch) return false
    }
    return true
  })

  const paginatedUnidades = filteredUnidades.slice(
    (currentPageUnidad - 1) * itemsPerPageUnidad,
    currentPageUnidad * itemsPerPageUnidad
  )

  const totalPagesUnidad = Math.ceil(filteredUnidades.length / itemsPerPageUnidad) || 1

  const filteredAlmacenes = almacenes.filter((alm: Almacen) => {
    const s = searchAlmacen.toLowerCase()
    return (
      alm.nombre.toLowerCase().includes(s) ||
      (alm.ubicacion && alm.ubicacion.toLowerCase().includes(s)) ||
      (alm.responsable && alm.responsable.toLowerCase().includes(s))
    )
  })

  const paginatedAlmacenes = filteredAlmacenes.slice(
    (currentPageAlmacen - 1) * itemsPerPageAlmacen,
    currentPageAlmacen * itemsPerPageAlmacen
  )

  const totalPagesAlmacen = Math.ceil(filteredAlmacenes.length / itemsPerPageAlmacen) || 1

  // Keep filteredContratos for contract selector
  const filteredContratos = contratosActivos.filter((c) => {
    const s = contratoSearch.toLowerCase()
    return (
      c.numero_contrato.toLowerCase().includes(s) ||
      (c.contratista_rel?.nombre && c.contratista_rel.nombre.toLowerCase().includes(s)) ||
      (c.contratista_rel?.identificacion && c.contratista_rel.identificacion.includes(s))
    )
  })

  // Format currency
  const fmtCop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Cargando módulo de inventario...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-7 h-7 text-emerald-600" />
            Gestión de Inventario
          </h1>
          <p className="text-gray-500 mt-1">
            Control de equipos tecnológicos, biomédicos y dotación asignados a contratistas de Equipos Básicos de Salud.
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowAccionesDropdown(!showAccionesDropdown)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-200"
          >
            Acciones
            <ChevronDown className="w-4 h-4" />
          </button>

          {showAccionesDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowAccionesDropdown(false)} 
              />
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-gray-100 shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddArticulo(true)
                    setShowAccionesDropdown(false)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-400" />
                  Nuevo Artículo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUnidad(true)
                    setShowAccionesDropdown(false)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <PlusCircle className="w-4 h-4 text-gray-400" />
                  Registrar Unidad (S/N)
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setShowImportSerializado(true)
                    setImportType("serializado")
                    setSelectedAlmacenUpload("")
                    setShowAccionesDropdown(false)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  Importar Serializados
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportCantidad(true)
                    setImportType("cantidad")
                    setSelectedAlmacenUpload("")
                    setShowAccionesDropdown(false)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  Importar Dotación
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top summary cards */}
      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card Tecnológicos */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipos Tecnológicos</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{dashboard.resumen_tecnologico?.total || 0}</h3>
              <div className="flex gap-2 text-[10px] pt-1 flex-wrap">
                <span className="text-emerald-600 font-medium">{dashboard.resumen_tecnologico?.disponibles || 0} disp.</span>
                <span className="text-blue-600 font-medium">{dashboard.resumen_tecnologico?.entregados || 0} entreg.</span>
                <span className="text-amber-500 font-medium">{dashboard.resumen_tecnologico?.mantenimiento || 0} mant.</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Settings className="w-6 h-6 animate-spin" style={{ animationDuration: "12s" }} />
            </div>
          </div>

          {/* Card Biomédicos */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipos Biomédicos</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{dashboard.resumen_biomedico?.total || 0}</h3>
              <div className="flex gap-2 text-[10px] pt-1 flex-wrap">
                <span className="text-emerald-600 font-medium">{dashboard.resumen_biomedico?.disponibles || 0} disp.</span>
                <span className="text-blue-600 font-medium">{dashboard.resumen_biomedico?.entregados || 0} entreg.</span>
                <span className="text-amber-500 font-medium">{dashboard.resumen_biomedico?.mantenimiento || 0} mant.</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Package className="w-6 h-6" />
            </div>
          </div>

          {/* Card Dotación */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dotación</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{dashboard.resumen_dotacion?.total || 0}</h3>
              <div className="flex gap-3 text-xs pt-1">
                <span className="text-emerald-600 font-medium">{dashboard.resumen_dotacion?.disponibles || 0} en stock</span>
                <span className="text-blue-600 font-medium">{dashboard.resumen_dotacion?.entregados || 0} asignados</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Boxes className="w-6 h-6" />
            </div>
          </div>

          {/* Card Insumos */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Insumos</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{dashboard.resumen_insumo?.total || 0}</h3>
              <div className="flex gap-3 text-xs pt-1">
                <span className="text-emerald-600 font-medium">{dashboard.resumen_insumo?.disponibles || 0} en stock</span>
                <span className="text-blue-600 font-medium">{dashboard.resumen_insumo?.entregados || 0} asignados</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600">
              <Boxes className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Controls */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2.5 font-medium text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === "dashboard"
              ? "border-emerald-600 text-emerald-600 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Disponibilidad General
        </button>
        <button
          onClick={() => setActiveTab("catalogo")}
          className={`px-4 py-2.5 font-medium text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === "catalogo"
              ? "border-emerald-600 text-emerald-600 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Unidades Físicas (Serials)
        </button>
        <button
          onClick={() => setActiveTab("asignar")}
          className={`px-4 py-2.5 font-medium text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === "asignar"
              ? "border-emerald-600 text-emerald-600 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Asignar (Entrega / Devolución)
        </button>
        <button
          onClick={() => setActiveTab("almacenes")}
          className={`px-4 py-2.5 font-medium text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === "almacenes"
              ? "border-emerald-600 text-emerald-600 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Almacenes ({almacenes.length})
        </button>
      </div>
      {/* Tab Contents */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Global Availability Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-900">Estado de Disponibilidad por Elemento</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Control en tiempo real de stocks y asignaciones físicas.</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedArticulos.length > 0 && (
                    <button
                      onClick={handleBulkDeleteArticulos}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-red-100 cursor-pointer animate-pulse"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar Seleccionados ({selectedArticulos.length})
                    </button>
                  )}
                  <button
                    onClick={() => descargarExcelDisponibilidad({
                      categoria: filterArticuloCategoria,
                      elemento: filterArticuloElemento,
                      marca_modelo: filterArticuloMarcaModelo,
                      search: searchArticulo
                    })}
                    className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-emerald-100 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Exportar a Excel
                  </button>
                </div>
              </div>

              {/* Search and Toggle Filter Button Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar elemento..."
                    value={searchArticulo}
                    onChange={(e) => setSearchArticulo(e.target.value)}
                    className="pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={() => setShowArticuloFilters(!showArticuloFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    showArticuloFilters
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filtros Avanzados
                  {(filterArticuloCategoria || filterArticuloElemento || filterArticuloMarcaModelo) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  )}
                </button>
              </div>

              {/* Toggleable Filters grid */}
              {showArticuloFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50/50 border border-gray-100 rounded-xl pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Categoría</label>
                    <select
                      value={filterArticuloCategoria}
                      onChange={(e) => setFilterArticuloCategoria(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Todas</option>
                      <option value="TECNOLOGICO">TECNOLOGICO</option>
                      <option value="BIOMEDICO">BIOMEDICO</option>
                      <option value="DOTACION">DOTACION</option>
                      <option value="INSUMO">INSUMO</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Elemento</label>
                    <input
                      type="text"
                      placeholder="Buscar elemento..."
                      value={filterArticuloElemento}
                      onChange={(e) => setFilterArticuloElemento(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Marca / Modelo</label>
                    <input
                      type="text"
                      placeholder="Buscar marca o modelo..."
                      value={filterArticuloMarcaModelo}
                      onChange={(e) => setFilterArticuloMarcaModelo(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                        checked={
                          paginatedDashboardArticulos.length > 0 &&
                          paginatedDashboardArticulos.every((art: any) => selectedArticulos.includes(art.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newIds = paginatedDashboardArticulos.map((art: any) => art.id)
                            setSelectedArticulos((prev) => Array.from(new Set([...prev, ...newIds])))
                          } else {
                            const pageIds = paginatedDashboardArticulos.map((art: any) => art.id)
                            setSelectedArticulos((prev) => prev.filter((id) => !pageIds.includes(id)))
                          }
                        }}
                      />
                    </th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Elemento</th>
                    <th className="p-4">Marca / Modelo</th>
                    <th className="p-4">Resolución</th>
                    <th className="p-4 text-center">Registrados</th>
                    <th className="p-4 text-center">Disponibles</th>
                    <th className="p-4 text-center">Entregados</th>
                    <th className="p-4 text-center">En Mant. / De Baja</th>
                    <th className="p-4">Estado Stock</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {paginatedDashboardArticulos.map((art: any) => {
                    const percentDisp = art.registrados > 0 ? (art.disponibles / art.registrados) * 100 : 0
                    return (
                      <tr key={art.id} className="hover:bg-gray-50/50">
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                            checked={selectedArticulos.includes(art.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedArticulos((prev) => [...prev, art.id])
                              } else {
                                setSelectedArticulos((prev) => prev.filter((id) => id !== art.id))
                              }
                            }}
                          />
                        </td>
                        <td className="p-4 font-medium">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              art.categoria === "TECNOLOGICO"
                                ? "bg-emerald-50 text-emerald-700"
                                : art.categoria === "BIOMEDICO"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {art.categoria}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-gray-900">{art.elemento}</p>
                          <p className="text-[10px] text-gray-500 uppercase">{art.tipo_elemento}</p>
                        </td>
                        <td className="p-4 text-gray-500 text-xs">
                          {art.marca ? `${art.marca} - ${art.modelo || "N/A"}` : "—"}
                        </td>
                        <td className="p-4 text-gray-600 text-xs font-semibold font-mono">
                          {getResolucionCodigo(art.resolucion_id)}
                        </td>
                        <td className="p-4 text-center font-bold text-gray-600">{(art as any).registrados}</td>
                        <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/10">{art.disponibles}</td>
                        <td className="p-4 text-center font-bold text-blue-600">{art.entregados}</td>
                        <td className="p-4 text-center font-bold text-amber-500">
                          {art.mantenimiento} / {art.baja}
                        </td>
                        <td className="p-4">
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] mb-1 text-gray-500">
                              <span>Disponible</span>
                              <span>{percentDisp.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  percentDisp > 40
                                    ? "bg-emerald-500"
                                    : percentDisp > 10
                                    ? "bg-amber-400"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${percentDisp}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingArticulo({ ...art, stock_total: art.registrados })
                                setShowEditArticulo(true)
                              }}
                              className="p-1 hover:bg-gray-100 rounded text-blue-600 transition-colors"
                              title="Editar artículo"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteArticulo(art.id)}
                              className="p-1 hover:bg-gray-100 rounded text-red-600 transition-colors"
                              title="Eliminar artículo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredDashboardArticulos.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-400">
                        No hay artículos registrados. Suba un archivo Excel o agregue uno manual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Articulos (Disponibilidad General) */}
            <div className="flex items-center justify-between p-4 border-t border-gray-100 text-xs text-gray-500 bg-white">
              <div>
                Mostrando <span className="font-semibold text-gray-700">{filteredDashboardArticulos.length > 0 ? (currentPageArticulo - 1) * itemsPerPageArticulo + 1 : 0}</span> a{" "}
                <span className="font-semibold text-gray-700">{Math.min(currentPageArticulo * itemsPerPageArticulo, filteredDashboardArticulos.length)}</span> de{" "}
                <span className="font-semibold text-gray-700">{filteredDashboardArticulos.length}</span> elementos
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPageArticulo(Math.max(1, currentPageArticulo - 1))}
                  disabled={currentPageArticulo === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all font-medium flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <span className="font-medium text-gray-700">Página {currentPageArticulo} de {totalPagesArticulo}</span>
                <button
                  onClick={() => setCurrentPageArticulo(Math.min(totalPagesArticulo, currentPageArticulo + 1))}
                  disabled={currentPageArticulo === totalPagesArticulo}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all font-medium flex items-center gap-1"
                >
                  Siguiente <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "catalogo" && (
        <div className="space-y-6">
          {/* Physical Units list - Full Width */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col w-full">
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-900">Unidades Físicas (Serials)</h3>
                  <p className="text-xs text-gray-500">Equipos serializados registrados en el sistema.</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedUnidades.length > 0 && (
                    <button
                      onClick={handleBulkDeleteUnidades}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-red-100 cursor-pointer animate-pulse"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar Seleccionados ({selectedUnidades.length})
                    </button>
                  )}
                  <button
                    onClick={() => descargarExcelUnidades({
                      elemento: filterUnidadElemento,
                      estado: filterUnidadEstado,
                      asignado_a_contrato: filterUnidadAsignado,
                      search: searchUnidad
                    })}
                    className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-emerald-100 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Exportar a Excel
                  </button>
                </div>
              </div>

              {/* Search and Toggle Filter Button Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar por S/N..."
                    value={searchUnidad}
                    onChange={(e) => setSearchUnidad(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={() => setShowUnidadFilters(!showUnidadFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    showUnidadFilters
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filtros Avanzados
                  {(filterUnidadElemento || filterUnidadEstado || filterUnidadAsignado) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  )}
                </button>
              </div>

              {/* Toggleable Filters grid */}
              {showUnidadFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50/50 border border-gray-100 rounded-xl pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Elemento</label>
                    <input
                      type="text"
                      placeholder="Buscar elemento..."
                      value={filterUnidadElemento}
                      onChange={(e) => setFilterUnidadElemento(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Estado</label>
                    <select
                      value={filterUnidadEstado}
                      onChange={(e) => setFilterUnidadEstado(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Todos</option>
                      <option value="DISPONIBLE">DISPONIBLE</option>
                      <option value="BUEN_ESTADO">BUEN ESTADO</option>
                      <option value="REGULAR">REGULAR</option>
                      <option value="ENTREGADO">ENTREGADO</option>
                      <option value="EN_MANTENIMIENTO">EN_MANTENIMIENTO</option>
                      <option value="DANADO">DAÑADO</option>
                      <option value="DE_BAJA">DE_BAJA</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Asignado a Contrato</label>
                    <select
                      value={filterUnidadAsignado}
                      onChange={(e) => setFilterUnidadAsignado(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Todos</option>
                      <option value="SI">Asignados</option>
                      <option value="NO">No asignados</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] flex-1">
              <table className="w-full text-left text-xs min-w-full">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                        checked={
                          paginatedUnidades.length > 0 &&
                          paginatedUnidades.every((u: any) => selectedUnidades.includes(u.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newIds = paginatedUnidades.map((u: any) => u.id)
                            setSelectedUnidades((prev) => Array.from(new Set([...prev, ...newIds])))
                          } else {
                            const pageIds = paginatedUnidades.map((u: any) => u.id)
                            setSelectedUnidades((prev) => prev.filter((id) => !pageIds.includes(id)))
                          }
                        }}
                      />
                    </th>
                    <th className="p-3">Elemento</th>
                    <th className="p-3">S/N / IMEI 1</th>
                    <th className="p-3">IMEI 2</th>
                    <th className="p-3">Resolución</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Asignado a Contrato</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-600">
                  {paginatedUnidades.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                          checked={selectedUnidades.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUnidades((prev) => [...prev, u.id])
                            } else {
                              setSelectedUnidades((prev) => prev.filter((id) => id !== u.id))
                            }
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-gray-800">{u.articulo?.elemento}</p>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider">{u.articulo?.categoria}</p>
                      </td>
                      <td className="p-3 font-mono font-bold text-gray-800">{u.serial || "—"}</td>
                      <td className="p-3 font-mono text-gray-500">{u.imei2 || "N/A"}</td>
                      <td className="p-3 font-semibold text-gray-700 font-mono text-[10px]">
                        {getResolucionCodigo(u.resolucion_id)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all ${
                            u.estado === "DISPONIBLE" || u.estado === "BUEN_ESTADO"
                              ? "bg-emerald-50 text-emerald-700"
                              : u.estado === "REGULAR"
                              ? "bg-yellow-50 text-yellow-700 border border-yellow-150"
                              : u.estado === "ENTREGADO"
                              ? "bg-blue-50 text-blue-700"
                              : u.estado === "EN_MANTENIMIENTO" || u.estado === "DANADO"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {u.estado === "BUEN_ESTADO" ? "BUEN ESTADO" : u.estado === "DANADO" ? "DAÑADO" : u.estado}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">
                        {u.contratista_nombre ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wide">
                            {u.contratista_nombre}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {(u.estado === "DISPONIBLE" || u.estado === "BUEN_ESTADO" || u.estado === "REGULAR") && (
                            <button
                              onClick={() => handleAssignUnit(u)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded font-bold text-[9px] transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                              title="Asignar a Contrato"
                            >
                              <Plus className="w-3 h-3" /> Asignar
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingUnidad({ ...u })
                              setShowEditUnidad(true)
                            }}
                            className="p-1 hover:bg-gray-100 rounded text-blue-600 transition-colors cursor-pointer"
                            title="Editar unidad"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUnidad(u.id)}
                            className="p-1 hover:bg-gray-100 rounded text-red-600 transition-colors cursor-pointer"
                            title="Eliminar unidad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUnidades.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        No hay unidades físicas registradas o coincidentes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Unidades */}
            <div className="flex items-center justify-between p-4 border-t border-gray-100 text-xs text-gray-500 bg-white">
              <div>
                Mostrando <span className="font-semibold text-gray-700">{filteredUnidades.length > 0 ? (currentPageUnidad - 1) * itemsPerPageUnidad + 1 : 0}</span> a{" "}
                <span className="font-semibold text-gray-700">{Math.min(currentPageUnidad * itemsPerPageUnidad, filteredUnidades.length)}</span> de{" "}
                <span className="font-semibold text-gray-700">{filteredUnidades.length}</span> elementos
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPageUnidad(Math.max(1, currentPageUnidad - 1))}
                  disabled={currentPageUnidad === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all font-medium flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <span className="font-medium text-gray-700">Página {currentPageUnidad} de {totalPagesUnidad}</span>
                <button
                  onClick={() => setCurrentPageUnidad(Math.min(totalPagesUnidad, currentPageUnidad + 1))}
                  disabled={currentPageUnidad === totalPagesUnidad}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all font-medium flex items-center gap-1"
                >
                  Siguiente <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "asignar" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Select Contract and Mode */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 flex flex-col self-start">
            <h3 className="font-bold text-gray-900 text-base">Configuración de Transacción</h3>
            
            {/* Search contract */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">1. Seleccionar Contrato Activo</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por contratista, cédula o N°..."
                  value={contratoSearch}
                  onChange={(e) => {
                    setContratoSearch(e.target.value)
                    setSelectedContratoId("")
                  }}
                  className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {contratoSearch && !selectedContratoId && (
                <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-lg mt-1 bg-white divide-y divide-gray-50 shadow-lg absolute z-10 w-[280px]">
                  {filteredContratos.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedContratoId(c.id)
                        setContratoSearch(`${c.numero_contrato} - ${c.contratista_rel?.nombre}`)
                      }}
                      className="w-full text-left p-2.5 text-xs hover:bg-gray-50 transition-colors flex flex-col"
                    >
                      <span className="font-semibold text-gray-900">{c.numero_contrato}</span>
                      <span className="text-gray-500">{c.contratista_rel?.nombre} (CC: {c.contratista_rel?.identificacion})</span>
                    </button>
                  ))}
                  {filteredContratos.length === 0 && (
                    <div className="p-3 text-center text-xs text-gray-400">No hay contratos activos coincidentes</div>
                  )}
                </div>
              )}
            </div>

            {/* Operation Type Switch */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase">2. Tipo de Movimiento</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setOperationType("ENTREGA")}
                  className={`py-2 text-xs font-semibold rounded-md transition-all ${
                    operationType === "ENTREGA"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Entregar Inventario
                </button>
                <button
                  type="button"
                  onClick={() => setOperationType("DEVOLUCION")}
                  className={`py-2 text-xs font-semibold rounded-md transition-all ${
                    operationType === "DEVOLUCION"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Devolución
                </button>
              </div>
            </div>

            {/* Common Header Inputs */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Fecha del Acta</label>
                <input
                  type="date"
                  value={fechaOperacion}
                  onChange={(e) => setFechaOperacion(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Responsable E.S.E. (Entrega/Recibe)</label>
                <input
                  type="text"
                  value={user ? (user.nombre_completo || user.username) : "Cargando..."}
                  className="px-3 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg w-full cursor-not-allowed focus:outline-none"
                  readOnly
                  disabled
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Funcionario / Contratista</label>
                <input
                  type="text"
                  value={recibidoPor}
                  onChange={(e) => setRecibidoPor(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg w-full cursor-not-allowed focus:outline-none"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Action workspace */}
          <div className="lg:col-span-2 space-y-6">
            {selectedContratoId ? (
              loadingContratoDetalle ? (
                <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-4">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Cargando inventario actual del contrato...</p>
                </div>
              ) : (
                <>
                  {/* Contrato Info Card */}
                  {contratoDetalle && (
                    <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 flex flex-col md:flex-row justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-emerald-800 text-sm">{contratoDetalle.contratista}</h4>
                        <p className="text-xs text-emerald-700 mt-0.5">Contrato: {contratoDetalle.numero_contrato}</p>
                      </div>
                      <div className="text-xs text-emerald-700 flex gap-4 md:self-center">
                        <div>
                          <span className="font-semibold">{contratoDetalle.equipos_asignados?.length || 0}</span> Equipos Serializados
                        </div>
                        <div>
                          <span className="font-semibold">{contratoDetalle.dotaciones_asignadas?.length || 0}</span> Insumos/Dotación
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Operation Workspace: ENTREGA */}
                  {operationType === "ENTREGA" && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                      <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 text-sm">Carrito de Entrega</h3>
                        <p className="text-xs text-gray-500">Agregue elementos para generar las actas.</p>
                      </div>

                      {/* Add Item form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                        {/* 1. Almacén Selector */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">1. Almacén de Salida</label>
                          <select
                            value={cartAlmacenId}
                            onChange={(e) => {
                              setCartAlmacenId(e.target.value ? Number(e.target.value) : "")
                              // Reset subsequent steps
                              setCartCategoria("")
                              setCartArticuloId("")
                              setCartUnidadId("")
                              setArticuloSearchQuery("")
                            }}
                            className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                          >
                            <option value="">-- Seleccionar Almacén --</option>
                            {almacenes.map((a) => (
                              <option key={a.id} value={a.id}>
                                🏬 {a.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Categoría Selector */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">2. Categoría</label>
                          <select
                            value={cartCategoria}
                            disabled={!cartAlmacenId}
                            onChange={(e) => {
                              setCartCategoria(e.target.value)
                              setCartArticuloId("")
                              setCartUnidadId("")
                              setArticuloSearchQuery("")
                            }}
                            className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                          >
                            <option value="">-- Seleccionar Categoría --</option>
                            <option value="TECNOLOGICO">💻 Tecnológico</option>
                            <option value="BIOMEDICO">🩺 Biomédico</option>
                            <option value="DOTACION">📦 Dotación</option>
                            <option value="INSUMO">🧪 Insumo</option>
                          </select>
                        </div>

                        {/* 3. Artículo Autocomplete Selector */}
                        <div className="space-y-1 relative">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">
                            3. Buscar Artículo / Elemento
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder={
                                !cartAlmacenId
                                  ? "Seleccione almacén primero..."
                                  : !cartCategoria
                                  ? "Seleccione categoría primero..."
                                  : "Buscar por nombre, marca, S/N, modelo..."
                              }
                              disabled={!cartAlmacenId || !cartCategoria}
                              value={articuloSearchQuery}
                              onChange={(e) => {
                                setArticuloSearchQuery(e.target.value)
                                setShowArticuloSuggestions(true)
                                if (!e.target.value) {
                                  setCartArticuloId("")
                                  setCartUnidadId("")
                                }
                              }}
                              onFocus={() => {
                                if (cartAlmacenId && cartCategoria) setShowArticuloSuggestions(true)
                              }}
                              className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8 font-medium"
                            />
                            {cartArticuloId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCartArticuloId("")
                                  setCartUnidadId("")
                                  setArticuloSearchQuery("")
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold"
                              >
                                &times;
                              </button>
                            )}
                          </div>

                          {showArticuloSuggestions && cartAlmacenId && cartCategoria && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowArticuloSuggestions(false)}
                              />
                              <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-20 divide-y divide-gray-100">
                                {/* Group 1: Serialized Physical Units matching query */}
                                {(cartCategoria === "TECNOLOGICO" || cartCategoria === "BIOMEDICO") &&
                                  unidades.filter(
                                    (u) =>
                                      u.almacen_id === Number(cartAlmacenId) &&
                                      u.estado === "DISPONIBLE" &&
                                      (u.articulo?.categoria === cartCategoria ||
                                        (cartCategoria === "TECNOLOGICO" && u.articulo?.categoria?.includes("TECNOLOGICO")) ||
                                        (cartCategoria === "BIOMEDICO" && u.articulo?.categoria?.includes("BIOMEDICO"))) &&
                                      articuloSearchQuery &&
                                      (u.serial?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                        u.imei2?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                        u.articulo?.elemento?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                        u.articulo?.marca?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                        u.articulo?.modelo?.toLowerCase().includes(articuloSearchQuery.toLowerCase()))
                                  ).length > 0 && (
                                    <div className="bg-blue-50/10">
                                      <div className="px-3 py-1 text-[9px] font-bold text-blue-500 uppercase bg-blue-50/30">
                                        Unidades Disponibles (Por Serial/S/N)
                                      </div>
                                      {unidades
                                        .filter(
                                          (u) =>
                                            u.almacen_id === Number(cartAlmacenId) &&
                                            u.estado === "DISPONIBLE" &&
                                            (u.articulo?.categoria === cartCategoria ||
                                              (cartCategoria === "TECNOLOGICO" && u.articulo?.categoria?.includes("TECNOLOGICO")) ||
                                              (cartCategoria === "BIOMEDICO" && u.articulo?.categoria?.includes("BIOMEDICO"))) &&
                                            articuloSearchQuery &&
                                            (u.serial?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                              u.imei2?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                              u.articulo?.elemento?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                              u.articulo?.marca?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                              u.articulo?.modelo?.toLowerCase().includes(articuloSearchQuery.toLowerCase()))
                                        )
                                        .map((u) => (
                                          <button
                                            key={`unit-${u.id}`}
                                            type="button"
                                            onClick={() => {
                                              setCartArticuloId(u.articulo_id)
                                              setCartUnidadId(u.id)
                                              setArticuloSearchQuery(`${u.articulo?.elemento} - S/N: ${u.serial}`)
                                              setShowArticuloSuggestions(false)
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex flex-col border-b border-gray-50"
                                          >
                                            <span className="font-semibold text-blue-800">📟 S/N: {u.serial}</span>
                                            <span className="text-[10px] text-gray-500">
                                              {u.articulo?.elemento} | Marca: {u.articulo?.marca || "N/A"} | Modelo: {u.articulo?.modelo || "N/A"}
                                            </span>
                                          </button>
                                        ))}
                                    </div>
                                  )}

                                {/* Group 2: Catalog Articles */}
                                {articulos.filter(
                                  (a) =>
                                    a.almacen_id === Number(cartAlmacenId) &&
                                    a.categoria === cartCategoria &&
                                    (!articuloSearchQuery ||
                                      a.elemento?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                      a.marca?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                      a.modelo?.toLowerCase().includes(articuloSearchQuery.toLowerCase()))
                                ).length > 0 && (
                                  <div>
                                    <div className="px-3 py-1 text-[9px] font-bold text-gray-400 uppercase bg-gray-50/50">
                                      Catálogo de Artículos
                                    </div>
                                    {articulos
                                      .filter(
                                        (a) =>
                                          a.almacen_id === Number(cartAlmacenId) &&
                                          a.categoria === cartCategoria &&
                                          (!articuloSearchQuery ||
                                            a.elemento?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                            a.marca?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                            a.modelo?.toLowerCase().includes(articuloSearchQuery.toLowerCase()))
                                      )
                                      .map((a) => (
                                        <button
                                          key={`art-${a.id}`}
                                          type="button"
                                          onClick={() => {
                                            setCartArticuloId(a.id)
                                            setCartUnidadId("")
                                            setArticuloSearchQuery(`${a.elemento} (${a.categoria})`)
                                            setShowArticuloSuggestions(false)
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex flex-col border-b border-gray-50"
                                        >
                                          <span className="font-semibold text-gray-800">{a.elemento}</span>
                                          <span className="text-[10px] text-gray-500">
                                            Marca: {a.marca || "N/A"} | Modelo: {a.modelo || "N/A"} | Stock Disp: {a.stock_disponible} ud
                                          </span>
                                        </button>
                                      ))}
                                  </div>
                                )}

                                {/* Fallback when no matches */}
                                {articulos.filter(
                                  (a) =>
                                    a.almacen_id === Number(cartAlmacenId) &&
                                    a.categoria === cartCategoria &&
                                    (!articuloSearchQuery ||
                                      a.elemento?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                      a.marca?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                      a.modelo?.toLowerCase().includes(articuloSearchQuery.toLowerCase()))
                                ).length === 0 &&
                                  (!articuloSearchQuery ||
                                    unidades.filter(
                                      (u) =>
                                        u.almacen_id === Number(cartAlmacenId) &&
                                        u.estado === "DISPONIBLE" &&
                                        (u.articulo?.categoria === cartCategoria ||
                                          (cartCategoria === "TECNOLOGICO" && u.articulo?.categoria?.includes("TECNOLOGICO")) ||
                                          (cartCategoria === "BIOMEDICO" && u.articulo?.categoria?.includes("BIOMEDICO"))) &&
                                        (u.serial?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                          u.imei2?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                          u.articulo?.elemento?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                          u.articulo?.marca?.toLowerCase().includes(articuloSearchQuery.toLowerCase()) ||
                                          u.articulo?.modelo?.toLowerCase().includes(articuloSearchQuery.toLowerCase()))
                                    ).length === 0) && (
                                    <div className="p-3 text-center text-xs text-gray-400">
                                      No se encontraron artículos o seriales en este almacén
                                    </div>
                                  )}
                              </div>
                            </>
                          )}
                        </div>

                        {cartArticuloId &&
                          articulos.find((a) => a.id === Number(cartArticuloId))?.requiere_serial && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Unidad Física (S/N)</label>
                              <select
                                value={cartUnidadId}
                                onChange={(e) => setCartUnidadId(e.target.value ? Number(e.target.value) : "")}
                                className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">-- Seleccionar Serial --</option>
                                {disponiblesParaCart.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.serial} {u.imei2 ? `(IMEI2: ${u.imei2})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                        {cartArticuloId &&
                          !articulos.find((a) => a.id === Number(cartArticuloId))?.requiere_serial && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Cantidad a Entregar</label>
                              <input
                                type="number"
                                min={1}
                                value={cartCantidad}
                                onChange={(e) => setCartCantidad(Number(e.target.value))}
                                className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          )}

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Estado al Entregar</label>
                          <input
                            type="text"
                            value={cartEstado}
                            onChange={(e) => setCartEstado(e.target.value)}
                            className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Observaciones</label>
                          <input
                            type="text"
                            placeholder="Accesorios, bolsos, cargadores..."
                            value={cartObs}
                            onChange={(e) => setCartObs(e.target.value)}
                            className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="flex items-end md:col-span-2 lg:col-span-1">
                          <button
                            type="button"
                            onClick={addToEntregaCart}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg transition-all"
                          >
                            Agregar al Carrito
                          </button>
                        </div>
                      </div>

                      {/* Cart Table list */}
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                            <tr>
                              <th className="p-3">Categoría</th>
                              <th className="p-3">Elemento</th>
                              <th className="p-3">S/N / Cantidad</th>
                              <th className="p-3">Estado Asignado</th>
                              <th className="p-3 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-600">
                            {entregaCart.map((i, index) => (
                              <tr key={index} className="hover:bg-gray-50/50">
                                <td className="p-3 font-semibold">{i.categoria}</td>
                                <td className="p-3">
                                  <p className="font-semibold text-gray-800">{i.elemento}</p>
                                  {i.observaciones && <p className="text-[10px] text-gray-400">{i.observaciones}</p>}
                                </td>
                                <td className="p-3 font-mono font-bold">
                                  {i.requiere_serial ? i.serial : `Cant: ${i.cantidad}`}
                                </td>
                                <td className="p-3 text-gray-500">{i.estado_declarado}</td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => removeFromEntregaCart(index)}
                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {entregaCart.length === 0 && (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400">
                                  El carrito está vacío. Agregue elementos arriba.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Action trigger */}
                      {entregaCart.length > 0 && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={submitEntrega}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-md shadow-emerald-100 flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Confirmar Entrega y Generar Actas (.docx)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Operation Workspace: DEVOLUCION */}
                  {operationType === "DEVOLUCION" && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                      <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 text-sm">Registrar Devolución de Inventario</h3>
                        <p className="text-xs text-gray-500">Seleccione los elementos que el contratista está devolviendo.</p>
                      </div>

                      {/* Assigned Equipment List */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Elementos Actualmente Asignados</h4>
                        
                        {/* Serialized elements */}
                        {contratoDetalle?.equipos_asignados?.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-[10px] font-bold text-gray-400 uppercase">Equipos Serializados</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {contratoDetalle.equipos_asignados.map((eq: any) => {
                                const isSelected = devolucionesCart.some((d) => d.unidad_id === eq.id)
                                const cartIdx = devolucionesCart.findIndex((d) => d.unidad_id === eq.id)
                                return (
                                  <div
                                    key={eq.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                      isSelected
                                        ? "border-blue-400 bg-blue-50/20 shadow-sm"
                                        : "border-gray-100 hover:border-gray-200"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleDevolucionItem(eq, "SERIAL")}
                                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                          <p className="font-bold text-xs text-gray-800">{eq.elemento}</p>
                                          <p className="font-mono text-[10px] text-gray-500 mt-0.5">S/N: {eq.serial}</p>
                                        </div>
                                      </div>
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-100 text-blue-800">
                                        {eq.categoria}
                                      </span>
                                    </div>
                                    
                                    {isSelected && cartIdx !== -1 && (
                                      <div className="mt-3 space-y-2 border-t pt-2 border-blue-100/50">
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-gray-500 uppercase">Estado al Recibir</label>
                                          <input
                                            type="text"
                                            value={devolucionesCart[cartIdx].estado_declarado}
                                            onChange={(e) => updateDevolucionCartItem(cartIdx, "estado_declarado", e.target.value)}
                                            placeholder="Excelente, Con rayones, etc."
                                            className="px-2 py-1 text-[10px] bg-white border border-gray-200 rounded w-full focus:outline-none"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-gray-500 uppercase">Novedad / Observaciones</label>
                                          <input
                                            type="text"
                                            value={devolucionesCart[cartIdx].observaciones}
                                            onChange={(e) => updateDevolucionCartItem(cartIdx, "observaciones", e.target.value)}
                                            placeholder="Detalles sobre daños, piezas faltantes..."
                                            className="px-2 py-1 text-[10px] bg-white border border-gray-200 rounded w-full focus:outline-none"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Dotacion elements */}
                        {contratoDetalle?.dotaciones_asignadas?.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-[10px] font-bold text-gray-400 uppercase">Dotación / Insumos</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {contratoDetalle.dotaciones_asignadas.map((dot: any) => {
                                const isSelected = devolucionesCart.some((d) => d.articulo_id === dot.articulo_id)
                                const cartIdx = devolucionesCart.findIndex((d) => d.articulo_id === dot.articulo_id)
                                return (
                                  <div
                                    key={dot.articulo_id}
                                    className={`p-4 rounded-xl border transition-all ${
                                      isSelected
                                        ? "border-blue-400 bg-blue-50/20 shadow-sm"
                                        : "border-gray-100 hover:border-gray-200"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleDevolucionItem(dot, "DOTACION")}
                                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                          <p className="font-bold text-xs text-gray-800">{dot.elemento}</p>
                                          <p className="text-[10px] text-gray-500 mt-0.5">Asignados: {dot.cantidad_neta} unidades</p>
                                        </div>
                                      </div>
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-100 text-purple-800">
                                        {dot.categoria}
                                      </span>
                                    </div>
                                    
                                    {isSelected && cartIdx !== -1 && (
                                      <div className="mt-3 space-y-2 border-t pt-2 border-blue-100/50">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase">Cant. a Devolver</label>
                                            <input
                                              type="number"
                                              min={1}
                                              max={dot.cantidad_neta}
                                              value={devolucionesCart[cartIdx].cantidad}
                                              onChange={(e) => updateDevolucionCartItem(cartIdx, "cantidad", Number(e.target.value))}
                                              className="px-2 py-1 text-[10px] bg-white border border-gray-200 rounded w-full focus:outline-none"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase">¿Reutilizable?</label>
                                            <select
                                              value={devolucionesCart[cartIdx].reutilizable ? "SI" : "NO"}
                                              onChange={(e) => updateDevolucionCartItem(cartIdx, "reutilizable", e.target.value === "SI")}
                                              className="px-2 py-1 text-[10px] bg-white border border-gray-200 rounded w-full focus:outline-none"
                                            >
                                              <option value="SI">SI (Reingresa stock)</option>
                                              <option value="NO">NO (Baja definitiva)</option>
                                            </select>
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-gray-500 uppercase">Estado al Recibir</label>
                                          <input
                                            type="text"
                                            value={devolucionesCart[cartIdx].estado_declarado}
                                            onChange={(e) => updateDevolucionCartItem(cartIdx, "estado_declarado", e.target.value)}
                                            className="px-2 py-1 text-[10px] bg-white border border-gray-200 rounded w-full focus:outline-none"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {(!contratoDetalle?.equipos_asignados || contratoDetalle.equipos_asignados.length === 0) &&
                          (!contratoDetalle?.dotaciones_asignadas || contratoDetalle.dotaciones_asignadas.length === 0) && (
                            <div className="p-8 text-center bg-gray-50 rounded-xl text-gray-400 text-xs">
                              Este contratista no tiene ningún inventario asignado en este momento.
                            </div>
                          )}
                      </div>

                      {/* Action trigger */}
                      {devolucionesCart.length > 0 && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={submitDevolucion}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-md shadow-blue-100 flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Confirmar Devolución y Generar Actas (.docx)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contract acts history */}
                  {contratoDetalle?.actas?.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                      <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        Historial de Actas del Contrato ({contratoDetalle.actas.length})
                      </h4>
                      <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                        {contratoDetalle.actas.map((a: any) => (
                          <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-semibold text-gray-800">
                                Acta de {a.tipo} - {a.categoria}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">Fecha: {a.fecha} | ESE: {a.recibido_entregado_por || "Coordinador"}</p>
                            </div>
                            <button
                              onClick={() => descargarActaDocx(a.id)}
                              className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-semibold transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Descargar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                <User className="w-12 h-12 text-gray-300" />
                <h4 className="font-bold text-gray-900 text-sm">Seleccione un contrato para iniciar</h4>
                <p className="text-xs text-gray-400 max-w-sm">
                  Busque y seleccione un contrato activo a la izquierda para empezar a entregar o recibir devoluciones de inventario.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "almacenes" && (
        <div className="space-y-6">
          {/* Header & Search */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900">Almacenes Registrados</h3>
              <p className="text-xs text-gray-500 mt-0.5">Gestión y control de bodegas físicas de inventario.</p>
            </div>
            <div className="relative max-w-xs w-full md:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar almacén..."
                value={searchAlmacen}
                onChange={(e) => setSearchAlmacen(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAlmacenes.map((alm: Almacen) => (
              <div
                key={alm.id}
                onClick={() => {
                  setSelectedAlmacenDetalle(alm)
                  setAlmacenDetalleTab("stock")
                }}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 hover:shadow-md hover:border-emerald-100 hover:bg-emerald-50/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-base flex items-center gap-2 group-hover:text-emerald-700 transition-colors">
                    <Building className="w-5 h-5 text-emerald-600" />
                    {alm.nombre}
                  </h4>
                  <span className="text-[10px] font-bold text-gray-400">ID: {alm.id}</span>
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ubicación:</span>
                    <span className="font-medium">{alm.ubicacion || "No especificada"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Responsable:</span>
                    <span className="font-medium">{alm.responsable || "Sin asignar"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Creado el:</span>
                    <span>{new Date(alm.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedAlmacenDetalle(alm)
                      setAlmacenDetalleTab("stock")
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    title="Ver Inventario y Stock"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingAlmacen(alm)
                      setShowEditAlmacen(true)
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    title="Editar Almacén"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteAlmacen(alm.id)
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    title="Eliminar Almacén"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {/* Add warehouse card trigger */}
            <button
              onClick={() => setShowAddAlmacen(true)}
              className="p-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/10 transition-all flex flex-col items-center justify-center text-center space-y-2 text-gray-400 hover:text-emerald-700 min-h-[160px]"
            >
              <Plus className="w-8 h-8" />
              <span className="font-bold text-sm">Agregar Almacén</span>
            </button>
          </div>

          {/* Pagination for Almacenes */}
          <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl text-xs text-gray-500 bg-white shadow-sm">
            <div>
              Mostrando <span className="font-semibold text-gray-700">{filteredAlmacenes.length > 0 ? (currentPageAlmacen - 1) * itemsPerPageAlmacen + 1 : 0}</span> a{" "}
              <span className="font-semibold text-gray-700">{Math.min(currentPageAlmacen * itemsPerPageAlmacen, filteredAlmacenes.length)}</span> de{" "}
              <span className="font-semibold text-gray-700">{filteredAlmacenes.length}</span> almacenes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPageAlmacen(Math.max(1, currentPageAlmacen - 1))}
                disabled={currentPageAlmacen === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all font-medium flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <span className="font-medium text-gray-700">Página {currentPageAlmacen} de {totalPagesAlmacen}</span>
              <button
                onClick={() => setCurrentPageAlmacen(Math.min(totalPagesAlmacen, currentPageAlmacen + 1))}
                disabled={currentPageAlmacen === totalPagesAlmacen}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all font-medium flex items-center gap-1"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FORMS MODALS --- */}
      {/* 1. Modal Add Almacén */}
      {showAddAlmacen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateAlmacen} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Crear Almacén</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Nombre del Almacén *</label>
                <input
                  type="text"
                  required
                  value={newAlmacen.nombre}
                  onChange={(e) => setNewAlmacen({ ...newAlmacen, nombre: e.target.value })}
                  placeholder="Ej. Almacén Central de Sistemas"
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Ubicación</label>
                <input
                  type="text"
                  value={newAlmacen.ubicacion}
                  onChange={(e) => setNewAlmacen({ ...newAlmacen, ubicacion: e.target.value })}
                  placeholder="Ej. Sede Administrativa Villa Rica"
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Responsable / Encargado</label>
                <input
                  type="text"
                  value={newAlmacen.responsable}
                  onChange={(e) => setNewAlmacen({ ...newAlmacen, responsable: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowAddAlmacen(false)}
                className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold">
                Guardar Almacén
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Edit Almacén */}
      {showEditAlmacen && editingAlmacen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateAlmacen} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Editar Almacén</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Nombre del Almacén *</label>
                <input
                  type="text"
                  required
                  value={editingAlmacen.nombre}
                  onChange={(e) => setEditingAlmacen({ ...editingAlmacen, nombre: e.target.value })}
                  placeholder="Ej. Almacén Central de Sistemas"
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Ubicación</label>
                <input
                  type="text"
                  value={editingAlmacen.ubicacion || ""}
                  onChange={(e) => setEditingAlmacen({ ...editingAlmacen, ubicacion: e.target.value })}
                  placeholder="Ej. Sede Administrativa Villa Rica"
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Responsable / Encargado</label>
                <input
                  type="text"
                  value={editingAlmacen.responsable || ""}
                  onChange={(e) => setEditingAlmacen({ ...editingAlmacen, responsable: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowEditAlmacen(false)
                  setEditingAlmacen(null)
                }}
                className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold">
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Detalle Almacén */}
      {selectedAlmacenDetalle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl">
                  <Building className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    Contenido del Almacén: {selectedAlmacenDetalle.nombre}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ubicación: <span className="font-semibold text-gray-700">{selectedAlmacenDetalle.ubicacion || "No especificada"}</span> | Responsable: <span className="font-semibold text-gray-700">{selectedAlmacenDetalle.responsable || "Sin asignar"}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlmacenDetalle(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Inner Sub-Tabs */}
            <div className="flex border-b border-gray-100 text-xs font-semibold gap-4">
              <button
                onClick={() => setAlmacenDetalleTab("stock")}
                className={`pb-2.5 transition-all border-b-2 -mb-[1px] cursor-pointer ${
                  almacenDetalleTab === "stock"
                    ? "border-emerald-600 text-emerald-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Stock de Artículos / Insumos
              </button>
              <button
                onClick={() => setAlmacenDetalleTab("serials")}
                className={`pb-2.5 transition-all border-b-2 -mb-[1px] cursor-pointer ${
                  almacenDetalleTab === "serials"
                    ? "border-emerald-600 text-emerald-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Unidades Físicas (Seriales)
              </button>
            </div>

            {/* Toolbars (Search, Filters, Export) */}
            {almacenDetalleTab === "stock" ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar artículo..."
                      value={searchDetalleArticulo}
                      onChange={(e) => setSearchDetalleArticulo(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setShowDetalleArticuloFilters(!showDetalleArticuloFilters)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        showDetalleArticuloFilters
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Filtros
                      {(filterDetalleArticuloCategoria || filterDetalleArticuloElemento || filterDetalleArticuloMarcaModelo) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        descargarExcelDisponibilidad({
                          almacen_id: selectedAlmacenDetalle.id,
                          categoria: filterDetalleArticuloCategoria,
                          elemento: filterDetalleArticuloElemento,
                          marca_modelo: filterDetalleArticuloMarcaModelo,
                          search: searchDetalleArticulo,
                        })
                      }
                      className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-emerald-100 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Exportar a Excel
                    </button>
                  </div>
                </div>

                {/* Collapsible filters */}
                {showDetalleArticuloFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 border border-gray-150 rounded-xl pt-2 animate-in fade-in slide-in-from-top-1 duration-200 text-[11px] text-gray-600">
                    <div className="space-y-1">
                      <label className="font-bold text-gray-500 uppercase">Categoría</label>
                      <select
                        value={filterDetalleArticuloCategoria}
                        onChange={(e) => setFilterDetalleArticuloCategoria(e.target.value)}
                        className="px-2 py-1 bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Todas</option>
                        <option value="TECNOLOGICO">TECNOLOGICO</option>
                        <option value="BIOMEDICO">BIOMEDICO</option>
                        <option value="DOTACION">DOTACION</option>
                        <option value="INSUMO">INSUMO</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-gray-500 uppercase">Elemento</label>
                      <input
                        type="text"
                        placeholder="Buscar por elemento..."
                        value={filterDetalleArticuloElemento}
                        onChange={(e) => setFilterDetalleArticuloElemento(e.target.value)}
                        className="px-2 py-1 bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-gray-500 uppercase">Marca / Modelo</label>
                      <input
                        type="text"
                        placeholder="Buscar marca o modelo..."
                        value={filterDetalleArticuloMarcaModelo}
                        onChange={(e) => setFilterDetalleArticuloMarcaModelo(e.target.value)}
                        className="px-2 py-1 bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por serial o elemento..."
                      value={searchDetalleUnidad}
                      onChange={(e) => setSearchDetalleUnidad(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setShowDetalleUnidadFilters(!showDetalleUnidadFilters)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        showDetalleUnidadFilters
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Filtros
                      {(filterDetalleUnidadElemento || filterDetalleUnidadEstado || filterDetalleUnidadAsignado) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        descargarExcelUnidades({
                          almacen_id: selectedAlmacenDetalle.id,
                          elemento: filterDetalleUnidadElemento,
                          estado: filterDetalleUnidadEstado,
                          asignado_a_contrato: filterDetalleUnidadAsignado,
                          search: searchDetalleUnidad,
                        })
                      }
                      className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-emerald-100 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Exportar a Excel
                    </button>
                  </div>
                </div>

                {/* Collapsible filters */}
                {showDetalleUnidadFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 border border-gray-150 rounded-xl pt-2 animate-in fade-in slide-in-from-top-1 duration-200 text-[11px] text-gray-600">
                    <div className="space-y-1">
                      <label className="font-bold text-gray-500 uppercase">Elemento</label>
                      <input
                        type="text"
                        placeholder="Buscar por elemento..."
                        value={filterDetalleUnidadElemento}
                        onChange={(e) => setFilterDetalleUnidadElemento(e.target.value)}
                        className="px-2 py-1 bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-gray-500 uppercase">Estado</label>
                      <select
                        value={filterDetalleUnidadEstado}
                        onChange={(e) => setFilterDetalleUnidadEstado(e.target.value)}
                        className="px-2 py-1 bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Todos</option>
                        <option value="DISPONIBLE">DISPONIBLE</option>
                        <option value="BUEN_ESTADO">BUEN ESTADO</option>
                        <option value="REGULAR">REGULAR</option>
                        <option value="ENTREGADO">ENTREGADO</option>
                        <option value="EN_MANTENIMIENTO">EN_MANTENIMIENTO</option>
                        <option value="DANADO">DAÑADO</option>
                        <option value="DE_BAJA">DE_BAJA</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-gray-500 uppercase">Asignado a Contrato</label>
                      <select
                        value={filterDetalleUnidadAsignado}
                        onChange={(e) => setFilterDetalleUnidadAsignado(e.target.value)}
                        className="px-2 py-1 bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Todos</option>
                        <option value="SI">Asignados</option>
                        <option value="NO">No asignados</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Body Table Section */}
            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl min-h-[300px] flex flex-col justify-between bg-gray-50/10">
              {almacenDetalleTab === "stock" ? (
                <div className="flex flex-col h-full justify-between">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100 sticky top-0">
                        <tr>
                          <th className="p-3">Categoría</th>
                          <th className="p-3">Elemento</th>
                          <th className="p-3">Marca / Modelo</th>
                          <th className="p-3">Resolución</th>
                          <th className="p-3 text-center">Stock Total</th>
                          <th className="p-3 text-center">Stock Disponible</th>
                          <th className="p-3">Control Serial</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                        {paginatedDetalleArticulos.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-400">
                              No hay artículos registrados con los filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          paginatedDetalleArticulos.map((art) => (
                            <tr key={art.id} className="hover:bg-gray-50/50">
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    art.categoria === "TECNOLOGICO"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : art.categoria === "BIOMEDICO"
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-purple-50 text-purple-700"
                                  }`}
                                >
                                  {art.categoria}
                                </span>
                              </td>
                              <td className="p-3 font-semibold text-gray-900">{art.elemento}</td>
                              <td className="p-3 text-gray-500">
                                {art.marca || art.modelo ? `${art.marca || ""} / ${art.modelo || ""}` : "—"}
                              </td>
                              <td className="p-3 text-gray-600 font-semibold font-mono text-[10px]">
                                {getResolucionCodigo(art.resolucion_id)}
                              </td>
                              <td className="p-3 text-center font-bold text-gray-800">{art.stock_total}</td>
                              <td className="p-3 text-center font-semibold text-emerald-600">{art.stock_disponible}</td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                    art.requiere_serial
                                      ? "bg-orange-50 text-orange-700"
                                      : "bg-gray-50 text-gray-500"
                                  }`}
                                >
                                  {art.requiere_serial ? "Serializado" : "Sin Serial"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {filteredDetalleArticulos.length > 0 && (
                    <div className="p-3 border-t border-gray-150 flex items-center justify-between text-xs text-gray-500 bg-white">
                      <div>
                        Mostrando <span className="font-semibold text-gray-700">{(currentPageDetalleArticulo - 1) * itemsPerPageDetalleArticulo + 1}</span> a{" "}
                        <span className="font-semibold text-gray-700">{Math.min(currentPageDetalleArticulo * itemsPerPageDetalleArticulo, filteredDetalleArticulos.length)}</span> de{" "}
                        <span className="font-semibold text-gray-700">{filteredDetalleArticulos.length}</span> elementos
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPageDetalleArticulo(currentPageDetalleArticulo - 1)}
                          disabled={currentPageDetalleArticulo === 1}
                          className="px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent font-semibold transition-all cursor-pointer"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => setCurrentPageDetalleArticulo(currentPageDetalleArticulo + 1)}
                          disabled={currentPageDetalleArticulo === totalPagesDetalleArticulo}
                          className="px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent font-semibold transition-all cursor-pointer"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-full justify-between">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100 sticky top-0">
                        <tr>
                          <th className="p-3">Elemento</th>
                          <th className="p-3">S/N / IMEI 1</th>
                          <th className="p-3">IMEI 2</th>
                          <th className="p-3">Resolución</th>
                          <th className="p-3">Estado</th>
                          <th className="p-3">Asignado a Contrato</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                        {paginatedDetalleUnidades.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400">
                              No hay unidades físicas serializadas con los filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          paginatedDetalleUnidades.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50/50">
                              <td className="p-3 font-semibold text-gray-900">{u.articulo?.elemento || "—"}</td>
                              <td className="p-3 font-mono font-bold text-gray-800">{u.serial || "—"}</td>
                              <td className="p-3 font-mono text-gray-500">{u.imei2 || "N/A"}</td>
                              <td className="p-3 font-semibold text-gray-700 font-mono text-[10px]">
                                {getResolucionCodigo(u.resolucion_id)}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                    u.estado === "DISPONIBLE" || u.estado === "BUEN_ESTADO"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : u.estado === "REGULAR"
                                      ? "bg-yellow-50 text-yellow-700 border border-yellow-150"
                                      : u.estado === "ENTREGADO"
                                      ? "bg-blue-50 text-blue-700"
                                      : u.estado === "EN_MANTENIMIENTO" || u.estado === "DANADO"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {u.estado === "BUEN_ESTADO" ? "BUEN ESTADO" : u.estado === "DANADO" ? "DAÑADO" : u.estado}
                                </span>
                              </td>
                              <td className="p-3">
                                {u.contratista_nombre ? (
                                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] uppercase">
                                    {u.contratista_nombre}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-medium">NO</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {filteredDetalleUnidades.length > 0 && (
                    <div className="p-3 border-t border-gray-150 flex items-center justify-between text-xs text-gray-500 bg-white">
                      <div>
                        Mostrando <span className="font-semibold text-gray-700">{(currentPageDetalleUnidad - 1) * itemsPerPageDetalleUnidad + 1}</span> a{" "}
                        <span className="font-semibold text-gray-700">{Math.min(currentPageDetalleUnidad * itemsPerPageDetalleUnidad, filteredDetalleUnidades.length)}</span> de{" "}
                        <span className="font-semibold text-gray-700">{filteredDetalleUnidades.length}</span> elementos
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPageDetalleUnidad(currentPageDetalleUnidad - 1)}
                          disabled={currentPageDetalleUnidad === 1}
                          className="px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent font-semibold transition-all cursor-pointer"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => setCurrentPageDetalleUnidad(currentPageDetalleUnidad + 1)}
                          disabled={currentPageDetalleUnidad === totalPagesDetalleUnidad}
                          className="px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent font-semibold transition-all cursor-pointer"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t pt-4 text-xs">
              <button
                onClick={() => setSelectedAlmacenDetalle(null)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-sm cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Add Artículo */}
      {showAddArticulo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateArticulo} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Registrar Artículo en Catálogo</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Categoría *</label>
                <select
                  value={newArticulo.categoria}
                  onChange={(e) => {
                    const requiresSer = e.target.value !== "DOTACION" && e.target.value !== "INSUMO"
                    setNewArticulo({ ...newArticulo, categoria: e.target.value, requiere_serial: requiresSer })
                  }}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="TECNOLOGICO">TECNOLOGICO</option>
                  <option value="BIOMEDICO">BIOMEDICO</option>
                  <option value="DOTACION">DOTACION</option>
                  <option value="INSUMO">INSUMO</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Tipo de Elemento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. PORTATIL, CHALECO, TENSIOMETRO"
                  value={newArticulo.tipo_elemento}
                  onChange={(e) => setNewArticulo({ ...newArticulo, tipo_elemento: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="font-semibold text-gray-600">Nombre / Elemento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Portátil HP ProBook 440 G8"
                  value={newArticulo.elemento}
                  onChange={(e) => setNewArticulo({ ...newArticulo, elemento: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Marca</label>
                <input
                  type="text"
                  placeholder="Ej. HP"
                  value={newArticulo.marca}
                  onChange={(e) => setNewArticulo({ ...newArticulo, marca: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Modelo</label>
                <input
                  type="text"
                  placeholder="Ej. ProBook 440 G8"
                  value={newArticulo.modelo}
                  onChange={(e) => setNewArticulo({ ...newArticulo, modelo: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Almacén Destino</label>
                <select
                  value={newArticulo.almacen_id}
                  onChange={(e) => setNewArticulo({ ...newArticulo, almacen_id: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Resolución</label>
                <select
                  value={newArticulo.resolucion_id}
                  onChange={(e) => setNewArticulo({ ...newArticulo, resolucion_id: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {resoluciones.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.codigo}
                    </option>
                  ))}
                </select>
              </div>

              {!newArticulo.requiere_serial && (
                <div className="space-y-1">
                  <label className="font-semibold text-gray-600">Stock Inicial (Cantidad)</label>
                  <input
                    type="number"
                    min={0}
                    value={newArticulo.stock_total}
                    onChange={(e) => setNewArticulo({ ...newArticulo, stock_total: Number(e.target.value) })}
                    className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowAddArticulo(false)}
                className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold">
                Crear Artículo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Modal Add Unidad */}
      {showAddUnidad && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateUnidad} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Registrar Unidad Física (S/N)</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Seleccionar Artículo del Catálogo *</label>
                <select
                  required
                  value={newUnidad.articulo_id}
                  onChange={(e) => setNewUnidad({ ...newUnidad, articulo_id: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="">-- Seleccionar Elemento --</option>
                  {articulos
                    .filter((a) => a.requiere_serial)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.elemento} ({a.categoria})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Número de Serial / IMEI 1 *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. S/N ABC123XYZ"
                  value={newUnidad.serial}
                  onChange={(e) => setNewUnidad({ ...newUnidad, serial: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">IMEI 2 o ID Dispositivo (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. 356789012345678"
                  value={newUnidad.imei2}
                  onChange={(e) => setNewUnidad({ ...newUnidad, imei2: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Almacén Destino</label>
                <select
                  value={newUnidad.almacen_id}
                  onChange={(e) => setNewUnidad({ ...newUnidad, almacen_id: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Resolución</label>
                <select
                  value={newUnidad.resolucion_id}
                  onChange={(e) => setNewUnidad({ ...newUnidad, resolucion_id: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {resoluciones.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.codigo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Observaciones Iniciales</label>
                <textarea
                  placeholder="Detalles del estado físico actual..."
                  value={newUnidad.observaciones}
                  onChange={(e) => setNewUnidad({ ...newUnidad, observaciones: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 h-16"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowAddUnidad(false)}
                className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold">
                Registrar Unidad
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Artículo Modal */}
      {showEditArticulo && editingArticulo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateArticulo} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Editar Artículo (Catálogo)</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Categoría *</label>
                <select
                  value={editingArticulo.categoria}
                  onChange={(e) => setEditingArticulo({ ...editingArticulo, categoria: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="TECNOLOGICO">TECNOLOGICO</option>
                  <option value="BIOMEDICO">BIOMEDICO</option>
                  <option value="DOTACION">DOTACION</option>
                  <option value="INSUMO">INSUMO</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Tipo de Elemento *</label>
                <input
                  type="text"
                  required
                  value={editingArticulo.tipo_elemento}
                  onChange={(e) => setEditingArticulo({ ...editingArticulo, tipo_elemento: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="font-semibold text-gray-600">Nombre / Elemento *</label>
                <input
                  type="text"
                  required
                  value={editingArticulo.elemento}
                  onChange={(e) => setEditingArticulo({ ...editingArticulo, elemento: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Marca</label>
                <input
                  type="text"
                  value={editingArticulo.marca || ""}
                  onChange={(e) => setEditingArticulo({ ...editingArticulo, marca: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Modelo</label>
                <input
                  type="text"
                  value={editingArticulo.modelo || ""}
                  onChange={(e) => setEditingArticulo({ ...editingArticulo, modelo: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Almacén Destino</label>
                <select
                  value={editingArticulo.almacen_id || ""}
                  onChange={(e) => setEditingArticulo({ ...editingArticulo, almacen_id: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Resolución</label>
                <select
                  value={editingArticulo.resolucion_id || ""}
                  onChange={(e) => setEditingArticulo({ ...editingArticulo, resolucion_id: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {resoluciones.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.codigo}
                    </option>
                  ))}
                </select>
              </div>

              {!editingArticulo.requiere_serial && (
                <div className="space-y-1">
                  <label className="font-semibold text-gray-600">Stock Total</label>
                  <input
                    type="number"
                    min={0}
                    value={editingArticulo.stock_total || 0}
                    onChange={(e) => setEditingArticulo({ ...editingArticulo, stock_total: Number(e.target.value) })}
                    className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowEditArticulo(false)
                  setEditingArticulo(null)
                }}
                className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold cursor-pointer">
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Unidad Modal */}
      {showEditUnidad && editingUnidad && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateUnidad} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Editar Unidad Física</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Número de Serial / IMEI 1 *</label>
                <input
                  type="text"
                  required
                  value={editingUnidad.serial || ""}
                  onChange={(e) => setEditingUnidad({ ...editingUnidad, serial: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">IMEI 2 o ID Dispositivo (Opcional)</label>
                <input
                  type="text"
                  value={editingUnidad.imei2 || ""}
                  onChange={(e) => setEditingUnidad({ ...editingUnidad, imei2: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Estado *</label>
                <select
                  required
                  value={editingUnidad.estado || "DISPONIBLE"}
                  onChange={(e) => setEditingUnidad({ ...editingUnidad, estado: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="DISPONIBLE">DISPONIBLE</option>
                  <option value="BUEN_ESTADO">BUEN ESTADO</option>
                  <option value="REGULAR">REGULAR</option>
                  <option value="ENTREGADO">ENTREGADO</option>
                  <option value="EN_MANTENIMIENTO">EN_MANTENIMIENTO</option>
                  <option value="DANADO">DAÑADO</option>
                  <option value="DE_BAJA">DE_BAJA</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Almacén Ubicación</label>
                <select
                  value={editingUnidad.almacen_id || ""}
                  onChange={(e) => setEditingUnidad({ ...editingUnidad, almacen_id: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Resolución</label>
                <select
                  value={editingUnidad.resolucion_id || ""}
                  onChange={(e) => setEditingUnidad({ ...editingUnidad, resolucion_id: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {resoluciones.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.codigo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Observaciones</label>
                <textarea
                  value={editingUnidad.observaciones || ""}
                  onChange={(e) => setEditingUnidad({ ...editingUnidad, observaciones: e.target.value })}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 h-16"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowEditUnidad(false)
                  setEditingUnidad(null)
                }}
                className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold cursor-pointer">
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Modal Import Excel: Serializados */}
      {showImportSerializado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              Importar Inventario Serializado
            </h3>
            <p className="text-xs text-gray-500">
              Cargue un archivo de Excel (.xlsx) con columnas: <strong>ALMACEN_ID</strong>, <strong>TIPO DE ELEMENTO</strong>, <strong>ELEMENTO</strong>, <strong>MARCA</strong>, <strong>MODELO</strong>, <strong>IMEI 1 (S/N)</strong>, <strong>IMEI 2</strong>.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between text-xs my-1">
              <span className="text-blue-700 font-medium">¿No tienes la plantilla?</span>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/inventario/plantillas/serializado`}
                download
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg font-bold transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Descargar Ejemplo
              </a>
            </div>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Resolución Destino (Opcional, fallback)</label>
                <select
                  value={importResolucionId || ""}
                  onChange={(e) => setImportResolucionId(e.target.value ? Number(e.target.value) : undefined)}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Seleccionar Resolución —</option>
                  {resoluciones.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.codigo} {r.titulo ? `– ${r.titulo}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Archivo Excel *</label>
                <input
                  type="file"
                  required
                  accept=".xlsx, .xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowImportSerializado(false)
                  setUploadFile(null)
                }}
                className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-50 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!uploadFile}
                onClick={() => handleImportSerializado(true)}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold disabled:opacity-50"
              >
                Verificar Excel
              </button>
              <button
                type="button"
                disabled={!uploadFile}
                onClick={() => handleImportSerializado(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                Importar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Import Excel: Cantidad */}
      {showImportCantidad && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
              Importar Dotación / Insumos
            </h3>
            <p className="text-xs text-gray-500">
              Cargue un archivo de Excel (.xlsx) con columnas: <strong>ALMACEN_ID</strong>, <strong>TIPO DE ELEMENTO</strong>, <strong>ELEMENTO</strong>, <strong>CANTIDAD</strong>.
            </p>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center justify-between text-xs my-1">
              <span className="text-purple-700 font-medium">¿No tienes la plantilla?</span>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/inventario/plantillas/dotacion`}
                download
                className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg font-bold transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Descargar Ejemplo
              </a>
            </div>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Resolución Destino (Opcional, fallback)</label>
                <select
                  value={importResolucionId || ""}
                  onChange={(e) => setImportResolucionId(e.target.value ? Number(e.target.value) : undefined)}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                >
                  <option value="">— Seleccionar Resolución —</option>
                  {resoluciones.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.codigo} {r.titulo ? `– ${r.titulo}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-600">Archivo Excel *</label>
                <input
                  type="file"
                  required
                  accept=".xlsx, .xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="px-3 py-2 border rounded-lg w-full focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowImportCantidad(false)
                  setUploadFile(null)
                }}
                className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-50 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!uploadFile}
                onClick={() => handleImportCantidad(true)}
                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-bold disabled:opacity-50"
              >
                Verificar Excel
              </button>
              <button
                type="button"
                disabled={!uploadFile}
                onClick={() => handleImportCantidad(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                Importar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Import Result */}
      {importResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2 flex items-center gap-2">
              {importResult.dry_run ? (
                <>
                  <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                  Verificación de Datos (Simulado)
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Resultado de la Importación
                </>
              )}
            </h3>

            {importResult.dry_run && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600" /> Vista Previa de Simulación
                </p>
                <p>
                  El Excel fue analizado y validado fila por fila. <strong>Ningún cambio ha sido guardado.</strong>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border">
              <div>
                <p className="text-gray-400">Filas Evaluadas:</p>
                <p className="text-lg font-bold text-gray-800">{importResult.total}</p>
              </div>
              <div>
                <p className="text-gray-400">Artículos a Crear:</p>
                <p className="text-lg font-bold text-emerald-600">{importResult.created_articles}</p>
              </div>
              <div>
                <p className="text-gray-400">Unidades/Stock:</p>
                <p className="text-lg font-bold text-blue-600">{importResult.created_units}</p>
              </div>
              <div>
                <p className="text-gray-400">Duplicados Omitidos:</p>
                <p className="text-lg font-bold text-amber-600">{importResult.skipped_duplicates || 0}</p>
              </div>
            </div>

            {importResult.errors?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-red-500 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Errores encontrados ({importResult.errors.length})
                </p>
                <div className="max-h-36 overflow-y-auto border border-red-100 rounded-lg p-2.5 bg-red-50/10 space-y-1 text-[10px]">
                  {importResult.errors.map((err: any, idx: number) => (
                    <p key={idx} className="text-red-700">
                      <strong>Fila {err.fila || "N/A"}:</strong> {err.error}
                    </p>
                  ))}
                </div>
                {importResult.error_file && (
                  <div className="pt-1">
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/inventario/import/errores/${importResult.error_file}/download`}
                      download
                      className="w-full px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl hover:bg-red-100 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-red-600" /> Descargar Excel con columna de errores
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 text-xs">
              {importResult.dry_run ? (
                <>
                  <button
                    onClick={() => setImportResult(null)}
                    className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-50 font-semibold"
                  >
                    Cerrar Vista Previa
                  </button>
                  {importResult.errors?.length === 0 && (
                    <button
                      onClick={executeRealImportFromPreview}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Proceder a Importar
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setImportResult(null)}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold"
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
