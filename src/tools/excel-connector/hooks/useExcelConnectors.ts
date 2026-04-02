import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { useAuth } from '@/context/AuthContext';
import type { ExcelConnector } from '../types';
import { createTemplateBlob } from '../lib/template';

export function useExcelConnectors() {
  const { user } = useAuth();
  const [connectors, setConnectors] = useState<ExcelConnector[]>([]);
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
          supabase.from('excel_connectors').select('*').order('created_at', { ascending: false })
        );
        if (cancelled) return;
        if (err) setError('Connectors konnten nicht geladen werden.');
        else setConnectors((data || []) as ExcelConnector[]);
      } catch {
        if (cancelled) return;
        setError('Verbindung fehlgeschlagen.');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; mountedRef.current = false; };
  }, [user]);

  const createConnector = async (name: string): Promise<ExcelConnector | null> => {
    if (!user) return null;
    const { data, error: err } = await supabase
      .from('excel_connectors')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('Connector konnte nicht erstellt werden.');
      return null;
    }
    const connector = data as ExcelConnector;

    // Upload default template Excel
    const excelPath = `${user.id}/${connector.connector_id}/data.xlsx`;
    const templateBlob = createTemplateBlob();
    await supabase.storage.from('excel-connectors').upload(excelPath, templateBlob, { upsert: true });
    await supabase.from('excel_connectors').update({ excel_path: excelPath }).eq('connector_id', connector.connector_id);
    connector.excel_path = excelPath;

    setConnectors(prev => [connector, ...prev]);
    return connector;
  };

  const deleteConnector = async (connectorId: string): Promise<boolean> => {
    // Delete files from storage first
    const connector = connectors.find(c => c.connector_id === connectorId);
    if (connector && user) {
      const prefix = `${user.id}/${connectorId}`;
      const { data: files } = await supabase.storage.from('excel-connectors').list(prefix, { limit: 1000 });
      if (files && files.length > 0) {
        await supabase.storage.from('excel-connectors').remove(files.map(f => `${prefix}/${f.name}`));
      }
      // Also delete documents subfolder
      const { data: docs } = await supabase.storage.from('excel-connectors').list(`${prefix}/documents`, { limit: 1000 });
      if (docs && docs.length > 0) {
        await supabase.storage.from('excel-connectors').remove(docs.map(f => `${prefix}/documents/${f.name}`));
      }
    }

    const { error: err } = await supabase
      .from('excel_connectors')
      .delete()
      .eq('connector_id', connectorId);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('Connector konnte nicht gelöscht werden.');
      return false;
    }
    setConnectors(prev => prev.filter(c => c.connector_id !== connectorId));
    return true;
  };

  const renameConnector = async (connectorId: string, name: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('excel_connectors')
      .update({ name: name.trim() })
      .eq('connector_id', connectorId);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('Umbenennen fehlgeschlagen.');
      return false;
    }
    setConnectors(prev => prev.map(c => c.connector_id === connectorId ? { ...c, name: name.trim() } : c));
    return true;
  };

  return { connectors, loading, error, createConnector, deleteConnector, renameConnector };
}
