import { useState, useRef } from 'react';
import { Copy, RefreshCw, Check, Key, Download, Upload, Loader2, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import JSZip from 'jszip';
import { read, write, utils } from 'xlsx';
import { supabase } from '@/lib/supabase';
import type { ExcelConnector, ExcelConnectorSettings } from '../types';
import { filenameMode, type FilenameMode } from '../lib/filenameMode';
import { useLocale, type TranslationKey } from '@/context/LocaleContext';

interface ConnectorSettingsProps {
  connector: ExcelConnector;
  onApiKeyRegenerate: (newKey: string) => void;
  onSettingsChange: (settings: ExcelConnectorSettings) => void;
}

// Download fresh from Storage (bypass cache)
async function downloadFresh(bucket: string, path: string): Promise<ArrayBuffer | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return null;
  const res = await fetch(data.signedUrl);
  if (!res.ok) return null;
  return res.arrayBuffer();
}

export function ConnectorSettings({ connector, onApiKeyRegenerate, onSettingsChange }: ConnectorSettingsProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  // Attribute settings. mimeType is a toggle (default on, only explicit false disables),
  // filename is three-state and normalized from the legacy boolean shape.
  const [attrs, setAttrs] = useState({
    valuesMimeType: connector.settings?.valuesMimeType !== false,
    valuesFilename: filenameMode(connector.settings?.valuesFilename),
    documentsMimeType: connector.settings?.documentsMimeType !== false,
    documentsFilename: filenameMode(connector.settings?.documentsFilename),
  });

  type Attrs = typeof attrs;
  type ToggleKey = 'valuesMimeType' | 'documentsMimeType';
  type FilenameKey = 'valuesFilename' | 'documentsFilename';

  const persist = async (next: Attrs) => {
    const prev = attrs;
    setAttrs(next);
    onSettingsChange(next);
    const { error } = await supabase
      .from('excel_connectors')
      .update({ settings: next })
      .eq('connector_id', connector.connector_id);
    if (error) {
      // Revert on failure
      console.error('Failed to save debug settings:', error);
      setAttrs(prev);
      onSettingsChange(prev);
    }
  };

  const toggleAttr = (key: ToggleKey) => persist({ ...attrs, [key]: !attrs[key] });

  const setFilenameMode = (key: FilenameKey, mode: FilenameMode) => {
    if (attrs[key] === mode) return;
    return persist({ ...attrs, [key]: mode });
  };

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importDone, setImportDone] = useState(false);
  const [importPreview, setImportPreview] = useState<{ excelFound: boolean; docCount: number } | null>(null);
  const [importZip, setImportZip] = useState<JSZip | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(connector.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    const newKey = crypto.randomUUID();
    const { error } = await supabase
      .from('excel_connectors')
      .update({ api_key: newKey })
      .eq('connector_id', connector.connector_id);
    if (!error) onApiKeyRegenerate(newKey);
    setRegenerating(false);
    setConfirmRegenerate(false);
  };

  const storagePath = (file: string) => `${connector.user_id}/${connector.connector_id}/${file}`;
  const docsPrefix = `${connector.user_id}/${connector.connector_id}/documents`;

  // Export: ZIP with data.xlsx + documents/
  const handleExport = async () => {
    setExporting(true);
    setExportError(null);

    try {
      const zip = new JSZip();

      // Add Excel
      if (connector.excel_path) {
        const buf = await downloadFresh('excel-connectors', connector.excel_path);
        if (buf) zip.file('data.xlsx', buf);
      }

      // Add documents
      const { data: files } = await supabase.storage
        .from('excel-connectors')
        .list(docsPrefix, { limit: 500 });

      const docs = (files || []).filter(f => f.name !== '.emptyFolderPlaceholder');
      for (const doc of docs) {
        const buf = await downloadFresh('excel-connectors', `${docsPrefix}/${doc.name}`);
        if (buf) zip.file(`documents/${doc.name}`, buf);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const date = new Date().toISOString().slice(0, 10);
      const name = connector.name.replace(/\s+/g, '_');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_export_${date}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : t('common.exportFailed'));
    }
    setExporting(false);
  };

  // Import: parse ZIP preview
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportDone(false);
    setImportPreview(null);
    setImportZip(null);

    try {
      const zip = await JSZip.loadAsync(file);
      const excelFound = !!zip.file('data.xlsx');
      const docFiles = Object.keys(zip.files).filter(f => f.startsWith('documents/') && !f.endsWith('/'));
      setImportPreview({ excelFound, docCount: docFiles.length });
      setImportZip(zip);
    } catch {
      setImportError(t('common.zipReadFailed'));
    }
  };

  // Import: apply
  const handleImport = async () => {
    if (!importZip) return;
    setImporting(true);
    setImportError(null);

    try {
      // Import Excel
      const excelFile = importZip.file('data.xlsx');
      if (excelFile) {
        const buf = await excelFile.async('arraybuffer');

        // Validate it's a real XLSX
        const wb = read(buf, { type: 'array' });
        if (!wb.SheetNames.length) throw new Error(t('common.invalidExcel'));

        // Re-write to ensure clean format
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });
        const newWs = utils.aoa_to_sheet(rows as unknown[][]);
        const newWb = utils.book_new();
        utils.book_append_sheet(newWb, newWs, 'Asset data');
        const newBuf = write(newWb, { type: 'array', bookType: 'xlsx' });

        const excelPath = storagePath('data.xlsx');
        await supabase.storage.from('excel-connectors').remove([excelPath]);
        const { error } = await supabase.storage
          .from('excel-connectors')
          .upload(excelPath, new Blob([newBuf]), { cacheControl: '0' });
        if (error) throw new Error(t('common.excelUploadFailed') + ': ' + error.message);
      }

      // Import documents
      const docFiles = Object.keys(importZip.files).filter(f => f.startsWith('documents/') && !f.endsWith('/'));

      // Remove existing documents
      const { data: existing } = await supabase.storage
        .from('excel-connectors')
        .list(docsPrefix, { limit: 500 });
      const toRemove = (existing || [])
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => `${docsPrefix}/${f.name}`);
      if (toRemove.length > 0) {
        await supabase.storage.from('excel-connectors').remove(toRemove);
      }

      // Upload new documents
      for (const path of docFiles) {
        const buf = await importZip.file(path)!.async('arraybuffer');
        const fileName = path.replace('documents/', '');
        const { error } = await supabase.storage
          .from('excel-connectors')
          .upload(`${docsPrefix}/${fileName}`, new Blob([buf]), { cacheControl: '0' });
        if (error) console.warn('Doc upload failed:', fileName, error.message);
      }

      setImportDone(true);
      setImportPreview(null);
      setImportZip(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setImportError(e instanceof Error ? e.message : t('common.importFailed'));
    }
    setImporting(false);
  };

  const resetImport = () => {
    setImportPreview(null);
    setImportZip(null);
    setImportError(null);
    setImportDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const AttrCheckbox = ({ attrKey, label }: { attrKey: ToggleKey; label: string }) => (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={attrs[attrKey]}
        onChange={() => toggleAttr(attrKey)}
        className="w-4 h-4 rounded-sm border-border bg-bg-input text-accent accent-accent cursor-pointer"
      />
      <span className="text-sm text-txt-secondary">{label}</span>
    </label>
  );

  const FILENAME_MODES: { mode: FilenameMode; labelKey: TranslationKey }[] = [
    { mode: 'full', labelKey: 'attrs.filenameFull' },
    { mode: 'noext', labelKey: 'attrs.filenameNoExt' },
    { mode: 'none', labelKey: 'attrs.filenameOff' },
  ];

  const FilenameModeControl = ({ attrKey }: { attrKey: FilenameKey }) => (
    <div className="space-y-1.5">
      <span className="text-sm text-txt-secondary">{t('attrs.filename')}</span>
      <div className="flex flex-wrap gap-1.5">
        {FILENAME_MODES.map(({ mode, labelKey }) => {
          const active = attrs[attrKey] === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setFilenameMode(attrKey, mode)}
              aria-pressed={active}
              className={`px-2.5 py-1 text-2xs font-mono rounded-sm border transition-colors ${
                active
                  ? 'border-accent text-accent bg-bg-elevated'
                  : 'border-border text-txt-muted bg-bg-input hover:bg-bg-elevated hover:text-txt-secondary'
              }`}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Test / Debug — attribute toggles */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              {t('attrs.title')}
            </h2>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <p className="text-xs text-txt-muted">{t('attrs.hint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-3">
              <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider font-mono">
                {t('attrs.valuesCall')}
              </p>
              <AttrCheckbox attrKey="valuesMimeType" label={t('attrs.mimeType')} />
              <FilenameModeControl attrKey="valuesFilename" />
            </div>
            <div className="space-y-3">
              <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider font-mono">
                {t('attrs.documentsCall')}
              </p>
              <AttrCheckbox attrKey="documentsMimeType" label={t('attrs.mimeType')} />
              <FilenameModeControl attrKey="documentsFilename" />
            </div>
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              API Key
            </h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <input type="text" value={connector.api_key} readOnly
                className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm font-mono text-txt-primary cursor-default" />
              <button onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors"
                title={t('common.copy')}>
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-txt-secondary" />}
              </button>
            </div>
            <p className="text-2xs text-txt-muted mt-1.5">{t('apiKey.hint')}</p>
          </div>

          {!confirmRegenerate ? (
            <button onClick={() => setConfirmRegenerate(true)}
              className="flex items-center gap-2 text-sm text-txt-secondary hover:text-txt-primary transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              {t('apiKey.generate')}
            </button>
          ) : (
            <div className="bg-red-500/5 border border-red-500/20 rounded-sm p-3">
              <p className="text-xs text-red-400 mb-3">{t('apiKey.invalidWarning')}</p>
              <div className="flex items-center gap-2">
                <button onClick={handleRegenerate} disabled={regenerating}
                  className="text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-sm px-3 py-1.5 disabled:opacity-50">
                  {regenerating ? t('apiKey.regenerating') : t('apiKey.regenerate')}
                </button>
                <button onClick={() => setConfirmRegenerate(false)}
                  className="text-xs text-txt-muted hover:text-txt-primary px-3 py-1.5">{t('common.cancel')}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">Export</h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-txt-muted">{t('common.exportDesc')}</p>
          {exportError && <p className="text-xs text-red-400">{exportError}</p>}
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-40">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t('common.export')}
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">Import</h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-txt-muted mb-2">{t('common.selectZip')}</p>
            <input ref={fileInputRef} type="file" accept=".zip" onChange={handleFileSelect}
              className="text-sm text-txt-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border file:border-border file:text-sm file:font-medium file:bg-bg-elevated file:text-txt-primary hover:file:bg-border file:cursor-pointer file:transition-colors" />
          </div>

          {importPreview && (
            <div className="bg-bg-input border border-border rounded-sm p-4 space-y-2">
              <div className="space-y-1">
                {importPreview.excelFound && (
                  <p className="text-xs text-txt-secondary">
                    <Check className="w-3 h-3 text-emerald-400 inline mr-1.5" />
                    {t('common.excelFile')}
                  </p>
                )}
                {importPreview.docCount > 0 && (
                  <p className="text-xs text-txt-secondary">
                    <Check className="w-3 h-3 text-emerald-400 inline mr-1.5" />
                    {importPreview.docCount} {importPreview.docCount !== 1 ? t('common.documents') : t('common.document')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2 text-xs text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {t('common.existingDataReplaced')}
              </div>
            </div>
          )}

          {importError && <p className="text-xs text-red-400">{importError}</p>}
          {importDone && <p className="text-xs text-emerald-400">{t('common.importSuccess')}</p>}

          <div className="flex items-center gap-3">
            {importPreview && !importDone && (
              <button onClick={handleImport} disabled={importing}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {t('common.import')}
              </button>
            )}
            {(importPreview || importDone) && (
              <button onClick={resetImport}
                className="text-sm text-txt-muted hover:text-txt-primary transition-colors">
                {t('common.reset')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
