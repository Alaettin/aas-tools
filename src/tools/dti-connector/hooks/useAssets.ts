import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';
import type { Asset } from '../types';

export function useAssets(connectorId: string) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await withTimeout(
        supabase.from('dti_assets').select('*').eq('connector_id', connectorId).order('asset_id')
      );
      if (!mountedRef.current) return;
      if (err) {
        setError('Assets konnten nicht geladen werden.');
      } else {
        setAssets((data || []) as Asset[]);
      }
    } catch {
      if (!mountedRef.current) return;
      setError('common.connectionFailed');
    }
    setLoading(false);
  }, [connectorId]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  const createAsset = async (assetId: string): Promise<boolean> => {
    setError(null);

    const { error: err } = await supabase
      .from('dti_assets')
      .insert({ connector_id: connectorId, asset_id: assetId.trim() });

    if (err) {
      if (err.code === '23505') {
        setError('Asset-ID existiert bereits.');
      } else {
        setError('Asset konnte nicht erstellt werden.');
      }
      return false;
    }

    await fetch();
    return true;
  };

  const renameAsset = async (oldId: string, newId: string): Promise<boolean> => {
    setError(null);

    // Insert new asset
    const { error: insErr } = await supabase
      .from('dti_assets')
      .insert({ connector_id: connectorId, asset_id: newId.trim() });

    if (insErr) {
      setError('common.renameFailed');
      return false;
    }

    // Copy values to new asset_id
    const { data: values } = await supabase
      .from('dti_asset_values')
      .select('*')
      .eq('connector_id', connectorId)
      .eq('asset_id', oldId);

    if (values && values.length > 0) {
      const newValues = values.map(v => ({ ...v, asset_id: newId.trim() }));
      await supabase.from('dti_asset_values').insert(newValues);
    }

    // Delete old asset + values (cascade)
    await supabase.from('dti_asset_values').delete()
      .eq('connector_id', connectorId).eq('asset_id', oldId);
    await supabase.from('dti_assets').delete()
      .eq('connector_id', connectorId).eq('asset_id', oldId);

    await fetch();
    return true;
  };

  const deleteAsset = async (assetId: string): Promise<boolean> => {
    setError(null);

    await supabase.from('dti_asset_values').delete()
      .eq('connector_id', connectorId).eq('asset_id', assetId);

    const { error: err } = await supabase
      .from('dti_assets')
      .delete()
      .eq('connector_id', connectorId)
      .eq('asset_id', assetId);

    if (err) {
      setError('Asset konnte nicht gelöscht werden.');
      return false;
    }

    setAssets(prev => prev.filter(a => a.asset_id !== assetId));
    return true;
  };

  return { assets, loading, error, createAsset, renameAsset, deleteAsset, refresh: fetch };
}
