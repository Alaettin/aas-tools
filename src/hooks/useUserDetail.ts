import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

export function useUserDetail(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [toolAccess, setToolAccess] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => { clearTimeout(savedTimerRef.current); };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const [profileRes, accessRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_tool_access').select('tool_id').eq('user_id', userId),
      ]);

      if (cancelled) return;

      if (profileRes.error || !profileRes.data) {
        setError('Benutzer konnte nicht geladen werden.');
        setLoading(false);
        return;
      }

      const p = profileRes.data as Profile;
      setProfile(p);
      setRole(p.role);
      setToolAccess(new Set((accessRes.data || []).map(r => r.tool_id)));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const toggleTool = (toolId: string) => {
    setToolAccess(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
    setSaved(false);
  };

  const save = async (): Promise<boolean> => {
    if (saving) return false;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: roleErr } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (roleErr) {
      setError('Rolle konnte nicht gespeichert werden.');
      setSaving(false);
      return false;
    }

    const { data: backup } = await supabase
      .from('user_tool_access')
      .select('tool_id')
      .eq('user_id', userId);

    await supabase.from('user_tool_access').delete().eq('user_id', userId);

    if (toolAccess.size > 0) {
      const rows = Array.from(toolAccess).map(toolId => ({
        user_id: userId,
        tool_id: toolId,
      }));

      const { error: insErr } = await supabase
        .from('user_tool_access')
        .insert(rows);

      if (insErr) {
        if (backup && backup.length > 0) {
          const { error: rollbackErr } = await supabase.from('user_tool_access').insert(
            backup.map(b => ({ user_id: userId, tool_id: b.tool_id }))
          );
          if (rollbackErr) {
            setError('Speichern und Wiederherstellung fehlgeschlagen. Bitte Seite neu laden.');
            setSaving(false);
            return false;
          }
        }
        setError('Tool-Zugriff konnte nicht gespeichert werden.');
        setSaving(false);
        return false;
      }
    }

    setSaving(false);
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
    return true;
  };

  return {
    profile,
    role,
    setRole: (r: UserRole) => { setRole(r); setSaved(false); },
    toolAccess,
    toggleTool,
    loading,
    saving,
    saved,
    error,
    save,
  };
}
