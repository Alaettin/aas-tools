import { useState } from 'react';
import { Plus, Loader2, Database, Pencil, Trash2, List, X } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useSources, useAasIds } from '../hooks/useSources';

function AasIdsDialog({ sourceId, sourceName, sourceUrl, onClose }: {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { entries, loading, addAasIds, removeAasId } = useAasIds(sourceId);
  const [newIds, setNewIds] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleAdd = async () => {
    const ids = newIds.split('\n').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    setAdding(true);
    await addAasIds(ids);
    setNewIds('');
    setAdding(false);
  };

  const handleRemove = async (entryId: string) => {
    setRemoving(entryId);
    await removeAasId(entryId);
    setRemoving(null);
  };

  return (
    <div className="fixed inset-0 bg-bg-primary/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded w-full max-w-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-mono text-sm font-semibold">{t('ucc.aasIds')} — {sourceName}</h3>
              <p className="text-2xs text-txt-muted font-mono mt-0.5">{sourceUrl}</p>
            </div>
            <button onClick={onClose} className="text-txt-muted hover:text-txt-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            </div>
          ) : (
            <>
              {entries.length === 0 ? (
                <p className="text-sm text-txt-muted mb-4">{t('ucc.noAasIds')}</p>
              ) : (
                <div className="border border-border rounded-sm mb-4 divide-y divide-border">
                  {entries.map(entry => (
                    <div
                      key={entry.entry_id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-bg-elevated/50 transition-colors"
                    >
                      <span className="text-xs font-mono text-txt-primary truncate mr-3" title={entry.aas_id}>
                        {entry.aas_id}
                      </span>
                      <button
                        onClick={() => handleRemove(entry.entry_id)}
                        className="text-txt-muted hover:text-red-400 transition-colors flex-shrink-0 p-0.5"
                      >
                        {removing === entry.entry_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add IDs */}
              <div>
                <label className="block text-2xs text-txt-muted mb-1">{t('ucc.addAasHint')}</label>
                <textarea
                  value={newIds}
                  onChange={e => setNewIds(e.target.value)}
                  placeholder="urn:example:aas:1234&#10;urn:example:aas:5678"
                  rows={4}
                  className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-sm font-mono text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 resize-none"
                />
                <button
                  onClick={handleAdd}
                  disabled={!newIds.trim() || adding}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm mt-2 transition-colors disabled:opacity-50"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {t('ucc.add')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SourcesPage() {
  const { t } = useLocale();
  const { sources, loading, error, createSource, updateSource, deleteSource } = useSources();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [aasDialogSource, setAasDialogSource] = useState<{ id: string; name: string; url: string } | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setBaseUrl('');
    setShowDialog(true);
  };

  const openEdit = (sourceId: string, currentName: string, currentUrl: string) => {
    setEditingId(sourceId);
    setName(currentName);
    setBaseUrl(currentUrl);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !baseUrl.trim() || saving) return;
    setSaving(true);
    if (editingId) {
      await updateSource(editingId, name, baseUrl);
    } else {
      await createSource(name, baseUrl);
    }
    setSaving(false);
    setShowDialog(false);
  };

  const handleDelete = async (sourceId: string) => {
    setDeleting(sourceId);
    await deleteSource(sourceId);
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-mono text-lg font-semibold">{t('ucc.sources')}</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('ucc.newSource')}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {sources.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded p-10 text-center">
          <Database className="w-10 h-10 text-txt-muted mx-auto mb-3" />
          <p className="text-sm text-txt-secondary">{t('ucc.noSources')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map(source => (
            <div
              key={source.source_id}
              className="bg-bg-surface border border-border rounded p-5 hover:border-border-hover transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-accent/10 rounded-sm">
                  <Database className="w-5 h-5 text-accent" />
                </div>
                <span className="text-2xs font-mono text-txt-muted bg-bg-elevated px-2 py-0.5 rounded-sm">
                  {source.aas_count || 0} AAS
                </span>
              </div>
              <h3 className="font-mono text-sm font-semibold mb-1">{source.name}</h3>
              <p className="text-2xs text-txt-muted font-mono truncate mb-4" title={source.base_url}>
                {source.base_url}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAasDialogSource({ id: source.source_id, name: source.name, url: source.base_url })}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-accent hover:bg-accent-muted rounded-sm transition-colors"
                >
                  <List className="w-3.5 h-3.5" />
                  {t('ucc.aasIds')}
                </button>
                <button
                  onClick={() => openEdit(source.source_id, source.name, source.base_url)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-txt-muted hover:text-txt-primary hover:bg-bg-elevated rounded-sm transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(source.source_id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-txt-muted hover:text-red-400 hover:bg-bg-elevated rounded-sm transition-colors"
                >
                  {deleting === source.source_id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Source Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-bg-primary/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface border border-border rounded w-full max-w-md p-5">
            <h3 className="font-mono text-sm font-semibold mb-4">
              {editingId ? t('ucc.editSource') : t('ucc.newSource')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-2xs text-txt-muted mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="z.B. Production Repository"
                  className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-2xs text-txt-muted mb-1">Base URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://aas-repository.example.com/api/v3.0"
                  className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary font-mono focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDialog(false)}
                  className="px-4 py-2 text-sm text-txt-muted hover:text-txt-primary transition-colors"
                >
                  {t('ucc.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || !baseUrl.trim() || saving}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? t('ucc.save') : t('ucc.create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AAS IDs Dialog */}
      {aasDialogSource && (
        <AasIdsDialog
          sourceId={aasDialogSource.id}
          sourceName={aasDialogSource.name}
          sourceUrl={aasDialogSource.url}
          onClose={() => setAasDialogSource(null)}
        />
      )}
    </div>
  );
}
