-- ============================================
-- Use Case Checker — Supabase Setup
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

-- 1. Sources (AAS Repositories)
create table if not exists public.ucc_sources (
  source_id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  base_url text not null,
  created_at timestamptz default now()
);

alter table public.ucc_sources enable row level security;

create policy "Users can read own sources" on public.ucc_sources for select using (user_id = auth.uid());
create policy "Users can insert own sources" on public.ucc_sources for insert with check (user_id = auth.uid());
create policy "Users can update own sources" on public.ucc_sources for update using (user_id = auth.uid());
create policy "Users can delete own sources" on public.ucc_sources for delete using (user_id = auth.uid());

-- 2. Source AAS IDs
create table if not exists public.ucc_source_aas (
  entry_id uuid default gen_random_uuid() primary key,
  source_id uuid references public.ucc_sources on delete cascade not null,
  aas_id text not null,
  unique(source_id, aas_id)
);

alter table public.ucc_source_aas enable row level security;

create policy "Users can read own source aas" on public.ucc_source_aas for select
  using (exists (select 1 from public.ucc_sources where source_id = ucc_source_aas.source_id and user_id = auth.uid()));
create policy "Users can insert own source aas" on public.ucc_source_aas for insert
  with check (exists (select 1 from public.ucc_sources where source_id = ucc_source_aas.source_id and user_id = auth.uid()));
create policy "Users can delete own source aas" on public.ucc_source_aas for delete
  using (exists (select 1 from public.ucc_sources where source_id = ucc_source_aas.source_id and user_id = auth.uid()));

-- 3. Use Cases
create table if not exists public.ucc_use_cases (
  case_id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);

alter table public.ucc_use_cases enable row level security;

create policy "Users can read own use cases" on public.ucc_use_cases for select using (user_id = auth.uid());
create policy "Users can insert own use cases" on public.ucc_use_cases for insert with check (user_id = auth.uid());
create policy "Users can update own use cases" on public.ucc_use_cases for update using (user_id = auth.uid());
create policy "Users can delete own use cases" on public.ucc_use_cases for delete using (user_id = auth.uid());

-- 4. Required Submodels per Use Case
create table if not exists public.ucc_required_submodels (
  id uuid default gen_random_uuid() primary key,
  case_id uuid references public.ucc_use_cases on delete cascade not null,
  semantic_id text not null,
  id_short text
);

alter table public.ucc_required_submodels enable row level security;

create policy "Users can read own required submodels" on public.ucc_required_submodels for select
  using (exists (select 1 from public.ucc_use_cases where case_id = ucc_required_submodels.case_id and user_id = auth.uid()));
create policy "Users can insert own required submodels" on public.ucc_required_submodels for insert
  with check (exists (select 1 from public.ucc_use_cases where case_id = ucc_required_submodels.case_id and user_id = auth.uid()));
create policy "Users can delete own required submodels" on public.ucc_required_submodels for delete
  using (exists (select 1 from public.ucc_use_cases where case_id = ucc_required_submodels.case_id and user_id = auth.uid()));

-- 5. Cached Evaluations
create table if not exists public.ucc_evaluations (
  eval_id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  aas_id text not null,
  source_id uuid references public.ucc_sources on delete cascade not null,
  results_json text not null,
  evaluated_at timestamptz default now(),
  unique(user_id, aas_id, source_id)
);

alter table public.ucc_evaluations enable row level security;

create policy "Users can read own evaluations" on public.ucc_evaluations for select using (user_id = auth.uid());
create policy "Users can insert own evaluations" on public.ucc_evaluations for insert with check (user_id = auth.uid());
create policy "Users can update own evaluations" on public.ucc_evaluations for update using (user_id = auth.uid());
create policy "Users can delete own evaluations" on public.ucc_evaluations for delete using (user_id = auth.uid());
