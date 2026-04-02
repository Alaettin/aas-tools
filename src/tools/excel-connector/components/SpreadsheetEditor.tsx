import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, Save, CheckCircle, AlertTriangle, XCircle, RotateCcw, Download, Upload } from 'lucide-react';
import { HotTable, type HotTableClass } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import { read, write, utils } from 'xlsx';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import { supabase } from '@/lib/supabase';
import { validateExcel } from '../lib/validate';

registerAllModules();

// Supabase Storage download() caches aggressively — use signed URLs to bypass
async function downloadFresh(bucket: string, path: string): Promise<ArrayBuffer | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return null;
  const res = await fetch(data.signedUrl);
  if (!res.ok) return null;
  return res.arrayBuffer();
}

interface SpreadsheetEditorProps {
  excelPath: string | null;
  documentNames?: string[];
}

export function SpreadsheetEditor({ excelPath, documentNames = [] }: SpreadsheetEditorProps) {
  const [data, setData] = useState<(string | number | null)[][]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const hotRef = useRef<HotTableClass>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const loadExcel = useCallback(async () => {
    if (!excelPath) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    setLoadFailed(false);

    try {
      const buf = await downloadFresh('excel-connectors', excelPath);
      if (!buf) {
        setError(['Excel konnte nicht geladen werden. Prüfe deine Internetverbindung.']);
        setLoadFailed(true);
        setLoading(false);
        return;
      }

      const wb = read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) {
        setError(['Die Excel-Datei enthält kein Sheet.']);
        setLoadFailed(true);
        setLoading(false);
        return;
      }

      const rows = utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: '' });
      setData(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError([msg.includes('Invalid') ? 'Die Excel-Datei ist beschädigt oder hat ein ungültiges Format.' : 'Fehler beim Laden: ' + msg]);
      setLoadFailed(true);
    }
    setLoading(false);
  }, [excelPath]);

  useEffect(() => {
    loadExcel();
    return () => clearTimeout(savedTimerRef.current);
  }, [loadExcel]);

  // Handsontable v17: hotInstance lives under __hotInstance
  const getHotInstance = () => {
    const ref = hotRef.current as any;
    return ref?.hotInstance ?? ref?.__hotInstance ?? null;
  };

  const handleSave = async () => {
    const hot = getHotInstance();
    if (!excelPath || !hot) return;

    // Capture data BEFORE any state update (re-render resets HotTable data prop)
    const tableData = hot.getData();

    // Validate
    const validation = validateExcel(tableData, documentNames);
    setWarnings(validation.warnings);

    if (validation.errors.length > 0) {
      setError(validation.errors);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const ws = utils.aoa_to_sheet(tableData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Asset data');
      const buf = write(wb, { type: 'array', bookType: 'xlsx' });

      // Remove + re-upload to avoid stale cache
      await supabase.storage.from('excel-connectors').remove([excelPath]);
      const { error: uploadErr } = await supabase.storage
        .from('excel-connectors')
        .upload(excelPath, new Blob([buf]), { cacheControl: '0' });

      if (uploadErr) {
        if (uploadErr.message.includes('Payload too large')) {
          setError(['Datei ist zu groß (max. 50 MB).']);
        } else if (uploadErr.message.includes('not found')) {
          setError(['Storage-Bucket nicht gefunden. Kontaktiere den Admin.']);
        } else {
          setError(['Speichern fehlgeschlagen: ' + uploadErr.message]);
        }
      } else {
        setSaved(true);
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      setError(['Speichern fehlgeschlagen: ' + (e instanceof Error ? e.message : String(e))]);
    }
    setSaving(false);
  };

  const handleExport = () => {
    const hot = getHotInstance();
    if (!hot) return;
    const tableData = hot.getData();
    const ws = utils.aoa_to_sheet(tableData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Asset data');
    const buf = write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const buf = evt.target?.result;
      if (!buf) return;
      try {
        const wb = read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) { setError(['Die Datei enthält kein Sheet.']); return; }
        const rows = utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: '' });
        setData(rows);
        setWarnings([]);
        setError(null);
      } catch {
        setError(['Die Datei konnte nicht gelesen werden.']);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  if (!excelPath) {
    return (
      <div className="bg-bg-surface border border-border rounded p-8 text-center">
        <p className="text-sm text-txt-secondary">Keine Excel-Datei vorhanden.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="bg-bg-surface border border-border rounded p-8 text-center space-y-4">
        <XCircle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-sm text-red-400">{error?.[0]}</p>
        <button
          onClick={loadExcel}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 16rem)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-txt-muted font-mono">data.xlsx</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-bg-elevated hover:bg-border border border-border text-txt-secondary font-medium text-sm px-3 py-2 rounded-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-bg-elevated hover:bg-border border border-border text-txt-secondary font-medium text-sm px-3 py-2 rounded-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Gespeichert' : 'Speichern'}
          </button>
        </div>
      </div>

      {/* Errors */}
      {error && error.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Fehler</span>
          </div>
          <ul className="list-disc list-inside text-xs space-y-0.5 ml-6">
            {error.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && !error && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-sm px-3 py-2 text-sm text-amber-400 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Warnungen</span>
          </div>
          <ul className="list-disc list-inside text-xs space-y-0.5 ml-6">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Spreadsheet */}
      <div className="flex-1 border border-border rounded overflow-hidden">
        {data.length > 0 && (
          <HotTable
            ref={hotRef}
            data={data}
            rowHeaders={true}
            colHeaders={true}
            contextMenu={true}
            manualColumnResize={true}
            manualRowResize={true}
            minRows={50}
            minCols={10}
            minSpareRows={10}
            minSpareCols={3}
            undo={true}
            height="auto"
            width="auto"
            stretchH="all"
            licenseKey="non-commercial-and-evaluation"
          />
        )}
      </div>
    </div>
  );
}
