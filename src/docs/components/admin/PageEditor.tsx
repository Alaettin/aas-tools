import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Link,
  Image,
  List,
  Code,
} from 'lucide-react';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { useLocale } from '@/context/LocaleContext';
import { useDocPage } from '../../hooks/useDocPage';
import { useDocImageUpload } from '../../hooks/useDocImageUpload';
import { MarkdownPreview } from '../shared/MarkdownPreview';

const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0D1321',
    color: '#F9FAFB',
    fontSize: '14px',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: 'JetBrains Mono, monospace',
    padding: '16px',
    caretColor: '#06B6D4',
  },
  '.cm-cursor': {
    borderLeftColor: '#06B6D4',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: '#083344 !important',
  },
  '.cm-gutters': {
    backgroundColor: '#0D1321',
    borderRight: '1px solid #1F2937',
    color: '#4B5563',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#111827',
  },
  '.cm-activeLine': {
    backgroundColor: '#111827',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
});

function insertAtCursor(view: EditorView, before: string, after = '') {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: before + selected + after },
    selection: { anchor: from + before.length + selected.length },
  });
  view.focus();
}

export function PageEditor() {
  const { manualId, pageId } = useParams<{ manualId: string; pageId: string }>();
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useLocale();
  const { page, content, setContent, loading, saving, error, save } = useDocPage(pageId);
  const { upload, uploading } = useDocImageUpload(manualId);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        markdown(),
        darkTheme,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        cmPlaceholder(t('docs.editor.placeholder')),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            setContent(update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [loading]); // Re-create when loading finishes

  // Sync content from external changes (initial load)
  useEffect(() => {
    if (viewRef.current && page) {
      const currentDoc = viewRef.current.state.doc.toString();
      if (currentDoc !== content && content === page.content) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: content },
        });
      }
    }
  }, [page]);

  const handleImageUpload = useCallback(async (file: File) => {
    const url = await upload(file);
    if (url && viewRef.current) {
      insertAtCursor(viewRef.current, `![${file.name}](${url})`);
    }
  }, [upload]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const toolbar = [
    { icon: Bold, action: () => viewRef.current && insertAtCursor(viewRef.current, '**', '**'), title: t('docs.editor.bold') },
    { icon: Italic, action: () => viewRef.current && insertAtCursor(viewRef.current, '*', '*'), title: t('docs.editor.italic') },
    { icon: Code, action: () => viewRef.current && insertAtCursor(viewRef.current, '`', '`'), title: t('docs.editor.code') },
    null, // separator
    { icon: Heading1, action: () => viewRef.current && insertAtCursor(viewRef.current, '# '), title: t('docs.editor.heading1') },
    { icon: Heading2, action: () => viewRef.current && insertAtCursor(viewRef.current, '## '), title: t('docs.editor.heading2') },
    { icon: List, action: () => viewRef.current && insertAtCursor(viewRef.current, '- '), title: t('docs.editor.list') },
    null,
    { icon: Link, action: () => viewRef.current && insertAtCursor(viewRef.current, '[', '](url)'), title: t('docs.editor.link') },
    { icon: Image, action: () => fileInputRef.current?.click(), title: t('docs.editor.insertImage') },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!page) {
    return <p className="text-sm text-red-400">{t('docs.editor.pageNotFound')}</p>;
  }

  return (
    <div className="-m-6 animate-fade-in flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/docs/admin/${manualId}`)}
            className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors font-mono"
          >
            <ArrowLeft className="w-3 h-3" />
            {t('docs.editor.back')}
          </button>
          <h2 className="font-mono text-sm font-semibold">{page.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {uploading && (
            <span className="text-2xs text-txt-muted flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> {t('docs.editor.uploading')}
            </span>
          )}
          {error && <span className="text-2xs text-red-400">{error}</span>}
          <button
            onClick={() => save()}
            disabled={saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</>
            )}
            {t('docs.editor.save')}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-6 py-2 border-b border-border flex-shrink-0 bg-bg-surface">
        {toolbar.map((item, i) =>
          item === null ? (
            <div key={i} className="w-px h-5 bg-border mx-1" />
          ) : (
            <button
              key={i}
              onClick={item.action}
              title={item.title}
              className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-bg-elevated rounded-sm transition-colors"
            >
              <item.icon className="w-4 h-4" />
            </button>
          )
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Split View */}
      <div className="flex-1 flex min-h-0">
        {/* Editor */}
        <div
          ref={editorRef}
          className="w-1/2 border-r border-border overflow-auto"
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
        />

        {/* Preview */}
        <div className="w-1/2 overflow-auto p-6">
          <MarkdownPreview content={content} />
        </div>
      </div>
    </div>
  );
}
