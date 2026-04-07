import { useState, useRef } from 'react';
import { Copy, RefreshCw, Check, Key, Download, Upload, Loader2, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import { read, write, utils } from 'xlsx';
import { supabase } from '@/lib/supabase';
import type { GlobalConnector } from '../types';

interface ConnectorSettingsProps {
  connector: GlobalConnector;
  onApiKeyRegenerate: (newKey: string) => void;
}

async function downloadFresh(bucket: string, path: string): Promise<ArrayBuffer | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return null;
  const res = await fetch(data.signedUrl);
  if (!res.ok) return null;
  return res.arrayBuffer();
}

export function ConnectorSettings({ connector, onApiKeyRegenerate }: ConnectorSettingsProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
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
      .from('global_connectors')
      .update({ api_key: newKey })
      .eq('connector_id', connector.connector_id);
    if (!error) onApiKeyRegenerate(newKey);
    setRegenerating(false);
    setConfirmRegenerate(false);
  };

  const storagePath = (file: string) => `${connector.user_id}/${connector.connector_id}/${file}`;
  const docsPrefix = `${connector.user_id}/${connector.connector_id}/documents`;

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);

    try {
      const zip = new JSZip();

      if (connector.excel_path) {
        const buf = await downloadFresh('global-connectors', connector.excel_path);
        if (buf) zip.file('data.xlsx', buf);
      }

      const { data: files } = await supabase.storage
        .from('global-connectors')
        .list(docsPrefix, { limit: 500 });

      const docs = (files || []).filter(f => f.name !== '.emptyFolderPlaceholder');
      for (const doc of docs) {
        const buf = await downloadFresh('global-connectors', `${docsPrefix}/${doc.name}`);
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
      setExportError(e instanceof Error ? e.message : 'Export fehlgeschlagen.');
    }
    setExporting(false);
  };

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
      setImportError('ZIP-Datei konnte nicht gelesen werden.');
    }
  };

  const handleImport = async () => {
    if (!importZip) return;
    setImporting(true);
    setImportError(null);

    try {
      const excelFile = importZip.file('data.xlsx');
      if (excelFile) {
        const buf = await excelFile.async('arraybuffer');
        const wb = read(buf, { type: 'array' });
        if (!wb.SheetNames.length) throw new Error('Ungültige Excel-Datei.');

        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });
        const newWs = utils.aoa_to_sheet(rows as unknown[][]);
        const newWb = utils.book_new();
        utils.book_append_sheet(newWb, newWs, 'Asset data');
        const newBuf = write(newWb, { type: 'array', bookType: 'xlsx' });

        const excelPath = storagePath('data.xlsx');
        await supabase.storage.from('global-connectors').remove([excelPath]);
        const { error } = await supabase.storage
          .from('global-connectors')
          .upload(excelPath, new Blob([newBuf]), { cacheControl: '0' });
        if (error) throw new Error('Excel-Upload fehlgeschlagen: ' + error.message);
      }

      const docFiles = Object.keys(importZip.files).filter(f => f.startsWith('documents/') && !f.endsWith('/'));

      const { data: existing } = await supabase.storage
        .from('global-connectors')
        .list(docsPrefix, { limit: 500 });
      const toRemove = (existing || [])
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => `${docsPrefix}/${f.name}`);
      if (toRemove.length > 0) {
        await supabase.storage.from('global-connectors').remove(toRemove);
      }

      for (const path of docFiles) {
        const buf = await importZip.file(path)!.async('arraybuffer');
        const fileName = path.replace('documents/', '');
        const { error } = await supabase.storage
          .from('global-connectors')
          .upload(`${docsPrefix}/${fileName}`, new Blob([buf]), { cacheControl: '0' });
        if (error) console.warn('Doc upload failed:', fileName, error.message);
      }

      setImportDone(true);
      setImportPreview(null);
      setImportZip(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import fehlgeschlagen.');
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

  return (
    <div className="space-y-6">
      {/* API Key */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">API Key</h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <input type="text" value={connector.api_key} readOnly
                className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm font-mono text-txt-primary cursor-default" />
              <button onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors"
                title="Kopieren">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-txt-secondary" />}
              </button>
            </div>
            <p className="text-2xs text-txt-muted mt-1.5">Verwende diesen Key für den Zugriff auf die External API.</p>
          </div>

          {!confirmRegenerate ? (
            <button onClick={() => setConfirmRegenerate(true)}
              className="flex items-center gap-2 text-sm text-txt-secondary hover:text-txt-primary transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Neuen Key generieren
            </button>
          ) : (
            <div className="bg-red-500/5 border border-red-500/20 rounded-sm p-3">
              <p className="text-xs text-red-400 mb-3">Der alte Key wird sofort ungültig.</p>
              <div className="flex items-center gap-2">
                <button onClick={handleRegenerate} disabled={regenerating}
                  className="text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-sm px-3 py-1.5 disabled:opacity-50">
                  {regenerating ? 'Generiere…' : 'Key erneuern'}
                </button>
                <button onClick={() => setConfirmRegenerate(false)}
                  className="text-xs text-txt-muted hover:text-txt-primary px-3 py-1.5">Abbrechen</button>
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
          <p className="text-xs text-txt-muted">Exportiert die Excel-Datei und alle Dokumente als ZIP.</p>
          {exportError && <p className="text-xs text-red-400">{exportError}</p>}
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-40">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportieren
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
            <p className="text-xs text-txt-muted mb-2">ZIP-Datei auswählen:</p>
            <input ref={fileInputRef} type="file" accept=".zip" onChange={handleFileSelect}
              className="text-sm text-txt-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border file:border-border file:text-sm file:font-medium file:bg-bg-elevated file:text-txt-primary hover:file:bg-border file:cursor-pointer file:transition-colors" />
          </div>

          {importPreview && (
            <div className="bg-bg-input border border-border rounded-sm p-4 space-y-2">
              <div className="space-y-1">
                {importPreview.excelFound && (
                  <p className="text-xs text-txt-secondary">
                    <Check className="w-3 h-3 text-emerald-400 inline mr-1.5" />
                    Excel-Datei (data.xlsx)
                  </p>
                )}
                {importPreview.docCount > 0 && (
                  <p className="text-xs text-txt-secondary">
                    <Check className="w-3 h-3 text-emerald-400 inline mr-1.5" />
                    {importPreview.docCount} Dokument{importPreview.docCount !== 1 ? 'e' : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2 text-xs text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Vorhandene Daten werden ersetzt.
              </div>
            </div>
          )}

          {importError && <p className="text-xs text-red-400">{importError}</p>}
          {importDone && <p className="text-xs text-emerald-400">Import erfolgreich. Bitte Seite neu laden.</p>}

          <div className="flex items-center gap-3">
            {importPreview && !importDone && (
              <button onClick={handleImport} disabled={importing}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importieren
              </button>
            )}
            {(importPreview || importDone) && (
              <button onClick={resetImport}
                className="text-sm text-txt-muted hover:text-txt-primary transition-colors">
                Zurücksetzen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
