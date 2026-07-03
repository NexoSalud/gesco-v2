"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import * as TiptapTable from "@tiptap/extension-table"
import * as TiptapTableRow from "@tiptap/extension-table-row"
import * as TiptapTableCell from "@tiptap/extension-table-cell"
import * as TiptapTableHeader from "@tiptap/extension-table-header"
import { useState, useEffect } from "react"
import {
  Bold, Italic, List, ListOrdered, Undo, Redo,
  Heading1, Heading2, Table as TableIcon, Trash2,
  Minus, Plus,
} from "lucide-react"

interface ActividadEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  maxHeight?: number
}

export function ActividadEditor({ value, onChange, placeholder, minHeight = 120, maxHeight = 300 }: ActividadEditorProps) {
  const [mounted, setMounted] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Escribe la actividad...",
      }),
      TiptapTable.Table.configure({ resizable: true }),
      TiptapTableRow.TableRow,
      TiptapTableCell.TableCell,
      TiptapTableHeader.TableHeader,
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-4 py-3 min-h-[120px]",
        style: `min-height: ${minHeight}px; max-height: ${maxHeight}px; overflow-y: auto;`,
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "")
    }
  }, [value, editor])

  const addTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  if (!mounted) {
    return (
      <div
        className="border border-gray-200 rounded-xl bg-white animate-pulse"
        style={{ minHeight }}
      />
    )
  }

  if (!editor) return null

  const ToolBtn = ({ onClick, active, children, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active ? "bg-emerald-100 text-emerald-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/50 flex-wrap">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrita">
          <Bold className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Cursiva">
          <Italic className="w-4 h-4" />
        </ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Título">
          <Heading1 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Subtítulo">
          <Heading2 className="w-4 h-4" />
        </ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista">
          <List className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
          <ListOrdered className="w-4 h-4" />
        </ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn onClick={addTable} active={editor.isActive("table")} title="Insertar tabla">
          <TableIcon className="w-4 h-4" />
        </ToolBtn>
        {editor.isActive("table") && (
          <>
            <ToolBtn onClick={() => editor.chain().focus().addColumnAfter().run()} active={false} title="Columna después">
              <Plus className="w-3.5 h-3.5" /><span className="text-[10px]">col</span>
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().deleteColumn().run()} active={false} title="Eliminar columna">
              <Minus className="w-3.5 h-3.5" /><span className="text-[10px]">col</span>
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().addRowAfter().run()} active={false} title="Fila después">
              <Plus className="w-3.5 h-3.5" /><span className="text-[10px]">row</span>
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().deleteRow().run()} active={false} title="Eliminar fila">
              <Minus className="w-3.5 h-3.5" /><span className="text-[10px]">row</span>
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().deleteTable().run()} active={false} title="Eliminar tabla">
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </ToolBtn>
          </>
        )}
        <span className="flex-1" />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Deshacer">
          <Undo className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Rehacer">
          <Redo className="w-4 h-4" />
        </ToolBtn>
      </div>
      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
