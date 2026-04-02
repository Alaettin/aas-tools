import { useState } from 'react';
import { type NodeProps } from 'reactflow';
import type { Submodel } from '../../../types';
import { useAasStore } from '../../../store/aasStore';
import { MultiHandles, ELEMENT_OPTIONS } from '../MultiHandles';

interface SubmodelNodeData { type: 'submodel'; submodel: Submodel }

export function SubmodelNode({ id, data, selected }: NodeProps<SubmodelNodeData>) {
  const { submodel } = data;
  const store = useAasStore();
  const [editField, setEditField] = useState<string | null>(null);

  const handleEdit = (field: string, value: string) => {
    if (field === 'idShort') store.updateSubmodelIdShort(id, value);
    else if (field === 'id') store.updateSubmodelId(id, value);
    else store.updateSubmodel(id, { [field]: value });
    setEditField(null);
  };

  const elementCount = submodel.submodelElements?.length || 0;

  return (
    <div className={`bg-bg-surface border rounded w-[280px] relative ${selected ? 'border-purple-400 shadow-lg shadow-purple-400/20' : 'border-border'}`}>
      <MultiHandles
        color="#c084fc"
        addMode="dropdown"
        addOptions={ELEMENT_OPTIONS}
        onAdd={(modelType, pos) => { if (modelType) store.addSubmodelElement(id, modelType, pos); }}
      />

      <div className="bg-purple-400/10 border-b border-border px-3 py-2">
        <span className="text-2xs font-mono font-bold text-purple-400 uppercase">Submodel</span>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {editField === 'idShort' ? (
          <input type="text" defaultValue={submodel.idShort || ''} onBlur={e => handleEdit('idShort', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditField(null); }} autoFocus className="w-full bg-bg-input border border-accent rounded-sm px-1.5 py-0.5 text-xs font-mono text-txt-primary focus:outline-none" />
        ) : (
          <p className="text-sm font-mono font-semibold text-txt-primary cursor-text truncate" onDoubleClick={() => setEditField('idShort')}>{submodel.idShort || 'Submodel'}</p>
        )}

        {editField === 'id' ? (
          <input type="text" defaultValue={submodel.id} onBlur={e => handleEdit('id', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditField(null); }} autoFocus className="w-full bg-bg-input border border-accent rounded-sm px-1.5 py-0.5 text-2xs font-mono text-txt-muted focus:outline-none" />
        ) : (
          <p className="text-2xs font-mono text-txt-muted cursor-text truncate" onDoubleClick={() => setEditField('id')} title={submodel.id}>{submodel.id}</p>
        )}

        <p className="text-2xs text-txt-muted">{elementCount} {elementCount === 1 ? 'Element' : 'Elemente'}</p>
      </div>
    </div>
  );
}
