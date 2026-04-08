import { useState, useMemo } from 'react';
import { ArrowLeft, Save, Loader2, Search } from 'lucide-react';
import { useAssetDetail } from '../hooks/useAssetDetail';
import { useLocale } from '@/context/LocaleContext';

interface AssetDetailProps {
  connectorId: string;
  assetId: string;
  onBack: () => void;
}

export function AssetDetail({ connectorId, assetId, onBack }: AssetDetailProps) {
  const { t } = useLocale();
  const {
    hierarchyLevels, propertyDps, fileDps, fileEntryIds,
    loading, saving, error, hasChanges,
    getValue, setValue, save,
  } = useAssetDetail(connectorId, assetId);

  const [propSearch, setPropSearch] = useState('');

  const filteredProps = useMemo(() => {
    if (!propSearch) return propertyDps;
    const q = propSearch.toLowerCase();
    return propertyDps.filter(dp => dp.dp_id.toLowerCase().includes(q) || dp.name.toLowerCase().includes(q));
  }, [propertyDps, propSearch]);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors mb-2 font-mono"
          >
            <ArrowLeft className="w-3 h-3" />
            Assets
          </button>
          <h2 className="font-mono text-lg font-semibold">{assetId}</h2>
        </div>
        <button
          onClick={() => save()}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('common.save')}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* ─── Section 1: Hierarchy ─── */}
        {hierarchyLevels.length > 0 && (
          <div>
            <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary mb-3">
              Hierarchy
            </h3>
            <div className="bg-bg-surface border border-border rounded p-4 space-y-3">
              {hierarchyLevels.map(level => (
                <div key={level} className="flex items-center gap-4">
                  <label className="text-sm text-txt-secondary w-32 flex-shrink-0 font-mono">
                    {level}
                  </label>
                  <input
                    type="text"
                    value={getValue(level, 'en')}
                    onChange={e => setValue(level, 'en', e.target.value)}
                    placeholder="Wert…"
                    className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Section 2: Properties ─── */}
        {propertyDps.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
                Properties
              </h3>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted" />
                <input
                  type="text"
                  value={propSearch}
                  onChange={e => setPropSearch(e.target.value)}
                  placeholder="Suchen…"
                  className="bg-bg-input border border-border rounded-sm pl-8 pr-3 py-1.5 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 w-40"
                />
              </div>
            </div>
            <div className="bg-bg-surface border border-border rounded overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-0 border-b border-border px-3 py-2 text-2xs font-medium text-txt-muted uppercase tracking-wider">
                <div className="text-center">#</div>
                <div className="px-2">ID</div>
                <div className="px-2">EN</div>
                <div className="px-2">DE</div>
              </div>
              {filteredProps.map((dp, i) => (
                <div
                  key={dp.dp_id}
                  className="grid grid-cols-[40px_1fr_1fr_1fr] gap-0 border-b border-border last:border-0 px-3 py-1.5 hover:bg-bg-elevated/50 transition-colors items-center"
                >
                  <div className="text-xs font-mono text-txt-muted text-center">{i + 1}</div>
                  <div className="px-2 text-sm font-mono text-txt-secondary" title={dp.name || dp.dp_id}>
                    {dp.dp_id}
                  </div>
                  <div className="px-2">
                    <input
                      type="text"
                      value={getValue(dp.dp_id, 'en')}
                      onChange={e => setValue(dp.dp_id, 'en', e.target.value)}
                      placeholder="—"
                      className="w-full bg-transparent text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none"
                    />
                  </div>
                  <div className="px-2">
                    <input
                      type="text"
                      value={getValue(dp.dp_id, 'de')}
                      onChange={e => setValue(dp.dp_id, 'de', e.target.value)}
                      placeholder="—"
                      className="w-full bg-transparent text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Section 3: Files ─── */}
        {fileDps.length > 0 && (
          <div>
            <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary mb-3">
              Files
            </h3>
            <div className="bg-bg-surface border border-border rounded overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_1fr] gap-0 border-b border-border px-3 py-2 text-2xs font-medium text-txt-muted uppercase tracking-wider">
                <div className="text-center">#</div>
                <div className="px-2">Datapoint</div>
                <div className="px-2">File-Eintrag</div>
              </div>
              {fileDps.map((dp, i) => (
                <div
                  key={dp.dp_id}
                  className="grid grid-cols-[40px_1fr_1fr] gap-0 border-b border-border last:border-0 px-3 py-1.5 hover:bg-bg-elevated/50 transition-colors items-center"
                >
                  <div className="text-xs font-mono text-txt-muted text-center">{i + 1}</div>
                  <div className="px-2 text-sm font-mono text-txt-secondary" title={dp.name || dp.dp_id}>
                    {dp.dp_id}
                  </div>
                  <div className="px-2">
                    <select
                      value={getValue(dp.dp_id, 'en')}
                      onChange={e => setValue(dp.dp_id, 'en', e.target.value)}
                      className="w-full bg-bg-input border border-border rounded-sm px-2 py-1 text-xs text-txt-primary focus:border-accent"
                    >
                      <option value="">—</option>
                      {fileEntryIds.map(id => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
