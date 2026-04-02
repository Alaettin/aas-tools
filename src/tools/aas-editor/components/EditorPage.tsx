import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowLeft, Loader2, Save, CheckCircle } from 'lucide-react';
import ReactFlow, {
  Background, Controls, MiniMap,
  type Node, type Edge,
  applyNodeChanges, applyEdgeChanges,
  type NodeChange, type EdgeChange,
  type NodeMouseHandler,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { useAasStore, type NodeData, type SubmodelElementNodeData } from '../store/aasStore';
import { AasNode } from './canvas/nodes/AasNode';
import { SubmodelNode } from './canvas/nodes/SubmodelNode';
import { ElementNode } from './canvas/nodes/ElementNode';
import { ConceptDescriptionNode } from './canvas/nodes/ConceptDescriptionNode';
import { Toolbar } from './canvas/Toolbar';
import { ContextMenu } from './canvas/ContextMenu';
import { DetailPanel } from './panels/DetailPanel';

interface EditorPageProps {
  projectId: string;
  onBack: () => void;
}

const NODE_TYPES = {
  aasNode: AasNode,
  submodelNode: SubmodelNode,
  elementNode: ElementNode,
  conceptDescriptionNode: ConceptDescriptionNode,
};

function clearSemanticIdsForCdEdges(removedEdges: Edge[]) {
  const state = useAasStore.getState();
  for (const edge of removedEdges) {
    if (!edge.id.startsWith('cd-edge-')) continue;
    const cdId = edge.target; // CD node ID = CD id
    const sourceNodeId = edge.source;
    const sourceNode = state.nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) continue;
    const data = sourceNode.data as NodeData;

    if (data.type === 'element') {
      const ed = data as SubmodelElementNodeData;
      const el = ed.element;
      if (el.semanticId?.keys[0]?.value === cdId) {
        // Main semanticId removed — promote first supplemental if exists
        const suppl = el.supplementalSemanticIds || [];
        if (suppl.length > 0) {
          const [first, ...rest] = suppl;
          useAasStore.getState().updateSubmodelElement(ed.submodelId, el._nodeId!, { semanticId: first, supplementalSemanticIds: rest.length > 0 ? rest : undefined } as Partial<import('../types').SubmodelElement>);
        } else {
          useAasStore.getState().updateSubmodelElement(ed.submodelId, el._nodeId!, { semanticId: undefined } as Partial<import('../types').SubmodelElement>);
        }
      } else {
        // Remove from supplementalSemanticIds
        const filtered = (el.supplementalSemanticIds || []).filter(r => r.keys[0]?.value !== cdId);
        useAasStore.getState().updateSubmodelElement(ed.submodelId, el._nodeId!, { supplementalSemanticIds: filtered.length > 0 ? filtered : undefined } as Partial<import('../types').SubmodelElement>);
      }
    } else if (data.type === 'submodel') {
      const sm = (data as import('../store/aasStore').SubmodelNodeData).submodel;
      if (sm.semanticId?.keys[0]?.value === cdId) {
        const suppl = sm.supplementalSemanticIds || [];
        if (suppl.length > 0) {
          const [first, ...rest] = suppl;
          useAasStore.getState().updateSubmodel(sourceNodeId, { semanticId: first, supplementalSemanticIds: rest.length > 0 ? rest : undefined });
        } else {
          useAasStore.getState().updateSubmodel(sourceNodeId, { semanticId: undefined });
        }
      } else {
        const filtered = (sm.supplementalSemanticIds || []).filter(r => r.keys[0]?.value !== cdId);
        useAasStore.getState().updateSubmodel(sourceNodeId, { supplementalSemanticIds: filtered.length > 0 ? filtered : undefined });
      }
    }
  }
}

export function EditorPage({ projectId, onBack }: EditorPageProps) {
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; nodeType?: string } | null>(null);
  const [showDetail, setShowDetail] = useState(true);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const dirtyRef = useRef(false);

  const store = useAasStore();
  const { nodes, edges } = store;
  const nodeTypes = useMemo(() => NODE_TYPES, []);

  // Load project
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('aas_projects').select('*').eq('id', projectId).single()
        );
        if (cancelled) return;
        if (error || !data) { onBack(); return; }
        setProjectName(data.name);
        if (data.canvas_data) {
          store.loadCanvas({
            nodes: (data.canvas_data.nodes || []) as Node[],
            edges: (data.canvas_data.edges || []) as Edge[],
          });
        }
      } catch {
        if (!cancelled) onBack();
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      clearTimeout(savedTimerRef.current);
      clearTimeout(autoSaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Save
  const save = useCallback(async () => {
    const { nodes: n, edges: e } = useAasStore.getState();
    setSaving(true);
    const { error } = await supabase
      .from('aas_projects')
      .update({ canvas_data: { nodes: n, edges: e } })
      .eq('id', projectId);
    if (!error) {
      dirtyRef.current = false;
      setSaved(true);
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }, [projectId]);

  // Auto-save
  useEffect(() => {
    if (!dirtyRef.current) return;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { if (dirtyRef.current) save(); }, 30000);
  }, [nodes, edges, save]);

  useEffect(() => { dirtyRef.current = true; }, [nodes, edges]);

  // Ctrl+S, Ctrl+Z, Ctrl+Y
  const { undo, redo } = useAasStore.temporal.getState();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { store.copyNodes(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { store.pasteNodes({ x: 40, y: 40 }); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save, undo, redo, store]);

  // Delete key — only selected nodes (no cascade) + selected edges
  // Ctrl+A — select all nodes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selNodeIds = nodes.filter(n => n.selected).map(n => n.id);
        if (selNodeIds.length > 0) store.deleteNodes(selNodeIds);
        const selEdges = edges.filter(ed => ed.selected);
        if (selEdges.length > 0) {
          clearSemanticIdsForCdEdges(selEdges);
          useAasStore.setState(s => ({ edges: s.edges.filter(ed => !ed.selected) }));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        useAasStore.setState(s => ({ nodes: s.nodes.map(n => ({ ...n, selected: true })) }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, edges, store]);

  // React Flow change handlers → update store
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    useAasStore.setState(s => ({ nodes: applyNodeChanges(changes, s.nodes) }));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Clear semanticId when CD edges are removed
    for (const change of changes) {
      if (change.type === 'remove') {
        const edge = useAasStore.getState().edges.find(e => e.id === change.id);
        if (edge && edge.id.startsWith('cd-edge-')) {
          clearSemanticIdsForCdEdges([edge]);
        }
      }
    }
    useAasStore.setState(s => ({ edges: applyEdgeChanges(changes, s.edges) }));
  }, []);

  // Context menu
  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id, nodeType: node.type });
  }, []);

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const getCenter = () => ({ x: 400, y: 300 });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors mb-1 font-mono">
            <ArrowLeft className="w-3 h-3" />
            AAS Editor
          </button>
          <h1 className="font-mono text-xl font-bold">{projectName}</h1>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Gespeichert' : 'Speichern'}
        </button>
      </div>

      {/* Editor Layout */}
      <div className="flex-1 flex border border-border rounded overflow-hidden">
        <div className="flex-1 relative">
          <Toolbar
            onAddShell={() => store.addShell(getCenter())}
            onAddSubmodel={() => store.addSubmodel(getCenter())}
            onAddConceptDescription={() => store.addConceptDescription(getCenter())}
          />
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={store.onConnect}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            onClick={() => setContextMenu(null)}
            onNodeClick={() => setShowDetail(true)}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={null}
            edgesFocusable
            edgesUpdatable
            className="bg-bg-primary"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1F2937" />
            <Controls className="!bg-bg-surface !border-border !shadow-none [&>button]:!bg-bg-elevated [&>button]:!border-border [&>button]:!text-txt-secondary" />
            <MiniMap nodeColor="#06B6D4" maskColor="rgba(10, 15, 28, 0.7)" className="!bg-bg-surface !border-border" />
          </ReactFlow>

          {contextMenu && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              nodeId={contextMenu.nodeId}
              nodeType={contextMenu.nodeType}
              onClose={() => setContextMenu(null)}
              onDelete={(id) => store.deleteNode(id)}
              onCopy={() => store.copyNodes()}
              onPaste={() => store.pasteNodes({ x: 40, y: 40 })}
              hasClipboard={store.clipboard.length > 0}
              onAddElement={(parentId) => store.addSubmodelElement(parentId, 'Property')}
              onAddShell={() => store.addShell(getCenter())}
              onAddSubmodel={() => store.addSubmodel(getCenter())}
              onAddCD={() => store.addConceptDescription(getCenter())}
            />
          )}
        </div>

        {showDetail && (
          <DetailPanel
            nodes={nodes}
            onClose={() => setShowDetail(false)}
          />
        )}
      </div>
    </div>
  );
}
