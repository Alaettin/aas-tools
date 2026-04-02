-- ============================================
-- DTI Connector — Sprint 2: Hierarchy & Model
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

-- 1. Hierarchy Levels
create table if not exists public.dti_hierarchy_levels (
  connector_id uuid references public.dti_connectors on delete cascade not null,
  level integer not null,
  name text not null check (char_length(name) between 1 and 60),
  primary key (connector_id, level)
);

alter table public.dti_hierarchy_levels enable row level security;

create policy "Owner can read hierarchy levels"
  on public.dti_hierarchy_levels for select
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_hierarchy_levels.connector_id
    and user_id = auth.uid()
  ));

create policy "Owner can insert hierarchy levels"
  on public.dti_hierarchy_levels for insert
  with check (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_hierarchy_levels.connector_id
    and user_id = auth.uid()
  ));

create policy "Owner can update hierarchy levels"
  on public.dti_hierarchy_levels for update
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_hierarchy_levels.connector_id
    and user_id = auth.uid()
  ));

create policy "Owner can delete hierarchy levels"
  on public.dti_hierarchy_levels for delete
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_hierarchy_levels.connector_id
    and user_id = auth.uid()
  ));

-- 2. Model Datapoints
create table if not exists public.dti_model_datapoints (
  connector_id uuid references public.dti_connectors on delete cascade not null,
  dp_id text not null check (char_length(dp_id) between 1 and 120),
  name text default '',
  type integer default 0 check (type in (0, 1)),
  sort_order integer default 0,
  primary key (connector_id, dp_id)
);

alter table public.dti_model_datapoints enable row level security;

create policy "Owner can read model datapoints"
  on public.dti_model_datapoints for select
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_model_datapoints.connector_id
    and user_id = auth.uid()
  ));

create policy "Owner can insert model datapoints"
  on public.dti_model_datapoints for insert
  with check (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_model_datapoints.connector_id
    and user_id = auth.uid()
  ));

create policy "Owner can update model datapoints"
  on public.dti_model_datapoints for update
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_model_datapoints.connector_id
    and user_id = auth.uid()
  ));

create policy "Owner can delete model datapoints"
  on public.dti_model_datapoints for delete
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_model_datapoints.connector_id
    and user_id = auth.uid()
  ));
