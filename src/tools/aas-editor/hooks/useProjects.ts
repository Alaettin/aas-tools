import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { useAuth } from '@/context/AuthContext';
import type { AasProject } from '../types';

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<AasProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await withTimeout(
          supabase.from('aas_projects').select('*').order('updated_at', { ascending: false })
        );
        if (cancelled) return;
        if (err) {
          setError('Projekte konnten nicht geladen werden.');
        } else {
          setProjects((data || []) as AasProject[]);
        }
      } catch {
        if (cancelled) return;
        setError('Verbindung fehlgeschlagen.');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; mountedRef.current = false; };
  }, [user]);

  const createProject = async (name: string): Promise<AasProject | null> => {
    if (!user) return null;

    const { data, error: err } = await supabase
      .from('aas_projects')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('Projekt konnte nicht erstellt werden.');
      return null;
    }

    const project = data as AasProject;
    setProjects(prev => [project, ...prev]);
    return project;
  };

  const renameProject = async (id: string, name: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('aas_projects')
      .update({ name: name.trim() })
      .eq('id', id);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('Projekt konnte nicht umbenannt werden.');
      return false;
    }

    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: name.trim() } : p));
    return true;
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('aas_projects')
      .delete()
      .eq('id', id);

    if (err || !mountedRef.current) {
      if (mountedRef.current) setError('Projekt konnte nicht gelöscht werden.');
      return false;
    }

    setProjects(prev => prev.filter(p => p.id !== id));
    return true;
  };

  const saveCanvas = async (id: string, canvasData: unknown): Promise<boolean> => {
    const { error: err } = await supabase
      .from('aas_projects')
      .update({ canvas_data: canvasData })
      .eq('id', id);

    if (err) return false;
    return true;
  };

  return { projects, loading, error, createProject, renameProject, deleteProject, saveCanvas };
}
