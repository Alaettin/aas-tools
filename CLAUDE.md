# CLAUDE.md — AAS Tools Platform

## Projekt-Kontext

Dies ist eine Plattform für AAS (Asset Administration Shell) Tools im Industrie 4.0 Umfeld. Die App wird mit React + TypeScript + Supabase gebaut.

## Wichtige Regeln

### Auth & Rollen
- Supabase Auth mit Email/Passwort
- `alaettin87@gmail.com` ist IMMER Admin (wird über DB-Trigger gesetzt)
- Zwei Rollen: `admin` und `user`
- Admin-Prüfung läuft über `profiles.role`, NICHT über Supabase Auth Metadata
- RLS Policies schützen alle Daten serverseitig

### Code-Konventionen
- TypeScript strict mode
- Funktionale Komponenten mit Hooks
- Kein `any` — immer typisieren
- Named Exports für Komponenten
- Barrel Exports (`index.ts`) pro Ordner
- Error Boundaries um Tool-Komponenten

### Design-System
- Dark-First Design, KEIN helles Theme als Default
- Farben NUR über CSS Custom Properties / Tailwind Config
- Font: JetBrains Mono (Display), DM Sans (Body)
- Keine Standard-Tailwind-Farben direkt nutzen — immer semantic tokens
- Border-Radius: scharf (2px–6px), keine `rounded-full` außer Avatare
- Akzente sparsam einsetzen — Cyan nur für CTAs und aktive States

### Supabase
- Client in `src/lib/supabase.ts`
- Typen aus Supabase CLI generieren wenn möglich
- RLS Policies IMMER aktiv — kein `service_role` Key im Frontend
- Realtime nur wenn nötig (User-Liste braucht kein Realtime)

### Routing
- React Router v6
- Protected Routes über `<AuthGuard>` Wrapper
- Admin Routes über `<AdminGuard>` Wrapper
- Lazy Loading für Tool-Seiten (spätere Phase)

### Ordnerstruktur
```
src/
├── components/layout/    # App Shell
├── components/auth/      # Auth-Komponenten
├── components/ui/        # Shared UI
├── pages/                # Route-Seiten
├── hooks/                # Custom Hooks
├── lib/                  # Supabase, Utils
├── context/              # React Context
└── types/                # TypeScript Types
```

### Was NICHT machen
- Keine unnötigen npm packages — Tailwind + Lucide reichen für UI
- Kein State Management Library (Context + Hooks reichen)
- Keine Tests in Phase 1 (kommt später)
- Keine i18n in Phase 1 (Deutsch-only ist ok)
- Keine Over-Engineering — YAGNI Prinzip

## Supabase Setup

### SQL für Tabellen und Trigger

```sql
-- Profiles Tabelle
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS aktivieren
alter table public.profiles enable row level security;

-- Policies
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Trigger: Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case when new.email = 'alaettin87@gmail.com' then 'admin' else 'user' end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at Trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();
```

## Skill-Referenz

- `skills/workflow.md` — Workflow Orchestration (Plan Mode, Subagents, Self-Improvement, Verification)
- `skills/tool-integration.md` — Wie neue Tools eingebunden werden
- `skills/supabase-patterns.md` — Supabase Best Practices
- `skills/design-system.md` — UI/UX Richtlinien
