import { useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useAasStore, type NodeData, type SubmodelElementNodeData } from '../../store/aasStore';
import { DataTypeDefXsd, ModellingKind, AssetKind, EntityType, type LangString, type SubmodelElement, type Reference, ReferenceTypes, type EmbeddedDataSpecification } from '../../types';
import type { Node } from 'reactflow';
import { useLocale } from '@/context/LocaleContext';

interface DetailPanelProps {
  nodes: Node[];
  onClose: () => void;
}

const VALUE_TYPES = Object.values(DataTypeDefXsd);

// --- Reusable Section Components ---

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-border">
      <summary className="flex items-center gap-2 px-4 py-2.5 cursor-pointer text-2xs font-mono font-semibold text-txt-muted uppercase tracking-wider hover:bg-bg-elevated transition-colors">
        <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-0 -rotate-90" />
        {title}
      </summary>
      <div className="px-4 pb-3 space-y-2">{children}</div>
    </details>
  );
}

function Field({ label, value, onChange, mono, disabled }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-2xs text-txt-muted mb-0.5">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className={`w-full bg-bg-input border border-border rounded-sm px-2 py-1 text-xs text-txt-primary focus:border-accent disabled:opacity-50 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-2xs text-txt-muted mb-0.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-bg-input border border-border rounded-sm px-2 py-1 text-xs text-txt-primary focus:border-accent">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function LangStringsEditor({ label, value, onChange }: { label: string; value: LangString[]; onChange: (v: LangString[]) => void }) {
  const { t } = useLocale();
  const add = () => onChange([...value, { language: 'en', text: '' }]);
  return (
    <div>
      <label className="block text-2xs text-txt-muted mb-1">{label}</label>
      <div className="space-y-1">
        {value.map((ls, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input type="text" value={ls.language} onChange={e => onChange(value.map((l, j) => j === i ? { ...l, language: e.target.value } : l))}
              className="w-10 bg-bg-input border border-border rounded-sm px-1 py-0.5 text-2xs font-mono text-center focus:border-accent" />
            <input type="text" value={ls.text} onChange={e => onChange(value.map((l, j) => j === i ? { ...l, text: e.target.value } : l))}
              className="flex-1 bg-bg-input border border-border rounded-sm px-1.5 py-0.5 text-2xs focus:border-accent" />
            <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-txt-muted hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} className="text-2xs text-accent hover:text-accent-hover mt-1">{t('aasEditor.addElement')}</button>
    </div>
  );
}

function ReferenceEditor({ label, value, onChange }: { label: string; value?: Reference; onChange: (v: Reference | undefined) => void }) {
  const ref = value || { type: ReferenceTypes.ExternalReference, keys: [] };
  const keyValue = ref.keys[0]?.value || '';
  const keyType = ref.keys[0]?.type || 'GlobalReference';

  const updateKey = (val: string) => {
    if (!val) { onChange(undefined); return; }
    onChange({ ...ref, keys: [{ type: keyType, value: val }] });
  };

  return (
    <div>
      <label className="block text-2xs text-txt-muted mb-0.5">{label}</label>
      <div className="flex gap-1.5">
        <select value={ref.type} onChange={e => onChange({ ...ref, type: e.target.value as ReferenceTypes })}
          className="w-24 bg-bg-input border border-border rounded-sm px-1 py-0.5 text-2xs focus:border-accent">
          <option value="ExternalReference">External</option>
          <option value="ModelReference">Model</option>
        </select>
        <input type="text" value={keyValue} onChange={e => updateKey(e.target.value)} placeholder="Reference Key"
          className="flex-1 bg-bg-input border border-border rounded-sm px-1.5 py-0.5 text-2xs font-mono focus:border-accent" />
      </div>
    </div>
  );
}

function LinkedDataSpecSection({ semanticId, ownSpecs, onOwnChange: _onOwnChange }: {
  semanticId?: Reference;
  ownSpecs: EmbeddedDataSpecification[];
  onOwnChange: (v: EmbeddedDataSpecification[]) => void;
}) {
  const { t } = useLocale();
  const cds = useAasStore(s => s.conceptDescriptions);
  const semIdValue = semanticId?.keys?.[0]?.value;
  const linkedCd = semIdValue ? cds.find(cd => cd.id === semIdValue) : undefined;

  if (linkedCd) {
    const cdSpecs = linkedCd.embeddedDataSpecifications || [];
    if (cdSpecs.length === 0) {
      return (
        <Section title={`Data Specs (CD: ${linkedCd.idShort || 'CD'})`} defaultOpen={false}>
          <p className="text-2xs text-txt-muted">{t('aasEditor.noDataSpecs')}</p>
        </Section>
      );
    }
    return (
      <Section title={`Data Specs (CD: ${linkedCd.idShort || 'CD'})`}>
        {cdSpecs.map((spec, idx) => (
          <div key={idx} className="space-y-1.5 pb-2 border-b border-border last:border-0 last:pb-0">
            {spec.dataSpecificationContent && (
              <>
                {spec.dataSpecificationContent.preferredName && spec.dataSpecificationContent.preferredName.length > 0 && (
                  <div>
                    <label className="block text-2xs text-txt-muted mb-0.5">Preferred Name</label>
                    {spec.dataSpecificationContent.preferredName.map((ls, i) => (
                      <p key={i} className="text-2xs text-txt-secondary"><span className="font-mono text-txt-muted">{ls.language}</span> {ls.text}</p>
                    ))}
                  </div>
                )}
                {spec.dataSpecificationContent.shortName && spec.dataSpecificationContent.shortName.length > 0 && (
                  <div>
                    <label className="block text-2xs text-txt-muted mb-0.5">Short Name</label>
                    {spec.dataSpecificationContent.shortName.map((ls, i) => (
                      <p key={i} className="text-2xs text-txt-secondary"><span className="font-mono text-txt-muted">{ls.language}</span> {ls.text}</p>
                    ))}
                  </div>
                )}
                {spec.dataSpecificationContent.unit && (
                  <Field label="Unit" value={spec.dataSpecificationContent.unit} onChange={() => {}} disabled />
                )}
                {spec.dataSpecificationContent.dataType && (
                  <Field label="Data Type" value={spec.dataSpecificationContent.dataType} onChange={() => {}} disabled />
                )}
                {spec.dataSpecificationContent.definition && spec.dataSpecificationContent.definition.length > 0 && (
                  <div>
                    <label className="block text-2xs text-txt-muted mb-0.5">Definition</label>
                    {spec.dataSpecificationContent.definition.map((ls, i) => (
                      <p key={i} className="text-2xs text-txt-secondary"><span className="font-mono text-txt-muted">{ls.language}</span> {ls.text}</p>
                    ))}
                  </div>
                )}
                {spec.dataSpecificationContent.value && (
                  <Field label="Value" value={spec.dataSpecificationContent.value} onChange={() => {}} disabled />
                )}
              </>
            )}
          </div>
        ))}
      </Section>
    );
  }

  // No linked CD — show own editable specs (placeholder for now)
  if (ownSpecs.length > 0) {
    return (
      <Section title="Data Specifications" defaultOpen={false}>
        <p className="text-2xs text-txt-muted">{ownSpecs.length} eigene Specification(s)</p>
      </Section>
    );
  }

  return null;
}

// --- Main Panel ---

export function DetailPanel({ nodes, onClose }: DetailPanelProps) {
  const store = useAasStore();
  const selectedNode = useMemo(() => nodes.find(n => n.selected), [nodes]);
  if (!selectedNode) return null;

  const data = selectedNode.data as NodeData;
  const nodeId = selectedNode.id;

  // Type badge
  let typeBadge = '', badgeColor = '';
  if (data.type === 'aas') { typeBadge = 'AAS'; badgeColor = 'text-blue-400 bg-blue-400/10'; }
  else if (data.type === 'submodel') { typeBadge = 'Submodel'; badgeColor = 'text-purple-400 bg-purple-400/10'; }
  else if (data.type === 'element') { typeBadge = data.element.modelType; badgeColor = 'text-cyan-400 bg-cyan-400/10'; }
  else if (data.type === 'conceptDescription') { typeBadge = 'CD'; badgeColor = 'text-orange-400 bg-orange-400/10'; }

  const title = data.type === 'aas' ? data.shell.idShort : data.type === 'submodel' ? data.submodel.idShort :
    data.type === 'element' ? data.element.idShort : data.type === 'conceptDescription' ? data.conceptDescription.idShort : '';

  return (
    <div className="w-[300px] flex-shrink-0 bg-bg-surface border-l border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>{typeBadge}</span>
          <span className="text-xs font-mono text-txt-primary truncate">{title}</span>
        </div>
        <button onClick={onClose} className="text-txt-muted hover:text-txt-primary"><X className="w-4 h-4" /></button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">

        {/* === AAS === */}
        {data.type === 'aas' && (
          <>
            <Section title="Allgemein">
              <Field label="idShort" value={data.shell.idShort || ''} onChange={v => store.updateShellIdShort(nodeId, v)} mono />
              <Field label="id" value={data.shell.id} onChange={v => store.updateShellId(nodeId, v)} mono />
              <Field label="category" value={data.shell.category || ''} onChange={v => store.updateShell(nodeId, { category: v || undefined })} />
            </Section>
            <Section title="Asset Information">
              <Select label="Asset Kind" value={data.shell.assetInformation.assetKind}
                options={[{ value: 'Instance', label: 'Instance' }, { value: 'Type', label: 'Type' }]}
                onChange={v => store.updateShell(nodeId, { assetInformation: { ...data.shell.assetInformation, assetKind: v as AssetKind } })} />
              <Field label="Global Asset ID" value={data.shell.assetInformation.globalAssetId || ''}
                onChange={v => store.updateShell(nodeId, { assetInformation: { ...data.shell.assetInformation, globalAssetId: v } })} mono />
              <Field label="Asset Type" value={data.shell.assetInformation.assetType || ''}
                onChange={v => store.updateShell(nodeId, { assetInformation: { ...data.shell.assetInformation, assetType: v } })} />
            </Section>
            <Section title="Display Name" defaultOpen={false}>
              <LangStringsEditor label="" value={data.shell.displayName || []}
                onChange={v => store.updateShell(nodeId, { displayName: v })} />
            </Section>
            <Section title="Beschreibung" defaultOpen={false}>
              <LangStringsEditor label="" value={data.shell.description || []}
                onChange={v => store.updateShell(nodeId, { description: v })} />
            </Section>
            <Section title="Administration" defaultOpen={false}>
              <Field label="Version" value={data.shell.administration?.version || ''}
                onChange={v => store.updateShell(nodeId, { administration: { ...data.shell.administration, version: v } })} />
              <Field label="Revision" value={data.shell.administration?.revision || ''}
                onChange={v => store.updateShell(nodeId, { administration: { ...data.shell.administration, revision: v } })} />
            </Section>
          </>
        )}

        {/* === Submodel === */}
        {data.type === 'submodel' && (
          <>
            <Section title="Allgemein">
              <Field label="idShort" value={data.submodel.idShort || ''} onChange={v => store.updateSubmodelIdShort(nodeId, v)} mono />
              <Field label="id" value={data.submodel.id} onChange={v => store.updateSubmodelId(nodeId, v)} mono />
              <Field label="category" value={data.submodel.category || ''} onChange={v => store.updateSubmodel(nodeId, { category: v || undefined })} />
              <Select label="Kind" value={data.submodel.kind || 'Instance'}
                options={[{ value: 'Instance', label: 'Instance' }, { value: 'Template', label: 'Template' }]}
                onChange={v => store.updateSubmodel(nodeId, { kind: v as ModellingKind })} />
            </Section>
            <Section title="Semantic ID" defaultOpen={false}>
              <ReferenceEditor label="" value={data.submodel.semanticId}
                onChange={v => store.updateSubmodel(nodeId, { semanticId: v })} />
            </Section>
            <Section title="Display Name" defaultOpen={false}>
              <LangStringsEditor label="" value={data.submodel.displayName || []}
                onChange={v => store.updateSubmodel(nodeId, { displayName: v })} />
            </Section>
            <Section title="Beschreibung" defaultOpen={false}>
              <LangStringsEditor label="" value={data.submodel.description || []}
                onChange={v => store.updateSubmodel(nodeId, { description: v })} />
            </Section>
            <Section title="Administration" defaultOpen={false}>
              <Field label="Version" value={data.submodel.administration?.version || ''}
                onChange={v => store.updateSubmodel(nodeId, { administration: { ...data.submodel.administration, version: v } })} />
              <Field label="Revision" value={data.submodel.administration?.revision || ''}
                onChange={v => store.updateSubmodel(nodeId, { administration: { ...data.submodel.administration, revision: v } })} />
            </Section>
            <LinkedDataSpecSection
              semanticId={data.submodel.semanticId}
              ownSpecs={data.submodel.embeddedDataSpecifications ?? []}
              onOwnChange={v => store.updateSubmodel(nodeId, { embeddedDataSpecifications: v })}
            />
          </>
        )}

        {/* === SubmodelElement === */}
        {data.type === 'element' && (() => {
          const { element, submodelId } = data as SubmodelElementNodeData;
          const upd = (changes: Partial<SubmodelElement>) => store.updateSubmodelElement(submodelId, element._nodeId!, changes);

          return (
            <>
              <Section title="Allgemein">
                <Field label="idShort" value={element.idShort} onChange={v => upd({ idShort: v } as Partial<SubmodelElement>)} mono />
                <Field label="category" value={element.category || ''} onChange={v => upd({ category: v || undefined } as Partial<SubmodelElement>)} />
                <p className="text-2xs text-txt-muted">Typ: {element.modelType}</p>
              </Section>

              {element.modelType === 'Property' && (
                <Section title="Property">
                  <Select label="valueType" value={element.valueType}
                    options={VALUE_TYPES.map(v => ({ value: v, label: v }))}
                    onChange={v => upd({ valueType: v as DataTypeDefXsd } as Partial<SubmodelElement>)} />
                  <Field label="value" value={element.value || ''} onChange={v => upd({ value: v } as Partial<SubmodelElement>)} />
                </Section>
              )}

              {element.modelType === 'Range' && (
                <Section title="Range">
                  <Select label="valueType" value={element.valueType}
                    options={VALUE_TYPES.map(v => ({ value: v, label: v }))}
                    onChange={v => upd({ valueType: v as DataTypeDefXsd } as Partial<SubmodelElement>)} />
                  <Field label="min" value={element.min || ''} onChange={v => upd({ min: v } as Partial<SubmodelElement>)} />
                  <Field label="max" value={element.max || ''} onChange={v => upd({ max: v } as Partial<SubmodelElement>)} />
                </Section>
              )}

              {element.modelType === 'MultiLanguageProperty' && (
                <Section title="MultiLanguageProperty">
                  <LangStringsEditor label="Werte" value={element.value || []}
                    onChange={v => upd({ value: v } as Partial<SubmodelElement>)} />
                </Section>
              )}

              {(element.modelType === 'File' || element.modelType === 'Blob') && (
                <Section title={element.modelType}>
                  <Field label="contentType" value={element.contentType} onChange={v => upd({ contentType: v } as Partial<SubmodelElement>)} />
                  {element.modelType === 'File' && (
                    <Field label="value (path)" value={element.value || ''} onChange={v => upd({ value: v } as Partial<SubmodelElement>)} />
                  )}
                </Section>
              )}

              {element.modelType === 'Entity' && (
                <Section title="Entity">
                  <Select label="entityType" value={element.entityType}
                    options={[{ value: 'SelfManagedEntity', label: 'Self-Managed' }, { value: 'CoManagedEntity', label: 'Co-Managed' }]}
                    onChange={v => upd({ entityType: v as EntityType } as Partial<SubmodelElement>)} />
                  <Field label="Global Asset ID" value={element.globalAssetId || ''}
                    onChange={v => upd({ globalAssetId: v } as Partial<SubmodelElement>)} />
                </Section>
              )}

              {(element.modelType === 'RelationshipElement' || element.modelType === 'AnnotatedRelationshipElement') && (
                <Section title="Relationship">
                  <ReferenceEditor label="First" value={element.first}
                    onChange={v => upd({ first: v || { type: ReferenceTypes.ModelReference, keys: [] } } as Partial<SubmodelElement>)} />
                  <ReferenceEditor label="Second" value={element.second}
                    onChange={v => upd({ second: v || { type: ReferenceTypes.ModelReference, keys: [] } } as Partial<SubmodelElement>)} />
                </Section>
              )}

              {element.modelType === 'BasicEventElement' && (
                <Section title="Event">
                  <Select label="direction" value={element.direction}
                    options={[{ value: 'input', label: 'Input' }, { value: 'output', label: 'Output' }]}
                    onChange={v => upd({ direction: v } as Partial<SubmodelElement>)} />
                  <Select label="state" value={element.state}
                    options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
                    onChange={v => upd({ state: v } as Partial<SubmodelElement>)} />
                </Section>
              )}

              <Section title="Semantic ID" defaultOpen={false}>
                <ReferenceEditor label="" value={element.semanticId}
                  onChange={v => upd({ semanticId: v } as Partial<SubmodelElement>)} />
              </Section>
              <Section title="Display Name" defaultOpen={false}>
                <LangStringsEditor label="" value={element.displayName || []}
                  onChange={v => upd({ displayName: v } as Partial<SubmodelElement>)} />
              </Section>
              <Section title="Beschreibung" defaultOpen={false}>
                <LangStringsEditor label="" value={element.description || []}
                  onChange={v => upd({ description: v } as Partial<SubmodelElement>)} />
              </Section>
              <LinkedDataSpecSection
                semanticId={element.semanticId}
                ownSpecs={element.embeddedDataSpecifications ?? []}
                onOwnChange={v => upd({ embeddedDataSpecifications: v } as Partial<SubmodelElement>)}
              />
            </>
          );
        })()}

        {/* === ConceptDescription === */}
        {data.type === 'conceptDescription' && (
          <>
            <Section title="Allgemein">
              <Field label="idShort" value={data.conceptDescription.idShort || ''} onChange={v => store.updateConceptDescriptionField(nodeId, 'idShort', v)} mono />
              <Field label="id" value={data.conceptDescription.id} onChange={v => store.updateConceptDescriptionField(nodeId, 'id', v)} mono />
              <Field label="category" value={data.conceptDescription.category || ''} onChange={v => store.updateConceptDescriptionField(nodeId, 'category', v || undefined)} />
            </Section>
            <Section title="Display Name" defaultOpen={false}>
              <LangStringsEditor label="" value={data.conceptDescription.displayName || []}
                onChange={v => store.updateConceptDescriptionField(nodeId, 'displayName', v)} />
            </Section>
            <Section title="Beschreibung" defaultOpen={false}>
              <LangStringsEditor label="" value={data.conceptDescription.description || []}
                onChange={v => store.updateConceptDescriptionField(nodeId, 'description', v)} />
            </Section>
            <Section title="Administration" defaultOpen={false}>
              <Field label="Version" value={data.conceptDescription.administration?.version || ''}
                onChange={v => store.updateConceptDescriptionField(nodeId, 'administration', { ...data.conceptDescription.administration, version: v })} />
              <Field label="Revision" value={data.conceptDescription.administration?.revision || ''}
                onChange={v => store.updateConceptDescriptionField(nodeId, 'administration', { ...data.conceptDescription.administration, revision: v })} />
            </Section>
            {/* Embedded Data Specifications */}
            {data.conceptDescription.embeddedDataSpecifications && data.conceptDescription.embeddedDataSpecifications.length > 0 && (
              <Section title={`Data Specifications (${data.conceptDescription.embeddedDataSpecifications.length})`}>
                {data.conceptDescription.embeddedDataSpecifications.map((spec, idx) => (
                  <div key={idx} className="space-y-2 pb-2 border-b border-border last:border-0 last:pb-0">
                    {spec.dataSpecificationContent && (
                      <>
                        <LangStringsEditor label="Preferred Name" value={spec.dataSpecificationContent.preferredName || []}
                          onChange={v => {
                            const specs = [...(data.conceptDescription.embeddedDataSpecifications || [])];
                            specs[idx] = { ...specs[idx], dataSpecificationContent: { ...specs[idx].dataSpecificationContent, preferredName: v } };
                            store.updateConceptDescriptionField(nodeId, 'embeddedDataSpecifications', specs);
                          }} />
                        <LangStringsEditor label="Short Name" value={spec.dataSpecificationContent.shortName || []}
                          onChange={v => {
                            const specs = [...(data.conceptDescription.embeddedDataSpecifications || [])];
                            specs[idx] = { ...specs[idx], dataSpecificationContent: { ...specs[idx].dataSpecificationContent, shortName: v } };
                            store.updateConceptDescriptionField(nodeId, 'embeddedDataSpecifications', specs);
                          }} />
                        <Field label="Unit" value={spec.dataSpecificationContent.unit || ''}
                          onChange={v => {
                            const specs = [...(data.conceptDescription.embeddedDataSpecifications || [])];
                            specs[idx] = { ...specs[idx], dataSpecificationContent: { ...specs[idx].dataSpecificationContent, unit: v } };
                            store.updateConceptDescriptionField(nodeId, 'embeddedDataSpecifications', specs);
                          }} />
                        <Field label="Data Type" value={spec.dataSpecificationContent.dataType || ''}
                          onChange={v => {
                            const specs = [...(data.conceptDescription.embeddedDataSpecifications || [])];
                            specs[idx] = { ...specs[idx], dataSpecificationContent: { ...specs[idx].dataSpecificationContent, dataType: v } };
                            store.updateConceptDescriptionField(nodeId, 'embeddedDataSpecifications', specs);
                          }} />
                        <LangStringsEditor label="Definition" value={spec.dataSpecificationContent.definition || []}
                          onChange={v => {
                            const specs = [...(data.conceptDescription.embeddedDataSpecifications || [])];
                            specs[idx] = { ...specs[idx], dataSpecificationContent: { ...specs[idx].dataSpecificationContent, definition: v } };
                            store.updateConceptDescriptionField(nodeId, 'embeddedDataSpecifications', specs);
                          }} />
                        <Field label="Value" value={spec.dataSpecificationContent.value || ''}
                          onChange={v => {
                            const specs = [...(data.conceptDescription.embeddedDataSpecifications || [])];
                            specs[idx] = { ...specs[idx], dataSpecificationContent: { ...specs[idx].dataSpecificationContent, value: v } };
                            store.updateConceptDescriptionField(nodeId, 'embeddedDataSpecifications', specs);
                          }} />
                      </>
                    )}
                  </div>
                ))}
              </Section>
            )}
            {/* isCaseOf */}
            {data.conceptDescription.isCaseOf && data.conceptDescription.isCaseOf.length > 0 && (
              <Section title={`isCaseOf (${data.conceptDescription.isCaseOf.length})`} defaultOpen={false}>
                {data.conceptDescription.isCaseOf.map((ref, idx) => (
                  <ReferenceEditor key={idx} label={`#${idx + 1}`} value={ref}
                    onChange={v => {
                      const refs = [...(data.conceptDescription.isCaseOf || [])];
                      if (v) refs[idx] = v; else refs.splice(idx, 1);
                      store.updateConceptDescriptionField(nodeId, 'isCaseOf', refs);
                    }} />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
