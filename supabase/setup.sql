-- ============================================
-- AAS Tools Platform — Supabase Setup
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

-- 1. Profiles Tabelle
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. RLS aktivieren
alter table public.profiles enable row level security;

-- 3. Helper-Funktion für Admin-Check (SECURITY DEFINER umgeht RLS-Rekursion)
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- 4. RLS Policies

-- Jeder kann sein eigenes Profil lesen
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins können alle Profile lesen
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Jeder kann sein eigenes Profil updaten (aber nicht die Rolle)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins können alle Profile updaten (inkl. Rolle)
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

-- Admins können Profile löschen
create policy "Admins can delete profiles"
  on public.profiles for delete
  using (public.is_admin());

-- 4. Trigger: Profil automatisch erstellen bei Registrierung
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case
      when new.email = 'alaettin87@gmail.com' then 'admin'
      else 'user'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger nur erstellen wenn noch nicht vorhanden
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Trigger: updated_at automatisch setzen
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();
