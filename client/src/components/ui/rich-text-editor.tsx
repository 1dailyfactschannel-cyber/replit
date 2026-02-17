import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useMemo } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Underline as UnderlineIcon,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onBlur?: (content: string) => void;
  placeholder?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const buttons = [
    {
      icon: Bold,
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
      label: 'Bold'
    },
    {
      icon: Italic,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
      label: 'Italic'
    },
    {
      icon: UnderlineIcon,
      onClick: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive('underline'),
      label: 'Underline'
    },
    {
      icon: Code,
      onClick: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive('code'),
      label: 'Code'
    },
    {
      icon: List,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
      label: 'Bullet List'
    },
    {
      icon: ListOrdered,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
      label: 'Ordered List'
    },
    {
      icon: Quote,
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
      label: 'Quote'
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 p-1 border-b border-border bg-secondary/50">
      {buttons.map((btn, i) => (
        <Button
          key={i}
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-muted-foreground hover:text-foreground",
            btn.isActive && "bg-primary/20 text-primary"
          )}
          onClick={btn.onClick}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
        >
          <btn.icon className="h-4 w-4" />
        </Button>
      ))}
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        onMouseDown={(e) => e.preventDefault()}
        type="button"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        onMouseDown={(e) => e.preventDefault()}
        type="button"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
};

export function RichTextEditor({ content, onChange, onBlur, placeholder }: RichTextEditorProps) {
  const extensions = useMemo(() => [
    StarterKit.configure({
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
      link: false,
      underline: false,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
    }),
    Placeholder.configure({
      placeholder: placeholder || 'Начните писать...',
    }),
  ], [placeholder]);

  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onBlur: ({ editor }) => {
      if (onBlur) onBlur(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[150px] p-4 focus:outline-none text-black dark:text-white',
      },
    },
  });

  // Sync content if it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden focus-within:ring-2 ring-primary/20 transition-all">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
