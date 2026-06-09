-- ============================================
-- Connector Proxy — File Cache (CAS) Setup
-- Dieses SQL im Supabase SQL Editor ausführen
-- Idempotent — mehrfaches Ausführen ist sicher.
-- ============================================

-- 1) Erweiterung connector_proxies um die File-Cache-Felder
alter table public.connector_proxies
  add column if not exists files_cache_enabled boolean not null default false;
alter table public.connector_proxies
  add column if not exists files_cache_ttl integer not null default 86400; -- default 24h

-- 2) Blob-Tabelle (ein Eintrag pro einzigartigem Inhalt)
create table if not exists public.proxy_file_blob (
  proxy_id uuid references public.connector_proxies on delete cascade not null,
  file_hash text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  first_seen_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  primary key (proxy_id, file_hash)
);

create index if not exists idx_proxy_file_blob_last_accessed
  on public.proxy_file_blob (proxy_id, last_accessed_at);

alter table public.proxy_file_blob enable row level security;

drop policy if exists "Users can read own blobs" on public.proxy_file_blob;
drop policy if exists "Users can insert own blobs" on public.proxy_file_blob;
drop policy if exists "Users can update own blobs" on public.proxy_file_blob;
drop policy if exists "Users can delete own blobs" on public.proxy_file_blob;

create policy "Users can read own blobs"
  on public.proxy_file_blob for select
  using (exists (
    select 1 from public.connector_proxies
    where proxy_id = proxy_file_blob.proxy_id and user_id = auth.uid()
  ));

create policy "Users can insert own blobs"
  on public.proxy_file_blob for insert
  with check (exists (
    select 1 from public.connector_proxies
    where proxy_id = proxy_file_blob.proxy_id and user_id = auth.uid()
  ));

create policy "Users can update own blobs"
  on public.proxy_file_blob for update
  using (exists (
    select 1 from public.connector_proxies
    where proxy_id = proxy_file_blob.proxy_id and user_id = auth.uid()
  ));

create policy "Users can delete own blobs"
  on public.proxy_file_blob for delete
  using (exists (
    select 1 from public.connector_proxies
    where proxy_id = proxy_file_blob.proxy_id and user_id = auth.uid()
  ));

-- 3) Ref-Tabelle (Zeiger von Lookup-Key auf Blob-Hash)
create table if not exists public.proxy_file_ref (
  proxy_id uuid references public.connector_proxies on delete cascade not null,
  item_id text not null,
  property_id text not null,
  language text not null default '',
  file_hash text not null,
  filename text,
  fetched_at timestamptz default now(),
  expires_at timestamptz,
  primary key (proxy_id, item_id, property_id, language),
  foreign key (proxy_id, file_hash) references public.proxy_file_blob (proxy_id, file_hash) on delete cascade
);

create index if not exists idx_proxy_file_ref_fetched
  on public.proxy_file_ref (proxy_id, fetched_at desc);
create index if not exists idx_proxy_file_ref_hash
  on public.proxy_file_ref (proxy_id, file_hash);

alter table public.proxy_file_ref enable row level security;

drop policy if exists "Users can read own file refs" on public.proxy_file_ref;
drop policy if exists "Users can insert own file refs" on public.proxy_file_ref;
drop policy if exists "Users can update own file refs" on public.proxy_file_ref;
drop policy if exists "Users can delete own file refs" on public.proxy_file_ref;

create policy "Users can read own file refs"
  on public.proxy_file_ref for select
  using (exists (
    select 1 from public.connector_proxies
    where proxy_id = proxy_file_ref.proxy_id and user_id = auth.uid()
  ));

create policy "Users can insert own file refs"
  on public.proxy_file_ref for insert
  with check (exists (
    select 1 from public.connector_proxies
    where proxy_id = proxy_file_ref.proxy_id and user_id = auth.uid()
  ));

create policy "Users can update own file refs"
  on public.proxy_file_ref for update
  using (exists (
    select 1 from public.connector_proxies
    where proxy_id = proxy_file_ref.proxy_id and user_id = auth.uid()
  ));

create policy "Users can delete own file refs"
  on public.proxy_file_ref for delete
  using (exists (
    select 1 from public.connector_proxies
    where proxy_id = proxy_file_ref.proxy_id and user_id = auth.uid()
  ));

-- 4) Storage-Bucket anlegen (private)
insert into storage.buckets (id, name, public)
values ('proxy-file-cache', 'proxy-file-cache', false)
on conflict (id) do nothing;

-- 5) Storage-Policies
-- Der Lesezugriff nutzt die bereits RLS-geschützte Tabelle proxy_file_blob:
-- wenn der User den Blob-Row lesen kann (Policy auf proxy_file_blob greift), darf er auch das File.
-- Service-Role (Edge Function) umgeht RLS automatisch und braucht keine explizite Policy,
-- wir setzen sie trotzdem explizit.

drop policy if exists "Users can read own cached files" on storage.objects;
drop policy if exists "Service role can write cached files" on storage.objects;
drop policy if exists "Authenticated can read own cached files" on storage.objects;

create policy "Authenticated can read own cached files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'proxy-file-cache'
    and exists (
      select 1 from public.proxy_file_blob
      where storage_path = storage.objects.name
    )
  );

create policy "Service role can write cached files"
  on storage.objects for all
  to service_role
  using (bucket_id = 'proxy-file-cache')
  with check (bucket_id = 'proxy-file-cache');
