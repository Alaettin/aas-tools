import { useState } from 'react';
import { ArrowLeft, Plus, Loader2, Database, Pencil, Trash2, List, X } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useSources, useAasIds } from '../hooks/useSources';
import type { Source } from '../types';

type View = 'list' | 'form' | 'aasIds';

function AasIdsView({ source, onBack }: { source: Source; onBack: () => void }) {
  const { t } = useLocale();
  const { entries, loading, addAasIds, removeAasId } = useAasIds(source.source_id);
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

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors font-mono">
          <ArrowLeft className="w-3 h-3" />
          {t('ucc.tabSources')}
        </button>
        <div className="h-4 w-px bg-border" />
        <div>
          <h3 className="font-mono text-sm font-semibold">{t('ucc.aasIds')} — {source.name}</h3>
          <p className="text-2xs text-txt-muted font-mono mt-0.5">{source.base_url}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
        </div>
      ) : (
        <>
          {entries.length === 0 ? (
            <p className="text-sm text-txt-muted mb-4">{t('ucc.noAasIds')}</p>
          ) : (
            <div className="bg-bg-surface border border-border rounded-sm mb-6 divide-y divide-border">
              {entries.map(entry => (
                <div key={entry.entry_id} className="flex items-center justify-between px-4 py-2.5 hover:bg-bg-elevated/50 transition-colors">
                  <span className="text-xs font-mono text-txt-primary truncate mr-3" title={entry.aas_id}>
                    {entry.aas_id}
                  </span>
                  <button
                    onClick={async () => { setRemoving(entry.entry_id); await removeAasId(entry.entry_id); setRemoving(null); }}
                    className="text-txt-muted hover:text-red-400 transition-colors flex-shrink-0 p-0.5"
                  >
                    {removing === entry.entry_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}

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
  );
}

function SourceForm({ editing, onSave, onBack }: {
  editing: Source | null;
  onSave: (name: string, baseUrl: string) => Promise<void>;
  onBack: () => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(editing?.name || '');
  const [baseUrl, setBaseUrl] = useState(editing?.base_url || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !baseUrl.trim() || saving) return;
    setSaving(true);
    await onSave(name, baseUrl);
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors font-mono">
          <ArrowLeft className="w-3 h-3" />
          {t('ucc.tabSources')}
        </button>
        <div className="h-4 w-px bg-border" />
        <h3 className="font-mono text-sm font-semibold">
          {editing ? t('ucc.editSource') : t('ucc.newSource')}
        </h3>
      </div>

      <div className="bg-bg-surface border border-border rounded p-5 max-w-lg space-y-4">
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
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!name.trim() || !baseUrl.trim() || saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? t('ucc.save') : t('ucc.create')}
          </button>
          <button onClick={onBack} className="px-4 py-2 text-sm text-txt-muted hover:text-txt-primary transition-colors">
            {t('ucc.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SourcesPage() {
  const { t } = useLocale();
  const { sources, loading, error, createSource, updateSource, deleteSource } = useSources();
  const [view, setView] = useState<View>('list');
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [aasSource, setAasSource] = useState<Source | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const openCreate = () => { setEditingSource(null); setView('form'); };
  const openEdit = (source: Source) => { setEditingSource(source); setView('form'); };
  const openAasIds = (source: Source) => { setAasSource(source); setView('aasIds'); };
  const backToList = () => setView('list');

  const handleSave = async (name: string, baseUrl: string) => {
    if (editingSource) {
      await updateSource(editingSource.source_id, name, baseUrl);
    } else {
      await createSource(name, baseUrl);
    }
    setView('list');
  };

  const handleDelete = async (sourceId: string) => {
    setDeleting(sourceId);
    await deleteSource(sourceId);
    setDeleting(null);
  };

  if (view === 'form') {
    return <SourceForm editing={editingSource} onSave={handleSave} onBack={backToList} />;
  }

  if (view === 'aasIds' && aasSource) {
    return <AasIdsView source={aasSource} onBack={backToList} />;
  }

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
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">{error}</div>
      )}

      {sources.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded p-10 text-center">
          <Database className="w-10 h-10 text-txt-muted mx-auto mb-3" />
          <p className="text-sm text-txt-secondary">{t('ucc.noSources')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map(source => (
            <div key={source.source_id} className="bg-bg-surface border border-border rounded p-5 hover:border-border-hover transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-accent/10 rounded-sm">
                  <Database className="w-5 h-5 text-accent" />
                </div>
                <span className="text-2xs font-mono text-txt-muted bg-bg-elevated px-2 py-0.5 rounded-sm">
                  {source.aas_count || 0} AAS
                </span>
              </div>
              <h3 className="font-mono text-sm font-semibold mb-1">{source.name}</h3>
              <p className="text-2xs text-txt-muted font-mono truncate mb-4" title={source.base_url}>{source.base_url}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => openAasIds(source)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-accent hover:bg-accent-muted rounded-sm transition-colors">
                  <List className="w-3.5 h-3.5" />
                  {t('ucc.aasIds')}
                </button>
                <button onClick={() => openEdit(source)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-txt-muted hover:text-txt-primary hover:bg-bg-elevated rounded-sm transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(source.source_id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-txt-muted hover:text-red-400 hover:bg-bg-elevated rounded-sm transition-colors">
                  {deleting === source.source_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
