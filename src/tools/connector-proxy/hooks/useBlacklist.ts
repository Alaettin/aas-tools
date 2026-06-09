import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useBlacklist(proxyId: string | undefined) {
  const [blacklist, setBlacklist] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proxyId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('connector_proxy_blacklist')
        .select('dp_id')
        .eq('proxy_id', proxyId);
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setBlacklist(new Set());
      } else {
        setBlacklist(new Set((data || []).map((r: { dp_id: string }) => r.dp_id)));
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [proxyId]);

  const toggle = useCallback(async (dpId: string, block: boolean): Promise<boolean> => {
    if (!proxyId) return false;

    setBlacklist(prev => {
      const next = new Set(prev);
      if (block) next.add(dpId); else next.delete(dpId);
      return next;
    });

    if (block) {
      const { error: err } = await supabase
        .from('connector_proxy_blacklist')
        .insert({ proxy_id: proxyId, dp_id: dpId });
      if (err && err.code !== '23505') {
        setBlacklist(prev => {
          const next = new Set(prev);
          next.delete(dpId);
          return next;
        });
        setError(err.message);
        return false;
      }
    } else {
      const { error: err } = await supabase
        .from('connector_proxy_blacklist')
        .delete()
        .eq('proxy_id', proxyId)
        .eq('dp_id', dpId);
      if (err) {
        setBlacklist(prev => new Set(prev).add(dpId));
        setError(err.message);
        return false;
      }
    }
    return true;
  }, [proxyId]);

  const bulkSet = useCallback(async (dpIds: string[], block: boolean): Promise<boolean> => {
    if (!proxyId || dpIds.length === 0) return true;

    setBlacklist(prev => {
      const next = new Set(prev);
      for (const id of dpIds) {
        if (block) next.add(id); else next.delete(id);
      }
      return next;
    });

    if (block) {
      const rows = dpIds.map(id => ({ proxy_id: proxyId, dp_id: id }));
      const { error: err } = await supabase
        .from('connector_proxy_blacklist')
        .upsert(rows, { onConflict: 'proxy_id,dp_id' });
      if (err) {
        setError(err.message);
        return false;
      }
    } else {
      const { error: err } = await supabase
        .from('connector_proxy_blacklist')
        .delete()
        .eq('proxy_id', proxyId)
        .in('dp_id', dpIds);
      if (err) {
        setError(err.message);
        return false;
      }
    }
    return true;
  }, [proxyId]);

  return { blacklist, loading, error, toggle, bulkSet };
}
