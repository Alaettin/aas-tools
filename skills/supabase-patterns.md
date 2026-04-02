# Skill: Supabase Patterns — AAS Tools Platform

## Client Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

## Auth Pattern

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
});

// Register
const { data, error } = await supabase.auth.signUp({
  email, password,
  options: { data: { display_name: name } }
});

// Logout
await supabase.auth.signOut();

// Session Listener
supabase.auth.onAuthStateChange((event, session) => {
  // Handle session changes
});
```

## Profil laden (mit Rolle)

```typescript
const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};
```

## Admin-Check

```typescript
// Im AuthContext
const isAdmin = profile?.role === 'admin';

// NICHT über auth.user metadata — immer über profiles Tabelle
// RLS stellt sicher, dass nur Admins andere Profile sehen können
```

## User-Liste (Admin)

```typescript
const getUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
};
```

## Rolle ändern (Admin)

```typescript
const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);
  return { error };
};
```

## Sicherheitsregeln

1. **Kein `service_role` Key im Frontend** — immer `anon` Key
2. **RLS immer aktiv** — keine Tabelle ohne Policies
3. **Admin-Check serverseitig** — RLS Policy prüft `profiles.role`
4. **Keine Supabase Edge Functions in Phase 1** — alles über Client + RLS
5. **Environment Variables** in `.env.local`, nie committen

## Error Handling

```typescript
// Standardisiertes Error-Handling
const handleSupabaseError = (error: any): string => {
  if (error?.message?.includes('Invalid login credentials')) {
    return 'E-Mail oder Passwort falsch.';
  }
  if (error?.message?.includes('User already registered')) {
    return 'Diese E-Mail ist bereits registriert.';
  }
  if (error?.message?.includes('Email not confirmed')) {
    return 'Bitte bestätige deine E-Mail-Adresse.';
  }
  return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
};
```

## Env-Datei

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```
