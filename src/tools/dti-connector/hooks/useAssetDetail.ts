import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';

interface ValuePair {
  en: string;
  de: string;
}

export function useAssetDetail(connectorId: string, assetId: string) {
  const [values, setValues] = useState<Map<string, ValuePair>>(new Map());
  const [hierarchyLevels, setHierarchyLevels] = useState<string[]>([]);
  const [propertyDps, setPropertyDps] = useState<{ dp_id: string; name: string }[]>([]);
  const [fileDps, setFileDps] = useState<{ dp_id: string; name: string }[]>([]);
  const [fileEntryIds, setFileEntryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef<string>('');

  const hasChanges = JSON.stringify(Array.from(values.entries())) !== savedRef.current;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [levelsRes, modelRes, entriesRes, valuesRes] = await withTimeout(
          Promise.all([
            supabase.from('dti_hierarchy_levels').select('name').eq('connector_id', connectorId).order('level'),
            supabase.from('dti_model_datapoints').select('dp_id, name, type').eq('connector_id', connectorId).order('sort_order'),
            supabase.from('dti_file_entries').select('entry_id').eq('connector_id', connectorId).order('entry_id'),
            supabase.from('dti_asset_values').select('key, lang, value').eq('connector_id', connectorId).eq('asset_id', assetId),
          ])
        );

        if (cancelled) return;

        setHierarchyLevels((levelsRes.data || []).map(l => l.name));
        setPropertyDps((modelRes.data || []).filter(d => d.type === 0).map(d => ({ dp_id: d.dp_id, name: d.name })));
        setFileDps((modelRes.data || []).filter(d => d.type === 1).map(d => ({ dp_id: d.dp_id, name: d.name })));
        setFileEntryIds((entriesRes.data || []).map(e => e.entry_id));

        const map = new Map<string, ValuePair>();
        for (const v of (valuesRes.data || [])) {
          if (!map.has(v.key)) map.set(v.key, { en: '', de: '' });
          const pair = map.get(v.key)!;
          if (v.lang === 'en') pair.en = v.value || '';
          else pair.de = v.value || '';
        }
        setValues(map);
        savedRef.current = JSON.stringify(Array.from(map.entries()));
      } catch {
        if (cancelled) return;
        setError('common.connectionFailed');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [connectorId, assetId]);

  const getValue = (key: string, lang: 'en' | 'de'): string => {
    return values.get(key)?.[lang] || '';
  };

  const setValue = (key: string, lang: 'en' | 'de', value: string) => {
    setValues(prev => {
      const next = new Map(prev);
      const pair = next.get(key) || { en: '', de: '' };
      next.set(key, { ...pair, [lang]: value });
      return next;
    });
  };

  const save = async (): Promise<boolean> => {
    if (saving) return false;
    setSaving(true);
    setError(null);

    // Backup for rollback
    const { data: backup } = await supabase
      .from('dti_asset_values')
      .select('key, lang, value')
      .eq('connector_id', connectorId)
      .eq('asset_id', assetId);

    const { error: delErr } = await supabase
      .from('dti_asset_values')
      .delete()
      .eq('connector_id', connectorId)
      .eq('asset_id', assetId);

    if (delErr) {
      setError('common.saveFailed');
      setSaving(false);
      return false;
    }

    const rows: { connector_id: string; asset_id: string; key: string; lang: string; value: string }[] = [];
    for (const [key, pair] of values.entries()) {
      if (pair.en) rows.push({ connector_id: connectorId, asset_id: assetId, key, lang: 'en', value: pair.en });
      if (pair.de) rows.push({ connector_id: connectorId, asset_id: assetId, key, lang: 'de', value: pair.de });
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from('dti_asset_values')
        .insert(rows);

      if (insErr) {
        // Rollback
        if (backup && backup.length > 0) {
          await supabase.from('dti_asset_values').insert(
            backup.map(b => ({ connector_id: connectorId, asset_id: assetId, ...b }))
          );
        }
        setError('common.saveFailed');
        setSaving(false);
        return false;
      }
    }

    savedRef.current = JSON.stringify(Array.from(values.entries()));
    setSaving(false);
    return true;
  };

  return {
    hierarchyLevels,
    propertyDps,
    fileDps,
    fileEntryIds,
    loading,
    saving,
    error,
    hasChanges,
    getValue,
    setValue,
    save,
  };
}
