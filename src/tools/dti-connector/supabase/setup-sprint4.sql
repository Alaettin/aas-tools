-- ============================================
-- DTI Connector — Sprint 4: Assets
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

-- 1. Assets
create table if not exists public.dti_assets (
  connector_id uuid references public.dti_connectors on delete cascade not null,
  asset_id text not null check (char_length(asset_id) between 1 and 120),
  primary key (connector_id, asset_id)
);

alter table public.dti_assets enable row level security;

create policy "Owner can read assets"
  on public.dti_assets for select
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_assets.connector_id and user_id = auth.uid()
  ));

create policy "Owner can insert assets"
  on public.dti_assets for insert
  with check (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_assets.connector_id and user_id = auth.uid()
  ));

create policy "Owner can update assets"
  on public.dti_assets for update
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_assets.connector_id and user_id = auth.uid()
  ));

create policy "Owner can delete assets"
  on public.dti_assets for delete
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_assets.connector_id and user_id = auth.uid()
  ));

-- 2. Asset Values
create table if not exists public.dti_asset_values (
  connector_id uuid references public.dti_connectors on delete cascade not null,
  asset_id text not null,
  key text not null,
  lang text not null default 'en' check (lang in ('en', 'de')),
  value text default '',
  primary key (connector_id, asset_id, key, lang)
);

alter table public.dti_asset_values enable row level security;

create policy "Owner can read asset values"
  on public.dti_asset_values for select
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_asset_values.connector_id and user_id = auth.uid()
  ));

create policy "Owner can insert asset values"
  on public.dti_asset_values for insert
  with check (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_asset_values.connector_id and user_id = auth.uid()
  ));

create policy "Owner can update asset values"
  on public.dti_asset_values for update
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_asset_values.connector_id and user_id = auth.uid()
  ));

create policy "Owner can delete asset values"
  on public.dti_asset_values for delete
  using (exists (
    select 1 from public.dti_connectors
    where connector_id = dti_asset_values.connector_id and user_id = auth.uid()
  ));
