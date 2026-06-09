import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { useAuth } from '@/context/AuthContext';
import type { Proxy } from '../types';

export function useProxies() {
  const { user } = useAuth();
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await withTimeout(
          supabase.from('connector_proxies').select('*').order('created_at', { ascending: false })
        );

        if (cancelled) return;

        if (result.error) {
          setError('common.loadFailed');
        } else {
          setProxies(result.data as Proxy[]);
        }
      } catch {
        if (cancelled) return;
        setError('common.loadFailed');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; mountedRef.current = false; };
  }, [user]);

  const createProxy = async (name: string): Promise<Proxy | null> => {
    if (!user) return null;

    const { data, error: err } = await supabase
      .from('connector_proxies')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.saveFailed');
      return null;
    }

    const proxy = data as Proxy;
    setProxies(prev => [proxy, ...prev]);
    return proxy;
  };

  const renameProxy = async (proxyId: string, name: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('connector_proxies')
      .update({ name: name.trim() })
      .eq('proxy_id', proxyId);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.renameFailed');
      return false;
    }

    setProxies(prev =>
      prev.map(p => p.proxy_id === proxyId ? { ...p, name: name.trim() } : p)
    );
    return true;
  };

  const deleteProxy = async (proxyId: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('connector_proxies')
      .delete()
      .eq('proxy_id', proxyId);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.deleteFailed');
      return false;
    }

    setProxies(prev => prev.filter(p => p.proxy_id !== proxyId));
    return true;
  };

  return {
    proxies,
    loading,
    error,
    createProxy,
    renameProxy,
    deleteProxy,
  };
}
