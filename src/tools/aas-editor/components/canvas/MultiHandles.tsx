import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from 'reactflow';
import { Plus } from 'lucide-react';

const POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function getHoverZoneStyle(pos: Position): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute', width: 28, height: 28 };
  switch (pos) {
    case Position.Top: return { ...base, top: -14, left: '50%', transform: 'translateX(-50%)' };
    case Position.Right: return { ...base, right: -14, top: '50%', transform: 'translateY(-50%)' };
    case Position.Bottom: return { ...base, bottom: -14, left: '50%', transform: 'translateX(-50%)' };
    case Position.Left: return { ...base, left: -14, top: '50%', transform: 'translateY(-50%)' };
  }
}

const PLUS_OFFSET: Record<string, React.CSSProperties> = {
  [Position.Top]: { bottom: '100%', left: '50%', transform: 'translate(-50%, -4px)' },
  [Position.Right]: { left: '100%', top: '50%', transform: 'translate(4px, -50%)' },
  [Position.Bottom]: { top: '100%', left: '50%', transform: 'translate(-50%, 4px)' },
  [Position.Left]: { right: '100%', top: '50%', transform: 'translate(-4px, -50%)' },
};

export interface AddOption {
  value: string;
  label: string;
  color: string;
}

export const ELEMENT_OPTIONS: AddOption[] = [
  { value: 'Property', label: 'Property', color: '#22d3ee' },
  { value: 'SubmodelElementCollection', label: 'Collection', color: '#facc15' },
  { value: 'SubmodelElementList', label: 'List', color: '#facc15' },
  { value: 'MultiLanguageProperty', label: 'Multi-Language', color: '#22d3ee' },
  { value: 'Range', label: 'Range', color: '#22d3ee' },
  { value: 'File', label: 'File', color: '#9ca3af' },
  { value: 'Blob', label: 'Blob', color: '#9ca3af' },
  { value: 'ReferenceElement', label: 'Reference', color: '#9ca3af' },
  { value: 'Entity', label: 'Entity', color: '#22d3ee' },
  { value: 'RelationshipElement', label: 'Relationship', color: '#9ca3af' },
  { value: 'AnnotatedRelationshipElement', label: 'Annotated Rel.', color: '#9ca3af' },
  { value: 'BasicEventElement', label: 'Event', color: '#9ca3af' },
  { value: 'Operation', label: 'Operation', color: '#9ca3af' },
  { value: 'Capability', label: 'Capability', color: '#9ca3af' },
];

interface MultiHandlesProps {
  color: string;
  addMode?: 'direct' | 'dropdown';
  onAdd?: (modelType?: string, position?: Position) => void;
  addOptions?: AddOption[];
}

export function MultiHandles({ color, addMode, onAdd, addOptions }: MultiHandlesProps) {
  const [hoveredPos, setHoveredPos] = useState<Position | null>(null);
  const [popupPos, setPopupPos] = useState<Position | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const plusBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});

  const cancelHide = useCallback(() => {
    if (hideTimeout.current) { clearTimeout(hideTimeout.current); hideTimeout.current = null; }
  }, []);

  const startHide = useCallback((pos: Position) => {
    cancelHide();
    hideTimeout.current = setTimeout(() => {
      setHoveredPos(current => (current === pos && popupPos !== pos) ? null : current);
      hideTimeout.current = null;
    }, 300);
  }, [cancelHide, popupPos]);

  useEffect(() => () => { if (hideTimeout.current) clearTimeout(hideTimeout.current); }, []);

  useEffect(() => {
    if (!popupPos) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as HTMLElement)) setPopupPos(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popupPos]);

  const handlePlusClick = (pos: Position, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onAdd) return;
    if (addMode === 'direct') {
      onAdd(undefined, pos);
      setHoveredPos(null);
    } else if (addMode === 'dropdown') {
      if (popupPos === pos) { setPopupPos(null); return; }
      const btn = plusBtnRefs.current[pos];
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const style: React.CSSProperties = { position: 'fixed', zIndex: 9999 };
        switch (pos) {
          case Position.Top: style.left = rect.left + rect.width / 2; style.top = rect.top - 4; style.transform = 'translate(-50%, -100%)'; break;
          case Position.Bottom: style.left = rect.left + rect.width / 2; style.top = rect.bottom + 4; style.transform = 'translateX(-50%)'; break;
          case Position.Right: style.left = rect.right + 4; style.top = rect.top + rect.height / 2; style.transform = 'translateY(-50%)'; break;
          case Position.Left: style.left = rect.left - 4; style.top = rect.top + rect.height / 2; style.transform = 'translate(-100%, -50%)'; break;
        }
        setPortalStyle(style);
      }
      setPopupPos(pos);
    }
  };

  const handleDotStyle: React.CSSProperties = {
    width: 10, height: 10, backgroundColor: color,
    border: '2px solid #1F2937', opacity: 0.8, zIndex: 5,
  };

  return (
    <>
      {/* Dropdown Portal */}
      {popupPos && addOptions && createPortal(
        <div
          ref={popupRef}
          onMouseDown={e => e.stopPropagation()}
          className="bg-bg-surface border border-border rounded shadow-lg py-1 min-w-[160px] max-h-[60vh] overflow-y-auto"
          style={portalStyle}
        >
          {addOptions.map(opt => (
            <button
              key={opt.value}
              onClick={e => { e.stopPropagation(); onAdd?.(opt.value, popupPos); setPopupPos(null); setHoveredPos(null); }}
              onMouseDown={e => e.stopPropagation()}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors text-left"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
              {opt.label}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {/* Hover Zones */}
      {POSITIONS.map(pos => (
        <div
          key={`hover-${pos}`}
          onMouseEnter={() => { cancelHide(); setHoveredPos(pos); }}
          onMouseLeave={() => startHide(pos)}
          style={getHoverZoneStyle(pos)}
        >
          {addMode && onAdd && (hoveredPos === pos || popupPos === pos) && (
            <button
              ref={el => { plusBtnRefs.current[pos] = el; }}
              onClick={e => handlePlusClick(pos, e)}
              onMouseDown={e => e.stopPropagation()}
              onMouseEnter={cancelHide}
              onMouseLeave={() => startHide(pos)}
              className="absolute flex items-center justify-center w-7 h-7 rounded-full border-none text-white cursor-pointer z-20 shadow-lg"
              style={{ ...PLUS_OFFSET[pos], backgroundColor: color }}
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          )}
        </div>
      ))}

      {/* Source Handles */}
      {POSITIONS.map(pos => (
        <Handle key={`source-${pos}`} type="source" position={pos} id={`source-${pos}`} style={handleDotStyle} />
      ))}
      {/* Target Handles (invisible, larger hit area) */}
      {POSITIONS.map(pos => (
        <Handle key={`target-${pos}`} type="target" position={pos} id={`target-${pos}`} style={{ ...handleDotStyle, opacity: 0, width: 20, height: 20 }} />
      ))}
    </>
  );
}
