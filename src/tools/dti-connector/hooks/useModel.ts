import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';

export interface LocalDatapoint {
  dp_id: string;
  name: string;
  type: number; // 0 = Property, 1 = File
}

export function useModel(connectorId: string) {
  const [datapoints, setDatapoints] = useState<LocalDatapoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef<string>('');

  const hasChanges = JSON.stringify(datapoints) !== savedRef.current;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await withTimeout(
          supabase.from('dti_model_datapoints').select('dp_id, name, type').eq('connector_id', connectorId).order('sort_order')
        );
        if (cancelled) return;
        if (err) {
          setError('Model konnte nicht geladen werden.');
        } else {
          const mapped = (data || []).map(d => ({ dp_id: d.dp_id, name: d.name || '', type: d.type }));
          setDatapoints(mapped);
          savedRef.current = JSON.stringify(mapped);
        }
      } catch {
        if (cancelled) return;
        setError('Verbindung fehlgeschlagen.');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [connectorId]);

  const addDatapoint = () => {
    setDatapoints(prev => [...prev, { dp_id: '', name: '', type: 0 }]);
  };

  const removeDatapoints = (indices: Set<number>) => {
    setDatapoints(prev => prev.filter((_, i) => !indices.has(i)));
  };

  const updateDatapoint = (index: number, field: keyof LocalDatapoint, value: string | number) => {
    setDatapoints(prev => prev.map((dp, i) => i === index ? { ...dp, [field]: value } : dp));
  };

  const save = async (): Promise<boolean> => {
    if (saving) return false;
    setSaving(true);
    setError(null);

    const { data: backup } = await supabase
      .from('dti_model_datapoints')
      .select('dp_id, name, type, sort_order')
      .eq('connector_id', connectorId);

    const { error: delErr } = await supabase
      .from('dti_model_datapoints')
      .delete()
      .eq('connector_id', connectorId);

    if (delErr) {
      setError('Speichern fehlgeschlagen.');
      setSaving(false);
      return false;
    }

    if (datapoints.length > 0) {
      const rows = datapoints.map((dp, i) => ({
        connector_id: connectorId,
        dp_id: dp.dp_id,
        name: dp.name,
        type: dp.type,
        sort_order: i,
      }));

      const { error: insErr } = await supabase
        .from('dti_model_datapoints')
        .insert(rows);

      if (insErr) {
        if (backup && backup.length > 0) {
          await supabase.from('dti_model_datapoints').insert(
            backup.map(b => ({ connector_id: connectorId, ...b }))
          );
        }
        setError('Speichern fehlgeschlagen.');
        setSaving(false);
        return false;
      }
    }

    savedRef.current = JSON.stringify(datapoints);
    setSaving(false);
    return true;
  };

  return {
    datapoints,
    loading,
    saving,
    error,
    hasChanges,
    addDatapoint,
    removeDatapoints,
    updateDatapoint,
    save,
  };
}
