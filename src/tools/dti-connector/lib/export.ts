import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';

export type ExportCategory = 'hierarchy' | 'model' | 'fileEntries' | 'assets';

interface ExportData {
  connector: string;
  exportedAt: string;
  includes: ExportCategory[];
  hierarchy?: { level: number; name: string }[];
  model?: { id: string; name: string; type: number }[];
  uploads?: { fileId: string; originalName: string; size: number; mimeType: string }[];
  fileEntries?: { entryId: string; en: string | null; de: string | null }[];
  assets?: { assetId: string; values: Record<string, { en?: string; de?: string }> }[];
}

export async function exportConnector(
  connectorId: string,
  connectorName: string,
  _userId: string,
  categories: Set<ExportCategory>,
): Promise<Blob> {
  const data: ExportData = {
    connector: connectorName,
    exportedAt: new Date().toISOString(),
    includes: Array.from(categories),
  };

  // Hierarchy
  if (categories.has('hierarchy')) {
    const { data: rows } = await supabase
      .from('dti_hierarchy_levels')
      .select('level, name')
      .eq('connector_id', connectorId)
      .order('level');
    data.hierarchy = (rows || []).map(r => ({ level: r.level, name: r.name }));
  }

  // Model
  if (categories.has('model')) {
    const { data: rows } = await supabase
      .from('dti_model_datapoints')
      .select('dp_id, name, type')
      .eq('connector_id', connectorId)
      .order('sort_order');
    data.model = (rows || []).map(r => ({ id: r.dp_id, name: r.name || '', type: r.type }));
  }

  // File Entries + Uploads
  if (categories.has('fileEntries')) {
    const [uploadsRes, entriesRes] = await Promise.all([
      supabase.from('dti_uploads').select('*').eq('connector_id', connectorId).order('file_id'),
      supabase.from('dti_file_entries').select('*').eq('connector_id', connectorId).order('entry_id'),
    ]);

    data.uploads = (uploadsRes.data || []).map(u => ({
      fileId: u.file_id,
      originalName: u.original_name,
      size: u.size,
      mimeType: u.mime_type,
    }));

    data.fileEntries = (entriesRes.data || []).map(e => ({
      entryId: e.entry_id,
      en: e.en_file_id || null,
      de: e.de_file_id || null,
    }));
  }

  // Assets
  if (categories.has('assets')) {
    const [assetsRes, valuesRes] = await Promise.all([
      supabase.from('dti_assets').select('asset_id').eq('connector_id', connectorId).order('asset_id'),
      supabase.from('dti_asset_values').select('asset_id, key, lang, value').eq('connector_id', connectorId),
    ]);

    const valuesMap = new Map<string, Record<string, { en?: string; de?: string }>>();
    for (const v of (valuesRes.data || [])) {
      if (!valuesMap.has(v.asset_id)) valuesMap.set(v.asset_id, {});
      const assetValues = valuesMap.get(v.asset_id)!;
      if (!assetValues[v.key]) assetValues[v.key] = {};
      assetValues[v.key][v.lang as 'en' | 'de'] = v.value;
    }

    data.assets = (assetsRes.data || []).map(a => ({
      assetId: a.asset_id,
      values: valuesMap.get(a.asset_id) || {},
    }));
  }

  // Build ZIP
  const zip = new JSZip();
  zip.file('data.json', JSON.stringify(data, null, 2));

  // Download actual files from Storage
  if (categories.has('fileEntries') && data.uploads && data.uploads.length > 0) {
    const filesFolder = zip.folder('files')!;

    const { data: uploadRows } = await supabase
      .from('dti_uploads')
      .select('file_id, original_name, storage_path')
      .eq('connector_id', connectorId);

    for (const upload of (uploadRows || [])) {
      const ext = upload.original_name.includes('.') ? '.' + upload.original_name.split('.').pop() : '';
      const { data: fileData } = await supabase.storage
        .from('dti-files')
        .download(upload.storage_path);

      if (fileData) {
        filesFolder.file(`${upload.file_id}${ext}`, fileData);
      }
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
