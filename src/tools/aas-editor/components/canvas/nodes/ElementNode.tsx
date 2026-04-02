import { useState } from 'react';
import { type NodeProps } from 'reactflow';
import { DataTypeDefXsd, type SubmodelElement } from '../../../types';
import { useAasStore, isContainerElement, type SubmodelElementNodeData } from '../../../store/aasStore';
import { MultiHandles, ELEMENT_OPTIONS } from '../MultiHandles';

const VALUE_TYPES = [
  DataTypeDefXsd.String, DataTypeDefXsd.Int, DataTypeDefXsd.Double, DataTypeDefXsd.Boolean,
  DataTypeDefXsd.DateTime, DataTypeDefXsd.Decimal, DataTypeDefXsd.Long, DataTypeDefXsd.Float, DataTypeDefXsd.AnyURI,
];

const TYPE_COLORS: Record<string, { text: string; bg: string }> = {
  Property: { text: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  MultiLanguageProperty: { text: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  Range: { text: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  SubmodelElementCollection: { text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  SubmodelElementList: { text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  Entity: { text: 'text-cyan-400', bg: 'bg-cyan-400/10' },
};
const DEFAULT_COLOR = { text: 'text-txt-muted', bg: 'bg-bg-elevated' };

export function ElementNode({ id, data, selected }: NodeProps<SubmodelElementNodeData>) {
  const { element, submodelId } = data;
  const store = useAasStore();
  const [editField, setEditField] = useState<string | null>(null);

  const handleEdit = (field: string, value: string) => {
    store.updateSubmodelElement(submodelId, element._nodeId!, { [field]: value } as Partial<SubmodelElement>);
    setEditField(null);
  };

  const color = TYPE_COLORS[element.modelType] || DEFAULT_COLOR;
  const container = isContainerElement(element);

  // Resolve linked ConceptDescriptions (main + supplemental)
  const cds = useAasStore(s => s.conceptDescriptions);
  const allSemIds: string[] = [];
  if (element.semanticId?.keys?.[0]?.value) allSemIds.push(element.semanticId.keys[0].value);
  for (const ref of element.supplementalSemanticIds || []) {
    if (ref.keys?.[0]?.value) allSemIds.push(ref.keys[0].value);
  }
  const linkedCds = allSemIds.map(id => cds.find(cd => cd.id === id)).filter(Boolean);

  return (
    <div className={`bg-bg-surface border rounded w-[280px] relative ${selected ? 'border-cyan-400 shadow-lg shadow-cyan-400/20' : 'border-border'}`}>
      {container ? (
        <MultiHandles
          color="#facc15"
          addMode="dropdown"
          addOptions={ELEMENT_OPTIONS}
          onAdd={(modelType, pos) => { if (modelType) store.addSubmodelElement(id, modelType, pos); }}
        />
      ) : (
        <MultiHandles color="#22d3ee" />
      )}

      <div className={`border-b border-border px-3 py-1.5 ${color.bg}`}>
        <span className={`text-2xs font-mono font-bold uppercase ${color.text}`}>{element.modelType}</span>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {editField === 'idShort' ? (
          <input type="text" defaultValue={element.idShort} onBlur={e => handleEdit('idShort', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditField(null); }} autoFocus className="w-full bg-bg-input border border-accent rounded-sm px-1.5 py-0.5 text-xs font-mono text-txt-primary focus:outline-none" />
        ) : (
          <p className="text-xs font-mono font-semibold text-txt-primary cursor-text truncate" onDoubleClick={() => setEditField('idShort')}>{element.idShort}</p>
        )}

        {element.modelType === 'Property' && (
          <div className="space-y-1">
            <select value={element.valueType} onChange={e => store.updateSubmodelElement(submodelId, element._nodeId!, { valueType: e.target.value as DataTypeDefXsd } as Partial<SubmodelElement>)} className="w-full bg-bg-input border border-border rounded-sm px-1.5 py-0.5 text-2xs text-txt-secondary focus:border-accent">
              {VALUE_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
            </select>
            {editField === 'value' ? (
              <input type="text" defaultValue={element.value || ''} onBlur={e => handleEdit('value', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditField(null); }} autoFocus className="w-full bg-bg-input border border-accent rounded-sm px-1.5 py-0.5 text-2xs font-mono text-txt-primary focus:outline-none" />
            ) : (
              <p className="text-2xs font-mono text-txt-muted cursor-text truncate" onDoubleClick={() => setEditField('value')}>{element.value || '(kein Wert)'}</p>
            )}
          </div>
        )}

        {element.modelType === 'Range' && (
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-2xs text-txt-muted">min</p>
              <input type="text" value={element.min || ''} onChange={e => store.updateSubmodelElement(submodelId, element._nodeId!, { min: e.target.value } as Partial<SubmodelElement>)} className="w-full bg-bg-input border border-border rounded-sm px-1 py-0.5 text-2xs font-mono text-txt-primary focus:border-accent" />
            </div>
            <div className="flex-1">
              <p className="text-2xs text-txt-muted">max</p>
              <input type="text" value={element.max || ''} onChange={e => store.updateSubmodelElement(submodelId, element._nodeId!, { max: e.target.value } as Partial<SubmodelElement>)} className="w-full bg-bg-input border border-border rounded-sm px-1 py-0.5 text-2xs font-mono text-txt-primary focus:border-accent" />
            </div>
          </div>
        )}

        {element.modelType === 'MultiLanguageProperty' && <p className="text-2xs text-txt-muted">{element.value?.length || 0} Sprachen</p>}
        {container && <p className="text-2xs text-txt-muted">{(element as { value?: unknown[] }).value?.length || 0} Elemente</p>}
        {element.modelType === 'Entity' && <p className="text-2xs text-txt-muted">{element.entityType}</p>}
        {(element.modelType === 'File' || element.modelType === 'Blob') && <p className="text-2xs text-txt-muted">{element.contentType}</p>}

        {/* Linked ConceptDescriptions */}
        {linkedCds.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-border space-y-0.5">
            {linkedCds.map(cd => (
              <p key={cd!.id} className="text-2xs text-orange-400 truncate" title={cd!.idShort || cd!.id}>
                CD: {cd!.idShort || cd!.id}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
