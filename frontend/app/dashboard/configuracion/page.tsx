"use client"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImageIcon, Upload, CheckCircle } from "lucide-react"
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8099"
export default function ConfiguracionPage() {
  const [logoLeftUrl, setLogoLeftUrl] = useState<string | null>(null)
  const [logoRightUrl, setLogoRightUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const leftInputRef = useRef<HTMLInputElement>(null)
  const rightInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    fetch(API + "/api/v1/config/logos").then(r=>r.json()).then(d=>{
      if(d.logo_left) setLogoLeftUrl(API + d.logo_left)
      if(d.logo_right) setLogoRightUrl(API + d.logo_right)
    }).catch(()=>{})
  }, [])
  const handleUpload = async (side: "left"|"right", file: File) => {
    if(!file.type.startsWith("image/")){toast.error("Solo imagenes (PNG, JPEG, WebP)");return}
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("logo_"+side, file)
      const r = await fetch(API+"/api/v1/config/logos",{method:"POST",body:fd})
      if(!r.ok) throw new Error((await r.text()).slice(0,200))
      const d = await fetch(API+"/api/v1/config/logos").then(r=>r.json())
      if(d.logo_left) setLogoLeftUrl(API + d.logo_left)
      if(d.logo_right) setLogoRightUrl(API + d.logo_right)
      toast.success("Logo "+(side==="left"?"izquierdo":"derecho")+" subido")
    } catch(e: any){toast.error(e.message||"Error al subir")}
    finally{setUploading(false)}
  }
  return (<div className="space-y-6 animate-fade-in">
    <div><h1 className="text-2xl font-bold text-gray-900">Configuracion - Logos</h1>
    <p className="text-gray-500 mt-1">Sube los logos para los documentos DOCX</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-600"/> Logo Izquierdo</CardTitle>
      <CardDescription>Esquina superior izquierda del documento</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex items-center justify-center min-h-[160px] bg-gray-50/50 hover:bg-gray-100/50 transition-colors cursor-pointer"
          onClick={()=>leftInputRef.current?.click()}
          onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleUpload("left",f)}}>
          {logoLeftUrl ? <img src={logoLeftUrl} alt="Logo izquierdo" className="max-h-[120px] object-contain"/>
          : <div className="text-center text-gray-400"><Upload className="w-10 h-10 mx-auto mb-2"/><p className="text-sm">Haz clic o arrastra una imagen aqui</p><p className="text-xs mt-1">PNG, JPEG o WebP</p></div>}
        </div>
        <input ref={leftInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleUpload("left",f)}}/>
        <Button variant="outline" size="sm" className="w-full" onClick={()=>leftInputRef.current?.click()} disabled={uploading}>
          <Upload className="w-4 h-4 mr-2"/>{uploading?"Subiendo...":"Cambiar imagen"}
        </Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-600"/> Logo Derecho</CardTitle>
      <CardDescription>Esquina superior derecha del documento</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex items-center justify-center min-h-[160px] bg-gray-50/50 hover:bg-gray-100/50 transition-colors cursor-pointer"
          onClick={()=>rightInputRef.current?.click()}
          onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleUpload("right",f)}}>
          {logoRightUrl ? <img src={logoRightUrl} alt="Logo derecho" className="max-h-[120px] object-contain"/>
          : <div className="text-center text-gray-400"><Upload className="w-10 h-10 mx-auto mb-2"/><p className="text-sm">Haz clic o arrastra una imagen aqui</p><p className="text-xs mt-1">PNG, JPEG o WebP</p></div>}
        </div>
        <input ref={rightInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleUpload("right",f)}}/>
        <Button variant="outline" size="sm" className="w-full" onClick={()=>rightInputRef.current?.click()} disabled={uploading}>
          <Upload className="w-4 h-4 mr-2"/>{uploading?"Subiendo...":"Cambiar imagen"}
        </Button>
      </CardContent></Card>
    </div>
    <Card className="bg-emerald-50 border-emerald-200"><CardContent className="py-4 flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0"/>
      <div><p className="text-sm text-emerald-800 font-medium">Como funciona?</p><p className="text-sm text-emerald-700 mt-1">
        Los logos se insertan en el encabezado de los DOCX. Sin logos, se usa el texto estandar.</p></div>
    </CardContent></Card>
  </div>)
}
