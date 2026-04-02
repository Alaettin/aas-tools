import type { Node, Edge } from 'reactflow';
import type { AssetAdministrationShell, Submodel, ConceptDescription, SubmodelElement, AasEnvironment } from '../types';
import type { AASNodeData, SubmodelNodeData, SubmodelElementNodeData } from '../store/aasStore';

let _importIdCounter = 0;
function genId() { return `imp_${Date.now().toString(36)}_${++_importIdCounter}`; }

function isContainer(el: SubmodelElement) {
  return el.modelType === 'SubmodelElementCollection' || el.modelType === 'SubmodelElementList';
}
function getChildren(el: SubmodelElement): SubmodelElement[] {
  return (el as { value?: SubmodelElement[] }).value ?? [];
}

function assignNodeIds(elements: SubmodelElement[]): SubmodelElement[] {
  return elements.map(el => {
    const withId = { ...el, _nodeId: genId() };
    if (isContainer(el) && getChildren(el).length > 0) {
      (withId as { value: SubmodelElement[] }).value = assignNodeIds(getChildren(el));
    }
    return withId;
  });
}

// Layout constants
const W = { aas: 280, sm: 280, el: 280 };
const H = { aas: 120, sm: 110, el: 90 };
const VGAP = 60;
const SGAP = 30;

function calcSubtreeWidth(elements: SubmodelElement[]): number {
  if (elements.length === 0) return W.el;
  let total = 0;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const children = isContainer(el) ? getChildren(el) : [];
    total += children.length > 0 ? Math.max(calcSubtreeWidth(children), W.el) : W.el;
    if (i < elements.length - 1) total += SGAP;
  }
  return total;
}

function calcSmWidth(sm: Submodel): number {
  const els = sm.submodelElements ?? [];
  return els.length === 0 ? W.sm : Math.max(calcSubtreeWidth(els), W.sm);
}

function layoutElements(
  elements: SubmodelElement[], parentId: string, startX: number, y: number,
  smId: string, nodes: Node[], edges: Edge[],
) {
  let x = startX;
  for (const el of elements) {
    const nodeId = el._nodeId!;
    const children = isContainer(el) ? getChildren(el) : [];
    const subtreeW = children.length > 0 ? Math.max(calcSubtreeWidth(children), W.el) : W.el;
    const cx = x + subtreeW / 2;

    nodes.push({
      id: nodeId, type: 'elementNode',
      position: { x: cx - W.el / 2, y },
      data: { type: 'element', submodelId: smId, element: el } satisfies SubmodelElementNodeData,
    });
    edges.push({
      id: `${parentId}->${nodeId}`, source: parentId, target: nodeId,
      sourceHandle: 'source-bottom', targetHandle: 'target-top',
      type: 'smoothstep', animated: true,
    });

    if (children.length > 0) {
      layoutElements(children, nodeId, x, y + H.el + VGAP, smId, nodes, edges);
    }
    x += subtreeW + SGAP;
  }
}

export interface ImportResult {
  shells: AssetAdministrationShell[];
  submodels: Submodel[];
  conceptDescriptions: ConceptDescription[];
  nodes: Node[];
  edges: Edge[];
}

export function importFromJson(jsonString: string, origin: { x: number; y: number }): ImportResult {
  const env: AasEnvironment = JSON.parse(jsonString);

  const shells = env.assetAdministrationShells ?? [];
  const conceptDescriptions = env.conceptDescriptions ?? [];
  const submodels = (env.submodels ?? []).map(sm => ({
    ...sm,
    submodelElements: sm.submodelElements ? assignNodeIds(sm.submodelElements) : [],
  }));

  const smMap = new Map(submodels.map(sm => [sm.id, sm]));
  const referencedSmIds = new Set<string>();
  const shellSmIds = new Map<string, string[]>();

  for (const shell of shells) {
    const ids: string[] = [];
    for (const ref of shell.submodels ?? []) {
      const smId = ref.keys?.[0]?.value;
      if (smId && smMap.has(smId)) { ids.push(smId); referencedSmIds.add(smId); }
    }
    shellSmIds.set(shell.id, ids);
  }

  const standalone = submodels.filter(sm => !referencedSmIds.has(sm.id));
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let curX = origin.x;

  // Layout AAS shells
  for (const shell of shells) {
    const smIds = shellSmIds.get(shell.id) ?? [];
    const sms = smIds.map(id => smMap.get(id)!).filter(Boolean);

    let treeW = 0;
    for (let i = 0; i < sms.length; i++) {
      treeW += calcSmWidth(sms[i]);
      if (i < sms.length - 1) treeW += SGAP;
    }
    treeW = Math.max(treeW, W.aas);
    const aasCx = curX + treeW / 2;

    nodes.push({
      id: shell.id, type: 'aasNode',
      position: { x: aasCx - W.aas / 2, y: origin.y },
      data: { type: 'aas', shell } satisfies AASNodeData,
    });

    let smX = curX;
    const smY = origin.y + H.aas + VGAP;
    for (const sm of sms) {
      const smW = calcSmWidth(sm);
      const smCx = smX + smW / 2;

      nodes.push({
        id: sm.id, type: 'submodelNode',
        position: { x: smCx - W.sm / 2, y: smY },
        data: { type: 'submodel', submodel: sm } satisfies SubmodelNodeData,
      });
      edges.push({
        id: `${shell.id}->${sm.id}`, source: shell.id, target: sm.id,
        sourceHandle: 'source-bottom', targetHandle: 'target-top',
        type: 'smoothstep', animated: true,
      });

      if (sm.submodelElements && sm.submodelElements.length > 0) {
        layoutElements(sm.submodelElements, sm.id, smX, smY + H.sm + VGAP, sm.id, nodes, edges);
      }
      smX += smW + SGAP;
    }
    curX += treeW + SGAP;
  }

  // Standalone submodels
  for (const sm of standalone) {
    const smW = calcSmWidth(sm);
    const smCx = curX + smW / 2;

    nodes.push({
      id: sm.id, type: 'submodelNode',
      position: { x: smCx - W.sm / 2, y: origin.y },
      data: { type: 'submodel', submodel: sm } satisfies SubmodelNodeData,
    });

    if (sm.submodelElements && sm.submodelElements.length > 0) {
      layoutElements(sm.submodelElements, sm.id, curX, origin.y + H.sm + VGAP, sm.id, nodes, edges);
    }
    curX += smW + SGAP * 2;
  }

  // ConceptDescription nodes — positioned below their referencing elements
  if (conceptDescriptions.length > 0) {
    const cdIdSet = new Set(conceptDescriptions.map(cd => cd.id));

    // Find the first referencing node for each CD
    const cdRefNode = new Map<string, string>(); // cdId → nodeId that references it
    function scanForRefs(el: SubmodelElement) {
      const allIds = [el.semanticId?.keys?.[0]?.value, ...(el.supplementalSemanticIds || []).map(r => r.keys?.[0]?.value)].filter(Boolean) as string[];
      for (const semId of allIds) {
        if (cdIdSet.has(semId) && el._nodeId && !cdRefNode.has(semId)) {
          cdRefNode.set(semId, el._nodeId);
        }
      }
      if (isContainer(el)) getChildren(el).forEach(scanForRefs);
    }
    for (const sm of submodels) {
      const allIds = [sm.semanticId?.keys?.[0]?.value, ...(sm.supplementalSemanticIds || []).map(r => r.keys?.[0]?.value)].filter(Boolean) as string[];
      for (const semId of allIds) {
        if (cdIdSet.has(semId) && !cdRefNode.has(semId)) {
          cdRefNode.set(semId, sm.id);
        }
      }
      (sm.submodelElements ?? []).forEach(scanForRefs);
    }

    let fallbackX = origin.x;
    const fallbackY = origin.y + H.aas + VGAP + H.sm + VGAP + H.el + VGAP + H.el + VGAP;

    for (const cd of conceptDescriptions) {
      const refNodeId = cdRefNode.get(cd.id);
      const refNode = refNodeId ? nodes.find(n => n.id === refNodeId) : null;

      const pos = refNode
        ? { x: refNode.position.x, y: refNode.position.y + H.el + VGAP }
        : { x: fallbackX, y: fallbackY };

      if (!refNode) fallbackX += 280 + SGAP;

      nodes.push({
        id: cd.id, type: 'conceptDescriptionNode',
        position: pos,
        data: { type: 'conceptDescription', conceptDescription: cd } as { type: 'conceptDescription'; conceptDescription: ConceptDescription },
      });
    }
  }

  // Semantic edges — connect elements/submodels to their referenced CDs
  if (conceptDescriptions.length > 0) {
    const cdIds = new Set(conceptDescriptions.map(cd => cd.id));

    const cdEdgeStyle = { stroke: '#fb923c', strokeWidth: 2, strokeDasharray: '5 5' };

    function addCdEdge(sourceId: string, cdId: string) {
      if (cdIds.has(cdId)) {
        const edgeId = `cd-edge-${sourceId}->${cdId}`;
        if (!edges.some(e => e.id === edgeId)) {
          edges.push({
            id: edgeId, source: sourceId, target: cdId,
            sourceHandle: 'source-bottom', targetHandle: 'target-top',
            type: 'smoothstep', animated: true, style: cdEdgeStyle,
          });
        }
      }
    }

    function scanElement(el: SubmodelElement) {
      if (el._nodeId) {
        const semId = el.semanticId?.keys?.[0]?.value;
        if (semId) addCdEdge(el._nodeId, semId);
        for (const ref of el.supplementalSemanticIds || []) {
          if (ref.keys?.[0]?.value) addCdEdge(el._nodeId, ref.keys[0].value);
        }
      }
      if (isContainer(el)) getChildren(el).forEach(scanElement);
    }

    for (const sm of submodels) {
      const semId = sm.semanticId?.keys?.[0]?.value;
      if (semId) addCdEdge(sm.id, semId);
      for (const ref of sm.supplementalSemanticIds || []) {
        if (ref.keys?.[0]?.value) addCdEdge(sm.id, ref.keys[0].value);
      }
      (sm.submodelElements ?? []).forEach(scanElement);
    }
  }

  return { shells, submodels, conceptDescriptions, nodes, edges };
}
