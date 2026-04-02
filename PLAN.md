# AAS Tools Platform — Projektplan

## Vision

Eine zentrale Plattform für verschiedene AAS (Asset Administration Shell) Tools. Zielgruppe: Entwickler, Integratoren und Unternehmen im Industrie 4.0 Umfeld, die mit AAS arbeiten.

## Tech Stack

| Komponente | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS (custom Design System) |
| Auth & Backend | Supabase (Auth, PostgreSQL, RLS) |
| Hosting | Vercel |
| Icons | Lucide React |

## Architektur

```
src/
├── components/
│   ├── layout/          # Shell, Sidebar, Header
│   ├── auth/            # Login, Register, AuthGuard
│   └── ui/              # Shared UI-Komponenten
├── pages/
│   ├── Dashboard.tsx
│   ├── UserManagement.tsx
│   └── Settings.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useUsers.ts
├── lib/
│   ├── supabase.ts      # Supabase Client
│   └── roles.ts         # Role-Definitionen
├── context/
│   └── AuthContext.tsx
└── types/
    └── index.ts
```

## Datenmodell (Supabase)

### Tabelle: `profiles`

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | uuid (FK → auth.users) | Primary Key |
| email | text | E-Mail |
| display_name | text | Anzeigename |
| role | text | `admin` oder `user` |
| avatar_url | text | Optional |
| created_at | timestamptz | Erstellt am |
| updated_at | timestamptz | Aktualisiert am |

### RLS Policies

- `profiles`: Jeder kann sein eigenes Profil lesen/updaten
- Admin kann alle Profile lesen und Rollen ändern
- Admin-Check: `role = 'admin'` in profiles

### Trigger

- `on_auth_user_created`: Erstellt automatisch ein Profil
- Wenn `email = 'alaettin87@gmail.com'` → `role = 'admin'`
- Alle anderen → `role = 'user'`

## Features (MVP)

### Phase 1 — Basis (aktuell)
- [x] Login / Register (Email + Passwort)
- [x] Auth Guard (geschützte Routen)
- [x] Dashboard Shell (Sidebar + Header)
- [x] User-Verwaltung (Admin-only)
- [x] Rollen-System (admin / user)
- [x] Profil-Einstellungen

### Phase 2 — Tools (nächster Schritt)
- [ ] Tool-Registry (Tools als Module registrieren)
- [ ] Tool-Marketplace / Übersicht
- [ ] Tool-spezifische Routen
- [ ] Usage Tracking

### Phase 3 — Erweiterung
- [ ] API Keys für externe Tool-Nutzung
- [ ] Team / Organisation Support
- [ ] Billing Integration

## Design System

- **Theme**: Dark-First, Industrial Precision
- **Primary**: `#0A0F1C` (Deep Navy)
- **Surface**: `#111827` / `#1F2937`
- **Accent**: `#06B6D4` (Cyan 500)
- **Text**: `#F9FAFB` / `#9CA3AF`
- **Font Display**: JetBrains Mono (Headings, Code)
- **Font Body**: DM Sans (Body Text)
- **Border Radius**: 2px–6px (sharp, nicht rounded)
- **Borders**: 1px `#1F2937`, Accent-Glow auf Fokus
