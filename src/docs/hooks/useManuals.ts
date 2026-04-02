import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Manual } from '../types';

export function useManuals() {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('doc_manuals')
      .select('*')
      .order('sort_order', { ascending: true });

    if (err) {
      setError('Manuals konnten nicht geladen werden.');
      setLoading(false);
      return;
    }
    setManuals(data as Manual[]);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error: err } = await supabase
        .from('doc_manuals')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!mounted) return;
      if (err) {
        setError('Manuals konnten nicht geladen werden.');
      } else {
        setManuals(data as Manual[]);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const createManual = async (title: string, slug: string, description?: string, icon?: string, iconColor?: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    const { data, error: err } = await supabase
      .from('doc_manuals')
      .insert({
        title,
        slug,
        description: description || null,
        icon: icon || 'BookOpen',
        icon_color: iconColor || 'text-accent',
        sort_order: manuals.length,
        created_by: user.user.id,
      })
      .select()
      .single();

    if (err) {
      setError('Manual konnte nicht erstellt werden.');
      return null;
    }
    setManuals(prev => [...prev, data as Manual]);
    return data as Manual;
  };

  const deleteManual = async (id: string) => {
    const { error: err } = await supabase
      .from('doc_manuals')
      .delete()
      .eq('id', id);

    if (err) {
      setError('Manual konnte nicht gelöscht werden.');
      return false;
    }
    setManuals(prev => prev.filter(m => m.id !== id));
    return true;
  };

  const updateManual = async (id: string, updates: Partial<Pick<Manual, 'title' | 'slug' | 'description' | 'icon' | 'icon_color' | 'sort_order'>>) => {
    const { data, error: err } = await supabase
      .from('doc_manuals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (err) {
      setError('Manual konnte nicht aktualisiert werden.');
      return false;
    }
    setManuals(prev => prev.map(m => m.id === id ? data as Manual : m));
    return true;
  };

  return { manuals, loading, error, createManual, deleteManual, updateManual, refresh: load };
}
