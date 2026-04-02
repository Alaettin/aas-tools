-- ============================================
-- Docs Feature — Supabase Setup
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

-- 1. Manuals (ein Eintrag = ein Doc in der Sidebar)
create table if not exists public.doc_manuals (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  title text not null,
  description text,
  icon text not null default 'BookOpen',
  icon_color text not null default 'text-accent',
  sort_order int not null default 0,
  created_by uuid references auth.users not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.doc_manuals enable row level security;

-- 2. Pages (Kapitel/Seiten mit Baumstruktur)
create table if not exists public.doc_pages (
  id uuid default gen_random_uuid() primary key,
  manual_id uuid references public.doc_manuals on delete cascade not null,
  parent_id uuid references public.doc_pages on delete cascade,
  title text not null,
  slug text not null,
  content text not null default '',
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(manual_id, parent_id, slug)
);

create index if not exists idx_doc_pages_manual_parent
  on public.doc_pages(manual_id, parent_id);

alter table public.doc_pages enable row level security;

-- 3. User Doc Access (spiegelt user_tool_access)
create table if not exists public.user_doc_access (
  user_id uuid references auth.users on delete cascade not null,
  manual_id uuid references public.doc_manuals on delete cascade not null,
  primary key (user_id, manual_id)
);

alter table public.user_doc_access enable row level security;

-- 4. updated_at Trigger für doc_manuals
drop trigger if exists on_doc_manual_updated on public.doc_manuals;
create trigger on_doc_manual_updated
  before update on public.doc_manuals
  for each row execute function public.handle_updated_at();

-- 5. updated_at Trigger für doc_pages
drop trigger if exists on_doc_page_updated on public.doc_pages;
create trigger on_doc_page_updated
  before update on public.doc_pages
  for each row execute function public.handle_updated_at();

-- ============================================
-- RLS Policies
-- ============================================

-- doc_manuals: Admins CRUD
create policy "Admins can read all manuals"
  on public.doc_manuals for select
  using (public.is_admin());

create policy "Admins can insert manuals"
  on public.doc_manuals for insert
  with check (public.is_admin());

create policy "Admins can update manuals"
  on public.doc_manuals for update
  using (public.is_admin());

create policy "Admins can delete manuals"
  on public.doc_manuals for delete
  using (public.is_admin());

-- doc_manuals: Users lesen nur freigegebene
create policy "Users can read accessible manuals"
  on public.doc_manuals for select
  using (
    exists (
      select 1 from public.user_doc_access
      where user_id = auth.uid() and manual_id = doc_manuals.id
    )
  );

-- doc_pages: Admins CRUD
create policy "Admins can read all pages"
  on public.doc_pages for select
  using (public.is_admin());

create policy "Admins can insert pages"
  on public.doc_pages for insert
  with check (public.is_admin());

create policy "Admins can update pages"
  on public.doc_pages for update
  using (public.is_admin());

create policy "Admins can delete pages"
  on public.doc_pages for delete
  using (public.is_admin());

-- doc_pages: Users lesen nur Seiten freigegebener Manuals
create policy "Users can read accessible pages"
  on public.doc_pages for select
  using (
    exists (
      select 1 from public.user_doc_access
      where user_id = auth.uid() and manual_id = doc_pages.manual_id
    )
  );

-- user_doc_access: Admins CRUD
create policy "Admins can read doc access"
  on public.user_doc_access for select
  using (public.is_admin());

create policy "Admins can insert doc access"
  on public.user_doc_access for insert
  with check (public.is_admin());

create policy "Admins can delete doc access"
  on public.user_doc_access for delete
  using (public.is_admin());

-- user_doc_access: Users lesen eigene Rows
create policy "Users can read own doc access"
  on public.user_doc_access for select
  using (user_id = auth.uid());

-- ============================================
-- Storage Bucket für Doc-Bilder
-- ============================================

insert into storage.buckets (id, name, public)
  values ('doc-images', 'doc-images', true)
  on conflict (id) do nothing;

create policy "Admins can upload doc images"
  on storage.objects for insert
  with check (bucket_id = 'doc-images' and public.is_admin());

create policy "Anyone authenticated can view doc images"
  on storage.objects for select
  using (bucket_id = 'doc-images' and auth.role() = 'authenticated');

create policy "Admins can delete doc images"
  on storage.objects for delete
  using (bucket_id = 'doc-images' and public.is_admin());
