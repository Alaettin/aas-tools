import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { useAuth } from '@/context/AuthContext';
import type { AasMcpServer } from '../types';

export function useMcpServers() {
  const { user } = useAuth();
  const [servers, setServers] = useState<AasMcpServer[]>([]);
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
          supabase.from('aas_mcp_servers').select('*').order('created_at', { ascending: false })
        );

        if (cancelled) return;

        if (result.error) {
          setError('common.loadFailed');
        } else {
          setServers(result.data as AasMcpServer[]);
        }
      } catch {
        if (cancelled) return;
        setError('common.loadFailed');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; mountedRef.current = false; };
  }, [user]);

  const createServer = async (name: string): Promise<AasMcpServer | null> => {
    if (!user) return null;

    const { data, error: err } = await supabase
      .from('aas_mcp_servers')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.saveFailed');
      return null;
    }

    const server = data as AasMcpServer;
    setServers(prev => [server, ...prev]);
    return server;
  };

  const renameServer = async (serverId: string, name: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('aas_mcp_servers')
      .update({ name: name.trim() })
      .eq('server_id', serverId);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.renameFailed');
      return false;
    }

    setServers(prev =>
      prev.map(s => s.server_id === serverId ? { ...s, name: name.trim() } : s)
    );
    return true;
  };

  const deleteServer = async (serverId: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('aas_mcp_servers')
      .delete()
      .eq('server_id', serverId);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.deleteFailed');
      return false;
    }

    setServers(prev => prev.filter(s => s.server_id !== serverId));
    return true;
  };

  return {
    servers,
    loading,
    error,
    createServer,
    renameServer,
    deleteServer,
  };
}
