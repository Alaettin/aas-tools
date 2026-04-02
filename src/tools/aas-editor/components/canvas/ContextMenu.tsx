import { useEffect, useRef } from 'react';
import { Trash2, Plus, Clipboard, ClipboardPaste } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId?: string;
  nodeType?: string;
  onClose: () => void;
  onDelete?: (nodeId: string) => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onAddElement?: (parentId: string) => void;
  onAddShell?: () => void;
  onAddSubmodel?: () => void;
  onAddCD?: () => void;
  hasClipboard?: boolean;
}

export function ContextMenu({
  x, y, nodeId, nodeType, onClose,
  onDelete, onCopy, onPaste, onAddElement,
  onAddShell, onAddSubmodel, onAddCD, hasClipboard,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const isNode = !!nodeId;
  const canAddElement = nodeType === 'submodelNode' || nodeType === 'elementNode';

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-bg-surface border border-border rounded shadow-lg py-1 min-w-[170px] animate-fade-in"
      style={{ left: x, top: y }}
    >
      {isNode ? (
        <>
          {canAddElement && onAddElement && (
            <button
              onClick={() => { onAddElement(nodeId!); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Element hinzufügen
            </button>
          )}
          {onCopy && (
            <button
              onClick={() => { onCopy(); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Kopieren
            </button>
          )}
          {onPaste && hasClipboard && (
            <button
              onClick={() => { onPaste(); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              Einfügen
            </button>
          )}
          {onDelete && (
            <>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => { onDelete(nodeId!); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Löschen
              </button>
            </>
          )}
        </>
      ) : (
        <>
          {onAddShell && (
            <button
              onClick={() => { onAddShell(); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              Neue AAS
            </button>
          )}
          {onAddSubmodel && (
            <button
              onClick={() => { onAddSubmodel(); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              Neues Submodel
            </button>
          )}
          {onAddCD && (
            <button
              onClick={() => { onAddCD(); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-orange-400" />
              Neue CD
            </button>
          )}
          {onPaste && hasClipboard && (
            <>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => { onPaste(); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Einfügen
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
