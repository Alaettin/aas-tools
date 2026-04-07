import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Loader2, Database } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { supabase } from '@/lib/supabase';
import { useAasIds } from '../hooks/useSources';
import type { Source } from '../types';

export function SourceDetail() {
  const { sourceId } = useParams<{ sourceId: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [source, setSource] = useState<Source | null>(null);
  const [loadingSource, setLoadingSource] = useState(true);
  const { entries, loading, addAasIds, removeAasId } = useAasIds(sourceId);
  const [newIds, setNewIds] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceId) return;
    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from('ucc_sources')
        .select('*')
        .eq('source_id', sourceId)
        .single();

      if (!mounted) return;
      setSource(data as Source | null);
      setLoadingSource(false);
    })();

    return () => { mounted = false; };
  }, [sourceId]);

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

  if (loadingSource || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!source) {
    return <p className="text-sm text-red-400">{t('ucc.sourceNotFound')}</p>;
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors mb-6 font-mono"
      >
        <ArrowLeft className="w-3 h-3" />
        {t('ucc.tabSources')}
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent/10 rounded-sm">
          <Database className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="font-mono text-lg font-semibold">{source.name}</h2>
          <p className="text-2xs text-txt-muted font-mono">{source.base_url}</p>
        </div>
      </div>

      {/* AAS IDs */}
      <div className="bg-bg-surface border border-border rounded mb-6">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
            AAS-IDs
          </h3>
          <span className="text-2xs font-mono text-txt-muted bg-bg-elevated px-2 py-0.5 rounded-sm">
            {entries.length}
          </span>
        </div>
        <div className="p-5">
          {entries.length === 0 ? (
            <p className="text-sm text-txt-muted mb-4">{t('ucc.noAasIds')}</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              {entries.map(entry => (
                <div
                  key={entry.entry_id}
                  className="flex items-center gap-1.5 bg-bg-elevated px-2.5 py-1 rounded-sm group"
                >
                  <span className="text-xs font-mono text-txt-primary max-w-[250px] truncate" title={entry.aas_id}>
                    {entry.aas_id}
                  </span>
                  <button
                    onClick={() => handleRemove(entry.entry_id)}
                    className="text-txt-muted hover:text-red-400 transition-colors"
                  >
                    {removing === entry.entry_id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
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
        </div>
      </div>
    </div>
  );
}
