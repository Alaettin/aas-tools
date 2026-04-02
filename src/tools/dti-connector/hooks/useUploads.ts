import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';
import type { Upload } from '../types';

export function useUploads(connectorId: string, userId: string) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await withTimeout(
        supabase.from('dti_uploads').select('*').eq('connector_id', connectorId).order('file_id')
      );
      if (!mountedRef.current) return;
      if (err) {
        setError('Uploads konnten nicht geladen werden.');
      } else {
        setUploads((data || []) as Upload[]);
      }
    } catch {
      if (!mountedRef.current) return;
      setError('Verbindung fehlgeschlagen.');
    }
    setLoading(false);
  }, [connectorId]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  const upload = async (fileId: string, file: File): Promise<boolean> => {
    setError(null);

    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
    const storagePath = `${userId}/${connectorId}/${fileId}${ext}`;

    // Delete old file if exists
    const existing = uploads.find(u => u.file_id === fileId);
    if (existing) {
      await supabase.storage.from('dti-files').remove([existing.storage_path]);
    }

    const { error: uploadErr } = await supabase.storage
      .from('dti-files')
      .upload(storagePath, file, { upsert: true });

    if (uploadErr) {
      setError('Upload fehlgeschlagen: ' + uploadErr.message);
      return false;
    }

    const { error: dbErr } = await supabase
      .from('dti_uploads')
      .upsert({
        connector_id: connectorId,
        file_id: fileId,
        original_name: file.name,
        size: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: storagePath,
      }, { onConflict: 'connector_id,file_id' });

    if (dbErr) {
      setError('Datei-Eintrag konnte nicht gespeichert werden.');
      return false;
    }

    await fetch();
    return true;
  };

  const deleteUpload = async (fileId: string): Promise<boolean> => {
    setError(null);

    const existing = uploads.find(u => u.file_id === fileId);
    if (existing) {
      await supabase.storage.from('dti-files').remove([existing.storage_path]);
    }

    const { error: dbErr } = await supabase
      .from('dti_uploads')
      .delete()
      .eq('connector_id', connectorId)
      .eq('file_id', fileId);

    if (dbErr) {
      setError('Datei konnte nicht gelöscht werden.');
      return false;
    }

    setUploads(prev => prev.filter(u => u.file_id !== fileId));
    return true;
  };

  const getFileUrl = async (storagePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from('dti-files')
      .createSignedUrl(storagePath, 3600);
    return data?.signedUrl || null;
  };

  return { uploads, loading, error, upload, deleteUpload, getFileUrl, refresh: fetch };
}
