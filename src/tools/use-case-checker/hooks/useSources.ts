import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Source, AasEntry } from '../types';

export function useSources() {
  const { user } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!user) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('ucc_sources')
        .select('*, ucc_source_aas(entry_id)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!mountedRef.current) return;
      if (err) {
        setError('Sources konnten nicht geladen werden.');
      } else {
        setSources((data || []).map((s: any) => ({
          ...s,
          aas_count: s.ucc_source_aas?.length || 0,
          ucc_source_aas: undefined,
        })));
      }
      setLoading(false);
    })();

    return () => { mountedRef.current = false; };
  }, [user]);

  const createSource = async (name: string, baseUrl: string): Promise<Source | null> => {
    if (!user) return null;
    const { data, error: err } = await supabase
      .from('ucc_sources')
      .insert({ user_id: user.id, name: name.trim(), base_url: baseUrl.trim() })
      .select()
      .single();

    if (err || !mountedRef.current) return null;
    const source = { ...data, aas_count: 0 } as Source;
    setSources(prev => [source, ...prev]);
    return source;
  };

  const updateSource = async (sourceId: string, name: string, baseUrl: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('ucc_sources')
      .update({ name: name.trim(), base_url: baseUrl.trim() })
      .eq('source_id', sourceId);

    if (err || !mountedRef.current) return false;
    setSources(prev => prev.map(s =>
      s.source_id === sourceId ? { ...s, name: name.trim(), base_url: baseUrl.trim() } : s
    ));
    return true;
  };

  const deleteSource = async (sourceId: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('ucc_sources')
      .delete()
      .eq('source_id', sourceId);

    if (err || !mountedRef.current) return false;
    setSources(prev => prev.filter(s => s.source_id !== sourceId));
    return true;
  };

  return { sources, loading, error, createSource, updateSource, deleteSource };
}

export function useAasIds(sourceId: string | undefined) {
  const [entries, setEntries] = useState<AasEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sourceId) { setLoading(false); return; }
    let mounted = true;

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('ucc_source_aas')
        .select('*')
        .eq('source_id', sourceId);

      if (!mounted) return;
      setEntries((data || []) as AasEntry[]);
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [sourceId]);

  const addAasIds = async (aasIds: string[]): Promise<boolean> => {
    if (!sourceId || aasIds.length === 0) return false;
    const rows = aasIds.map(id => ({ source_id: sourceId, aas_id: id.trim() }));
    const { data, error } = await supabase
      .from('ucc_source_aas')
      .upsert(rows, { onConflict: 'source_id,aas_id' })
      .select();

    if (error) return false;
    if (data) {
      setEntries(prev => {
        const existing = new Set(prev.map(e => e.aas_id));
        const newEntries = (data as AasEntry[]).filter(e => !existing.has(e.aas_id));
        return [...prev, ...newEntries];
      });
    }
    return true;
  };

  const removeAasId = async (entryId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('ucc_source_aas')
      .delete()
      .eq('entry_id', entryId);

    if (error) return false;
    setEntries(prev => prev.filter(e => e.entry_id !== entryId));
    return true;
  };

  return { entries, loading, addAasIds, removeAasId };
}
