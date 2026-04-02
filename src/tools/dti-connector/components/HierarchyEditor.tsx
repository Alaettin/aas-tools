import { useRef } from 'react';
import { GripVertical, Plus, X, Save, Loader2 } from 'lucide-react';
import { useHierarchy } from '../hooks/useHierarchy';
import { validateHierarchyName } from '../lib/validation';

interface HierarchyEditorProps {
  connectorId: string;
}

export function HierarchyEditor({ connectorId }: HierarchyEditorProps) {
  const {
    levels, loading, saving, error, hasChanges,
    addLevel, removeLevel, updateName, reorder, save,
  } = useHierarchy(connectorId);

  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const validationErrors = levels.map(l => validateHierarchyName(l.name));
  const hasErrors = validationErrors.some(e => e !== null);
  const canSave = hasChanges && !hasErrors && levels.length > 0 && levels.every(l => l.name.trim());

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = () => {
    if (dragIndex.current !== null && dragOverIndex.current !== null && dragIndex.current !== dragOverIndex.current) {
      reorder(dragIndex.current, dragOverIndex.current);
    }
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-mono text-lg font-semibold">Hierarchy Levels</h2>
          <p className="text-xs text-txt-muted mt-0.5">
            {levels.length} {levels.length === 1 ? 'Level' : 'Levels'}
          </p>
        </div>
        <button
          onClick={() => save()}
          disabled={!canSave || saving}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Speichern
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Levels */}
      <div className="space-y-2 mb-4">
        {levels.map((level, i) => {
          const err = level.name ? validationErrors[i] : null;
          return (
            <div
              key={level.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={handleDrop}
              className="flex items-center gap-3 bg-bg-surface border border-border rounded px-3 py-2.5 group hover:border-border-hover transition-colors"
            >
              <GripVertical className="w-4 h-4 text-txt-muted cursor-grab flex-shrink-0" />
              <span className="text-xs font-mono text-txt-muted w-6 text-center flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1">
                <input
                  type="text"
                  value={level.name}
                  onChange={e => updateName(i, e.target.value)}
                  placeholder="Level-Name…"
                  className={`w-full bg-transparent text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none ${
                    err ? 'text-red-400' : ''
                  }`}
                />
                {err && (
                  <p className="text-2xs text-red-400 mt-0.5">{err}</p>
                )}
              </div>
              {levels.length > 1 && (
                <button
                  onClick={() => removeLevel(i)}
                  className="p-1 text-txt-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Entfernen"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add */}
      <button
        onClick={addLevel}
        className="flex items-center gap-2 text-sm text-txt-secondary hover:text-accent transition-colors"
      >
        <Plus className="w-4 h-4" />
        Level hinzufügen
      </button>
    </div>
  );
}
