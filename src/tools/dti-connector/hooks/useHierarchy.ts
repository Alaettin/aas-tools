import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';

export interface Level {
  id: number;
  name: string;
}

let nextId = 1;

export function useHierarchy(connectorId: string) {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef<string>('');
  const mountedRef = useRef(true);

  const hasChanges = JSON.stringify(levels) !== savedRef.current;

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await withTimeout(
          supabase.from('dti_hierarchy_levels').select('level, name').eq('connector_id', connectorId).order('level')
        );
        if (cancelled) return;
        if (err) {
          setError('Hierarchy konnte nicht geladen werden.');
        } else {
          const mapped = (data || []).map(d => ({ id: nextId++, name: d.name }));
          setLevels(mapped);
          savedRef.current = JSON.stringify(mapped);
        }
      } catch {
        if (cancelled) return;
        setError('common.connectionFailed');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; mountedRef.current = false; };
  }, [connectorId]);

  const addLevel = () => {
    setLevels(prev => [...prev, { id: nextId++, name: '' }]);
  };

  const removeLevel = (index: number) => {
    setLevels(prev => prev.filter((_, i) => i !== index));
  };

  const updateName = (index: number, name: string) => {
    setLevels(prev => prev.map((l, i) => i === index ? { ...l, name } : l));
  };

  const reorder = (fromIndex: number, toIndex: number) => {
    setLevels(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const save = async (): Promise<boolean> => {
    if (saving) return false;
    setSaving(true);
    setError(null);

    // Backup current DB state for rollback
    const { data: backup } = await supabase
      .from('dti_hierarchy_levels')
      .select('level, name')
      .eq('connector_id', connectorId);

    // Delete all existing levels
    const { error: delErr } = await supabase
      .from('dti_hierarchy_levels')
      .delete()
      .eq('connector_id', connectorId);

    if (delErr) {
      setError('common.saveFailed');
      setSaving(false);
      return false;
    }

    // Insert new levels
    if (levels.length > 0) {
      const rows = levels.map((l, i) => ({
        connector_id: connectorId,
        level: i + 1,
        name: l.name,
      }));

      const { error: insErr } = await supabase
        .from('dti_hierarchy_levels')
        .insert(rows);

      if (insErr) {
        // Rollback: restore backup
        if (backup && backup.length > 0) {
          await supabase.from('dti_hierarchy_levels').insert(
            backup.map(b => ({ connector_id: connectorId, level: b.level, name: b.name }))
          );
        }
        setError('common.saveFailed');
        setSaving(false);
        return false;
      }
    }

    savedRef.current = JSON.stringify(levels);
    setSaving(false);
    return true;
  };

  return {
    levels,
    loading,
    saving,
    error,
    hasChanges,
    addLevel,
    removeLevel,
    updateName,
    reorder,
    save,
  };
}
