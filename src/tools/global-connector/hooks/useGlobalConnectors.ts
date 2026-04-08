import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { useAuth } from '@/context/AuthContext';
import type { GlobalConnector } from '../types';
import { createTemplateBlob } from '../lib/template';

export function useGlobalConnectors() {
  const { user } = useAuth();
  const [connectors, setConnectors] = useState<GlobalConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      if (!user) { setLoading(false); return; }
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await withTimeout(
          supabase.from('global_connectors').select('*').order('created_at', { ascending: false })
        );
        if (cancelled) return;
        if (err) setError('common.loadFailed');
        else setConnectors((data || []) as GlobalConnector[]);
      } catch {
        if (cancelled) return;
        setError('common.connectionFailed');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; mountedRef.current = false; };
  }, [user]);

  const createConnector = async (name: string): Promise<GlobalConnector | null> => {
    if (!user) return null;
    const { data, error: err } = await supabase
      .from('global_connectors')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.saveFailed');
      return null;
    }
    const connector = data as GlobalConnector;

    const excelPath = `${user.id}/${connector.connector_id}/data.xlsx`;
    const templateBlob = createTemplateBlob();
    await supabase.storage.from('global-connectors').upload(excelPath, templateBlob, { upsert: true });
    await supabase.from('global_connectors').update({ excel_path: excelPath }).eq('connector_id', connector.connector_id);
    connector.excel_path = excelPath;

    setConnectors(prev => [connector, ...prev]);
    return connector;
  };

  const deleteConnector = async (connectorId: string): Promise<boolean> => {
    const connector = connectors.find(c => c.connector_id === connectorId);
    if (connector && user) {
      const prefix = `${user.id}/${connectorId}`;
      const { data: files } = await supabase.storage.from('global-connectors').list(prefix, { limit: 1000 });
      if (files && files.length > 0) {
        await supabase.storage.from('global-connectors').remove(files.map(f => `${prefix}/${f.name}`));
      }
      const { data: docs } = await supabase.storage.from('global-connectors').list(`${prefix}/documents`, { limit: 1000 });
      if (docs && docs.length > 0) {
        await supabase.storage.from('global-connectors').remove(docs.map(f => `${prefix}/documents/${f.name}`));
      }
    }

    const { error: err } = await supabase
      .from('global_connectors')
      .delete()
      .eq('connector_id', connectorId);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.deleteFailed');
      return false;
    }
    setConnectors(prev => prev.filter(c => c.connector_id !== connectorId));
    return true;
  };

  const renameConnector = async (connectorId: string, name: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('global_connectors')
      .update({ name: name.trim() })
      .eq('connector_id', connectorId);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('common.renameFailed');
      return false;
    }
    setConnectors(prev => prev.map(c => c.connector_id === connectorId ? { ...c, name: name.trim() } : c));
    return true;
  };

  return { connectors, loading, error, createConnector, deleteConnector, renameConnector };
}
