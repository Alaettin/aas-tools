import { useState, useMemo } from 'react';
import { Plus, Trash2, Save, Loader2, Search } from 'lucide-react';
import { useModel } from '../hooks/useModel';
import { validateDatapointId } from '../lib/validation';
import { useLocale } from '@/context/LocaleContext';

interface ModelEditorProps {
  connectorId: string;
}

export function ModelEditor({ connectorId }: ModelEditorProps) {
  const { t } = useLocale();
  const {
    datapoints, loading, saving, error, hasChanges,
    addDatapoint, removeDatapoints, updateDatapoint, save,
  } = useModel(connectorId);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return datapoints.map((dp, i) => ({ dp, i }));
    const q = search.toLowerCase();
    return datapoints
      .map((dp, i) => ({ dp, i }))
      .filter(({ dp }) => dp.dp_id.toLowerCase().includes(q) || dp.name.toLowerCase().includes(q));
  }, [datapoints, search]);

  const idCounts = useMemo(() => {
    const counts = new Map<string, number>();
    datapoints.forEach(dp => {
      const key = dp.dp_id.toLowerCase();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [datapoints]);

  const hasErrors = datapoints.some((dp) => {
    if (!dp.dp_id) return true;
    if (validateDatapointId(dp.dp_id)) return true;
    if ((idCounts.get(dp.dp_id.toLowerCase()) || 0) > 1) return true;
    return false;
  });

  const canSave = hasChanges && !hasErrors && datapoints.every(dp => dp.dp_id.trim());

  const toggleSelect = (index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(f => f.i)));
    }
  };

  const handleBulkDelete = () => {
    removeDatapoints(selected);
    setSelected(new Set());
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
          <h2 className="font-mono text-lg font-semibold">Data Model</h2>
          <p className="text-xs text-txt-muted mt-0.5">
            {datapoints.length} {datapoints.length === 1 ? 'Datapoint' : 'Datapoints'}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => save()}
            disabled={!canSave || saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common.save')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Table */}
      {datapoints.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded p-8 text-center mb-4">
          <p className="text-sm text-txt-secondary">{t('dti.noDatapoints')}</p>
        </div>
      ) : (
        <div className="bg-bg-surface border border-border rounded overflow-hidden mb-4">
          <div className="grid grid-cols-[40px_40px_1fr_1fr_120px] gap-0 border-b border-border px-3 py-2 text-2xs font-medium text-txt-muted uppercase tracking-wider">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={filtered.length > 0 && selected.size === filtered.length}
                onChange={toggleSelectAll}
                className="accent-accent"
              />
            </div>
            <div className="text-center">#</div>
            <div className="px-2">ID</div>
            <div className="px-2">Name</div>
            <div className="px-2">Type</div>
          </div>

          {filtered.map(({ dp, i }) => {
            const idErr = dp.dp_id ? validateDatapointId(dp.dp_id) : null;
            const isDuplicate = dp.dp_id && (idCounts.get(dp.dp_id.toLowerCase()) || 0) > 1;

            return (
              <div
                key={i}
                className="grid grid-cols-[40px_40px_1fr_1fr_120px] gap-0 border-b border-border last:border-0 px-3 py-1.5 hover:bg-bg-elevated/50 transition-colors items-center"
              >
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleSelect(i)}
                    className="accent-accent"
                  />
                </div>
                <div className="text-xs font-mono text-txt-muted text-center">{i + 1}</div>
                <div className="px-2">
                  <input
                    type="text"
                    value={dp.dp_id}
                    onChange={e => updateDatapoint(i, 'dp_id', e.target.value)}
                    placeholder="datapoint_id"
                    className={`w-full bg-transparent text-sm font-mono placeholder:text-txt-muted focus:outline-none ${
                      idErr || isDuplicate ? 'text-red-400' : 'text-txt-primary'
                    }`}
                  />
                  {isDuplicate && <p className="text-2xs text-red-400">Duplikat</p>}
                  {idErr && !isDuplicate && <p className="text-2xs text-red-400">{idErr}</p>}
                </div>
                <div className="px-2">
                  <input
                    type="text"
                    value={dp.name}
                    onChange={e => updateDatapoint(i, 'name', e.target.value)}
                    placeholder="Name (optional)"
                    className="w-full bg-transparent text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none"
                  />
                </div>
                <div className="px-2">
                  <select
                    value={dp.type}
                    onChange={e => updateDatapoint(i, 'type', parseInt(e.target.value))}
                    className="w-full bg-bg-input border border-border rounded-sm px-2 py-1 text-xs text-txt-primary focus:border-accent"
                  >
                    <option value={0}>Property</option>
                    <option value={1}>File</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={addDatapoint}
          className="flex items-center gap-2 text-sm text-txt-secondary hover:text-accent transition-colors"
        >
          <Plus className="w-4 h-4" />
          Datapoint hinzufügen
        </button>

        {selected.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {selected.size} löschen
          </button>
        )}
      </div>
    </div>
  );
}
