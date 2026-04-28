import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useMemo, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';

// Custom extension to support font-size via textStyle mark
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) {
            return {};
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          };
        },
      },
    };
  },
});
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
  Code,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Highlighter,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onBlur?: (content: string) => void;
  placeholder?: string;
}

const FONT_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32];

const TEXT_COLORS = [
  '#000000', '#ffffff', '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
  '#0284c7', '#9333ea', '#db2777', '#475569'
];

const HIGHLIGHT_COLORS = [
  '#fef2f2', '#ffedd5', '#fef9c3', '#dcfce7', '#dbeafe',
  '#f3e8ff', '#fce7f3', '#f1f5f9', '#ffffff', '#000000'
];

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [highlightColorOpen, setHighlightColorOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const getCurrentFontSize = () => {
    try {
      const attrs = editor.getAttributes('textStyle');
      const fontSize = attrs.fontSize;
      if (fontSize) {
        const parsed = parseInt(String(fontSize).replace('px', ''));
        if (!isNaN(parsed)) return parsed;
      }
    } catch (e) {
      console.log('getCurrentFontSize error:', e);
    }
    return 14;
  };

  const getCurrentTextColor = () => {
    return editor.getAttributes('textStyle').color || '#000000';
  };

  const getCurrentHighlightColor = () => {
    return editor.getAttributes('highlight').color || null;
  };

  const setLink = () => {
    if (showLinkInput) {
      if (linkUrl) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      } else {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      }
      setShowLinkInput(false);
      setLinkUrl('');
    } else {
      const existingUrl = editor.getAttributes('link').href;
      setLinkUrl(existingUrl || '');
      setShowLinkInput(true);
    }
  };

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
      icon: Strikethrough,
      onClick: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive('strike'),
      label: 'Strikethrough'
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
    <div className="flex flex-wrap gap-0.5 p-1 border-b border-border bg-secondary/50 sticky top-0 z-10 items-center">
      {buttons.map((btn, i) => (
        <Button
          key={i}
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 text-muted-foreground hover:text-foreground",
            btn.isActive && "bg-primary/20 text-primary"
          )}
          onClick={btn.onClick}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
          title={btn.label}
        >
          <btn.icon className={cn("h-3.5 w-3.5", btn.label === 'H1' && "h-4 w-4", btn.label === 'H2' && "h-3.5 w-3.5")} />
        </Button>
      ))}

      <div className="w-px h-4 bg-border mx-0.5" />

      <Popover open={fontSizeOpen} onOpenChange={setFontSizeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-muted-foreground hover:text-foreground font-medium min-w-[50px]"
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="text-xs">{getCurrentFontSize()}</span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-1 w-32" align="start" onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.font-size-btn')) {
            e.preventDefault();
          }
        }}>
          <div className="grid grid-cols-4 gap-0.5">
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                className={cn(
                  "h-6 text-xs font-medium rounded hover:bg-secondary flex items-center justify-center font-size-btn",
                  getCurrentFontSize() === size && "bg-primary/20 text-primary"
                )}
              onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const { from, to } = editor.state.selection;
                  if (from === to) {
                    // No selection: insert a space with the font size mark
                    editor.chain().focus().insertContent([{ type: 'text', text: ' ', marks: [{ type: 'textStyle', attrs: { fontSize: size + 'px' } }] }]).run();
                  } else {
                    editor.chain().focus().setMark('textStyle', { fontSize: size + 'px' }).run();
                  }
                  setFontSizeOpen(false);
                  console.log('Font size applied:', size);
                }}
              >
                {size}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-6 text-xs mt-1 col-span-4"
              onClick={() => {
                editor.chain().focus().unsetMark('textStyle').run();
                setFontSizeOpen(false);
              }}
            >
              Сбросить
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={textColorOpen} onOpenChange={setTextColorOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onMouseDown={(e) => e.preventDefault()}
            title="Цвет текста"
          >
            <Palette className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-2 w-auto" align="start">
          <div className="flex flex-wrap gap-1 w-32">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                className={cn(
                  "w-5 h-5 rounded border border-border hover:scale-110 transition-transform",
                  getCurrentTextColor() === color && "ring-2 ring-primary ring-offset-1"
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  editor.chain().focus().extendMarkRange('textStyle').setColor(color).run();
                  setTextColorOpen(false);
                }}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-6 text-xs mt-1"
                onClick={() => {
                  editor.chain().focus().extendMarkRange('textStyle').unsetColor().run();
                  setTextColorOpen(false);
                }}
            >
              Сбросить
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={highlightColorOpen} onOpenChange={setHighlightColorOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onMouseDown={(e) => e.preventDefault()}
            title="Цвет фона"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-2 w-auto" align="start">
          <div className="flex flex-wrap gap-1 w-32">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                className={cn(
                  "w-5 h-5 rounded border border-border hover:scale-110 transition-transform",
                  getCurrentHighlightColor() === color && "ring-2 ring-primary ring-offset-1"
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  if (color === '#ffffff' || color === '#000000') {
                    editor.chain().focus().unsetHighlight().run();
                  } else {
                    editor.chain().focus().toggleHighlight({ color }).run();
                  }
                  setHighlightColorOpen(false);
                }}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-6 text-xs mt-1"
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                setHighlightColorOpen(false);
              }}
            >
              Сбросить
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-4 bg-border mx-0.5" />

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-6 w-6 text-muted-foreground hover:text-foreground",
          editor.isActive('link') && "bg-primary/20 text-primary"
        )}
        onClick={setLink}
        onMouseDown={(e) => e.preventDefault()}
        title="Ссылка"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </Button>

      {showLinkInput && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Введите URL..."
            className="h-6 px-2 text-xs border rounded w-32"
            onKeyDown={(e) => {
              if (e.key === 'Enter') setLink();
              if (e.key === 'Escape') {
                setShowLinkInput(false);
                setLinkUrl('');
              }
            }}
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              editor.chain().focus().unsetLink().run();
              setShowLinkInput(false);
              setLinkUrl('');
            }}
            title="Удалить ссылку"
          >
            <span className="text-xs">✕</span>
          </Button>
        </div>
      )}

      <div className="w-px h-4 bg-border mx-0.5" />

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-6 w-6 text-muted-foreground hover:text-foreground",
          editor.isActive({ textAlign: 'left' }) && "bg-primary/20 text-primary"
        )}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        onMouseDown={(e) => e.preventDefault()}
        title="По левому краю"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-6 w-6 text-muted-foreground hover:text-foreground",
          editor.isActive({ textAlign: 'center' }) && "bg-primary/20 text-primary"
        )}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        onMouseDown={(e) => e.preventDefault()}
        title="По центру"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-6 w-6 text-muted-foreground hover:text-foreground",
          editor.isActive({ textAlign: 'right' }) && "bg-primary/20 text-primary"
        )}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        onMouseDown={(e) => e.preventDefault()}
        title="По правому краю"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Button>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        onMouseDown={(e) => e.preventDefault()}
        type="button"
      >
        <Undo className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        onMouseDown={(e) => e.preventDefault()}
        type="button"
      >
        <Redo className="h-3.5 w-3.5" />
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
    FontSize.configure({
      HTMLAttributes: {
        class: 'text-style',
      },
    }),
    Color,
    Highlight.configure({
      multicolor: true,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
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
        class: 'tiptap max-w-none min-h-[40px] p-3 focus:outline-none text-black dark:text-white leading-relaxed',
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && content !== editor.getHTML()) {
      try {
        editor.commands.setContent(content);
      } catch (e) {
        console.warn('[RichTextEditor] setContent failed:', e);
      }
    }
  }, [content, editor]);

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden focus-within:ring-2 ring-primary/20 transition-all min-h-[60px] flex flex-col">
      <MenuBar editor={editor} />
      <div className="overflow-y-auto flex-1">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
