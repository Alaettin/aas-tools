import { useCallback, useEffect, useMemo, useState } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { AlertCircle, Loader2, RefreshCw, Search, Filter as FilterIcon, ShieldOff, ShieldCheck, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Proxy } from '../types';
import type { Datapoint } from '../types';
import { useBlacklist } from '../hooks/useBlacklist';
import { useLocale } from '@/context/LocaleContext';

interface ModelFilterProps {
  proxy: Proxy;
}

type FilterMode = 'all' | 'allowed' | 'blocked';
type TypeFilter = 'all' | 'property' | 'file';
type SortMode = 'default' | 'id-asc' | 'id-desc' | 'name-asc' | 'name-desc';

const ROW_HEIGHT = 52;
const LIST_HEIGHT = 620;
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500];
const DEFAULT_PAGE_SIZE = 50;

export function ModelFilter({ proxy }: ModelFilterProps) {
  const { t } = useLocale();
  const { blacklist, loading: blLoading, error: blError, toggle, bulkSet } = useBlacklist(proxy.proxy_id);

  const [dps, setDps] = useState<Datapoint[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mode, setMode] = useState<FilterMode>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortMode>('default');
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(0);

  const loadModel = useCallback(async () => {
    if (!proxy.target_base_url) return;
    setFetchLoading(true);
    setFetchError(null);
    try {
      const base = proxy.target_base_url.replace(/\/$/, '');
      const res = await fetch(`${base}/model`);
      if (!res.ok) {
        setFetchError(`HTTP ${res.status}`);
        setDps([]);
      } else {
        const data = await res.json();
        if (!Array.isArray(data)) {
          setFetchError('Unexpected response (not an array)');
          setDps([]);
        } else {
          setDps(data as Datapoint[]);
        }
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
      setDps([]);
    }
    setFetchLoading(false);
  }, [proxy.target_base_url]);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 150);
    return () => clearTimeout(h);
  }, [search]);

  const filtered = useMemo(() => {
    let list = dps;
    if (debouncedSearch) {
      list = list.filter(d =>
        d.id.toLowerCase().includes(debouncedSearch) ||
        d.name.toLowerCase().includes(debouncedSearch)
      );
    }
    if (typeFilter === 'property') list = list.filter(d => d.type === 0);
    else if (typeFilter === 'file') list = list.filter(d => d.type === 1);
    if (mode === 'allowed') list = list.filter(d => !blacklist.has(d.id));
    else if (mode === 'blocked') list = list.filter(d => blacklist.has(d.id));
    if (sortBy !== 'default') {
      const sorted = list.slice();
      const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
      if (sortBy === 'id-asc') sorted.sort((a, b) => cmp(a.id, b.id));
      else if (sortBy === 'id-desc') sorted.sort((a, b) => cmp(b.id, a.id));
      else if (sortBy === 'name-asc') sorted.sort((a, b) => cmp(a.name, b.name));
      else if (sortBy === 'name-desc') sorted.sort((a, b) => cmp(b.name, a.name));
      list = sorted;
    }
    return list;
  }, [dps, debouncedSearch, typeFilter, mode, blacklist, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, typeFilter, mode, sortBy, pageSize]);

  const visible = useMemo(
    () => filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [filtered, currentPage, pageSize],
  );

  const stats = useMemo(() => {
    const total = dps.length;
    const blocked = dps.reduce((acc, d) => acc + (blacklist.has(d.id) ? 1 : 0), 0);
    return { total, blocked, allowed: total - blocked };
  }, [dps, blacklist]);

  const blockVisible = () => {
    const ids = visible.filter(d => !blacklist.has(d.id)).map(d => d.id);
    if (ids.length) bulkSet(ids, true);
  };

  const allowVisible = () => {
    const ids = visible.filter(d => blacklist.has(d.id)).map(d => d.id);
    if (ids.length) bulkSet(ids, false);
  };

  if (!proxy.target_base_url) {
    return (
      <div className="bg-bg-surface border border-border rounded p-8 text-center">
        <AlertCircle className="w-10 h-10 text-txt-muted mx-auto mb-3" />
        <p className="text-sm text-txt-secondary">{t('proxy.filterNoTarget')}</p>
      </div>
    );
  }

  const anyLoading = fetchLoading || blLoading;
  const anyError = fetchError || blError;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-mono text-lg font-semibold mb-1 flex items-center gap-2">
          <FilterIcon className="w-5 h-5 text-accent" />
          {t('proxy.filterTitle')}
        </h2>
        <p className="text-sm text-txt-secondary">{t('proxy.filterSubtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t('proxy.filterStatsTotal')} value={stats.total} color="text-txt-primary" />
        <StatCard label={t('proxy.filterStatsAllowed')} value={stats.allowed} color="text-emerald-400" />
        <StatCard label={t('proxy.filterStatsBlocked')} value={stats.blocked} color="text-red-400" />
      </div>

      {/* Controls */}
      <div className="bg-bg-surface border border-border rounded p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-txt-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('proxy.filterSearchPlaceholder')}
              className="w-full bg-bg-input border border-border rounded-sm pl-9 pr-3 py-2 text-sm font-mono text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <button
            onClick={loadModel}
            disabled={anyLoading}
            title={t('proxy.filterReload')}
            className="p-2 bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-txt-secondary ${fetchLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status filter */}
            <div className="flex items-center gap-1 text-xs">
              {(['all', 'allowed', 'blocked'] as FilterMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-2.5 py-1 rounded-sm border transition-colors ${
                    mode === m
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-border text-txt-muted hover:text-txt-primary'
                  }`}
                >
                  {t(`proxy.filter${m === 'all' ? 'All' : m === 'allowed' ? 'Allowed' : 'Blocked'}` as any)}
                </button>
              ))}
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-1 text-xs">
              {(['all', 'property', 'file'] as TypeFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-2.5 py-1 rounded-sm border transition-colors ${
                    typeFilter === f
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-border text-txt-muted hover:text-txt-primary'
                  }`}
                >
                  {t(`proxy.filterType${f === 'all' ? 'All' : f === 'property' ? 'Property' : 'File'}` as any)}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-txt-muted" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortMode)}
                className="bg-bg-input border border-border rounded-sm px-2 py-1 text-xs text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
              >
                <option value="default">{t('proxy.sortDefault')}</option>
                <option value="id-asc">{t('proxy.sortIdAsc')}</option>
                <option value="id-desc">{t('proxy.sortIdDesc')}</option>
                <option value="name-asc">{t('proxy.sortNameAsc')}</option>
                <option value="name-desc">{t('proxy.sortNameDesc')}</option>
              </select>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={blockVisible}
              disabled={visible.length === 0}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldOff className="w-3.5 h-3.5" />
              {t('proxy.filterBlockVisible')}
            </button>
            <button
              onClick={allowVisible}
              disabled={visible.length === 0}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('proxy.filterAllowVisible')}
            </button>
          </div>
        </div>
      </div>

      {anyError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">{t('proxy.filterLoadFailed')}</p>
            <p className="text-xs text-red-400/70 mt-0.5 font-mono break-all">{anyError}</p>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-bg-surface border border-border rounded overflow-hidden">
        {fetchLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center text-sm text-txt-muted">
            {t('proxy.filterEmpty')}
          </div>
        ) : (
          <List
            rowCount={visible.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={Row}
            rowProps={{ items: visible, blacklist, toggle, t }}
            style={{ height: Math.min(LIST_HEIGHT, visible.length * ROW_HEIGHT) }}
          />
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="text-txt-muted">
            {t('proxy.paginationShowing')
              .replace('{from}', (currentPage * pageSize + 1).toLocaleString('de-DE'))
              .replace('{to}', Math.min((currentPage + 1) * pageSize, filtered.length).toLocaleString('de-DE'))
              .replace('{total}', filtered.length.toLocaleString('de-DE'))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(0)}
                disabled={currentPage === 0}
                title={t('proxy.paginationFirst')}
                className="p-1.5 rounded-sm border border-border text-txt-muted hover:text-txt-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                title={t('proxy.paginationPrev')}
                className="p-1.5 rounded-sm border border-border text-txt-muted hover:text-txt-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 text-txt-secondary font-mono">
                {currentPage + 1} / {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                title={t('proxy.paginationNext')}
                className="p-1.5 rounded-sm border border-border text-txt-muted hover:text-txt-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
                title={t('proxy.paginationLast')}
                className="p-1.5 rounded-sm border border-border text-txt-muted hover:text-txt-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-txt-muted">{t('proxy.paginationPerPage')}</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="bg-bg-input border border-border rounded-sm px-2 py-1 text-xs text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
              >
                {PAGE_SIZE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-bg-surface border border-border rounded p-3">
      <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider">{label}</p>
      <p className={`font-mono text-xl font-bold mt-1 ${color}`}>{value.toLocaleString('de-DE')}</p>
    </div>
  );
}

interface RowProps {
  items: Datapoint[];
  blacklist: Set<string>;
  toggle: (dpId: string, block: boolean) => Promise<boolean>;
  t: (key: any) => string;
}

function Row({ index, style, items, blacklist, toggle, t }: RowComponentProps<RowProps>) {
  const dp = items[index];
  const blocked = blacklist.has(dp.id);
  const typeLabel = dp.type === 1 ? 'F' : 'P';

  return (
    <div
      style={style}
      className="flex items-center gap-3 px-4 border-b border-border last:border-b-0 hover:bg-bg-elevated/40 transition-colors"
    >
      <button
        role="switch"
        aria-checked={!blocked}
        onClick={() => toggle(dp.id, !blocked)}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
          blocked ? 'bg-red-500/40' : 'bg-emerald-500/50'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            blocked ? 'translate-x-0' : 'translate-x-4'
          }`}
        />
      </button>

      <span
        className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
          dp.type === 1
            ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
            : 'text-blue-400 bg-blue-400/10 border-blue-400/20'
        }`}
        title={dp.type === 1 ? t('proxy.filterTypeFile') : t('proxy.filterTypeProperty')}
      >
        {typeLabel}
      </span>

      <span className="text-xs font-mono text-txt-primary flex-shrink-0 max-w-[40%] truncate" title={dp.id}>
        {dp.id}
      </span>

      <span className="text-xs text-txt-secondary truncate flex-1 min-w-0" title={dp.name}>
        {dp.name}
      </span>

      {blocked && (
        <span className="text-2xs uppercase tracking-wider text-red-400 font-medium flex-shrink-0">
          blocked
        </span>
      )}
    </div>
  );
}
