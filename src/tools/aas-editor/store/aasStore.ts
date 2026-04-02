import { create } from 'zustand';
import { temporal } from 'zundo';
import { type Node, type Edge, Position, addEdge, type Connection } from 'reactflow';
import {
  AssetKind, DataTypeDefXsd, Direction, StateOfEvent, EntityType, ReferenceTypes,
  type AssetAdministrationShell, type Submodel, type ConceptDescription, type SubmodelElement,
} from '../types';
import { importFromJson } from '../lib/import';

// --- ID Generation ---
let _idCounter = 0;
function generateId() { return `n_${Date.now().toString(36)}_${++_idCounter}`; }
function generateUrn(prefix: string) { return `urn:aas:${prefix}:${crypto.randomUUID().slice(0, 8)}`; }

// --- Node Data Types ---
export interface AASNodeData { type: 'aas'; shell: AssetAdministrationShell }
export interface SubmodelNodeData { type: 'submodel'; submodel: Submodel }
export interface SubmodelElementNodeData { type: 'element'; submodelId: string; element: SubmodelElement }
export interface ConceptDescriptionNodeData { type: 'conceptDescription'; conceptDescription: ConceptDescription }
export type NodeData = AASNodeData | SubmodelNodeData | SubmodelElementNodeData | ConceptDescriptionNodeData;

// --- Edge Cache ---
let _cachedEdges: Edge[] | null = null;
let _bySource = new Map<string, Edge[]>();

function getEdgesBySource(edges: Edge[]): Map<string, Edge[]> {
  if (edges !== _cachedEdges) {
    _cachedEdges = edges;
    _bySource = new Map();
    for (const e of edges) {
      let arr = _bySource.get(e.source);
      if (!arr) { arr = []; _bySource.set(e.source, arr); }
      arr.push(e);
    }
  }
  return _bySource;
}

// --- Selectors ---
export function selectEdgesBySource(nodeId: string) {
  return (s: { edges: Edge[] }) => getEdgesBySource(s.edges).get(nodeId)?.length ?? 0;
}

// --- Container Helpers ---
export function isContainerElement(el: SubmodelElement): boolean {
  return el.modelType === 'SubmodelElementCollection' || el.modelType === 'SubmodelElementList';
}

function getContainerChildren(el: SubmodelElement): SubmodelElement[] {
  if (isContainerElement(el)) return (el as { value?: SubmodelElement[] }).value ?? [];
  return [];
}

function findElementByNodeId(elements: SubmodelElement[], nodeId: string): SubmodelElement | undefined {
  for (const el of elements) {
    if (el._nodeId === nodeId) return el;
    if (isContainerElement(el)) {
      const found = findElementByNodeId(getContainerChildren(el), nodeId);
      if (found) return found;
    }
  }
  return undefined;
}

function mapElements(elements: SubmodelElement[], nodeId: string, mapper: (el: SubmodelElement) => SubmodelElement): SubmodelElement[] {
  return elements.map(el => {
    if (el._nodeId === nodeId) return mapper(el);
    if (isContainerElement(el)) return { ...el, value: mapElements(getContainerChildren(el), nodeId, mapper) } as SubmodelElement;
    return el;
  });
}

function addToContainer(elements: SubmodelElement[], containerNodeId: string, newEl: SubmodelElement): SubmodelElement[] {
  return elements.map(el => {
    if (el._nodeId === containerNodeId && isContainerElement(el)) return { ...el, value: [...getContainerChildren(el), newEl] } as SubmodelElement;
    if (isContainerElement(el)) return { ...el, value: addToContainer(getContainerChildren(el), containerNodeId, newEl) } as SubmodelElement;
    return el;
  });
}

export function filterElements(elements: SubmodelElement[], nodeId: string): SubmodelElement[] {
  return elements.filter(el => el._nodeId !== nodeId).map(el => {
    if (isContainerElement(el)) return { ...el, value: filterElements(getContainerChildren(el), nodeId) } as SubmodelElement;
    return el;
  });
}

export function collectDownstreamIds(startId: string, edges: Edge[]): Set<string> {
  const result = new Set<string>();
  const queue = [startId];
  const srcMap = getEdgesBySource(edges);
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const e of (srcMap.get(current) || [])) {
      if (!result.has(e.target)) { result.add(e.target); queue.push(e.target); }
    }
  }
  return result;
}

// --- Sync ---
function syncNodeData(nodes: Node[], shells: AssetAdministrationShell[], submodels: Submodel[], cds?: ConceptDescription[]): Node[] {
  return nodes.map(node => {
    const d = node.data as NodeData;
    if (d.type === 'aas') {
      const shell = shells.find(s => s.id === node.id);
      if (shell) return { ...node, data: { type: 'aas', shell } satisfies AASNodeData };
    }
    if (d.type === 'submodel') {
      const sm = submodels.find(s => s.id === node.id);
      if (sm) return { ...node, data: { type: 'submodel', submodel: sm } satisfies SubmodelNodeData };
    }
    if (d.type === 'element') {
      const ed = d as SubmodelElementNodeData;
      const sm = submodels.find(s => s.id === ed.submodelId);
      if (sm) {
        const el = findElementByNodeId(sm.submodelElements ?? [], ed.element._nodeId!);
        if (el) return { ...node, data: { type: 'element', submodelId: ed.submodelId, element: el } satisfies SubmodelElementNodeData };
      }
    }
    if (d.type === 'conceptDescription' && cds) {
      const cd = cds.find(c => c.id === node.id);
      if (cd) return { ...node, data: { type: 'conceptDescription', conceptDescription: cd } satisfies ConceptDescriptionNodeData };
    }
    return node;
  });
}

// --- Position ---
function getPositionOffset(handlePos: Position | undefined, count: number, spacing: number) {
  switch (handlePos) {
    case Position.Top: return { dx: count * spacing, dy: -180 };
    case Position.Bottom: return { dx: count * spacing, dy: 180 };
    case Position.Left: return { dx: -200, dy: count * spacing };
    default: return { dx: 200, dy: count * spacing };
  }
}

function oppositePosition(pos: Position): Position {
  switch (pos) {
    case Position.Top: return Position.Bottom;
    case Position.Bottom: return Position.Top;
    case Position.Left: return Position.Right;
    default: return Position.Left;
  }
}

// --- Default Elements ---
function createDefaultElement(modelType: string, index: number): SubmodelElement {
  const idShort = `${modelType}_${index}`;
  const _nodeId = generateId();
  const base = { idShort, _nodeId };
  switch (modelType) {
    case 'Property': return { ...base, modelType: 'Property', valueType: DataTypeDefXsd.String, value: '' };
    case 'MultiLanguageProperty': return { ...base, modelType: 'MultiLanguageProperty', value: [] };
    case 'Range': return { ...base, modelType: 'Range', valueType: DataTypeDefXsd.Double };
    case 'SubmodelElementCollection': return { ...base, modelType: 'SubmodelElementCollection', value: [] };
    case 'SubmodelElementList': return { ...base, modelType: 'SubmodelElementList', typeValueListElement: 'SubmodelElement', value: [] };
    case 'File': return { ...base, modelType: 'File', contentType: 'application/octet-stream' };
    case 'Blob': return { ...base, modelType: 'Blob', contentType: 'application/octet-stream' };
    case 'ReferenceElement': return { ...base, modelType: 'ReferenceElement' };
    case 'Entity': return { ...base, modelType: 'Entity', entityType: EntityType.SelfManagedEntity, statements: [] };
    case 'RelationshipElement': return { ...base, modelType: 'RelationshipElement', first: { type: ReferenceTypes.ModelReference, keys: [] }, second: { type: ReferenceTypes.ModelReference, keys: [] } };
    case 'AnnotatedRelationshipElement': return { ...base, modelType: 'AnnotatedRelationshipElement', first: { type: ReferenceTypes.ModelReference, keys: [] }, second: { type: ReferenceTypes.ModelReference, keys: [] } };
    case 'BasicEventElement': return { ...base, modelType: 'BasicEventElement', observed: { type: ReferenceTypes.ModelReference, keys: [] }, direction: Direction.Output, state: StateOfEvent.On };
    case 'Operation': return { ...base, modelType: 'Operation' };
    case 'Capability': return { ...base, modelType: 'Capability' };
    default: return { ...base, modelType: 'Property', valueType: DataTypeDefXsd.String } as SubmodelElement;
  }
}

// --- Clipboard ---
interface ClipboardEntry { node: Node; }

// --- Store ---
interface AasState {
  shells: AssetAdministrationShell[];
  submodels: Submodel[];
  conceptDescriptions: ConceptDescription[];
  nodes: Node[];
  edges: Edge[];
  clipboard: ClipboardEntry[];
}

interface AasActions {
  // Create
  addShell: (pos: { x: number; y: number }) => void;
  addSubmodel: (pos: { x: number; y: number }) => void;
  addSubmodelToShell: (shellId: string, handlePos?: Position) => void;
  addSubmodelElement: (parentId: string, modelType: string, handlePos?: Position) => void;
  addConceptDescription: (pos: { x: number; y: number }) => void;

  // Update
  updateShellId: (oldId: string, newId: string) => void;
  updateSubmodelId: (oldId: string, newId: string) => void;
  updateShell: (shellId: string, changes: Partial<AssetAdministrationShell>) => void;
  updateSubmodel: (smId: string, changes: Partial<Submodel>) => void;
  updateSubmodelElement: (smId: string, nodeId: string, changes: Partial<SubmodelElement>) => void;
  updateShellIdShort: (shellId: string, idShort: string) => void;
  updateSubmodelIdShort: (smId: string, idShort: string) => void;
  updateConceptDescriptionField: (cdId: string, field: string, value: unknown) => void;

  // Connect
  onConnect: (connection: Connection) => void;

  // Delete
  deleteNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: string[]) => void;

  // Clipboard
  copyNodes: () => number;
  pasteNodes: (offset: { x: number; y: number }) => number;

  // Import
  importEnvironment: (jsonString: string, origin: { x: number; y: number }) => void;

  // Canvas
  loadCanvas: (data: { nodes: Node[]; edges: Edge[] }) => void;
  clearCanvas: () => void;
}

export const useAasStore = create<AasState & AasActions>()(temporal((set, get) => ({
  shells: [],
  submodels: [],
  conceptDescriptions: [],
  nodes: [],
  edges: [],
  clipboard: [],

  addShell: (pos) => {
    const shellId = generateUrn('shell');
    const shell: AssetAdministrationShell = {
      id: shellId,
      idShort: `AAS_${get().shells.length + 1}`,
      assetInformation: { assetKind: AssetKind.Instance, globalAssetId: generateUrn('asset') },
      submodels: [],
    };
    const node: Node = {
      id: shellId, type: 'aasNode',
      position: { x: pos.x + (Math.random() - 0.5) * 40, y: pos.y + (Math.random() - 0.5) * 40 },
      data: { type: 'aas', shell } satisfies AASNodeData,
    };
    set(s => ({ shells: [...s.shells, shell], nodes: [...s.nodes, node] }));
  },

  addSubmodel: (pos) => {
    const smId = generateUrn('submodel');
    const submodel: Submodel = { id: smId, idShort: `Submodel_${get().submodels.length + 1}`, submodelElements: [] };
    const node: Node = {
      id: smId, type: 'submodelNode',
      position: { x: pos.x + (Math.random() - 0.5) * 40, y: pos.y + (Math.random() - 0.5) * 40 },
      data: { type: 'submodel', submodel } satisfies SubmodelNodeData,
    };
    set(s => ({ submodels: [...s.submodels, submodel], nodes: [...s.nodes, node] }));
  },

  addSubmodelToShell: (shellId, handlePos) => {
    const { shells, submodels, nodes, edges } = get();
    const shellNode = nodes.find(n => n.id === shellId);
    if (!shellNode) return;

    const smId = generateUrn('submodel');
    const existingCount = (shells.find(s => s.id === shellId)?.submodels ?? []).length;
    const submodel: Submodel = { id: smId, idShort: `Submodel_${submodels.length + 1}`, submodelElements: [] };

    const { dx, dy } = getPositionOffset(handlePos, existingCount, 140);
    const node: Node = {
      id: smId, type: 'submodelNode',
      position: { x: shellNode.position.x + dx, y: shellNode.position.y + dy },
      data: { type: 'submodel', submodel } satisfies SubmodelNodeData,
    };

    const updatedShells = shells.map(s => s.id !== shellId ? s : {
      ...s,
      submodels: [...(s.submodels ?? []), { type: ReferenceTypes.ModelReference, keys: [{ type: 'Submodel', value: smId }] }],
    });

    const srcPos = handlePos ?? Position.Right;
    const edge: Edge = {
      id: `${shellId}->${smId}`, source: shellId, target: smId,
      sourceHandle: `source-${srcPos}`, targetHandle: `target-${oppositePosition(srcPos)}`,
      type: 'smoothstep', animated: true,
    };

    set({
      shells: updatedShells,
      submodels: [...submodels, submodel],
      nodes: syncNodeData([...nodes, node], updatedShells, [...submodels, submodel]),
      edges: [...edges, edge],
    });
  },

  addSubmodelElement: (parentId, modelType, handlePos) => {
    const { submodels, nodes, edges } = get();

    // parentId can be a submodel ID or a container element _nodeId
    let targetSmId = parentId;
    let isContainer = false;
    const sm = submodels.find(s => s.id === parentId);
    if (!sm) {
      // Try to find as container element
      for (const sub of submodels) {
        if (findElementByNodeId(sub.submodelElements ?? [], parentId)) {
          targetSmId = sub.id;
          isContainer = true;
          break;
        }
      }
    }

    const parentNode = nodes.find(n => n.id === parentId);
    const existingCount = getEdgesBySource(edges).get(parentId)?.length ?? 0;
    const { dx, dy } = getPositionOffset(handlePos, existingCount, 120);

    const element = createDefaultElement(modelType, existingCount + 1);
    const nodeId = element._nodeId!;

    const node: Node = {
      id: nodeId, type: 'elementNode',
      position: {
        x: (parentNode?.position.x ?? 0) + dx,
        y: (parentNode?.position.y ?? 0) + dy,
      },
      data: { type: 'element', submodelId: targetSmId, element } satisfies SubmodelElementNodeData,
    };

    const srcPos = handlePos ?? Position.Right;
    const edge: Edge = {
      id: `${parentId}->${nodeId}`, source: parentId, target: nodeId,
      sourceHandle: `source-${srcPos}`, targetHandle: `target-${oppositePosition(srcPos)}`,
      type: 'smoothstep', animated: true,
    };

    const updatedSubmodels = submodels.map(sub => {
      if (sub.id !== targetSmId) return sub;
      if (isContainer) {
        return { ...sub, submodelElements: addToContainer(sub.submodelElements ?? [], parentId, element) };
      }
      return { ...sub, submodelElements: [...(sub.submodelElements ?? []), element] };
    });

    set({
      submodels: updatedSubmodels,
      nodes: [...nodes, node],
      edges: [...edges, edge],
    });
  },

  addConceptDescription: (pos) => {
    const cdId = generateUrn('cd');
    const cd: ConceptDescription = { id: cdId, idShort: `CD_${get().conceptDescriptions.length + 1}` };
    const node: Node = {
      id: cdId, type: 'conceptDescriptionNode',
      position: { x: pos.x + (Math.random() - 0.5) * 40, y: pos.y + (Math.random() - 0.5) * 40 },
      data: { type: 'conceptDescription', conceptDescription: cd } satisfies ConceptDescriptionNodeData,
    };
    set(s => ({ conceptDescriptions: [...s.conceptDescriptions, cd], nodes: [...s.nodes, node] }));
  },

  updateShell: (shellId, changes) => {
    const shells = get().shells.map(s => s.id === shellId ? { ...s, ...changes } : s);
    set({ shells, nodes: syncNodeData(get().nodes, shells, get().submodels, get().conceptDescriptions) });
  },

  updateSubmodel: (smId, changes) => {
    const submodels = get().submodels.map(s => s.id === smId ? { ...s, ...changes } : s);
    set({ submodels, nodes: syncNodeData(get().nodes, get().shells, submodels, get().conceptDescriptions) });
  },

  updateSubmodelElement: (smId, nodeId, changes) => {
    const submodels = get().submodels.map(sub => {
      if (sub.id !== smId) return sub;
      return { ...sub, submodelElements: mapElements(sub.submodelElements ?? [], nodeId, el => ({ ...el, ...changes } as SubmodelElement)) };
    });
    set({ submodels, nodes: syncNodeData(get().nodes, get().shells, submodels, get().conceptDescriptions) });
  },

  updateShellId: (oldId, newId) => {
    if (oldId === newId) return;
    set(s => ({
      shells: s.shells.map(sh => sh.id === oldId ? { ...sh, id: newId } : sh),
      nodes: s.nodes.map(n => n.id === oldId ? { ...n, id: newId, data: { ...n.data, shell: { ...(n.data as AASNodeData).shell, id: newId } } } : n),
      edges: s.edges.map(e => ({
        ...e,
        id: e.id.replace(oldId, newId),
        source: e.source === oldId ? newId : e.source,
        target: e.target === oldId ? newId : e.target,
      })),
    }));
  },

  updateSubmodelId: (oldId, newId) => {
    if (oldId === newId) return;
    set(s => ({
      submodels: s.submodels.map(sm => sm.id === oldId ? { ...sm, id: newId } : sm),
      shells: s.shells.map(sh => ({
        ...sh,
        submodels: sh.submodels?.map(ref =>
          ref.keys[0]?.value === oldId ? { ...ref, keys: [{ ...ref.keys[0], value: newId }] } : ref
        ),
      })),
      nodes: s.nodes.map(n => {
        if (n.id === oldId) return { ...n, id: newId, data: { ...n.data, submodel: { ...(n.data as SubmodelNodeData).submodel, id: newId } } };
        if ((n.data as NodeData).type === 'element' && (n.data as SubmodelElementNodeData).submodelId === oldId) {
          return { ...n, data: { ...n.data, submodelId: newId } };
        }
        return n;
      }),
      edges: s.edges.map(e => ({
        ...e,
        id: e.id.replace(oldId, newId),
        source: e.source === oldId ? newId : e.source,
        target: e.target === oldId ? newId : e.target,
      })),
    }));
  },

  updateShellIdShort: (shellId, idShort) => get().updateShell(shellId, { idShort }),
  updateSubmodelIdShort: (smId, idShort) => get().updateSubmodel(smId, { idShort }),

  updateConceptDescriptionField: (cdId, field, value) => {
    const cds = get().conceptDescriptions.map(cd => cd.id === cdId ? { ...cd, [field]: value } : cd);
    set({ conceptDescriptions: cds, nodes: syncNodeData(get().nodes, get().shells, get().submodels, cds) });
  },

  onConnect: (connection) => {
    const { nodes, shells, edges } = get();
    const srcNode = nodes.find(n => n.id === connection.source);
    const tgtNode = nodes.find(n => n.id === connection.target);
    if (!srcNode || !tgtNode) return;

    // Block duplicates
    if (edges.some(e => (e.source === connection.source && e.target === connection.target) || (e.source === connection.target && e.target === connection.source))) return;

    const srcData = srcNode.data as NodeData;
    const tgtData = tgtNode.data as NodeData;

    // AAS → Submodel
    if (srcData.type === 'aas' && tgtData.type === 'submodel') {
      const shell = (srcData as AASNodeData).shell;
      const sm = (tgtData as SubmodelNodeData).submodel;
      const updatedShells = shells.map(s => {
        if (s.id !== shell.id) return s;
        if (s.submodels?.some(r => r.keys[0]?.value === sm.id)) return s;
        return { ...s, submodels: [...(s.submodels ?? []), { type: ReferenceTypes.ModelReference, keys: [{ type: 'Submodel', value: sm.id }] }] };
      });
      set({
        edges: addEdge({ ...connection, type: 'smoothstep', animated: true }, edges),
        shells: updatedShells,
        nodes: syncNodeData(nodes, updatedShells, get().submodels),
      });
      return;
    }

    // Submodel → Element
    if (srcData.type === 'submodel' && tgtData.type === 'element') {
      set({ edges: addEdge({ ...connection, type: 'smoothstep', animated: true }, edges) });
      return;
    }

    // Submodel → AAS (reverse)
    if (srcData.type === 'submodel' && tgtData.type === 'aas') {
      const shell = (tgtData as AASNodeData).shell;
      const sm = (srcData as SubmodelNodeData).submodel;
      const updatedShells = shells.map(s => {
        if (s.id !== shell.id) return s;
        if (s.submodels?.some(r => r.keys[0]?.value === sm.id)) return s;
        return { ...s, submodels: [...(s.submodels ?? []), { type: ReferenceTypes.ModelReference, keys: [{ type: 'Submodel', value: sm.id }] }] };
      });
      set({
        edges: addEdge({ ...connection, type: 'smoothstep', animated: true }, edges),
        shells: updatedShells,
        nodes: syncNodeData(nodes, updatedShells, get().submodels),
      });
      return;
    }

    // Element → Submodel (reverse)
    if (srcData.type === 'element' && tgtData.type === 'submodel') {
      set({ edges: addEdge({ ...connection, type: 'smoothstep', animated: true }, edges) });
      return;
    }

    // Container → Element
    if (srcData.type === 'element' && tgtData.type === 'element' && isContainerElement((srcData as SubmodelElementNodeData).element)) {
      set({ edges: addEdge({ ...connection, type: 'smoothstep', animated: true }, edges) });
      return;
    }

    // Element → Container (reverse)
    if (srcData.type === 'element' && tgtData.type === 'element' && isContainerElement((tgtData as SubmodelElementNodeData).element)) {
      set({ edges: addEdge({ ...connection, type: 'smoothstep', animated: true }, edges) });
      return;
    }

    // CD ↔ Element/Submodel: set semanticId or add to supplementalSemanticIds
    const cdSide = srcData.type === 'conceptDescription' ? srcData : tgtData.type === 'conceptDescription' ? tgtData : null;
    const otherSide = cdSide === srcData ? tgtData : cdSide === tgtData ? srcData : null;
    const otherNodeId = cdSide === srcData ? connection.target : connection.source;

    if (cdSide && otherSide && (otherSide.type === 'element' || otherSide.type === 'submodel')) {
      const cd = (cdSide as ConceptDescriptionNodeData).conceptDescription;
      const newRef = { type: ReferenceTypes.ExternalReference, keys: [{ type: 'GlobalReference', value: cd.id }] };

      if (otherSide.type === 'element') {
        const ed = otherSide as SubmodelElementNodeData;
        const el = ed.element;
        if (!el.semanticId) {
          get().updateSubmodelElement(ed.submodelId, el._nodeId!, { semanticId: newRef } as Partial<SubmodelElement>);
        } else {
          const existing = el.supplementalSemanticIds || [];
          if (!existing.some(r => r.keys[0]?.value === cd.id)) {
            get().updateSubmodelElement(ed.submodelId, el._nodeId!, { supplementalSemanticIds: [...existing, newRef] } as Partial<SubmodelElement>);
          }
        }
      } else if (otherSide.type === 'submodel') {
        const sm = (otherSide as SubmodelNodeData).submodel;
        if (!sm.semanticId) {
          get().updateSubmodel(otherNodeId!, { semanticId: newRef });
        } else {
          const existing = sm.supplementalSemanticIds || [];
          if (!existing.some(r => r.keys[0]?.value === cd.id)) {
            get().updateSubmodel(otherNodeId!, { supplementalSemanticIds: [...existing, newRef] });
          }
        }
      }

      // Create CD edge with distinctive styling
      const cdEdgeId = `cd-edge-${otherNodeId}->${cd.id}`;
      if (!edges.some(e => e.id === cdEdgeId)) {
        set({
          edges: addEdge({
            ...connection,
            id: cdEdgeId,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#fb923c', strokeWidth: 2, strokeDasharray: '5 5' },
          }, get().edges),
        });
      }
      return;
    }
  },

  deleteNode: (nodeId) => {
    get().deleteNodes([nodeId]);
  },

  deleteNodes: (nodeIds) => {
    const { nodes, edges, shells, submodels, conceptDescriptions } = get();
    const toDelete = new Set(nodeIds);

    set({
      nodes: nodes.filter(n => !toDelete.has(n.id)),
      edges: edges.filter(e => !toDelete.has(e.source) && !toDelete.has(e.target)),
      shells: shells.filter(s => !toDelete.has(s.id)),
      submodels: submodels.filter(s => !toDelete.has(s.id)).map(sm => ({
        ...sm,
        submodelElements: sm.submodelElements?.filter(el => !toDelete.has(el._nodeId || '')),
      })),
      conceptDescriptions: conceptDescriptions.filter(cd => !toDelete.has(cd.id)),
    });
  },

  importEnvironment: (jsonString, origin) => {
    const result = importFromJson(jsonString, origin);
    set(s => ({
      shells: [...s.shells, ...result.shells],
      submodels: [...s.submodels, ...result.submodels],
      conceptDescriptions: [...s.conceptDescriptions, ...result.conceptDescriptions],
      nodes: [...s.nodes, ...result.nodes],
      edges: [...s.edges, ...result.edges],
    }));
  },

  loadCanvas: (data) => {
    const shells: AssetAdministrationShell[] = [];
    const submodels: Submodel[] = [];
    const cds: ConceptDescription[] = [];
    for (const n of data.nodes) {
      const d = n.data as NodeData;
      if (d.type === 'aas') shells.push(d.shell);
      else if (d.type === 'submodel') submodels.push(d.submodel);
      else if (d.type === 'conceptDescription') cds.push(d.conceptDescription);
    }
    set({ shells, submodels, conceptDescriptions: cds, nodes: data.nodes, edges: data.edges });
  },

  copyNodes: () => {
    const selected = get().nodes.filter(n => n.selected);
    set({ clipboard: selected.map(n => ({ node: n })) });
    return selected.length;
  },

  pasteNodes: (offset) => {
    const { clipboard, shells, submodels, conceptDescriptions, nodes } = get();
    if (clipboard.length === 0) return 0;

    const newNodes: Node[] = [];
    const newShells: AssetAdministrationShell[] = [];
    const newSubmodels: Submodel[] = [];
    const newCds: ConceptDescription[] = [];

    for (const entry of clipboard) {
      const oldNode = entry.node;
      const data = oldNode.data as NodeData;
      const newId = generateId();

      if (data.type === 'aas') {
        const newShell = { ...data.shell, id: generateUrn('shell'), idShort: (data.shell.idShort || 'AAS') + '_copy', submodels: [] };
        newShells.push(newShell);
        newNodes.push({ ...oldNode, id: newShell.id, position: { x: oldNode.position.x + offset.x, y: oldNode.position.y + offset.y }, selected: false, data: { type: 'aas', shell: newShell } satisfies AASNodeData });
      } else if (data.type === 'submodel') {
        const newSm = { ...data.submodel, id: generateUrn('submodel'), idShort: (data.submodel.idShort || 'SM') + '_copy', submodelElements: [] };
        newSubmodels.push(newSm);
        newNodes.push({ ...oldNode, id: newSm.id, position: { x: oldNode.position.x + offset.x, y: oldNode.position.y + offset.y }, selected: false, data: { type: 'submodel', submodel: newSm } satisfies SubmodelNodeData });
      } else if (data.type === 'conceptDescription') {
        const newCd = { ...data.conceptDescription, id: generateUrn('cd'), idShort: (data.conceptDescription.idShort || 'CD') + '_copy' };
        newCds.push(newCd);
        newNodes.push({ ...oldNode, id: newCd.id, position: { x: oldNode.position.x + offset.x, y: oldNode.position.y + offset.y }, selected: false, data: { type: 'conceptDescription', conceptDescription: newCd } satisfies ConceptDescriptionNodeData });
      } else if (data.type === 'element') {
        const newElement = { ...data.element, _nodeId: newId, idShort: data.element.idShort + '_copy' };
        newNodes.push({ ...oldNode, id: newId, position: { x: oldNode.position.x + offset.x, y: oldNode.position.y + offset.y }, selected: false, data: { type: 'element', submodelId: data.submodelId, element: newElement } satisfies SubmodelElementNodeData });
      }
    }

    set({
      shells: [...shells, ...newShells],
      submodels: [...submodels, ...newSubmodels],
      conceptDescriptions: [...conceptDescriptions, ...newCds],
      nodes: [...nodes, ...newNodes],
    });
    return newNodes.length;
  },

  clearCanvas: () => set({ shells: [], submodels: [], conceptDescriptions: [], nodes: [], edges: [], clipboard: [] }),
}), { limit: 50 }));
