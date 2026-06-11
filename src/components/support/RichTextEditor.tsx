import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import ImageExt from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import CodeBlock from '@tiptap/extension-code-block'
import { useEffect, useCallback } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code, Heading1, Heading2,
  Image, Undo2, Redo2, Highlighter, Minus,
} from 'lucide-react'
import './RichTextEditor.css'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  onImagePaste?: (file: File) => Promise<string>
}

export function RichTextEditor({ content, onChange, placeholder, onImagePaste }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Underline,
      Placeholder.configure({ placeholder: placeholder || 'Write something...' }),
      ImageExt.configure({ inline: true, allowBase64: true }),
      Highlight.configure({ multicolor: false }),
      CodeBlock,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content])

  const handleEditorPaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!editor || !onImagePaste) return
    const items = Array.from(e.clipboardData.items)
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const url = await onImagePaste(file)
          editor.chain().focus().setImage({ src: url, alt: file.name }).run()
        }
        return
      }
    }
  }, [editor, onImagePaste])

  if (!editor) return null

  return (
    <div className="rte-container">
      <div className="rte-toolbar">
        <div className="rte-toolbar-group">
          <button
            type="button"
            className={`rte-btn ${editor.isActive('bold') ? 'rte-btn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            className={`rte-btn ${editor.isActive('italic') ? 'rte-btn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            className={`rte-btn ${editor.isActive('underline') ? 'rte-btn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <UnderlineIcon size={15} />
          </button>
          <button
            type="button"
            className={`rte-btn ${editor.isActive('strike') ? 'rte-btn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough size={15} />
          </button>
          <button
            type="button"
            className={`rte-btn ${editor.isActive('highlight') ? 'rte-btn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            title="Highlight"
          >
            <Highlighter size={15} />
          </button>
        </div>

        <div className="rte-toolbar-divider" />

        <div className="rte-toolbar-group">
          <button
            type="button"
            className={`rte-btn ${editor.isActive('heading', { level: 1 }) ? 'rte-btn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 size={15} />
          </button>
          <button
            type="button"
            className={`rte-btn ${editor.isActive('heading', { level: 2 }) ? 'rte-btn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 size={15} />
          </button>
        </div>

        <div className="rte-toolbar-divider" />

        <div className="rte-toolbar-group">
          <button
            type="button"
            className={`rte-btn ${editor.isActive('bulletList') ? 'rte-btn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            className={`rte-btn ${editor.isActive('orderedList') ? 'rte-btn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            className={`rte-btn ${editor.isActive('blockquote') ? 'rte-btn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <Quote size={15} />
          </button>
          <button
            type="button"
            className={`rte-btn ${editor.isActive('codeBlock') ? 'rte-btn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          >
            <Code size={15} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            <Minus size={15} />
          </button>
        </div>

        <div className="rte-toolbar-divider" />

        <div className="rte-toolbar-group">
          <button
            type="button"
            className="rte-btn"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.onchange = async (ev) => {
                const file = (ev.target as HTMLInputElement).files?.[0]
                if (file && onImagePaste) {
                  const url = await onImagePaste(file)
                  editor.chain().focus().setImage({ src: url, alt: file.name }).run()
                }
              }
              input.click()
            }}
            title="Insert Image"
          >
            <Image size={15} />
          </button>
        </div>

        <div className="rte-toolbar-divider" />

        <div className="rte-toolbar-group">
          <button
            type="button"
            className="rte-btn"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo2 size={15} />
          </button>
        </div>
      </div>

      <div className="rte-content" onPaste={handleEditorPaste}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
