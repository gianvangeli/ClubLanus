import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect } from 'react'
import './EditorTexto.css'

// Editor de texto enriquecido (negrita, cursiva, links, listas), con
// límite de caracteres visible — usado por los 3 bloques de
// "Entrenamientos Desglosados" (Objetivo/Reglas/Puntos de coaching).
// Headless (Tiptap): la barra de herramientas es HTML/CSS propio, sin
// depender de ningún framework de UI.
export default function EditorTexto({ value, onChange, limite = 2000, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false }),
      CharacterCount.configure({ limit: limite }),
    ],
    content: value || '',
    editorProps: {
      attributes: { class: 'editor-texto-contenido' },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  })

  // Si el valor cambia desde afuera (p.ej. se cargó otro ejercicio) y no
  // coincide con lo que ya tiene el editor, se sincroniza.
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!editor) return null

  const caracteres = editor.storage.characterCount.characters()

  return (
    <div className="editor-texto">
      <div className="editor-texto-barra">
        <button type="button" className={editor.isActive('bold') ? 'activo' : ''} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </button>
        <button type="button" className={editor.isActive('italic') ? 'activo' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </button>
        <button
          type="button"
          className={editor.isActive('link') ? 'activo' : ''}
          onClick={() => {
            const url = window.prompt('URL del link')
            if (url) editor.chain().focus().setLink({ href: url }).run()
            else editor.chain().focus().unsetLink().run()
          }}
        >
          🔗
        </button>
        <button type="button" className={editor.isActive('bulletList') ? 'activo' : ''} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          • Lista
        </button>
        <button type="button" className={editor.isActive('orderedList') ? 'activo' : ''} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1. Lista
        </button>
      </div>
      <EditorContent editor={editor} placeholder={placeholder} />
      <span className="editor-texto-contador">{caracteres}/{limite} caracteres</span>
    </div>
  )
}
