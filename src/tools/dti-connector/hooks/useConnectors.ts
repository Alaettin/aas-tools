import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { useAuth } from '@/context/AuthContext';
import type { Connector } from '../types';

export function useConnectors() {
  const { user } = useAuth();
  const [connectors, setConnectors] = useState<Connector[]>([]);
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
          supabase.from('dti_connectors').select('*').order('created_at', { ascending: false })
        );

        if (cancelled) return;

        if (result.error) {
          setError('common.loadFailed');
        } else {
          setConnectors(result.data as Connector[]);
        }
      } catch {
        if (cancelled) return;
        setError('dti.connectionReload');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; mountedRef.current = false; };
  }, [user]);

  const createConnector = async (name: string): Promise<Connector | null> => {
    if (!user) return null;

    const { data, error: err } = await supabase
      .from('dti_connectors')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.saveFailed');
      return null;
    }

    const connector = data as Connector;
    setConnectors(prev => [connector, ...prev]);
    return connector;
  };

  const renameConnector = async (connectorId: string, name: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('dti_connectors')
      .update({ name: name.trim() })
      .eq('connector_id', connectorId);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.renameFailed');
      return false;
    }

    setConnectors(prev =>
      prev.map(c => c.connector_id === connectorId ? { ...c, name: name.trim() } : c)
    );
    return true;
  };

  const deleteConnector = async (connectorId: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('dti_connectors')
      .delete()
      .eq('connector_id', connectorId);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.deleteFailed');
      return false;
    }

    setConnectors(prev => prev.filter(c => c.connector_id !== connectorId));
    return true;
  };

  const regenerateApiKey = async (connectorId: string): Promise<string | null> => {
    const newKey = crypto.randomUUID();

    const { error: err } = await supabase
      .from('dti_connectors')
      .update({ api_key: newKey })
      .eq('connector_id', connectorId);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('API-Key konnte nicht generiert werden.');
      return null;
    }

    setConnectors(prev =>
      prev.map(c => c.connector_id === connectorId ? { ...c, api_key: newKey } : c)
    );
    return newKey;
  };

  return {
    connectors,
    loading,
    error,
    createConnector,
    renameConnector,
    deleteConnector,
    regenerateApiKey,
  };
}
