import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { FileRef, FileCacheStats } from '../types';

interface RawRefRow {
  proxy_id: string;
  item_id: string;
  property_id: string;
  language: string;
  file_hash: string;
  filename: string | null;
  fetched_at: string;
  expires_at: string | null;
  proxy_file_blob: {
    storage_path: string;
    mime_type: string | null;
    size_bytes: number | string | null;
  } | null;
}

export function useFileCache(proxyId: string | undefined) {
  const [refs, setRefs] = useState<FileRef[]>([]);
  const [stats, setStats] = useState<FileCacheStats>({ totalRefs: 0, uniqueBlobs: 0, storageBytes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!proxyId) return;
    setLoading(true);
    setError(null);

    const [refsRes, blobsRes, refCountRes] = await Promise.all([
      supabase
        .from('proxy_file_ref')
        .select('proxy_id, item_id, property_id, language, file_hash, filename, fetched_at, expires_at, proxy_file_blob!inner(storage_path, mime_type, size_bytes)')
        .eq('proxy_id', proxyId)
        .order('fetched_at', { ascending: false })
        .limit(5000),
      supabase
        .from('proxy_file_blob')
        .select('size_bytes')
        .eq('proxy_id', proxyId),
      supabase
        .from('proxy_file_ref')
        .select('*', { count: 'exact', head: true })
        .eq('proxy_id', proxyId),
    ]);

    if (refsRes.error) {
      setError(refsRes.error.message);
      setLoading(false);
      return;
    }

    const rows = (refsRes.data as unknown as RawRefRow[]) || [];
    const flattened: FileRef[] = rows.map(r => ({
      proxy_id: r.proxy_id,
      item_id: r.item_id,
      property_id: r.property_id,
      language: r.language,
      file_hash: r.file_hash,
      filename: r.filename,
      fetched_at: r.fetched_at,
      expires_at: r.expires_at,
      storage_path: r.proxy_file_blob?.storage_path ?? '',
      mime_type: r.proxy_file_blob?.mime_type ?? null,
      size_bytes: Number(r.proxy_file_blob?.size_bytes ?? 0),
    }));

    const blobs = (blobsRes.data as Array<{ size_bytes: number | string | null }>) || [];
    const uniqueBlobs = blobs.length;
    const storageBytes = blobs.reduce((sum, b) => sum + Number(b.size_bytes || 0), 0);

    setRefs(flattened);
    setStats({
      totalRefs: refCountRes.count ?? flattened.length,
      uniqueBlobs,
      storageBytes,
    });
    setLoading(false);
  }, [proxyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setEnabled = useCallback(async (enabled: boolean) => {
    if (!proxyId) return false;
    const { error: err } = await supabase
      .from('connector_proxies')
      .update({ files_cache_enabled: enabled })
      .eq('proxy_id', proxyId);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, [proxyId]);

  const openSignedUrl = useCallback(async (storagePath: string) => {
    const { data, error: err } = await supabase.storage
      .from('proxy-file-cache')
      .createSignedUrl(storagePath, 600);
    if (err || !data?.signedUrl) {
      setError(err?.message || 'Failed to create signed URL');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }, []);

  return { refs, stats, loading, error, reload, setEnabled, openSignedUrl };
}
