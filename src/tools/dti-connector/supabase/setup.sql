-- ============================================
-- DTI Connector — Supabase Setup (Sprint 1)
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

-- 1. Connectors Tabelle
create table if not exists public.dti_connectors (
  connector_id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null check (char_length(name) between 1 and 100),
  api_key uuid default gen_random_uuid() unique not null,
  created_at timestamptz default now()
);

-- 2. RLS aktivieren
alter table public.dti_connectors enable row level security;

-- 3. RLS Policies
create policy "Users can read own connectors"
  on public.dti_connectors for select
  using (user_id = auth.uid());

create policy "Users can create own connectors"
  on public.dti_connectors for insert
  with check (user_id = auth.uid());

create policy "Users can update own connectors"
  on public.dti_connectors for update
  using (user_id = auth.uid());

create policy "Users can delete own connectors"
  on public.dti_connectors for delete
  using (user_id = auth.uid());

-- 4. Index für schnelle User-Abfragen
create index if not exists idx_dti_connectors_user_id
  on public.dti_connectors (user_id);
