-- ============================================
-- AAS Editor — Supabase Setup
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

create table if not exists public.aas_projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null check (char_length(name) between 1 and 200),
  canvas_data jsonb default '{"nodes":[],"edges":[]}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.aas_projects enable row level security;

create policy "Users can read own projects"
  on public.aas_projects for select
  using (user_id = auth.uid());

create policy "Users can create own projects"
  on public.aas_projects for insert
  with check (user_id = auth.uid());

create policy "Users can update own projects"
  on public.aas_projects for update
  using (user_id = auth.uid());

create policy "Users can delete own projects"
  on public.aas_projects for delete
  using (user_id = auth.uid());

create index if not exists idx_aas_projects_user_id
  on public.aas_projects (user_id);

-- Updated_at Trigger
create trigger on_aas_project_updated
  before update on public.aas_projects
  for each row execute function public.handle_updated_at();
