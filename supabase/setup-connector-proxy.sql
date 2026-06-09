-- ============================================
-- Connector Proxy — Supabase Setup
-- Dieses SQL im Supabase SQL Editor ausführen
-- Idempotent — mehrfaches Ausführen ist sicher.
-- ============================================

create table if not exists public.connector_proxies (
  proxy_id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null check (char_length(name) between 1 and 100),
  api_key uuid default gen_random_uuid() unique not null,
  target_base_url text,
  model_cache_ttl integer not null default 0,
  created_at timestamptz default now()
);

-- Add model_cache_ttl column if table already exists (migration for existing installs)
alter table public.connector_proxies
  add column if not exists model_cache_ttl integer not null default 0;

-- Add file cache columns (CAS feature)
alter table public.connector_proxies
  add column if not exists files_cache_enabled boolean not null default false;
alter table public.connector_proxies
  add column if not exists files_cache_ttl integer not null default 86400;

create index if not exists idx_connector_proxies_user_id
  on public.connector_proxies (user_id);

alter table public.connector_proxies enable row level security;

drop policy if exists "Users can read own proxies" on public.connector_proxies;
drop policy if exists "Users can create own proxies" on public.connector_proxies;
drop policy if exists "Users can update own proxies" on public.connector_proxies;
drop policy if exists "Users can delete own proxies" on public.connector_proxies;

create policy "Users can read own proxies"
  on public.connector_proxies for select
  using (user_id = auth.uid());

create policy "Users can create own proxies"
  on public.connector_proxies for insert
  with check (user_id = auth.uid());

create policy "Users can update own proxies"
  on public.connector_proxies for update
  using (user_id = auth.uid());

create policy "Users can delete own proxies"
  on public.connector_proxies for delete
  using (user_id = auth.uid());
