-- ============================================
-- Excel Connector — Supabase Setup
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

-- 1. Connector-Metadaten (keine Daten — die leben in der Excel)
create table if not exists public.excel_connectors (
  connector_id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null check (char_length(name) between 1 and 200),
  api_key uuid default gen_random_uuid() unique not null,
  excel_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.excel_connectors enable row level security;

create policy "Users can read own excel connectors"
  on public.excel_connectors for select using (user_id = auth.uid());
create policy "Users can create own excel connectors"
  on public.excel_connectors for insert with check (user_id = auth.uid());
create policy "Users can update own excel connectors"
  on public.excel_connectors for update using (user_id = auth.uid());
create policy "Users can delete own excel connectors"
  on public.excel_connectors for delete using (user_id = auth.uid());

create index if not exists idx_excel_connectors_user_id
  on public.excel_connectors (user_id);

-- Updated_at trigger (reuse existing function)
create trigger on_excel_connector_updated
  before update on public.excel_connectors
  for each row execute function public.handle_updated_at();

-- 2. Storage Bucket: excel-connectors (Private)
-- Erstelle manuell im Dashboard: Storage → New Bucket → "excel-connectors" → Private
-- Dann diese Storage Policies ausführen:

create policy "User can read own excel files"
  on storage.objects for select
  using (bucket_id = 'excel-connectors' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "User can upload own excel files"
  on storage.objects for insert
  with check (bucket_id = 'excel-connectors' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "User can update own excel files"
  on storage.objects for update
  using (bucket_id = 'excel-connectors' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "User can delete own excel files"
  on storage.objects for delete
  using (bucket_id = 'excel-connectors' and (storage.foldername(name))[1] = auth.uid()::text);
