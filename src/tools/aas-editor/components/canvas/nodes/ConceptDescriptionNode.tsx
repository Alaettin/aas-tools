import { useState } from 'react';
import { type NodeProps } from 'reactflow';
import type { ConceptDescription } from '../../../types';
import { useAasStore } from '../../../store/aasStore';
import { MultiHandles } from '../MultiHandles';

interface CdNodeData { type: 'conceptDescription'; conceptDescription: ConceptDescription }

export function ConceptDescriptionNode({ id, data, selected }: NodeProps<CdNodeData>) {
  const { conceptDescription: cd } = data;
  const store = useAasStore();
  const [editField, setEditField] = useState<string | null>(null);

  const handleEdit = (field: string, value: string) => {
    store.updateConceptDescriptionField(id, field, value);
    setEditField(null);
  };

  return (
    <div className={`bg-bg-surface border rounded w-[280px] relative ${selected ? 'border-orange-400 shadow-lg shadow-orange-400/20' : 'border-border'}`}>
      <MultiHandles color="#fb923c" />

      <div className="bg-orange-400/10 border-b border-border px-3 py-1.5">
        <span className="text-2xs font-mono font-bold text-orange-400 uppercase">CD</span>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {editField === 'idShort' ? (
          <input type="text" defaultValue={cd.idShort || ''} onBlur={e => handleEdit('idShort', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditField(null); }} autoFocus className="w-full bg-bg-input border border-accent rounded-sm px-1.5 py-0.5 text-xs font-mono text-txt-primary focus:outline-none" />
        ) : (
          <p className="text-xs font-mono font-semibold text-txt-primary cursor-text truncate" onDoubleClick={() => setEditField('idShort')}>{cd.idShort || 'ConceptDescription'}</p>
        )}

        {editField === 'id' ? (
          <input type="text" defaultValue={cd.id} onBlur={e => handleEdit('id', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditField(null); }} autoFocus className="w-full bg-bg-input border border-accent rounded-sm px-1.5 py-0.5 text-2xs font-mono text-txt-muted focus:outline-none" />
        ) : (
          <p className="text-2xs font-mono text-txt-muted cursor-text truncate" onDoubleClick={() => setEditField('id')} title={cd.id}>{cd.id}</p>
        )}

        {/* Info badges */}
        {(cd.embeddedDataSpecifications?.length || cd.isCaseOf?.length) ? (
          <div className="flex items-center gap-2 mt-1">
            {cd.embeddedDataSpecifications && cd.embeddedDataSpecifications.length > 0 && (
              <span className="text-2xs text-orange-400/70">{cd.embeddedDataSpecifications.length} Data Specs</span>
            )}
            {cd.isCaseOf && cd.isCaseOf.length > 0 && (
              <span className="text-2xs text-orange-400/70">{cd.isCaseOf.length} isCaseOf</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
