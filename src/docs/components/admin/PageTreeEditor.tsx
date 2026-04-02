import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  FileText,
  Loader2,
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import type { DocTreeNode } from '../../types';

interface PageTreeEditorProps {
  manualId: string;
  tree: DocTreeNode[];
  onAddPage: (parentId: string | null, title: string) => Promise<unknown>;
  onDeletePage: (pageId: string) => Promise<boolean>;
  onRenamePage: (pageId: string, title: string) => Promise<boolean>;
  onReorderSiblings: (orderedIds: string[]) => Promise<void>;
}

function SortableTreeItem({
  node,
  depth,
  manualId,
  expanded,
  onToggle,
  onAddPage,
  onDeletePage,
  onRenamePage,
  onReorderSiblings,
}: {
  node: DocTreeNode;
  depth: number;
  manualId: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAddPage: (parentId: string | null, title: string) => Promise<unknown>;
  onDeletePage: (pageId: string) => Promise<boolean>;
  onRenamePage: (pageId: string, title: string) => Promise<boolean>;
  onReorderSiblings: (orderedIds: string[]) => Promise<void>;
}) {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [addingChild, setAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState('');
  const [deleting, setDeleting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  const handleRename = async () => {
    if (editTitle.trim() && editTitle.trim() !== node.title) {
      await onRenamePage(node.id, editTitle.trim());
    }
    setEditing(false);
  };

  const handleAddChild = async () => {
    if (!childTitle.trim()) return;
    await onAddPage(node.id, childTitle.trim());
    setChildTitle('');
    setAddingChild(false);
    if (!isExpanded) onToggle(node.id);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDeletePage(node.id);
    setDeleting(false);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={{ ...style, paddingLeft: `${depth * 24 + 8}px` }}
        className="flex items-center gap-1 h-9 group hover:bg-bg-elevated/50 rounded-sm"
      >
        <button {...attributes} {...listeners} className="cursor-grab text-txt-muted hover:text-txt-secondary p-0.5">
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {hasChildren ? (
          <button onClick={() => onToggle(node.id)} className="text-txt-muted hover:text-txt-secondary p-0.5">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-[18px]" />
        )}

        <FileText className="w-3.5 h-3.5 text-txt-muted flex-shrink-0" />

        {editing ? (
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setEditTitle(node.title); setEditing(false); }
            }}
            className="flex-1 bg-bg-input border border-accent rounded-sm px-2 py-0.5 text-sm text-txt-primary"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-sm text-txt-primary truncate cursor-pointer hover:text-accent"
            onClick={() => navigate(`/docs/admin/${manualId}/pages/${node.id}`)}
            onDoubleClick={() => { setEditTitle(node.title); setEditing(true); }}
            title={t('docs.admin.clickToEdit')}
          >
            {node.title}
          </span>
        )}

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setAddingChild(true)}
            className="text-txt-muted hover:text-accent p-1"
            title={t('docs.admin.addSubpage')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="text-txt-muted hover:text-red-400 p-1"
            title={t('docs.admin.delete')}
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Add child inline */}
      {addingChild && (
        <div className="flex items-center gap-2 h-9" style={{ paddingLeft: `${(depth + 1) * 24 + 32}px` }}>
          <input
            value={childTitle}
            onChange={e => setChildTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddChild();
              if (e.key === 'Escape') { setChildTitle(''); setAddingChild(false); }
            }}
            placeholder={t('docs.admin.pageNamePlaceholder')}
            className="flex-1 bg-bg-input border border-border rounded-sm px-2 py-0.5 text-sm text-txt-primary focus:border-accent"
            autoFocus
          />
          <button onClick={handleAddChild} className="text-accent hover:text-accent-hover text-xs font-medium">
            OK
          </button>
          <button onClick={() => { setChildTitle(''); setAddingChild(false); }} className="text-txt-muted hover:text-txt-primary text-xs">
            Esc
          </button>
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <SortableContext items={node.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {node.children.map(child => (
            <SortableTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              manualId={manualId}
              expanded={expanded}
              onToggle={onToggle}
              onAddPage={onAddPage}
              onDeletePage={onDeletePage}
              onRenamePage={onRenamePage}
              onReorderSiblings={onReorderSiblings}
            />
          ))}
        </SortableContext>
      )}
    </>
  );
}

export function PageTreeEditor({ manualId, tree, onAddPage, onDeletePage, onRenamePage, onReorderSiblings }: PageTreeEditorProps) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingRoot, setAddingRoot] = useState(false);
  const [rootTitle, setRootTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find siblings array that contains both items
    const findSiblings = (nodes: DocTreeNode[]): DocTreeNode[] | null => {
      const ids = nodes.map(n => n.id);
      if (ids.includes(active.id as string) && ids.includes(over.id as string)) {
        return nodes;
      }
      for (const node of nodes) {
        const found = findSiblings(node.children);
        if (found) return found;
      }
      return null;
    };

    const siblings = findSiblings(tree);
    if (!siblings) return;

    const oldIndex = siblings.findIndex(n => n.id === active.id);
    const newIndex = siblings.findIndex(n => n.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...siblings.map(n => n.id)];
    reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, active.id as string);
    onReorderSiblings(reordered);
  };

  const handleAddRoot = async () => {
    if (!rootTitle.trim()) return;
    await onAddPage(null, rootTitle.trim());
    setRootTitle('');
    setAddingRoot(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-txt-muted">
          {t('docs.admin.pages')}
        </h3>
        <button
          onClick={() => setAddingRoot(true)}
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('docs.admin.newPage')}
        </button>
      </div>

      {addingRoot && (
        <div className="flex items-center gap-2 mb-2 pl-2">
          <input
            value={rootTitle}
            onChange={e => setRootTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddRoot();
              if (e.key === 'Escape') { setRootTitle(''); setAddingRoot(false); }
            }}
            placeholder={t('docs.admin.pageNamePlaceholder')}
            className="flex-1 bg-bg-input border border-border rounded-sm px-2 py-1 text-sm text-txt-primary focus:border-accent"
            autoFocus
          />
          <button onClick={handleAddRoot} className="text-accent text-xs font-medium">OK</button>
          <button onClick={() => { setRootTitle(''); setAddingRoot(false); }} className="text-txt-muted text-xs">Esc</button>
        </div>
      )}

      {tree.length === 0 ? (
        <p className="text-sm text-txt-muted py-4 text-center">{t('docs.admin.noPages')}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tree.map(n => n.id)} strategy={verticalListSortingStrategy}>
            {tree.map(node => (
              <SortableTreeItem
                key={node.id}
                node={node}
                depth={0}
                manualId={manualId}
                expanded={expanded}
                onToggle={toggleExpand}
                onAddPage={onAddPage}
                onDeletePage={onDeletePage}
                onRenamePage={onRenamePage}
                onReorderSiblings={onReorderSiblings}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
