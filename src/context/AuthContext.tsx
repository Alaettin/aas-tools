import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  toolAccess: string[];
  docAccess: string[];
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_CACHE_KEY = 'aas_auth_cache';

async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as Profile;
}

async function loadToolAccess(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_tool_access')
    .select('tool_id')
    .eq('user_id', userId);
  return (data || []).map(r => r.tool_id);
}

async function loadDocAccess(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_doc_access')
    .select('manual_id')
    .eq('user_id', userId);
  return (data || []).map(r => r.manual_id);
}

function saveCache(profile: Profile | null, toolAccess: string[], docAccess: string[]) {
  if (profile) {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ profile, toolAccess, docAccess }));
  }
}

function loadCache(): { profile: Profile; toolAccess: string[]; docAccess: string[] } | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearCache() {
  localStorage.removeItem(AUTH_CACHE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Try to restore from cache immediately (no spinner)
  const cached = loadCache();

  const [state, setState] = useState<AuthState>(() => {
    if (cached) {
      return {
        session: null,
        user: null,
        profile: cached.profile,
        isLoading: false, // No spinner — show cached data
        isAdmin: cached.profile.role === 'admin',
        toolAccess: cached.toolAccess,
        docAccess: cached.docAccess || [],
      };
    }
    return {
      session: null,
      user: null,
      profile: null,
      isLoading: true,
      isAdmin: false,
      toolAccess: [],
      docAccess: [],
    };
  });
  const initializedRef = useRef(false);

  // Runs ONCE on mount
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        // If we have cache, skip loading state — just update in background
        const [profile, toolAccess, docAccess] = await Promise.all([
          loadProfile(session.user.id),
          loadToolAccess(session.user.id),
          loadDocAccess(session.user.id),
        ]);
        if (!mounted) return;
        if (profile) saveCache(profile, toolAccess, docAccess);
        setState({
          session,
          user: session.user,
          profile,
          isLoading: false,
          isAdmin: profile?.role === 'admin',
          toolAccess,
          docAccess,
        });
      } else {
        clearCache();
        setState(prev => ({ ...prev, isLoading: false, profile: null, user: null }));
      }
      initializedRef.current = true;
    }).then(undefined, () => {
      if (mounted) {
        setState(prev => ({ ...prev, isLoading: false }));
        initializedRef.current = true;
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user && initializedRef.current) {
          const [profile, toolAccess, docAccess] = await Promise.all([
            loadProfile(session.user.id),
            loadToolAccess(session.user.id),
            loadDocAccess(session.user.id),
          ]);
          if (!mounted) return;
          if (profile) saveCache(profile, toolAccess, docAccess);
          setState({
            session,
            user: session.user,
            profile,
            isLoading: false,
            isAdmin: profile?.role === 'admin',
            toolAccess,
            docAccess,
          });
        } else if (event === 'SIGNED_OUT') {
          clearCache();
          setState({
            session: null,
            user: null,
            profile: null,
            isLoading: false,
            isAdmin: false,
            toolAccess: [],
            docAccess: [],
          });
        } else if (session?.user) {
          // TOKEN_REFRESHED, INITIAL_SESSION, etc — just update session
          setState(prev => ({
            ...prev,
            session,
            user: session.user,
          }));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // ← Empty — runs only once

  const refreshProfile = async () => {
    if (!state.user) return;
    const [profile, toolAccess, docAccess] = await Promise.all([
      loadProfile(state.user.id),
      loadToolAccess(state.user.id),
      loadDocAccess(state.user.id),
    ]);
    if (profile) {
      setState(prev => ({
        ...prev,
        profile,
        isAdmin: profile.role === 'admin',
        toolAccess,
        docAccess,
      }));
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message || '';
        if (error.status === 400 || msg.includes('Invalid login credentials')) {
          return { error: 'auth.errorInvalidCredentials' };
        }
        if (msg.includes('Email not confirmed')) {
          return { error: 'auth.errorConfirmEmail' };
        }
        return { error: 'auth.errorSignInFailed' };
      }
      return { error: null };
    } catch {
      return { error: 'auth.errorSignInFailed' };
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) {
        const msg = error.message || '';
        if (error.status === 422 || msg.includes('User already registered')) {
          return { error: 'auth.errorAlreadyRegistered' };
        }
        return { error: 'auth.errorSignUpFailed' };
      }
      return { error: null };
    } catch {
      return { error: 'auth.errorSignUpFailed' };
    }
  };

  const signOut = async () => {
    clearCache();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
