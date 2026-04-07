import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { DocumentFile } from '../types';

export function useDocuments(userId: string, connectorId: string) {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const prefix = `${userId}/${connectorId}/documents`;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase.storage
        .from('global-connectors')
        .list(prefix, { limit: 500, sortBy: { column: 'name', order: 'asc' } });

      if (!mountedRef.current) return;
      if (err) { setError('Dateien konnten nicht geladen werden.'); }
      else {
        setDocuments((data || []).filter(f => f.name !== '.emptyFolderPlaceholder').map(f => ({
          name: f.name,
          size: f.metadata?.size || 0,
          mimeType: f.metadata?.mimetype || 'application/octet-stream',
          storagePath: `${prefix}/${f.name}`,
          createdAt: f.created_at || '',
        })));
      }
    } catch {
      if (mountedRef.current) setError('Verbindung fehlgeschlagen.');
    }
    setLoading(false);
  }, [prefix]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  const uploadFile = async (file: File): Promise<boolean> => {
    setError(null);
    const path = `${prefix}/${file.name}`;

    const { error: err } = await supabase.storage
      .from('global-connectors')
      .upload(path, file, { upsert: true });

    if (err) {
      setError('Upload fehlgeschlagen: ' + err.message);
      return false;
    }
    await fetch();
    return true;
  };

  const deleteFile = async (fileName: string): Promise<boolean> => {
    setError(null);
    const path = `${prefix}/${fileName}`;

    const { error: err } = await supabase.storage
      .from('global-connectors')
      .remove([path]);

    if (err) {
      setError('Löschen fehlgeschlagen.');
      return false;
    }
    setDocuments(prev => prev.filter(d => d.name !== fileName));
    return true;
  };

  const getFileUrl = async (storagePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from('global-connectors')
      .createSignedUrl(storagePath, 3600);
    return data?.signedUrl || null;
  };

  return { documents, loading, error, uploadFile, deleteFile, getFileUrl, refresh: fetch };
}
