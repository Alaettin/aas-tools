-- ============================================
-- Connector Proxy — Blacklist Table
-- Dieses SQL im Supabase SQL Editor ausführen
-- Idempotent — mehrfaches Ausführen ist sicher.
-- ============================================

create table if not exists public.connector_proxy_blacklist (
  proxy_id uuid references public.connector_proxies on delete cascade not null,
  dp_id text not null,
  primary key (proxy_id, dp_id)
);

create index if not exists idx_connector_proxy_blacklist_proxy
  on public.connector_proxy_blacklist (proxy_id);

alter table public.connector_proxy_blacklist enable row level security;

drop policy if exists "Users can read own blacklist" on public.connector_proxy_blacklist;
drop policy if exists "Users can insert own blacklist" on public.connector_proxy_blacklist;
drop policy if exists "Users can delete own blacklist" on public.connector_proxy_blacklist;

create policy "Users can read own blacklist"
  on public.connector_proxy_blacklist for select
  using (exists (
    select 1 from public.connector_proxies
    where proxy_id = connector_proxy_blacklist.proxy_id
      and user_id = auth.uid()
  ));

create policy "Users can insert own blacklist"
  on public.connector_proxy_blacklist for insert
  with check (exists (
    select 1 from public.connector_proxies
    where proxy_id = connector_proxy_blacklist.proxy_id
      and user_id = auth.uid()
  ));

create policy "Users can delete own blacklist"
  on public.connector_proxy_blacklist for delete
  using (exists (
    select 1 from public.connector_proxies
    where proxy_id = connector_proxy_blacklist.proxy_id
      and user_id = auth.uid()
  ));
