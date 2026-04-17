import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { QrPart } from '../types';

export interface SavedQrCode {
  id: string;
  uri: string;
  part: QrPart;
  label: string | null;
  created_at: string;
}

export function useQrCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<SavedQrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setCodes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('iec_qr_codes')
      .select('id, uri, part, label, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
      setCodes([]);
    } else {
      setError(null);
      setCodes((data || []) as SavedQrCode[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (uri: string, part: QrPart, label?: string) => {
      if (!user) return false;
      const { data, error: err } = await supabase
        .from('iec_qr_codes')
        .insert({ user_id: user.id, uri, part, label: label || null })
        .select('id, uri, part, label, created_at')
        .single();
      if (err || !data) {
        setError(err?.message || 'Speichern fehlgeschlagen.');
        return false;
      }
      setCodes(prev => [data as SavedQrCode, ...prev]);
      return true;
    },
    [user],
  );

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('iec_qr_codes').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return false;
    }
    setCodes(prev => prev.filter(c => c.id !== id));
    return true;
  }, []);

  return { codes, loading, error, add, remove, refresh };
}
