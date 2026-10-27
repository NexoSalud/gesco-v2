"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { toast } from "sonner"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Download,
  ExternalLink,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
} from "lucide-react"
import {
  Categoria,
  GcDocumento,
  gcActualizarDocumento,
  gcArchivoBlob,
  gcEliminarDocumento,
  gcSubirDocumento,
  guardarBlob,
} from "@/lib/gestion-api"
import { Btn, Miniatura, formatBytes, formatFecha, formatRelativo, inputCls } from "@/components/gestion/ui"
import { cn } from "@/lib/utils"

/** Documentos que todo expediente debería tener (indicador de completitud). */
export const DOCUMENTOS_CLAVE = ["CONTRATO_FIRMADO", "CDP", "RP", "POLIZA", "ACTA_INICIO"]

const EXT_PERMITIDAS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]
const MAX_MB = 50

const PISTAS: [RegExp, string][] = [
  [/liquidaci/i, "ACTA_LIQUIDACION"],
  [/acta.*inicio|inicio/i, "ACTA_INICIO"],
  [/p[oó]liza|garant/i, "POLIZA"],
  [/\bcdp\b|disponibilidad/i, "CDP"],
  [/\brp\b|registro.?presup/i, "RP"],
  [/otro.?s[ií]|modificaci|adici[oó]n|pr[oó]rroga/i, "OTROSI"],
  [/estudio.*previo|estudios/i, "ESTUDIOS_PREVIOS"],
  [/designaci/i, "DESIGNACION_SUPERVISION"],
  [/informe/i, "INFORME_SUPERVISION"],
  [/c[eé]dula|rut\b|antecedente|hoja.?de.?vida|t[ií]tulo|diploma/i, "DOCUMENTOS_CONTRATISTA"],
  [/contrato/i, "CONTRATO_FIRMADO"],
]

function adivinarCategoria(nombre: string, porDefecto: string) {
  const limpio = nombre.replace(/[_\-.]+/g, " ")
  return PISTAS.find(([re]) => re.test(limpio))?.[1] || porDefecto
}

function extension(doc: GcDocumento) {
  if (doc.mime_type === "application/pdf") return ".pdf"
  if (doc.mime_type === "image/png") return ".png"
  if (doc.mime_type === "image/webp") return ".webp"
  return ".jpg"
}

export async function descargarDocumento(doc: GcDocumento) {
  try {
    const blob = await gcArchivoBlob(doc.id)
    const ext = extension(doc)
    guardarBlob(blob, doc.nombre.toLowerCase().endsWith(ext) ? doc.nombre : `${doc.nombre}${ext}`)
  } catch (e: any) {
    toast.error(e.message)
  }
}

// ─── Cargador ────────────────────────────────────────────────────────────────

interface ItemCola {
  key: string
  file: File
  categoria: string
  estado: "listo" | "subiendo" | "ok" | "error"
  progreso: number
  error?: string
}

export function Cargador({
  contratoId,
  categorias,
  solicitud,
  onSubido,
}: {
  contratoId: number
  categorias: Categoria[]
  /** Pedido externo de carga para una categoría (p. ej. desde la lista de documentos clave) */
  solicitud?: { categoria: string; n: number } | null
  onSubido: (doc: GcDocumento) => void
}) {
  const [cola, setCola] = useState<ItemCola[]>([])
  const [arrastrando, setArrastrando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const zonaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (solicitud) {
      zonaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      inputRef.current?.click()
    }
  }, [solicitud])

  const agregar = useCallback(
    (files: FileList | File[]) => {
      const nuevos: ItemCola[] = []
      for (const file of Array.from(files)) {
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
        let error: string | undefined
        if (!EXT_PERMITIDAS.includes(ext)) error = "Formato no soportado"
        else if (file.size > MAX_MB * 1024 * 1024) error = `Supera ${MAX_MB} MB`
        nuevos.push({
          key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          categoria: solicitud?.categoria || adivinarCategoria(file.name, "OTRO"),
          estado: error ? "error" : "listo",
          progreso: 0,
          error,
        })
      }
      setCola((c) => [...c, ...nuevos])
    },
    [solicitud]
  )

  const actualizar = (key: string, patch: Partial<ItemCola>) => setCola((c) => c.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  const subirTodo = async () => {
    setSubiendo(true)
    const pendientes = cola.filter((i) => i.estado === "listo")
    let ok = 0
    for (const item of pendientes) {
      actualizar(item.key, { estado: "subiendo", progreso: 0 })
      try {
        const nombre = item.file.name.replace(/\.[^.]+$/, "")
        const doc = await gcSubirDocumento(contratoId, item.file, { categoria: item.categoria, nombre }, (p) => actualizar(item.key, { progreso: p })).promise
        actualizar(item.key, { estado: "ok", progreso: 100 })
        onSubido(doc)
        ok++
      } catch (e: any) {
        actualizar(item.key, { estado: "error", error: e.message })
      }
    }
    setSubiendo(false)
    if (ok) toast.success(`${ok} documento${ok === 1 ? "" : "s"} agregado${ok === 1 ? "" : "s"} al expediente`)
    setTimeout(() => setCola((c) => c.filter((i) => i.estado !== "ok")), 1200)
  }

  const listos = cola.filter((i) => i.estado === "listo").length

  return (
    <div ref={zonaRef} className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          if (e.dataTransfer.files.length) agregar(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all",
          arrastrando ? "scale-[1.01] border-emerald-500 bg-emerald-500/5" : "border-gray-200 bg-gray-50/60 hover:border-gray-300 hover:bg-gray-50"
        )}
      >
        <div className={cn("mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-transform", arrastrando && "-translate-y-1")}>
          <CloudUpload className={cn("h-5 w-5", arrastrando ? "text-emerald-600" : "text-gray-500")} />
        </div>
        <p className="text-sm font-medium text-gray-900">{arrastrando ? "Suelta para agregar" : "Arrastra los documentos escaneados aquí"}</p>
        <p className="mt-1 text-xs text-gray-500">
          o <span className="font-medium text-emerald-700 underline-offset-2 group-hover:underline dark:text-emerald-300">selecciónalos desde tu equipo</span> · PDF, JPG, PNG o TIFF hasta {MAX_MB} MB
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={EXT_PERMITIDAS.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) agregar(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {cola.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white animate-fade-in">
          <ul className="divide-y divide-gray-100">
            {cola.map((item) => (
              <li key={item.key} className="relative flex items-center gap-3 px-4 py-3">
                {item.estado === "subiendo" && <div className="absolute inset-y-0 left-0 bg-emerald-500/[0.07] transition-all" style={{ width: `${item.progreso}%` }} />}
                <div
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    item.estado === "error" ? "bg-red-500/10 text-red-600" : item.estado === "ok" ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-100 text-gray-500"
                  )}
                >
                  {item.estado === "subiendo" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : item.estado === "ok" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : item.estado === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="relative min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{item.file.name}</p>
                  <p className={cn("text-xs", item.estado === "error" ? "text-red-600 dark:text-red-400" : "text-gray-500")}>
                    {item.estado === "error" ? item.error : item.estado === "subiendo" ? `Subiendo… ${item.progreso}%` : formatBytes(item.file.size)}
                  </p>
                </div>
                <select
                  value={item.categoria}
                  disabled={item.estado !== "listo"}
                  onChange={(e) => actualizar(item.key, { categoria: e.target.value })}
                  className={cn(inputCls, "relative h-8 w-44 cursor-pointer text-xs sm:w-56")}
                >
                  {categorias.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  disabled={item.estado === "subiendo"}
                  onClick={() => setCola((c) => c.filter((i) => i.key !== item.key))}
                  className="relative cursor-pointer rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                  aria-label="Quitar de la cola"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50/60 px-4 py-3">
            <p className="text-xs text-gray-500">Revisa la categoría de cada archivo antes de subir.</p>
            <div className="flex gap-2">
              <Btn size="sm" variant="ghost" disabled={subiendo} onClick={() => setCola([])}>
                Cancelar
              </Btn>
              <Btn size="sm" variant="primary" disabled={subiendo || !listos} onClick={subirTodo}>
                {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
                Subir {listos || ""} archivo{listos === 1 ? "" : "s"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Lista / galería de documentos ───────────────────────────────────────────

const VISTA_KEY = "gc_docs_vista"

export function ListaDocumentos({
  documentos,
  categorias,
  puedeEditar,
  onCambio,
  onEliminado,
}: {
  documentos: GcDocumento[]
  categorias: Categoria[]
  puedeEditar: boolean
  onCambio: (doc: GcDocumento) => void
  onEliminado: (id: number) => void
}) {
  const [vista, setVista] = useState<"grid" | "lista">("grid")
  const [filtro, setFiltro] = useState<string>("")
  const [abierto, setAbierto] = useState<number | null>(null)
  const [editando, setEditando] = useState<GcDocumento | null>(null)
  const [eliminando, setEliminando] = useState<GcDocumento | null>(null)

  useEffect(() => {
    try {
      const v = localStorage.getItem(VISTA_KEY)
      if (v === "grid" || v === "lista") setVista(v)
    } catch {}
  }, [])
  const cambiarVista = (v: "grid" | "lista") => {
    setVista(v)
    try {
      localStorage.setItem(VISTA_KEY, v)
    } catch {}
  }

  const label = (cat: string) => categorias.find((c) => c.value === cat)?.label || cat
  const presentes = Array.from(new Set(documentos.map((d) => d.categoria)))
  const visibles = filtro ? documentos.filter((d) => d.categoria === filtro) : documentos
  const idx = abierto === null ? -1 : visibles.findIndex((d) => d.id === abierto)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-1.5">
          <ChipFiltro activo={!filtro} onClick={() => setFiltro("")}>
            Todos <span className="opacity-60">{documentos.length}</span>
          </ChipFiltro>
          {presentes.map((c) => (
            <ChipFiltro key={c} activo={filtro === c} onClick={() => setFiltro(c)}>
              {label(c)} <span className="opacity-60">{documentos.filter((d) => d.categoria === c).length}</span>
            </ChipFiltro>
          ))}
        </div>
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {(["grid", "lista"] as const).map((v) => {
            const Icon = v === "grid" ? LayoutGrid : List
            return (
              <button
                key={v}
                onClick={() => cambiarVista(v)}
                aria-label={v === "grid" ? "Vista de cuadrícula" : "Vista de lista"}
                className={cn("cursor-pointer rounded-md p-1.5 transition", vista === v ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-800")}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            )
          })}
        </div>
      </div>

      {vista === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">
          {visibles.map((d) => (
            <div key={d.id} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-900/5">
              <button onClick={() => setAbierto(d.id)} className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-gray-50">
                <Miniatura docId={d.id} tiene={d.tiene_miniatura} mime={d.mime_type} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="absolute left-2 top-2 rounded-md bg-[#fff]/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#374151] shadow-sm backdrop-blur">
                  {d.mime_type === "application/pdf" ? "PDF" : d.mime_type.split("/")[1]}
                </span>
                <span className="absolute bottom-2 left-1/2 flex -translate-x-1/2 whitespace-nowrap translate-y-2 items-center gap-1.5 rounded-full bg-[#fff] px-3 py-1 text-xs font-medium text-[#111827] opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100">
                  <Eye className="h-3.5 w-3.5" /> Vista previa
                </span>
              </button>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-gray-900" title={d.nombre}>
                  {d.nombre}
                </p>
                <p className="mt-0.5 truncate text-xs text-gray-500">{label(d.categoria)}</p>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="min-w-0 truncate whitespace-nowrap text-[11px] tabular-nums text-gray-400">
                    {formatBytes(d.tamano)}
                    {d.paginas ? ` · ${d.paginas} pág.` : ""}
                  </span>
                  <Acciones doc={d} puedeEditar={puedeEditar} onEditar={setEditando} onEliminar={setEliminando} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Documento</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Categoría</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Cargado</th>
                <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Tamaño</th>
                <th className="w-28 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {visibles.map((d) => (
                <tr key={d.id} className="group transition-colors hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <button onClick={() => setAbierto(d.id)} className="flex cursor-pointer items-center gap-3 text-left">
                      <Miniatura docId={d.id} tiene={d.tiene_miniatura} mime={d.mime_type} className="h-11 w-9 shrink-0 rounded-md ring-1 ring-gray-200" />
                      <span className="min-w-0">
                        <span className="block max-w-[18rem] truncate font-medium text-gray-900 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{d.nombre}</span>
                        <span className="block truncate text-xs text-gray-500">{d.archivo_nombre}</span>
                      </span>
                    </button>
                  </td>
                  <td className="hidden px-4 py-2.5 text-gray-600 md:table-cell">{label(d.categoria)}</td>
                  <td className="hidden px-4 py-2.5 text-xs lg:table-cell">
                    <span className="block whitespace-nowrap text-gray-700">{formatRelativo(d.created_at)}</span>
                    {d.subido_por && <span className="block max-w-[10rem] truncate text-gray-500">{d.subido_por}</span>}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-2.5 text-right text-xs tabular-nums text-gray-500 sm:table-cell">{formatBytes(d.tamano)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end">
                      <Acciones doc={d} puedeEditar={puedeEditar} onEditar={setEditando} onEliminar={setEliminando} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Visor
        docs={visibles}
        index={idx}
        etiqueta={label}
        onIndex={(i) => setAbierto(i === null ? null : visibles[i]?.id ?? null)}
      />
      <EditarDocumento doc={editando} categorias={categorias} onClose={() => setEditando(null)} onGuardado={onCambio} />
      <ConfirmarEliminar doc={eliminando} onClose={() => setEliminando(null)} onEliminado={onEliminado} />
    </div>
  )
}

function ChipFiltro({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition",
        activo ? "bg-emerald-600 text-[#fff] ring-emerald-600" : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  )
}

function Acciones({
  doc,
  puedeEditar,
  onEditar,
  onEliminar,
}: {
  doc: GcDocumento
  puedeEditar: boolean
  onEditar: (d: GcDocumento) => void
  onEliminar: (d: GcDocumento) => void
}) {
  const btn = "cursor-pointer rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-800"
  return (
    <div className="flex items-center">
      <button className={btn} onClick={() => descargarDocumento(doc)} title="Descargar">
        <Download className="h-3.5 w-3.5" />
      </button>
      {puedeEditar && (
        <>
          <button className={btn} onClick={() => onEditar(doc)} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button className={cn(btn, "hover:bg-red-500/10 hover:text-red-600")} onClick={() => onEliminar(doc)} title="Eliminar">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  )
}

// ─── Visor ───────────────────────────────────────────────────────────────────

function Visor({
  docs,
  index,
  etiqueta,
  onIndex,
}: {
  docs: GcDocumento[]
  index: number
  etiqueta: (c: string) => string
  onIndex: (i: number | null) => void
}) {
  const doc = index >= 0 ? docs[index] : null
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    if (!doc) return
    let objectUrl: string | null = null
    let cancel = false
    setUrl(null)
    setError(null)
    setZoom(false)
    gcArchivoBlob(doc.id)
      .then((b) => {
        if (cancel) return
        objectUrl = URL.createObjectURL(b)
        setUrl(objectUrl)
      })
      .catch((e) => !cancel && setError(e.message))
    return () => {
      cancel = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [doc?.id])

  useEffect(() => {
    if (!doc) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && index < docs.length - 1) onIndex(index + 1)
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [doc, index, docs.length, onIndex])

  const esImagen = doc?.mime_type.startsWith("image/")
  const iconBtn = "cursor-pointer rounded-lg p-2 text-[#cbd5e1] transition hover:bg-[#fff]/10 hover:text-[#fff] disabled:opacity-30 disabled:hover:bg-transparent"

  return (
    <Dialog.Root open={!!doc} onOpenChange={(o) => !o && onIndex(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#020617]/85 backdrop-blur-md" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col outline-none animate-fade-in">
          {doc && (
            <>
              <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#fff]/10 px-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff]/10">
                  <FileText className="h-4 w-4 text-[#e2e8f0]" />
                </div>
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="truncate text-sm font-medium text-[#fff]">{doc.nombre}</Dialog.Title>
                  <Dialog.Description className="truncate text-xs text-[#94a3b8]">
                    {etiqueta(doc.categoria)} · {formatBytes(doc.tamano)}
                    {doc.paginas ? ` · ${doc.paginas} página${doc.paginas === 1 ? "" : "s"}` : ""} · {formatFecha(doc.created_at)}
                    {doc.subido_por ? ` · ${doc.subido_por}` : ""}
                  </Dialog.Description>
                </div>
                <span className="hidden text-xs tabular-nums text-[#94a3b8] sm:inline">
                  {index + 1} / {docs.length}
                </span>
                <button className={iconBtn} disabled={index <= 0} onClick={() => onIndex(index - 1)} title="Anterior (←)">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className={iconBtn} disabled={index >= docs.length - 1} onClick={() => onIndex(index + 1)} title="Siguiente (→)">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="mx-1 h-5 w-px bg-[#fff]/10" />
                {esImagen && (
                  <button className={iconBtn} onClick={() => setZoom((z) => !z)} title={zoom ? "Ajustar a pantalla" : "Tamaño real"}>
                    {zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                  </button>
                )}
                <button className={iconBtn} disabled={!url} onClick={() => url && window.open(url, "_blank")} title="Abrir en pestaña nueva">
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  onClick={() => descargarDocumento(doc)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#fff] px-3 py-1.5 text-xs font-semibold text-[#0f172a] transition hover:bg-[#e2e8f0]"
                >
                  <Download className="h-3.5 w-3.5" /> Descargar
                </button>
                <Dialog.Close className={iconBtn} title="Cerrar (Esc)">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-4" onClick={(e) => e.target === e.currentTarget && onIndex(null)}>
                {error ? (
                  <div className="text-center text-sm text-[#fca5a5]">
                    <AlertCircle className="mx-auto mb-2 h-6 w-6" />
                    {error}
                  </div>
                ) : !url ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" />
                ) : esImagen ? (
                  <img
                    src={url}
                    alt={doc.nombre}
                    onClick={() => setZoom((z) => !z)}
                    className={cn("rounded-lg shadow-2xl transition-all", zoom ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain")}
                  />
                ) : (
                  <iframe src={url} title={doc.nombre} className="h-full w-full max-w-5xl rounded-lg bg-[#fff] shadow-2xl" />
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Diálogos ────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-gray-900/30 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-scale-in">
          <Dialog.Title className="text-base font-semibold text-gray-900">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditarDocumento({
  doc,
  categorias,
  onClose,
  onGuardado,
}: {
  doc: GcDocumento | null
  categorias: Categoria[]
  onClose: () => void
  onGuardado: (d: GcDocumento) => void
}) {
  const [nombre, setNombre] = useState("")
  const [categoria, setCategoria] = useState("OTRO")
  const [descripcion, setDescripcion] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (doc) {
      setNombre(doc.nombre)
      setCategoria(doc.categoria)
      setDescripcion(doc.descripcion || "")
    }
  }, [doc])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doc) return
    setSaving(true)
    try {
      const d = await gcActualizarDocumento(doc.id, { nombre: nombre.trim(), categoria, descripcion: descripcion.trim() || null })
      onGuardado(d)
      toast.success("Documento actualizado")
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!doc} onClose={onClose} title="Editar documento">
      <form onSubmit={guardar} className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Nombre</span>
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Categoría</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={cn(inputCls, "cursor-pointer")}>
            {categorias.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Descripción</span>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className={cn(inputCls, "h-auto py-2")} placeholder="Opcional" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" variant="primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

function ConfirmarEliminar({ doc, onClose, onEliminado }: { doc: GcDocumento | null; onClose: () => void; onEliminado: (id: number) => void }) {
  const [busy, setBusy] = useState(false)
  const eliminar = async () => {
    if (!doc) return
    setBusy(true)
    try {
      await gcEliminarDocumento(doc.id)
      onEliminado(doc.id)
      toast.success("Documento eliminado del expediente")
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={!!doc} onClose={onClose} title="¿Eliminar documento?">
      <p className="mt-2 text-sm text-gray-500">
        Se eliminará <span className="font-medium text-gray-900">{doc?.nombre}</span> del expediente. Esta acción no se puede deshacer.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>
          Cancelar
        </Btn>
        <Btn variant="danger" onClick={eliminar} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Eliminar
        </Btn>
      </div>
    </Modal>
  )
}
