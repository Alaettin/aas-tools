import { useState, useMemo } from 'react';
import { Plus, Loader2, Search, Pencil, Trash2, Check, X, Box } from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import { validateAssetId } from '../lib/validation';
import { useLocale } from '@/context/LocaleContext';

interface AssetListProps {
  connectorId: string;
  onSelect: (assetId: string) => void;
}

export function AssetList({ connectorId, onSelect }: AssetListProps) {
  const { t } = useLocale();
  const { assets, loading, error, createAsset, renameAsset, deleteAsset } = useAssets(connectorId);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [newId, setNewId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const filtered = useMemo(() => {
    if (!search) return assets;
    const q = search.toLowerCase();
    return assets.filter(a => a.asset_id.toLowerCase().includes(q));
  }, [assets, search]);

  const handleCreate = async () => {
    const err = validateAssetId(newId);
    if (err) { setCreateError(err); return; }

    setCreating(true);
    setCreateError(null);
    const ok = await createAsset(newId);
    if (ok) setNewId('');
    setCreating(false);
  };

  const handleRename = async (oldId: string) => {
    const err = validateAssetId(editValue);
    if (err) return;
    const ok = await renameAsset(oldId, editValue);
    if (ok) setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div>
          <h2 className="font-mono text-lg font-semibold">Assets</h2>
          <p className="text-xs text-txt-muted mt-0.5">
            {assets.length} {assets.length === 1 ? 'Asset' : 'Assets'}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen…"
            className="bg-bg-input border border-border rounded-sm pl-8 pr-3 py-1.5 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 w-48"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Create */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={newId}
          onChange={e => { setNewId(e.target.value); setCreateError(null); }}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
          placeholder={t('dti.newAssetPlaceholder')}
          className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2 text-sm font-mono text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newId.trim()}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-40"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {t('common.create')}
        </button>
      </div>
      {createError && <p className="text-xs text-red-400 mb-4">{createError}</p>}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded p-8 text-center">
          <Box className="w-8 h-8 text-txt-muted mx-auto mb-3" />
          <p className="text-sm text-txt-secondary">
            {assets.length === 0 ? t('dti.noAssets') : t('dti.noResults')}
          </p>
        </div>
      ) : (
        <div className="bg-bg-surface border border-border rounded overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_80px] gap-0 border-b border-border px-3 py-2 text-2xs font-medium text-txt-muted uppercase tracking-wider">
            <div className="text-center">#</div>
            <div className="px-2">Asset-ID</div>
            <div />
          </div>
          {filtered.map((asset, i) => (
            <div
              key={asset.asset_id}
              className="grid grid-cols-[40px_1fr_80px] gap-0 border-b border-border last:border-0 px-3 py-2 hover:bg-bg-elevated/50 transition-colors items-center group"
            >
              <div className="text-xs font-mono text-txt-muted text-center">{i + 1}</div>
              <div className="px-2">
                {editingId === asset.asset_id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(asset.asset_id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 bg-bg-input border border-border rounded-sm px-2 py-1 text-sm font-mono text-txt-primary focus:border-accent"
                    />
                    <button onClick={() => handleRename(asset.asset_id)} className="text-emerald-400 hover:text-emerald-300">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-txt-muted hover:text-txt-primary">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelect(asset.asset_id)}
                    className="text-sm font-mono text-txt-primary hover:text-accent transition-colors"
                  >
                    {asset.asset_id}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {editingId !== asset.asset_id && (
                  <>
                    <button
                      onClick={() => { setEditingId(asset.asset_id); setEditValue(asset.asset_id); }}
                      className="p-1 text-txt-muted hover:text-txt-primary"
                      title="Umbenennen"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => { setDeleting(asset.asset_id); await deleteAsset(asset.asset_id); setDeleting(null); }}
                      disabled={deleting === asset.asset_id}
                      className="p-1 text-txt-muted hover:text-red-400 disabled:opacity-50"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
