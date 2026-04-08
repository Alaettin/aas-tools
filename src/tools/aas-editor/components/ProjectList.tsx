import { useState } from 'react';
import { Plus, Loader2, Hexagon, Pencil, Trash2, Check, X } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useLocale } from '@/context/LocaleContext';

interface ProjectListProps {
  onSelect: (projectId: string) => void;
}

export function ProjectList({ onSelect }: ProjectListProps) {
  const { t } = useLocale();
  const { projects, loading, error, createProject, renameProject, deleteProject } = useProjects();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const project = await createProject(newName);
    if (project) {
      setNewName('');
      onSelect(project.id);
    }
    setCreating(false);
  };

  const handleRename = async (id: string) => {
    if (!editValue.trim()) return;
    const ok = await renameProject(id, editValue);
    if (ok) setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-6">
        <h1 className="font-mono text-2xl font-bold">AAS Editor</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Create */}
      <div className="bg-bg-surface border border-border rounded p-4 mb-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder={t('aasEditor.newProject')}
            className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t('common.create')}
          </button>
        </div>
      </div>

      {/* Grid */}
      {projects.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded p-10 text-center">
          <Hexagon className="w-10 h-10 text-txt-muted mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-txt-secondary">{t('aasEditor.noProjects')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const date = new Date(project.updated_at).toLocaleDateString('de-DE', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            });
            const nodeCount = project.canvas_data?.nodes?.length || 0;

            return (
              <div
                key={project.id}
                className="bg-bg-surface border border-border rounded p-5 hover:border-border-hover transition-colors group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  {editingId === project.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(project.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 bg-bg-input border border-border rounded-sm px-2 py-1 text-sm text-txt-primary focus:border-accent"
                      />
                      <button onClick={() => handleRename(project.id)} className="text-emerald-400"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="text-txt-muted"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => onSelect(project.id)} className="text-left flex-1 mr-2">
                      <h3 className="font-mono text-sm font-semibold text-txt-primary hover:text-accent transition-colors">
                        {project.name}
                      </h3>
                    </button>
                  )}

                  {editingId !== project.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(project.id); setEditValue(project.name); }}
                        className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-bg-elevated rounded-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(project.id)}
                        className="p-1.5 text-txt-muted hover:text-red-400 hover:bg-bg-elevated rounded-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info */}
                <button onClick={() => onSelect(project.id)} className="w-full text-left">
                  <p className="text-xs text-txt-muted">{nodeCount} Nodes — {date}</p>
                </button>

                {/* Delete Confirm */}
                {deletingId === project.id && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="flex-1 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-sm py-1.5"
                    >
                      {t('common.delete')}
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="flex-1 text-xs text-txt-secondary bg-bg-elevated rounded-sm py-1.5"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
