import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { DocPage } from '../types';

export function useDocPage(pageId: string | undefined) {
  const [page, setPage] = useState<DocPage | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!pageId) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('doc_pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (!mounted) return;
      if (err || !data) {
        setError('Seite konnte nicht geladen werden.');
        setLoading(false);
        return;
      }
      const p = data as DocPage;
      setPage(p);
      setContent(p.content);
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [pageId]);

  const save = async () => {
    if (!pageId || saving) return false;
    setSaving(true);
    setError(null);

    const { error: err } = await supabase
      .from('doc_pages')
      .update({ content })
      .eq('id', pageId);

    setSaving(false);
    if (err) {
      setError('Seite konnte nicht gespeichert werden.');
      return false;
    }
    setPage(prev => prev ? { ...prev, content } : null);
    return true;
  };

  return { page, content, setContent, loading, saving, error, save };
}
