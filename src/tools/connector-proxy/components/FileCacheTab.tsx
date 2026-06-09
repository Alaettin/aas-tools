import { useEffect, useMemo, useState } from 'react';
import { List, type RowComponentProps } from 'react-window';
import {
  AlertCircle,
  Database,
  Download,
  Loader2,
  RefreshCw,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { Proxy, FileRef } from '../types';
import { useFileCache } from '../hooks/useFileCache';
import { useLocale } from '@/context/LocaleContext';

interface FileCacheTabProps {
  proxy: Proxy;
  onEnabledChange: (enabled: boolean) => void;
}

type SortMode = 'default' | 'item-asc' | 'item-desc' | 'fetched-asc' | 'fetched-desc' | 'size-asc' | 'size-desc';

const ROW_HEIGHT = 56;
const LIST_HEIGHT = 620;
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500];
const DEFAULT_PAGE_SIZE = 50;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `vor ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `vor ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h}h`;
  const d = Math.floor(h / 24);
  return `vor ${d}d`;
}

export function FileCacheTab({ proxy, onEnabledChange }: FileCacheTabProps) {
  const { t } = useLocale();
  const { refs, stats, loading, error, reload, setEnabled, openSignedUrl } = useFileCache(proxy.proxy_id);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('default');
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(0);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 150);
    return () => clearTimeout(h);
  }, [search]);

  const handleToggle = async () => {
    setToggling(true);
    const next = !proxy.files_cache_enabled;
    const ok = await setEnabled(next);
    setToggling(false);
    if (ok) onEnabledChange(next);
  };

  const filtered = useMemo(() => {
    let list = refs;
    if (debouncedSearch) {
      list = list.filter(r =>
        r.item_id.toLowerCase().includes(debouncedSearch) ||
        r.property_id.toLowerCase().includes(debouncedSearch) ||
        (r.filename ?? '').toLowerCase().includes(debouncedSearch) ||
        r.language.toLowerCase().includes(debouncedSearch)
      );
    }
    if (sortBy !== 'default') {
      const sorted = list.slice();
      const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
      if (sortBy === 'item-asc') sorted.sort((a, b) => cmp(a.item_id, b.item_id));
      else if (sortBy === 'item-desc') sorted.sort((a, b) => cmp(b.item_id, a.item_id));
      else if (sortBy === 'fetched-asc') sorted.sort((a, b) => +new Date(a.fetched_at) - +new Date(b.fetched_at));
      else if (sortBy === 'fetched-desc') sorted.sort((a, b) => +new Date(b.fetched_at) - +new Date(a.fetched_at));
      else if (sortBy === 'size-asc') sorted.sort((a, b) => a.size_bytes - b.size_bytes);
      else if (sortBy === 'size-desc') sorted.sort((a, b) => b.size_bytes - a.size_bytes);
      list = sorted;
    }
    return list;
  }, [refs, debouncedSearch, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, sortBy, pageSize]);

  const visible = useMemo(
    () => filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [filtered, currentPage, pageSize],
  );

  const dedupRate = stats.totalRefs > 0 ? 1 - stats.uniqueBlobs / stats.totalRefs : 0;

  return (
    <div className="space-y-4">
      {/* Header with toggle */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-mono text-lg font-semibold mb-1 flex items-center gap-2">
            <Database className="w-5 h-5 text-accent" />
            {t('proxy.filesTitle')}
          </h2>
          <p className="text-sm text-txt-secondary">{t('proxy.filesSubtitle')}</p>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-md border text-sm font-medium transition-colors ${
            proxy.files_cache_enabled
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
              : 'border-border bg-bg-surface text-txt-muted'
          }`}
        >
          <span
            className={`relative w-10 h-5 rounded-full transition-colors ${
              proxy.files_cache_enabled ? 'bg-emerald-500/60' : 'bg-bg-elevated'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                proxy.files_cache_enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </span>
          {proxy.files_cache_enabled ? t('proxy.filesActive') : t('proxy.filesInactive')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t('proxy.filesStatsTotalRefs')} value={stats.totalRefs.toLocaleString('de-DE')} color="text-txt-primary" />
        <StatCard label={t('proxy.filesStatsUniqueBlobs')} value={stats.uniqueBlobs.toLocaleString('de-DE')} color="text-blue-400" />
        <StatCard label={t('proxy.filesStatsStorage')} value={formatBytes(stats.storageBytes)} color="text-amber-400" />
        <StatCard label={t('proxy.filesStatsDedup')} value={`${(dedupRate * 100).toFixed(1)}%`} color="text-emerald-400" />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="font-mono break-all">{error}</p>
        </div>
      )}

      {/* Controls */}
      {refs.length > 0 && (
        <div className="bg-bg-surface border border-border rounded p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-txt-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('proxy.filesSearchPlaceholder')}
                className="w-full bg-bg-input border border-border rounded-sm pl-9 pr-3 py-2 text-sm font-mono text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
              />
            </div>
            <button
              onClick={reload}
              disabled={loading}
              title={t('proxy.filterReload')}
              className="p-2 bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-txt-secondary ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-txt-muted" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortMode)}
              className="bg-bg-input border border-border rounded-sm px-2 py-1 text-xs text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
            >
              <option value="default">{t('proxy.sortDefault')}</option>
              <option value="fetched-desc">{t('proxy.filesSortFetchedDesc')}</option>
              <option value="fetched-asc">{t('proxy.filesSortFetchedAsc')}</option>
              <option value="item-asc">{t('proxy.filesSortItemAsc')}</option>
              <option value="item-desc">{t('proxy.filesSortItemDesc')}</option>
              <option value="size-desc">{t('proxy.filesSortSizeDesc')}</option>
              <option value="size-asc">{t('proxy.filesSortSizeAsc')}</option>
            </select>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-bg-surface border border-border rounded overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : refs.length === 0 ? (
          <div className="py-16 text-center text-sm text-txt-muted">
            {proxy.files_cache_enabled ? t('proxy.filesEmptyActive') : t('proxy.filesEmptyInactive')}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center text-sm text-txt-muted">
            {t('proxy.filesNoResults')}
          </div>
        ) : (
          <List
            rowCount={visible.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={Row}
            rowProps={{ items: visible, t, onDownload: openSignedUrl }}
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
              <button onClick={() => setPage(0)} disabled={currentPage === 0} title={t('proxy.paginationFirst')}
                className="p-1.5 rounded-sm border border-border text-txt-muted hover:text-txt-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} title={t('proxy.paginationPrev')}
                className="p-1.5 rounded-sm border border-border text-txt-muted hover:text-txt-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-txt-secondary font-mono">{currentPage + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1} title={t('proxy.paginationNext')}
                className="p-1.5 rounded-sm border border-border text-txt-muted hover:text-txt-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPage(totalPages - 1)} disabled={currentPage >= totalPages - 1} title={t('proxy.paginationLast')}
                className="p-1.5 rounded-sm border border-border text-txt-muted hover:text-txt-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-txt-muted">{t('proxy.paginationPerPage')}</span>
              <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
                className="bg-bg-input border border-border rounded-sm px-2 py-1 text-xs text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none">
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-bg-surface border border-border rounded p-3">
      <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider">{label}</p>
      <p className={`font-mono text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

interface RowProps {
  items: FileRef[];
  t: (key: any) => string;
  onDownload: (storagePath: string) => void;
}

function Row({ index, style, items, t, onDownload }: RowComponentProps<RowProps>) {
  const ref = items[index];
  return (
    <div
      style={style}
      className="flex items-center gap-3 px-4 border-b border-border last:border-b-0 hover:bg-bg-elevated/40 transition-colors"
    >
      <span className="text-xs font-mono text-txt-primary flex-shrink-0 w-32 truncate" title={ref.item_id}>
        {ref.item_id}
      </span>
      <span className="text-xs font-mono text-txt-secondary flex-shrink-0 w-40 truncate" title={ref.property_id}>
        {ref.property_id}
      </span>
      {ref.language && (
        <span className="text-2xs uppercase text-txt-muted bg-bg-elevated border border-border rounded px-1.5 py-0.5 font-mono flex-shrink-0">
          {ref.language}
        </span>
      )}
      <span className="text-xs text-txt-secondary flex-1 min-w-0 truncate" title={ref.filename ?? ''}>
        {ref.filename ?? '—'}
      </span>
      <span className="text-2xs text-txt-muted font-mono flex-shrink-0 w-20 text-right">
        {formatBytes(ref.size_bytes)}
      </span>
      <span className="text-2xs text-txt-muted font-mono flex-shrink-0 w-16 text-right">
        {formatRelative(ref.fetched_at)}
      </span>
      <button
        onClick={() => onDownload(ref.storage_path)}
        title={t('proxy.filesDownload')}
        className="p-1.5 rounded text-txt-muted hover:text-accent hover:bg-accent/10 transition-colors flex-shrink-0"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}
