-- ============================================
-- Global Connector — Supabase Setup
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

create table if not exists public.global_connectors (
  connector_id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null check (char_length(name) between 1 and 200),
  api_key uuid default gen_random_uuid() unique not null,
  excel_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.global_connectors enable row level security;

create policy "Users can read own global connectors"
  on public.global_connectors for select using (user_id = auth.uid());
create policy "Users can create own global connectors"
  on public.global_connectors for insert with check (user_id = auth.uid());
create policy "Users can update own global connectors"
  on public.global_connectors for update using (user_id = auth.uid());
create policy "Users can delete own global connectors"
  on public.global_connectors for delete using (user_id = auth.uid());

create index if not exists idx_global_connectors_user_id
  on public.global_connectors (user_id);

create trigger on_global_connector_updated
  before update on public.global_connectors
  for each row execute function public.handle_updated_at();

-- Storage Bucket: global-connectors (Private)
-- Erstelle manuell im Dashboard: Storage → New Bucket → "global-connectors" → Private

create policy "User can read own global files"
  on storage.objects for select
  using (bucket_id = 'global-connectors' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "User can upload own global files"
  on storage.objects for insert
  with check (bucket_id = 'global-connectors' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "User can update own global files"
  on storage.objects for update
  using (bucket_id = 'global-connectors' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "User can delete own global files"
  on storage.objects for delete
  using (bucket_id = 'global-connectors' and (storage.foldername(name))[1] = auth.uid()::text);
