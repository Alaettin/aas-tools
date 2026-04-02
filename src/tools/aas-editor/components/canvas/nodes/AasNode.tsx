import { useState } from 'react';
import { type NodeProps } from 'reactflow';
import type { AssetAdministrationShell } from '../../../types';
import { useAasStore } from '../../../store/aasStore';
import { MultiHandles } from '../MultiHandles';

interface AasNodeData { type: 'aas'; shell: AssetAdministrationShell }

export function AasNode({ id, data, selected }: NodeProps<AasNodeData>) {
  const { shell } = data;
  const store = useAasStore();
  const [editField, setEditField] = useState<string | null>(null);

  const handleEdit = (field: string, value: string) => {
    if (field === 'idShort') store.updateShellIdShort(id, value);
    else if (field === 'id') store.updateShellId(id, value);
    else store.updateShell(id, { [field]: value });
    setEditField(null);
  };

  return (
    <div className={`bg-bg-surface border rounded w-[280px] relative ${selected ? 'border-blue-400 shadow-lg shadow-blue-400/20' : 'border-border'}`}>
      <MultiHandles
        color="#60a5fa"
        addMode="direct"
        onAdd={(_, pos) => store.addSubmodelToShell(id, pos)}
      />

      <div className="bg-blue-400/10 border-b border-border px-3 py-2">
        <span className="text-2xs font-mono font-bold text-blue-400 uppercase">AAS</span>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {editField === 'idShort' ? (
          <input type="text" defaultValue={shell.idShort || ''} onBlur={e => handleEdit('idShort', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditField(null); }} autoFocus className="w-full bg-bg-input border border-accent rounded-sm px-1.5 py-0.5 text-xs font-mono text-txt-primary focus:outline-none" />
        ) : (
          <p className="text-sm font-mono font-semibold text-txt-primary cursor-text truncate" onDoubleClick={() => setEditField('idShort')}>{shell.idShort || 'AAS'}</p>
        )}

        {editField === 'id' ? (
          <input type="text" defaultValue={shell.id} onBlur={e => handleEdit('id', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditField(null); }} autoFocus className="w-full bg-bg-input border border-accent rounded-sm px-1.5 py-0.5 text-2xs font-mono text-txt-muted focus:outline-none" />
        ) : (
          <p className="text-2xs font-mono text-txt-muted cursor-text truncate" onDoubleClick={() => setEditField('id')} title={shell.id}>{shell.id}</p>
        )}

        <p className="text-2xs text-txt-muted">{shell.assetInformation.assetKind}</p>
      </div>
    </div>
  );
}
