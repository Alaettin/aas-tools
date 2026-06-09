-- ============================================
-- AAS MCP Server — Supabase Setup
-- Dieses SQL im Supabase SQL Editor ausführen
-- Idempotent — mehrfaches Ausführen ist sicher.
-- ============================================

create table if not exists public.aas_mcp_servers (
  server_id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null check (char_length(name) between 1 and 100),
  api_key uuid default gen_random_uuid() unique not null,
  aas_base_url text,
  tool_descriptions jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Per-server tool description overrides (migration for existing installs)
alter table public.aas_mcp_servers
  add column if not exists tool_descriptions jsonb not null default '{}'::jsonb;

-- Dynamic tool discovery (Runde 7):
--   available_tools = tool names derived from the AAS server's /description profiles
--   enabled_tools   = user-selected subset (null = all available enabled)
alter table public.aas_mcp_servers
  add column if not exists available_tools jsonb not null default '[]'::jsonb;
alter table public.aas_mcp_servers
  add column if not exists enabled_tools jsonb;

create index if not exists idx_aas_mcp_servers_user_id
  on public.aas_mcp_servers (user_id);

create index if not exists idx_aas_mcp_servers_api_key
  on public.aas_mcp_servers (api_key);

alter table public.aas_mcp_servers enable row level security;

drop policy if exists "Users can read own mcp servers" on public.aas_mcp_servers;
drop policy if exists "Users can create own mcp servers" on public.aas_mcp_servers;
drop policy if exists "Users can update own mcp servers" on public.aas_mcp_servers;
drop policy if exists "Users can delete own mcp servers" on public.aas_mcp_servers;

create policy "Users can read own mcp servers"
  on public.aas_mcp_servers for select
  using (user_id = auth.uid());

create policy "Users can create own mcp servers"
  on public.aas_mcp_servers for insert
  with check (user_id = auth.uid());

create policy "Users can update own mcp servers"
  on public.aas_mcp_servers for update
  using (user_id = auth.uid());

create policy "Users can delete own mcp servers"
  on public.aas_mcp_servers for delete
  using (user_id = auth.uid());
