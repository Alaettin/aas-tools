import { useState } from 'react';
import { Plus, Loader2, Globe, Pencil, Trash2, Check, X, Key } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useGlobalConnectors } from '../hooks/useGlobalConnectors';

interface ConnectorListProps {
  onSelect: (connectorId: string) => void;
}

export function ConnectorList({ onSelect }: ConnectorListProps) {
  const { t } = useLocale();
  const { connectors, loading, error, createConnector, deleteConnector, renameConnector } = useGlobalConnectors();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const connector = await createConnector(newName);
    if (connector) { setNewName(''); onSelect(connector.connector_id); }
    setCreating(false);
  };

  const handleRename = async (id: string) => {
    if (!editValue.trim()) return;
    const ok = await renameConnector(id, editValue);
    if (ok) setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteConnector(id);
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
        <h1 className="font-mono text-2xl font-bold">Global Connector</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">{error}</div>
      )}

      <div className="bg-bg-surface border border-border rounded p-4 mb-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder={t('connector.newPlaceholder')}
            className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <button onClick={handleCreate} disabled={creating || !newName.trim()}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t('common.create')}
          </button>
        </div>
      </div>

      {connectors.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded p-10 text-center">
          <Globe className="w-10 h-10 text-txt-muted mx-auto mb-3" />
          <p className="text-sm text-txt-secondary">{t('globalConnector.noConnectors')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectors.map(c => {
            const date = new Date(c.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return (
              <div key={c.connector_id} className="bg-bg-surface border border-border rounded p-5 hover:border-border-hover transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  {editingId === c.connector_id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(c.connector_id); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus className="flex-1 bg-bg-input border border-border rounded-sm px-2 py-1 text-sm text-txt-primary focus:border-accent" />
                      <button onClick={() => handleRename(c.connector_id)} className="text-emerald-400"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="text-txt-muted"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => onSelect(c.connector_id)} className="text-left flex-1 mr-2">
                      <h3 className="font-mono text-sm font-semibold text-txt-primary hover:text-accent transition-colors">{c.name}</h3>
                    </button>
                  )}
                  {editingId !== c.connector_id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(c.connector_id); setEditValue(c.name); }}
                        className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-bg-elevated rounded-sm"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeletingId(c.connector_id)}
                        className="p-1.5 text-txt-muted hover:text-red-400 hover:bg-bg-elevated rounded-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>

                <button onClick={() => onSelect(c.connector_id)} className="w-full text-left">
                  <div className="flex items-center gap-2 text-xs text-txt-muted mb-1">
                    <Key className="w-3 h-3" />
                    <span className="font-mono">{c.api_key.slice(0, 8)}…</span>
                  </div>
                  <p className="text-2xs text-txt-muted">{date}</p>
                </button>

                {deletingId === c.connector_id && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <button onClick={() => handleDelete(c.connector_id)}
                      className="flex-1 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-sm py-1.5">{t('common.delete')}</button>
                    <button onClick={() => setDeletingId(null)}
                      className="flex-1 text-xs text-txt-secondary bg-bg-elevated rounded-sm py-1.5">{t('common.cancel')}</button>
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
