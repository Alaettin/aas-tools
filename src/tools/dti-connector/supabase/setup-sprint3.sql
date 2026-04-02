-- ============================================
-- DTI Connector — Sprint 3: Files (v2)
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

-- 0. Alte Tabelle droppen (falls vorhanden)
drop table if exists public.dti_files;

-- 1. Uploads (Mediathek)
create table if not exists public.dti_uploads (
  connector_id uuid references public.dti_connectors on delete cascade not null,
  file_id text not null check (char_length(file_id) between 1 and 120),
  original_name text not null,
  size integer not null,
  mime_type text not null,
  storage_path text not null,
  created_at timestamptz default now(),
  primary key (connector_id, file_id)
);

alter table public.dti_uploads enable row level security;

create policy "Owner can read uploads"
  on public.dti_uploads for select
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_uploads.connector_id and user_id = auth.uid()
  ));

create policy "Owner can insert uploads"
  on public.dti_uploads for insert
  with check (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_uploads.connector_id and user_id = auth.uid()
  ));

create policy "Owner can update uploads"
  on public.dti_uploads for update
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_uploads.connector_id and user_id = auth.uid()
  ));

create policy "Owner can delete uploads"
  on public.dti_uploads for delete
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_uploads.connector_id and user_id = auth.uid()
  ));

-- 2. File Entries (Zuordnungen EN/DE)
create table if not exists public.dti_file_entries (
  connector_id uuid references public.dti_connectors on delete cascade not null,
  entry_id text not null check (char_length(entry_id) between 1 and 120),
  en_file_id text,
  de_file_id text,
  primary key (connector_id, entry_id)
);

alter table public.dti_file_entries enable row level security;

create policy "Owner can read file entries"
  on public.dti_file_entries for select
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_file_entries.connector_id and user_id = auth.uid()
  ));

create policy "Owner can insert file entries"
  on public.dti_file_entries for insert
  with check (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_file_entries.connector_id and user_id = auth.uid()
  ));

create policy "Owner can update file entries"
  on public.dti_file_entries for update
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_file_entries.connector_id and user_id = auth.uid()
  ));

create policy "Owner can delete file entries"
  on public.dti_file_entries for delete
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_file_entries.connector_id and user_id = auth.uid()
  ));
