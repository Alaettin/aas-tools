# Skill: Tool Integration — AAS Tools Platform

## Konzept

Jedes AAS-Tool ist ein eigenständiges Modul unter `src/tools/{tool-id}/`. Tools haben eigene Komponenten, Hooks, Types und optional eigene Supabase-Tabellen. Die zentrale Registry in `src/tools/registry.ts` steuert Routing, Sidebar und Tools-Übersicht automatisch.

## Tool-Ordnerstruktur

```
src/tools/
├── registry.ts                    # Zentrale Tool-Registry
└── {tool-id}/                     # z.B. "aas-viewer"
    ├── plan.md                    # Feature-Spec + Sprints (Pflicht!)
    ├── index.tsx                  # Hauptkomponente (default export, lazy-loaded)
    ├── routes.tsx                 # Tool-interne Sub-Routen (optional)
    ├── components/                # Tool-spezifische Komponenten
    ├── hooks/                     # Tool-spezifische Hooks
    ├── lib/                       # Tool-spezifische Utils/API
    ├── types.ts                   # Tool-spezifische Types
    └── supabase/
        └── setup.sql              # Tool-eigene Tabellen + RLS Policies
```

## Tool-Registry (`src/tools/registry.ts`)

```typescript
import { lazy } from 'react';
import type { ToolDefinition } from './registry';

export const tools: ToolDefinition[] = [
  {
    id: 'mein-tool',
    name: 'Mein Tool',
    description: 'Beschreibung...',
    icon: 'Wrench',
    status: 'active',
    requiredRole: 'user',
    component: lazy(() => import('./mein-tool')),
  },
];
```

## Automatisches Routing

- Aktive Tools (`status !== 'coming_soon'`) bekommen automatisch eine Route: `/tools/{tool-id}/*`
- `/*` erlaubt Tool-interne Sub-Routen
- Lazy Loading mit `<Suspense>` + `<ToolSkeleton />` Fallback
- `coming_soon` Tools erscheinen in der Übersicht aber haben keine Route

## Sidebar-Integration

Aktive Tools erscheinen automatisch in der Sidebar unter dem Abschnitt "Tools":

```
── Navigation ──
Dashboard
Tools
── Tools ──          ← nur wenn aktive Tools existieren
Mein Tool
Anderes Tool
── System ──
Benutzer (Admin)
Einstellungen
```

## Shared UI-Komponenten (`src/components/tools/`)

| Komponente | Zweck |
|---|---|
| `ToolHeader` | Breadcrumb + Titel + Beschreibung |
| `ToolSkeleton` | Loading-Fallback für Suspense |
| `ToolCard` | Karte für die Tools-Übersicht |

## plan.md Template

Jedes Tool braucht eine `plan.md`:

```markdown
# {Tool-Name} — Plan

## Vision
## Tech Stack
## Datenmodell
## Features (Sprint 1, Sprint 2, ...)
## UI Konzept
## API (optional)
```

## Neues Tool hinzufügen — Checkliste

1. Ordner `src/tools/{tool-id}/` erstellen
2. `plan.md` schreiben (Feature-Spec + Sprints)
3. `index.tsx` mit Hauptkomponente (default export)
4. Tool in `src/tools/registry.ts` registrieren
5. Optional: `supabase/setup.sql` für Tool-eigene Tabellen
6. Optional: `routes.tsx` für Sub-Routen
7. Testen: Tool erscheint in Übersicht + Sidebar, Route funktioniert
