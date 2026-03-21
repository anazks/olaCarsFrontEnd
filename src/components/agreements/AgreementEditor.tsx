import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { 
    Bold, Italic, List, ListOrdered, Quote, Undo, Redo, 
    Link as LinkIcon, Underline as UnderlineIcon,
    Heading1, Heading2, Heading3, RemoveFormatting,
    AlignCenter, AlignLeft, AlignRight, Image as ImageIcon
} from 'lucide-react';
import ResizeImage from 'tiptap-extension-resize-image';
import TextAlign from '@tiptap/extension-text-align';

interface AgreementEditorProps {
    content: string;
    onChange: (html: string) => void;
    editable?: boolean;
}

const MenuButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children, 
    title 
}: { 
    onClick: () => void; 
    isActive?: boolean; 
    disabled?: boolean; 
    children: React.ReactNode; 
    title: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-2 rounded-lg transition-all ${
            isActive 
                ? 'bg-lime text-black' 
                : 'text-dim hover:bg-white/5 hover:text-main'
        }`}
        style={{ 
            backgroundColor: isActive ? 'var(--brand-lime)' : 'transparent',
            color: isActive ? 'var(--brand-black)' : 'var(--text-dim)'
        }}
    >
        {children}
    </button>
);

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
            <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
            >
                <Heading1 size={18} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
            >
                <Heading2 size={18} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
            >
                <Heading3 size={18} />
            </MenuButton>
            
            <div className="w-px h-6 bg-border mx-1 my-auto" style={{ backgroundColor: 'var(--border-main)' }} />

            <MenuButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold"
            >
                <Bold size={18} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic"
            >
                <Italic size={18} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline"
            >
                <UnderlineIcon size={18} />
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1 my-auto" style={{ backgroundColor: 'var(--border-main)' }} />

            <MenuButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
            >
                <List size={18} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Ordered List"
            >
                <ListOrdered size={18} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Blockquote"
            >
                <Quote size={18} />
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1 my-auto" style={{ backgroundColor: 'var(--border-main)' }} />

            <MenuButton
                onClick={() => {
                    const url = window.prompt('URL');
                    if (url) {
                        editor.chain().focus().setLink({ href: url }).run();
                    }
                }}
                isActive={editor.isActive('link')}
                title="Add Link"
            >
                <LinkIcon size={18} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().unsetLink().run()}
                disabled={!editor.isActive('link')}
                title="Remove Link"
            >
                <RemoveFormatting size={18} />
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1 my-auto" style={{ backgroundColor: 'var(--border-main)' }} />

            <MenuButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
            >
                <AlignLeft size={18} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
            >
                <AlignCenter size={18} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
            >
                <AlignRight size={18} />
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1 my-auto" style={{ backgroundColor: 'var(--border-main)' }} />

            <MenuButton
                onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (readerEvent) => {
                                const url = readerEvent.target?.result as string;
                                editor.chain().focus().setImage({ src: url }).run();
                            };
                            reader.readAsDataURL(file);
                        }
                    };
                    input.click();
                }}
                title="Import Image"
            >
                <ImageIcon size={18} />
            </MenuButton>

            <div className="flex-1" />

            <MenuButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo"
            >
                <Undo size={18} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo"
            >
                <Redo size={18} />
            </MenuButton>
        </div>
    );
};

const AgreementEditor = ({ content, onChange, editable = true }: AgreementEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
            }),
            ResizeImage,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right'],
                defaultAlignment: 'left',
            }),
        ],
        content,
        editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    return (
        <div className="agreement-editor border rounded-xl overflow-hidden flex flex-col" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
            {editable && <MenuBar editor={editor} />}
            <div className="flex-1 overflow-y-auto min-h-[400px]">
                <EditorContent 
                    editor={editor} 
                    className="p-6 outline-none prose prose-invert max-w-none text-main" 
                />
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .ProseMirror {
                    outline: none;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: var(--text-dim);
                    pointer-events: none;
                    height: 0;
                }
                .ProseMirror h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; color: var(--text-main); }
                .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; color: var(--text-main); }
                .ProseMirror h3 { font-size: 1.25em; font-weight: bold; margin-bottom: 0.5em; color: var(--text-main); }
                .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
                .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
                .ProseMirror blockquote { border-left: 3px solid var(--brand-lime); padding-left: 1em; font-style: italic; margin-bottom: 1em; color: var(--text-dim); }
                .ProseMirror a { color: var(--brand-lime); text-decoration: underline; cursor: pointer; }
                .ProseMirror img { 
                    max-width: 100%; 
                    height: auto; 
                    display: block;
                    margin: 1.5rem auto;
                    border-radius: 0.5rem;
                }
                .ProseMirror .has-text-align-left { text-align: left; }
                .ProseMirror .has-text-align-center { text-align: center; }
                .ProseMirror .has-text-align-right { text-align: right; }
                .ProseMirror .has-text-align-justify { text-align: justify; }
            `}} />
        </div>
    );
};

export default AgreementEditor;
