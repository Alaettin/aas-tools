import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';
import type { Profile, UserRole } from '@/types';

export function useUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await withTimeout(
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
      );
      if (!mountedRef.current) return;
      if (error) {
        setError('Benutzer konnten nicht geladen werden.');
      } else {
        setUsers(data as Profile[]);
      }
    } catch {
      if (!mountedRef.current) return;
      setError('Verbindung fehlgeschlagen.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchUsers();
    return () => { mountedRef.current = false; };
  }, [fetchUsers]);

  const updateRole = async (userId: string, role: UserRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      console.error(error);
      return { error: 'Rolle konnte nicht geändert werden.' };
    }

    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, role } : u))
    );
    return { error: null };
  };

  const deleteUser = async (userId: string) => {
    // Nur Profil löschen — auth.users Löschung benötigt service_role
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error(error);
      return { error: 'Benutzer konnte nicht gelöscht werden.' };
    }

    setUsers(prev => prev.filter(u => u.id !== userId));
    return { error: null };
  };

  return { users, loading, error, fetchUsers, updateRole, deleteUser };
}
