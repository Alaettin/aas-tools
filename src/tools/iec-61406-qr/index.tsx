import { useMemo, useState } from 'react';
import {
  Download,
  FileImage,
  FileText,
  QrCode,
  AlertCircle,
  Save,
  Trash2,
  Loader2,
  Inbox,
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { renderSvg } from './lib/renderSvg';
import { svgToPngDataUrl } from './lib/toPng';
import { pngToPdfBlob } from './lib/toPdf';
import { DEFAULT_OPTIONS, EXPORT_SIZES, type QrPart, type ExportSize } from './types';
import { useQrCodes, type SavedQrCode } from './hooks/useQrCodes';

function validateUri(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return 'Nur http(s) URIs sind erlaubt.';
    }
    return null;
  } catch {
    return 'Ungültige URI.';
  }
}

function safeFilename(uri: string): string {
  return (
    uri
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 60) || 'iec61406'
  );
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export default function Iec61406Qr() {
  const { t } = useLocale();
  const [uri, setUri] = useState('');
  const [part, setPart] = useState<QrPart>(1);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const { codes, loading: codesLoading, error: codesError, add, remove } = useQrCodes();

  const error = validateUri(uri);
  const valid = uri.trim().length > 0 && !error;

  const { svg } = useMemo(() => {
    if (!valid) return { svg: '' };
    return renderSvg(uri, { ...DEFAULT_OPTIONS, part });
  }, [uri, part, valid]);

  const base = safeFilename(uri);

  async function downloadSvg() {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${base}.svg`);
    URL.revokeObjectURL(url);
  }

  async function downloadPng(size: ExportSize) {
    try {
      setBusy(true);
      const dataUrl = await svgToPngDataUrl(svg, size);
      triggerDownload(dataUrl, `${base}_${size}.png`);
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    try {
      setBusy(true);
      const dataUrl = await svgToPngDataUrl(svg, 1024);
      const blob = pngToPdfBlob(dataUrl, uri);
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${base}.pdf`);
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    const ok = await add(uri, part, label.trim() || undefined);
    setSaving(false);
    if (ok) setLabel('');
  }

  function loadEntry(entry: SavedQrCode) {
    setUri(entry.uri);
    setPart(entry.part);
    setLabel(entry.label ?? '');
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-2 flex items-center gap-3">
        <QrCode className="w-7 h-7 text-cyan-400" />
        <h1 className="font-mono text-2xl font-bold">{t('qr.title')}</h1>
      </div>
      <p className="text-sm text-txt-muted mb-6">{t('qr.subtitle')}</p>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        {/* Left column: Input + Preview */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('qr.uriLabel')}</label>
            <input
              type="url"
              value={uri}
              onChange={e => setUri(e.target.value)}
              placeholder="https://example.com/product/12345"
              className={`w-full px-3 py-2 rounded-md bg-bg-surface border font-mono text-sm outline-none transition-colors ${
                error
                  ? 'border-red-500/60 focus:border-red-500'
                  : 'border-border focus:border-accent'
              }`}
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('qr.labelLabel')}</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={t('qr.labelPlaceholder')}
              className="w-full px-3 py-2 rounded-md bg-bg-surface border border-border focus:border-accent text-sm outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('qr.partLabel')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPart(1)}
                className={`px-3 py-3 rounded-md border text-left transition-colors ${
                  part === 1
                    ? 'border-accent bg-accent/10 text-txt-primary'
                    : 'border-border hover:border-txt-muted text-txt-muted'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg width="14" height="14" viewBox="0 0 10 10">
                    <polygon points="10,10 0,10 10,0" fill="currentColor" />
                  </svg>
                  <span className="font-medium text-sm">{t('qr.part1Title')}</span>
                </div>
                <p className="text-xs text-txt-muted">{t('qr.part1Desc')}</p>
              </button>
              <button
                type="button"
                onClick={() => setPart(2)}
                className={`px-3 py-3 rounded-md border text-left transition-colors ${
                  part === 2
                    ? 'border-accent bg-accent/10 text-txt-primary'
                    : 'border-border hover:border-txt-muted text-txt-muted'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg width="14" height="14" viewBox="0 0 10 10">
                    <polygon
                      points="10,10 0,10 10,0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                  </svg>
                  <span className="font-medium text-sm">{t('qr.part2Title')}</span>
                </div>
                <p className="text-xs text-txt-muted">{t('qr.part2Desc')}</p>
              </button>
            </div>
          </div>

          <div className="rounded-md border border-border bg-bg-surface p-6 flex items-center justify-center min-h-[320px]">
            {valid ? (
              <div
                className="w-full max-w-[400px] aspect-square"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="text-center text-txt-muted text-sm">
                <QrCode className="w-10 h-10 mx-auto mb-2 opacity-40" />
                {t('qr.previewHint')}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Save + Downloads */}
        <div className="space-y-4">
          <button
            type="button"
            disabled={!valid || saving}
            onClick={handleSave}
            className="w-full px-3 py-2.5 rounded-md bg-accent/15 border border-accent/60 text-accent hover:bg-accent/25 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('qr.save')}
          </button>

          <div className="rounded-md border border-border bg-bg-surface p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Download className="w-4 h-4" />
              {t('qr.downloads')}
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-txt-muted mb-1.5">{t('qr.vector')}</p>
                <button
                  type="button"
                  disabled={!valid || busy}
                  onClick={downloadSvg}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg-elevated hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <FileImage className="w-4 h-4" />
                  SVG
                </button>
              </div>

              <div>
                <p className="text-xs text-txt-muted mb-1.5">{t('qr.raster')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {EXPORT_SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      disabled={!valid || busy}
                      onClick={() => downloadPng(size)}
                      className="px-3 py-2 rounded-md border border-border bg-bg-elevated hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-txt-muted mb-1.5">{t('qr.print')}</p>
                <button
                  type="button"
                  disabled={!valid || busy}
                  onClick={downloadPdf}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg-elevated hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  PDF (A4)
                </button>
              </div>
            </div>
          </div>

          <div className="text-xs text-txt-muted leading-relaxed px-1">
            <p className="mb-1 font-medium text-txt-primary">{t('qr.aboutTitle')}</p>
            <p>{t('qr.aboutBody')}</p>
          </div>
        </div>
      </div>

      {/* Saved list */}
      <div className="mt-10">
        <h2 className="font-mono text-lg font-bold mb-3 flex items-center gap-2">
          <Inbox className="w-5 h-5 text-cyan-400" />
          {t('qr.saved')}
          {codes.length > 0 && (
            <span className="text-sm font-normal text-txt-muted">({codes.length})</span>
          )}
        </h2>

        {codesError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5 mb-3">
            <AlertCircle className="w-3.5 h-3.5" />
            {codesError}
          </p>
        )}

        {codesLoading ? (
          <div className="rounded-md border border-border bg-bg-surface p-6 text-sm text-txt-muted flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('qr.savedLoading')}
          </div>
        ) : codes.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-bg-surface/40 p-8 text-sm text-txt-muted text-center">
            {t('qr.savedEmpty')}
          </div>
        ) : (
          <ul className="rounded-md border border-border bg-bg-surface divide-y divide-border overflow-hidden">
            {codes.map(entry => (
              <li
                key={entry.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors"
              >
                <button
                  type="button"
                  onClick={() => loadEntry(entry)}
                  title={t('qr.loadEntry')}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    {entry.label && (
                      <span className="text-sm font-medium truncate">{entry.label}</span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                        entry.part === 1
                          ? 'bg-cyan-500/15 text-cyan-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {t(entry.part === 1 ? 'qr.partBadge1' : 'qr.partBadge2')}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-txt-muted truncate">{entry.uri}</div>
                </button>
                <button
                  type="button"
                  onClick={() => remove(entry.id)}
                  title={t('qr.deleteEntry')}
                  className="p-1.5 rounded text-txt-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
