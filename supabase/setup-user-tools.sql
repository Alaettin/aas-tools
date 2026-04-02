-- ============================================
-- User Tool Access — Supabase Setup
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

create table if not exists public.user_tool_access (
  user_id uuid references auth.users on delete cascade not null,
  tool_id text not null,
  primary key (user_id, tool_id)
);

alter table public.user_tool_access enable row level security;

create policy "Admins can read tool access"
  on public.user_tool_access for select
  using (public.is_admin());

create policy "Admins can insert tool access"
  on public.user_tool_access for insert
  with check (public.is_admin());

create policy "Admins can delete tool access"
  on public.user_tool_access for delete
  using (public.is_admin());

-- Users can read their own tool access
create policy "Users can read own tool access"
  on public.user_tool_access for select
  using (user_id = auth.uid());
