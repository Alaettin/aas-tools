import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';
import type { ExportCategory } from './export';

interface ImportData {
  connector: string;
  exportedAt: string;
  includes: ExportCategory[];
  hierarchy?: { level: number; name: string }[];
  model?: { id: string; name: string; type: number }[];
  uploads?: { fileId: string; originalName: string; size: number; mimeType: string }[];
  fileEntries?: { entryId: string; en: string | null; de: string | null }[];
  assets?: { assetId: string; values: Record<string, { en?: string; de?: string }> }[];
}

export interface ImportPreview {
  connectorName: string;
  exportedAt: string;
  includes: ExportCategory[];
  counts: {
    hierarchy?: number;
    model?: number;
    uploads?: number;
    fileEntries?: number;
    assets?: number;
  };
}

export async function parseImportFile(file: File): Promise<{ data: ImportData; zip: JSZip; preview: ImportPreview }> {
  const zip = await JSZip.loadAsync(file);
  const dataFile = zip.file('data.json');
  if (!dataFile) throw new Error('data.json nicht gefunden in der ZIP-Datei.');

  const raw = await dataFile.async('string');
  const data = JSON.parse(raw) as ImportData;

  if (!data.includes || !Array.isArray(data.includes)) {
    throw new Error('Ungültiges Export-Format.');
  }

  const preview: ImportPreview = {
    connectorName: data.connector || 'Unbekannt',
    exportedAt: data.exportedAt || '',
    includes: data.includes,
    counts: {
      hierarchy: data.hierarchy?.length,
      model: data.model?.length,
      uploads: data.uploads?.length,
      fileEntries: data.fileEntries?.length,
      assets: data.assets?.length,
    },
  };

  return { data, zip, preview };
}

export async function importConnector(
  connectorId: string,
  userId: string,
  data: ImportData,
  zip: JSZip,
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Hierarchy
    if (data.includes.includes('hierarchy') && data.hierarchy) {
      await supabase.from('dti_hierarchy_levels').delete().eq('connector_id', connectorId);
      if (data.hierarchy.length > 0) {
        const rows = data.hierarchy.map(h => ({
          connector_id: connectorId,
          level: h.level,
          name: h.name,
        }));
        const { error } = await supabase.from('dti_hierarchy_levels').insert(rows);
        if (error) return { ok: false, error: 'Hierarchy-Import fehlgeschlagen.' };
      }
    }

    // Model
    if (data.includes.includes('model') && data.model) {
      await supabase.from('dti_model_datapoints').delete().eq('connector_id', connectorId);
      if (data.model.length > 0) {
        const rows = data.model.map((m, i) => ({
          connector_id: connectorId,
          dp_id: m.id,
          name: m.name,
          type: m.type,
          sort_order: i,
        }));
        const { error } = await supabase.from('dti_model_datapoints').insert(rows);
        if (error) return { ok: false, error: 'Model-Import fehlgeschlagen.' };
      }
    }

    // File Entries + Uploads
    if (data.includes.includes('fileEntries')) {
      // Delete old uploads from storage
      const { data: oldUploads } = await supabase
        .from('dti_uploads')
        .select('storage_path')
        .eq('connector_id', connectorId);
      if (oldUploads && oldUploads.length > 0) {
        await supabase.storage.from('dti-files').remove(oldUploads.map(u => u.storage_path));
      }

      // Delete old DB rows
      await supabase.from('dti_file_entries').delete().eq('connector_id', connectorId);
      await supabase.from('dti_uploads').delete().eq('connector_id', connectorId);

      // Upload new files from ZIP
      if (data.uploads && data.uploads.length > 0) {
        const filesFolder = zip.folder('files');

        for (const upload of data.uploads) {
          const ext = upload.originalName.includes('.') ? '.' + upload.originalName.split('.').pop() : '';
          const zipFile = filesFolder?.file(`${upload.fileId}${ext}`);

          const storagePath = `${userId}/${connectorId}/${upload.fileId}${ext}`;

          if (zipFile) {
            const blob = await zipFile.async('blob');
            await supabase.storage.from('dti-files').upload(storagePath, blob, { upsert: true });
          }

          await supabase.from('dti_uploads').insert({
            connector_id: connectorId,
            file_id: upload.fileId,
            original_name: upload.originalName,
            size: upload.size,
            mime_type: upload.mimeType,
            storage_path: storagePath,
          });
        }
      }

      // Insert file entries
      if (data.fileEntries && data.fileEntries.length > 0) {
        const rows = data.fileEntries.map(e => ({
          connector_id: connectorId,
          entry_id: e.entryId,
          en_file_id: e.en || null,
          de_file_id: e.de || null,
        }));
        const { error } = await supabase.from('dti_file_entries').insert(rows);
        if (error) return { ok: false, error: 'File-Entries Import fehlgeschlagen.' };
      }
    }

    // Assets
    if (data.includes.includes('assets') && data.assets) {
      await supabase.from('dti_asset_values').delete().eq('connector_id', connectorId);
      await supabase.from('dti_assets').delete().eq('connector_id', connectorId);

      if (data.assets.length > 0) {
        // Insert assets
        const assetRows = data.assets.map(a => ({
          connector_id: connectorId,
          asset_id: a.assetId,
        }));
        const { error: aErr } = await supabase.from('dti_assets').insert(assetRows);
        if (aErr) return { ok: false, error: 'Asset-Import fehlgeschlagen.' };

        // Insert values
        const valueRows: { connector_id: string; asset_id: string; key: string; lang: string; value: string }[] = [];
        for (const asset of data.assets) {
          for (const [key, pair] of Object.entries(asset.values)) {
            if (pair.en) valueRows.push({ connector_id: connectorId, asset_id: asset.assetId, key, lang: 'en', value: pair.en });
            if (pair.de) valueRows.push({ connector_id: connectorId, asset_id: asset.assetId, key, lang: 'de', value: pair.de });
          }
        }
        if (valueRows.length > 0) {
          const { error: vErr } = await supabase.from('dti_asset_values').insert(valueRows);
          if (vErr) return { ok: false, error: 'Asset-Values Import fehlgeschlagen.' };
        }
      }
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Import fehlgeschlagen: ' + (e instanceof Error ? e.message : 'Unbekannter Fehler') };
  }
}
