import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { UseCase } from '../types';

export function useUseCases() {
  const { user } = useAuth();
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = async () => {
    if (!user) return;
    const { data, error: err } = await supabase
      .from('ucc_use_cases')
      .select('*, ucc_required_submodels(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!mountedRef.current) return;
    if (err) {
      setError('Use Cases konnten nicht geladen werden.');
    } else {
      setUseCases((data || []).map((c: any) => ({
        ...c,
        submodels: c.ucc_required_submodels || [],
        ucc_required_submodels: undefined,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    mountedRef.current = true;
    if (!user) { setLoading(false); return; }
    load();
    return () => { mountedRef.current = false; };
  }, [user]);

  const createUseCase = async (
    name: string,
    description: string,
    submodels: { semantic_id: string; id_short: string }[]
  ): Promise<boolean> => {
    if (!user) return false;

    const { data, error: err } = await supabase
      .from('ucc_use_cases')
      .insert({ user_id: user.id, name: name.trim(), description: description.trim() || null })
      .select()
      .single();

    if (err || !data) return false;

    if (submodels.length > 0) {
      const rows = submodels.map(s => ({
        case_id: data.case_id,
        semantic_id: s.semantic_id.trim(),
        id_short: s.id_short.trim() || null,
      }));
      await supabase.from('ucc_required_submodels').insert(rows);
    }

    await load();
    return true;
  };

  const updateUseCase = async (
    caseId: string,
    name: string,
    description: string,
    submodels: { semantic_id: string; id_short: string }[]
  ): Promise<boolean> => {
    const { error: err } = await supabase
      .from('ucc_use_cases')
      .update({ name: name.trim(), description: description.trim() || null })
      .eq('case_id', caseId);

    if (err) return false;

    // Replace submodels: delete all then insert new
    await supabase.from('ucc_required_submodels').delete().eq('case_id', caseId);

    if (submodels.length > 0) {
      const rows = submodels.map(s => ({
        case_id: caseId,
        semantic_id: s.semantic_id.trim(),
        id_short: s.id_short.trim() || null,
      }));
      await supabase.from('ucc_required_submodels').insert(rows);
    }

    await load();
    return true;
  };

  const deleteUseCase = async (caseId: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('ucc_use_cases')
      .delete()
      .eq('case_id', caseId);

    if (err) return false;
    setUseCases(prev => prev.filter(c => c.case_id !== caseId));
    return true;
  };

  return { useCases, loading, error, createUseCase, updateUseCase, deleteUseCase, refresh: load };
}
