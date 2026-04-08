import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';

export interface LocalFileEntry {
  entry_id: string;
  en_file_id: string;
  de_file_id: string;
}

export function useFileEntries(connectorId: string) {
  const [entries, setEntries] = useState<LocalFileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef<string>('');

  const hasChanges = JSON.stringify(entries) !== savedRef.current;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await withTimeout(
          supabase.from('dti_file_entries').select('entry_id, en_file_id, de_file_id').eq('connector_id', connectorId).order('entry_id')
        );
        if (cancelled) return;
        if (err) {
          setError('Einträge konnten nicht geladen werden.');
        } else {
          const mapped = (data || []).map(d => ({ entry_id: d.entry_id, en_file_id: d.en_file_id || '', de_file_id: d.de_file_id || '' }));
          setEntries(mapped);
          savedRef.current = JSON.stringify(mapped);
        }
      } catch {
        if (cancelled) return;
        setError('common.connectionFailed');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [connectorId]);

  const addEntry = () => {
    setEntries(prev => [...prev, { entry_id: '', en_file_id: '', de_file_id: '' }]);
  };

  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof LocalFileEntry, value: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const save = async (): Promise<boolean> => {
    if (saving) return false;
    setSaving(true);
    setError(null);

    const { data: backup } = await supabase
      .from('dti_file_entries')
      .select('entry_id, en_file_id, de_file_id')
      .eq('connector_id', connectorId);

    const { error: delErr } = await supabase
      .from('dti_file_entries')
      .delete()
      .eq('connector_id', connectorId);

    if (delErr) {
      setError('common.saveFailed');
      setSaving(false);
      return false;
    }

    if (entries.length > 0) {
      const rows = entries.map(e => ({
        connector_id: connectorId,
        entry_id: e.entry_id,
        en_file_id: e.en_file_id || null,
        de_file_id: e.de_file_id || null,
      }));

      const { error: insErr } = await supabase
        .from('dti_file_entries')
        .insert(rows);

      if (insErr) {
        if (backup && backup.length > 0) {
          await supabase.from('dti_file_entries').insert(
            backup.map(b => ({ connector_id: connectorId, ...b }))
          );
        }
        setError('common.saveFailed');
        setSaving(false);
        return false;
      }
    }

    savedRef.current = JSON.stringify(entries);
    setSaving(false);
    return true;
  };

  return { entries, loading, saving, error, hasChanges, addEntry, removeEntry, updateEntry, save };
}
