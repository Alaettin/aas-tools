# AAS Editor — Plan

## Vision

Visueller Canvas-Editor für Asset Administration Shell (AAS) Dokumente. Per Drag & Drop AAS-Strukturen erstellen, bearbeiten, importieren (JSON/XML/AASX) und exportieren. Basiert auf dem bestehenden AAS Editor Projekt — ohne AI und ohne API-Publishing.

## Tech Stack

| Komponente | Technologie |
|---|---|
| Canvas | React Flow v12 |
| State | Zustand + Zundo (Undo/Redo) |
| Validierung | aas-core3.0-typescript |
| Import/Export | fast-xml-parser, JSZip |
| Layout | Dagre (Auto-Layout) |

## Datenmodell

### aas_projects
| Spalte | Typ | Beschreibung |
|---|---|---|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK → auth.users) | Owner |
| name | text | Projektname |
| canvas_data | jsonb | React Flow Nodes + Edges + AAS-Daten |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## Features

### Sprint 1 — Basis + Projektmanagement
- [ ] Tool-Ordner + Registry-Eintrag
- [ ] Supabase: aas_projects Tabelle + RLS
- [ ] Projekt-Liste (Grid mit Cards)
- [ ] Projekt erstellen, umbenennen, löschen
- [ ] Editor-Layout (Explorer links, Canvas mitte, Detail rechts)
- [ ] Canvas mit React Flow (leerer Viewport + Grid + Minimap)

### Sprint 2 — Node-System
- [ ] AAS Types übernehmen
- [ ] 4 Custom Nodes: Shell, Submodel, SME, ConceptDescription
- [ ] Toolbar: AAS/Submodel erstellen
- [ ] Drag & Connect Edges
- [ ] Inline-Editing (idShort, id)
- [ ] Kontext-Menü

### Sprint 3 — Panels
- [ ] Explorer Panel (Baumansicht)
- [ ] Detail Panel (Property-Editor)
- [ ] Expandable Collections
- [ ] valueType Dropdown, value Input

### Sprint 4 — Import/Export
- [ ] JSON Import/Export (AAS V3 Part 5)
- [ ] XML Import/Export
- [ ] AASX Import/Export
- [ ] Drop-Zone + Dagre Auto-Layout
- [ ] Export-Dialog

### Sprint 5 — Validierung + Polish
- [ ] aas-core3.0-typescript Validierung
- [ ] Live-Validation auf Nodes
- [ ] Undo/Redo (Zundo)
- [ ] Auto-Save + Ctrl+S
- [ ] Keyboard Shortcuts

## UI Konzept

### Projekt-Liste
```
┌──────────┐  ┌──────────┐  ┌────────┐
│ Projekt A │  │ Projekt B │  │   +    │
│ 27.03.26  │  │ 25.03.26  │  │  Neu   │
└──────────┘  └──────────┘  └────────┘
```

### Editor
```
┌─────────────────────────────────────────┐
│  ← AAS Editor > Projekt A    [Save]    │
├──────────┬──────────────────┬───────────┤
│ Explorer │ Canvas           │ Detail    │
│ Panel    │ + Toolbar        │ Panel     │
│ (Tree)   │ (React Flow)     │ (Props)   │
└──────────┴──────────────────┴───────────┘
```
