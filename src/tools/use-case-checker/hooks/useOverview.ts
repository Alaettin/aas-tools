import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { OverviewItem } from '../types';

export function useOverview() {
  const { user } = useAuth();
  const [items, setItems] = useState<OverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Get all source_aas entries with source info
    const { data: aasEntries } = await supabase
      .from('ucc_source_aas')
      .select('entry_id, aas_id, source_id, ucc_sources!inner(name, base_url, user_id)')
      .eq('ucc_sources.user_id', user.id);

    if (!aasEntries) { setLoading(false); return; }

    // Get all evaluations for this user
    const { data: evals } = await supabase
      .from('ucc_evaluations')
      .select('*')
      .eq('user_id', user.id);

    const evalMap = new Map<string, any>();
    for (const e of (evals || [])) {
      evalMap.set(`${e.source_id}:${e.aas_id}`, e);
    }

    const overview: OverviewItem[] = aasEntries.map((entry: any) => {
      const key = `${entry.source_id}:${entry.aas_id}`;
      const cached = evalMap.get(key);
      const source = entry.ucc_sources;

      if (!cached) {
        return {
          entry_id: entry.entry_id,
          aas_id: entry.aas_id,
          source_id: entry.source_id,
          source_name: source.name,
          base_url: source.base_url,
          last_evaluated: null,
          pass_count: null,
          total_count: null,
          status: 'pending' as const,
        };
      }

      let results: any;
      try { results = JSON.parse(cached.results_json); } catch { results = null; }

      if (!results || results.error) {
        return {
          entry_id: entry.entry_id,
          aas_id: entry.aas_id,
          source_id: entry.source_id,
          source_name: source.name,
          base_url: source.base_url,
          last_evaluated: cached.evaluated_at,
          pass_count: null,
          total_count: null,
          status: 'error' as const,
          error: results?.error || 'Unknown error',
        };
      }

      const caseResults = results.results || [];
      const passCount = caseResults.filter((r: any) => r.passed).length;
      const total = caseResults.length;

      let status: OverviewItem['status'] = 'pending';
      if (total > 0) {
        if (passCount === total) status = 'pass';
        else if (passCount === 0) status = 'fail';
        else status = 'partial';
      }

      return {
        entry_id: entry.entry_id,
        aas_id: entry.aas_id,
        source_id: entry.source_id,
        source_name: source.name,
        base_url: source.base_url,
        last_evaluated: cached.evaluated_at,
        pass_count: passCount,
        total_count: total,
        status,
      };
    });

    setItems(overview);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  return { items, loading, refresh: load };
}
