import { useRef } from 'react';
import { Box, BookOpen, Plus, Download, Upload } from 'lucide-react';
import { useAasStore } from '../../store/aasStore';
import { downloadJson } from '../../lib/export';

interface ToolbarProps {
  onAddShell: () => void;
  onAddSubmodel: () => void;
  onAddConceptDescription: () => void;
}

export function Toolbar({ onAddShell, onAddSubmodel, onAddConceptDescription }: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const store = useAasStore();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        store.importEnvironment(reader.result as string, { x: 100, y: 100 });
      } catch (err) {
        console.error('Import failed:', err);
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleExport = () => {
    const name = 'aas_export.json';
    downloadJson(name);
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-bg-surface/90 backdrop-blur-sm border border-border rounded-sm px-2 py-1.5">
      <button onClick={onAddShell} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-400/10 rounded-sm transition-colors" title="Neue AAS">
        <Box className="w-3.5 h-3.5" /> AAS
      </button>
      <button onClick={onAddSubmodel} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-400/10 rounded-sm transition-colors" title="Neues Submodel">
        <Plus className="w-3.5 h-3.5" /> Submodel
      </button>
      <div className="w-px h-5 bg-border mx-1" />
      <button onClick={onAddConceptDescription} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-400/10 rounded-sm transition-colors" title="Neue CD">
        <BookOpen className="w-3.5 h-3.5" /> CD
      </button>
      <div className="w-px h-5 bg-border mx-1" />
      <button onClick={handleExport} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-400/10 rounded-sm transition-colors" title="Export JSON">
        <Download className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 rounded-sm transition-colors" title="Import JSON">
        <Upload className="w-3.5 h-3.5" />
      </button>
      <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
    </div>
  );
}
