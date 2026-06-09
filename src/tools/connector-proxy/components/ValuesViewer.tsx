import { useCallback, useEffect, useMemo, useState } from 'react';
import { List, type RowComponentProps } from 'react-window';
import {
  AlertCircle,
  Loader2,
  Search,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
} from 'lucide-react';
import type { Proxy, ValueEntry, Datapoint } from '../types';
import { useLocale } from '@/context/LocaleContext';

interface ValuesViewerProps {
  proxy: Proxy;
}

type TypeFilter = 'all' | 'property' | 'file';
type SortMode = 'default' | 'id-asc' | 'id-desc' | 'name-asc' | 'name-desc' | 'value-asc' | 'value-desc';
type Source = 'filtered' | 'unfiltered';

const ROW_HEIGHT = 56;
const LIST_HEIGHT = 620;
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500];
const DEFAULT_PAGE_SIZE = 50;

function sourceBase(proxy: Proxy, mode: Source): string {
  if (mode === 'filtered') return `/connector-proxy-api/${proxy.api_key}`;
  return (proxy.target_base_url ?? '').replace(/\/$/, '');
}

function base64ToBlob(b64: string, mime: string): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function guessMime(filename?: string): string {
  if (!filename) return 'application/octet-stream';
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    zip: 'application/zip',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] ?? 'application/octet-stream';
}

export function ValuesViewer({ proxy }: ValuesViewerProps) {
  const { t } = useLocale();

  const [itemId, setItemId] = useState('');
  const [languages, setLanguages] = useState('en,de');
  const [source, setSource] = useState<Source>('filtered');
  const [entries, setEntries] = useState<ValueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortMode>('default');
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 150);
    return () => clearTimeout(h);
  }, [search]);

  const load = useCallback(async () => {
    const id = itemId.trim();
    if (!id) return;
    if (!proxy.target_base_url && source === 'unfiltered') {
      setError('common.saveFailed');
      return;
    }

    setLoading(true);
    setError(null);
    setDownloadError(null);

    const base = sourceBase(proxy, source);
    const langs = languages.split(',').map(s => s.trim()).filter(Boolean);
    const langList = langs.length ? langs : ['en', 'de'];

    try {
      const [modelRes, valuesRes] = await Promise.all([
        fetch(`${base}/model`),
        fetch(`${base}/Product/${encodeURIComponent(id)}/values`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertiesWithLanguage: { languages: langList, propertyIds: [] },
            propertiesWithoutLanguage: { propertyIds: [] },
          }),
        }),
      ]);

      if (!modelRes.ok) {
        setError(`model: HTTP ${modelRes.status}`);
        setEntries([]);
        setLoading(false);
        return;
      }
      if (!valuesRes.ok) {
        const body = await valuesRes.text();
        setError(`values: HTTP ${valuesRes.status} ${body.slice(0, 200)}`);
        setEntries([]);
        setLoading(false);
        return;
      }

      const model = (await modelRes.json()) as Datapoint[];
      const values = (await valuesRes.json()) as Array<{
        propertyId: string;
        value: string;
        valueLanguage?: string;
        needsResolve?: boolean;
      }>;

      const modelMap = new Map<string, { name: string; type: number }>();
      if (Array.isArray(model)) {
        for (const m of model) modelMap.set(m.id, { name: m.name ?? '', type: m.type ?? 0 });
      }

      const merged: ValueEntry[] = Array.isArray(values)
        ? values.map(v => {
            const meta = modelMap.get(v.propertyId);
            return {
              propertyId: v.propertyId,
              value: v.value ?? '',
              valueLanguage: v.valueLanguage,
              needsResolve: v.needsResolve,
              name: meta?.name ?? '',
              type: meta?.type ?? 0,
            };
          })
        : [];

      setEntries(merged);
      setPage(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEntries([]);
    }
    setLoading(false);
  }, [itemId, languages, source, proxy]);

  const downloadFile = useCallback(async (entry: ValueEntry) => {
    setDownloadError(null);
    const base = sourceBase(proxy, source);
    try {
      const res = await fetch(`${base}/Product/${encodeURIComponent(itemId.trim())}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languages: entry.valueLanguage ? [entry.valueLanguage] : [],
          propertyIds: [entry.propertyId],
        }),
      });
      if (!res.ok) {
        setDownloadError(`HTTP ${res.status}`);
        return;
      }
      const docs = (await res.json()) as Array<{ value: string; filename?: string; valueLanguage?: string }>;
      const doc = docs?.[0];
      if (!doc?.value) {
        setDownloadError('Empty response');
        return;
      }
      const blob = base64ToBlob(doc.value, guessMime(doc.filename));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename || `${entry.propertyId}.bin`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : String(e));
    }
  }, [proxy, source, itemId]);

  const filtered = useMemo(() => {
    let list = entries;
    if (debouncedSearch) {
      list = list.filter(e =>
        e.propertyId.toLowerCase().includes(debouncedSearch) ||
        e.name.toLowerCase().includes(debouncedSearch) ||
        e.value.toLowerCase().includes(debouncedSearch)
      );
    }
    if (typeFilter === 'property') list = list.filter(e => e.type === 0);
    else if (typeFilter === 'file') list = list.filter(e => e.type === 1);
    if (sortBy !== 'default') {
      const sorted = list.slice();
      const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
      if (sortBy === 'id-asc') sorted.sort((a, b) => cmp(a.propertyId, b.propertyId));
      else if (sortBy === 'id-desc') sorted.sort((a, b) => cmp(b.propertyId, a.propertyId));
      else if (sortBy === 'name-asc') sorted.sort((a, b) => cmp(a.name, b.name));
      else if (sortBy === 'name-desc') sorted.sort((a, b) => cmp(b.name, a.name));
      else if (sortBy === 'value-asc') sorted.sort((a, b) => cmp(a.value, b.value));
      else if (sortBy === 'value-desc') sorted.sort((a, b) => cmp(b.value, a.value));
      list = sorted;
    }
    return list;
  }, [entries, debouncedSearch, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, typeFilter, sortBy, pageSize]);

  const visible = useMemo(
    () => filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [filtered, currentPage, pageSize],
  );

  const stats = useMemo(() => {
    const total = entries.length;
    const files = entries.reduce((acc, e) => acc + (e.type === 1 ? 1 : 0), 0);
    return { total, properties: total - files, files };
  }, [entries]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-mono text-lg font-semibold mb-1 flex items-center gap-2">
          <Eye className="w-5 h-5 text-accent" />
          {t('proxy.valuesTitle')}
        </h2>
        <p className="text-sm text-txt-secondary">{t('proxy.valuesSubtitle')}</p>
      </div>

      {/* Input panel */}
      <div className="bg-bg-surface border border-border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3">
          <div>
            <label className="block text-2xs font-medium text-txt-muted uppercase tracking-wider mb-1">
              {t('proxy.valuesItemId')}
            </label>
            <input
              type="text"
              value={itemId}
              onChange={e => setItemId(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') load(); }}
              placeholder={t('proxy.valuesItemIdPlaceholder')}
              className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-sm font-mono text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
            />
          </div>
          <div>
            <label className="block text-2xs font-medium text-txt-muted uppercase tracking-wider mb-1">
              {t('proxy.valuesLanguages')}
            </label>
            <input
              type="text"
              value={languages}
              onChange={e => setLanguages(e.target.value)}
              placeholder="en,de"
              className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-sm font-mono text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-txt-muted">{t('proxy.valuesSource')}:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={source === 'filtered'}
                onChange={() => setSource('filtered')}
                className="accent-accent"
              />
              {t('proxy.valuesSourceFiltered')}
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={source === 'unfiltered'}
                onChange={() => setSource('unfiltered')}
                className="accent-accent"
              />
              {t('proxy.valuesSourceUnfiltered')}
            </label>
          </div>
          <button
            onClick={load}
            disabled={loading || !itemId.trim()}
            className="ml-auto flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {t('proxy.valuesLoad')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">{t('proxy.valuesLoadFailed')}</p>
            <p className="text-xs text-red-400/70 mt-0.5 font-mono break-all">{error}</p>
          </div>
        </div>
      )}

      {downloadError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-xs text-red-400">
          {t('proxy.valuesDownloadFailed')} — {downloadError}
        </div>
      )}

      {/* Stats */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t('proxy.filterStatsTotal')} value={stats.total} color="text-txt-primary" />
          <StatCard label={t('proxy.valuesStatsProperties')} value={stats.properties} color="text-blue-400" />
          <StatCard label={t('proxy.valuesStatsFiles')} value={stats.files} color="text-amber-400" />
        </div>
      )}

      {/* Controls */}
      {entries.length > 0 && (
        <div className="bg-bg-surface border border-border rounded p-3 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-txt-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('proxy.valuesSearchPlaceholder')}
              className="w-full bg-bg-input border border-border rounded-sm pl-9 pr-3 py-2 text-sm font-mono text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
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
                <option value="value-asc">{t('proxy.valuesSortValueAsc')}</option>
                <option value="value-desc">{t('proxy.valuesSortValueDesc')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-bg-surface border border-border rounded overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-sm text-txt-muted">
            {t('proxy.valuesEmpty')}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center text-sm text-txt-muted">
            {t('proxy.valuesNoResults')}
          </div>
        ) : (
          <List
            rowCount={visible.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={Row}
            rowProps={{ items: visible, t, onDownload: downloadFile }}
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

      {downloadError && null}
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
  items: ValueEntry[];
  t: (key: any) => string;
  onDownload: (entry: ValueEntry) => void;
}

function Row({ index, style, items, t, onDownload }: RowComponentProps<RowProps>) {
  const entry = items[index];
  const isFile = entry.type === 1;
  const isBase64Inline = !isFile && entry.value && /^[A-Za-z0-9+/=]{100,}$/.test(entry.value);
  const displayValue = isFile
    ? t('proxy.valuesFileHint')
    : isBase64Inline
      ? '[Base64 inline]'
      : entry.value;

  return (
    <div
      style={style}
      className="flex items-center gap-3 px-4 border-b border-border last:border-b-0 hover:bg-bg-elevated/40 transition-colors"
    >
      <span
        className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
          isFile
            ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
            : 'text-blue-400 bg-blue-400/10 border-blue-400/20'
        }`}
      >
        {isFile ? 'F' : 'P'}
      </span>

      <span className="text-xs font-mono text-txt-primary flex-shrink-0 w-48 truncate" title={entry.propertyId}>
        {entry.propertyId}
      </span>

      <span
        className={`text-xs flex-shrink-0 w-40 truncate ${entry.name ? 'text-txt-secondary' : 'text-txt-muted italic'}`}
        title={entry.name || '—'}
      >
        {entry.name || '—'}
      </span>

      <span
        className="text-xs font-mono text-txt-secondary flex-1 min-w-0 truncate"
        title={entry.value}
      >
        {displayValue}
      </span>

      {entry.valueLanguage && (
        <span className="text-2xs uppercase text-txt-muted bg-bg-elevated border border-border rounded px-1.5 py-0.5 font-mono flex-shrink-0">
          {entry.valueLanguage}
        </span>
      )}

      {(isFile || entry.needsResolve) && (
        <button
          onClick={() => onDownload(entry)}
          title={t('proxy.valuesDownload')}
          className="p-1.5 rounded text-txt-muted hover:text-accent hover:bg-accent/10 transition-colors flex-shrink-0"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
