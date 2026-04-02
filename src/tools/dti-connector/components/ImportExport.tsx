import { useState, useRef } from 'react';
import { Download, Upload, Loader2, Check, AlertTriangle } from 'lucide-react';
import { exportConnector, triggerDownload, type ExportCategory } from '../lib/export';
import { parseImportFile, importConnector, type ImportPreview } from '../lib/import';
import type { Connector } from '../types';
import type JSZip from 'jszip';

interface ImportExportProps {
  connector: Connector;
}

const CATEGORIES: { id: ExportCategory; label: string }[] = [
  { id: 'hierarchy', label: 'Hierarchy' },
  { id: 'model', label: 'Model' },
  { id: 'fileEntries', label: 'File-Einträge + Dateien' },
  { id: 'assets', label: 'Assets' },
];

export function ImportExport({ connector }: ImportExportProps) {
  // Export state
  const [exportCategories, setExportCategories] = useState<Set<ExportCategory>>(
    new Set(['hierarchy', 'model', 'fileEntries', 'assets'])
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Import state
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importData, setImportData] = useState<{ data: unknown; zip: JSZip } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = (id: ExportCategory) => {
    setExportCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    if (exportCategories.size === 0) return;
    setExporting(true);
    setExportError(null);

    try {
      const blob = await exportConnector(
        connector.connector_id,
        connector.name,
        connector.user_id,
        exportCategories,
      );
      const date = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `${connector.name.replace(/\s+/g, '_')}_export_${date}.zip`);
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
    setImportData(null);

    try {
      const result = await parseImportFile(file);
      setImportPreview(result.preview);
      setImportData({ data: result.data, zip: result.zip });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Datei konnte nicht gelesen werden.');
    }
  };

  const handleImport = async () => {
    if (!importData) return;
    setImporting(true);
    setImportError(null);

    const result = await importConnector(
      connector.connector_id,
      connector.user_id,
      importData.data as Parameters<typeof importConnector>[2],
      importData.zip,
    );

    if (result.ok) {
      setImportDone(true);
      setImportPreview(null);
      setImportData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setImportError(result.error || 'Import fehlgeschlagen.');
    }
    setImporting(false);
  };

  const resetImport = () => {
    setImportPreview(null);
    setImportData(null);
    setImportError(null);
    setImportDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              Export
            </h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-txt-muted">Was exportieren?</p>
          <div className="space-y-2">
            {CATEGORIES.map(cat => (
              <label key={cat.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportCategories.has(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                  className="accent-accent w-4 h-4"
                />
                <span className="text-sm text-txt-primary">{cat.label}</span>
              </label>
            ))}
          </div>

          {exportError && (
            <p className="text-xs text-red-400">{exportError}</p>
          )}

          <button
            onClick={handleExport}
            disabled={exporting || exportCategories.size === 0}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-40"
          >
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
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              Import
            </h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-txt-muted mb-2">ZIP-Datei auswählen:</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="text-sm text-txt-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border file:border-border file:text-sm file:font-medium file:bg-bg-elevated file:text-txt-primary hover:file:bg-border file:cursor-pointer file:transition-colors"
            />
          </div>

          {/* Preview */}
          {importPreview && (
            <div className="bg-bg-input border border-border rounded-sm p-4 space-y-2">
              <p className="text-xs text-txt-muted">
                Export von <span className="font-mono text-txt-primary">{importPreview.connectorName}</span>
                {importPreview.exportedAt && (
                  <span> — {new Date(importPreview.exportedAt).toLocaleDateString('de-DE')}</span>
                )}
              </p>
              <div className="space-y-1">
                {importPreview.includes.includes('hierarchy') && (
                  <p className="text-xs text-txt-secondary">
                    <Check className="w-3 h-3 text-emerald-400 inline mr-1.5" />
                    Hierarchy ({importPreview.counts.hierarchy || 0} Levels)
                  </p>
                )}
                {importPreview.includes.includes('model') && (
                  <p className="text-xs text-txt-secondary">
                    <Check className="w-3 h-3 text-emerald-400 inline mr-1.5" />
                    Model ({importPreview.counts.model || 0} Datapoints)
                  </p>
                )}
                {importPreview.includes.includes('fileEntries') && (
                  <p className="text-xs text-txt-secondary">
                    <Check className="w-3 h-3 text-emerald-400 inline mr-1.5" />
                    File-Einträge ({importPreview.counts.fileEntries || 0} Einträge, {importPreview.counts.uploads || 0} Dateien)
                  </p>
                )}
                {importPreview.includes.includes('assets') && (
                  <p className="text-xs text-txt-secondary">
                    <Check className="w-3 h-3 text-emerald-400 inline mr-1.5" />
                    Assets ({importPreview.counts.assets || 0} Assets)
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 text-xs text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Vorhandene Daten werden ersetzt.
              </div>
            </div>
          )}

          {importError && (
            <p className="text-xs text-red-400">{importError}</p>
          )}

          {importDone && (
            <p className="text-xs text-emerald-400">Import erfolgreich. Bitte Seite neu laden.</p>
          )}

          <div className="flex items-center gap-3">
            {importPreview && !importDone && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importieren
              </button>
            )}
            {(importPreview || importDone) && (
              <button
                onClick={resetImport}
                className="text-sm text-txt-muted hover:text-txt-primary transition-colors"
              >
                Zurücksetzen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
