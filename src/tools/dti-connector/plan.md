# DTI Connector — Plan

## Vision

Ein Tool zur Verwaltung von DTI (Digital Type Information) Daten im AAS-Umfeld. Nutzer können Connectors erstellen, Produkt-Hierarchien definieren, Datenmodelle konfigurieren, Dateien hochladen und Assets mit Werten pflegen. Eine externe REST-API ermöglicht den Zugriff auf die Daten durch Drittsysteme.

Basiert auf dem bewährten DTI Connector aus dem Kanban-Projekt — als React + Supabase Rewrite mit optimierter UI.

## Tech Stack

| Komponente | Technologie |
|---|---|
| Frontend | React 18 + TypeScript |
| Backend | Supabase (PostgreSQL, RLS, Storage) |
| File Storage | Supabase Storage (Bucket: `dti-files`) |
| External API | Supabase Edge Functions |
| Drag & Drop | Native HTML5 DnD API |
| Icons | Lucide React |

## Datenmodell

### dti_connectors
| Spalte | Typ | Beschreibung |
|---|---|---|
| connector_id | uuid (PK) | Auto-generated |
| user_id | uuid (FK → auth.users) | Owner |
| name | text | 1-100 Zeichen |
| api_key | uuid (UNIQUE) | Für External API |
| created_at | timestamptz | Default now() |

### dti_hierarchy_levels
| Spalte | Typ | Beschreibung |
|---|---|---|
| connector_id | uuid (FK, CASCADE) | |
| level | integer | 1-basiert |
| name | text | Max 60, `[A-Za-z0-9_-]+` |
| PK | (connector_id, level) | |

### dti_model_datapoints
| Spalte | Typ | Beschreibung |
|---|---|---|
| connector_id | uuid (FK, CASCADE) | |
| dp_id | text | Max 120, `[a-zA-Z0-9._]+` |
| name | text | Optional |
| type | integer | 0=Property, 1=File |
| sort_order | integer | Reihenfolge |
| PK | (connector_id, dp_id) | |

### dti_files
| Spalte | Typ | Beschreibung |
|---|---|---|
| connector_id | uuid (FK, CASCADE) | |
| file_id | text | Max 120, `[a-zA-Z0-9._]+` |
| lang | text | 'en' oder 'de' |
| original_name | text | Upload-Dateiname |
| size | integer | Bytes |
| mime_type | text | Content-Type |
| storage_path | text | Pfad in Supabase Storage |
| created_at | timestamptz | |
| PK | (connector_id, file_id, lang) | |

### dti_assets
| Spalte | Typ | Beschreibung |
|---|---|---|
| connector_id | uuid (FK, CASCADE) | |
| asset_id | text | Max 120, `[A-Za-z0-9]+` |
| PK | (connector_id, asset_id) | |

### dti_asset_values
| Spalte | Typ | Beschreibung |
|---|---|---|
| connector_id | uuid (FK, CASCADE) | |
| asset_id | text | FK → dti_assets |
| key | text | Hierarchy-Level-Name oder Datapoint-ID |
| lang | text | 'en' oder 'de' |
| value | text | |
| PK | (connector_id, asset_id, key, lang) | |

### RLS Policies
- Alle Tabellen: `user_id = auth.uid()` (über JOIN auf dti_connectors)
- Storage: `{user_id}/` Prefix-basierte Policy

### Validierungsregeln
| Feld | Pattern | Max | Hinweis |
|---|---|---|---|
| Connector-Name | beliebig | 100 | Pflicht |
| Hierarchy-Level | `[A-Za-z0-9_-]+` | 60 | Min. 1 Level |
| Datapoint-ID | `[a-zA-Z0-9._]+` | 120 | Unique pro Connector |
| File-ID | `[a-zA-Z0-9._]+` | 120 | Unique pro Connector |
| Asset-ID | `[A-Za-z0-9]+` | 120 | Nur alphanumerisch |
| Sprache | en, de | — | Feste Liste |

## Features

### Sprint 1 — Connector Basis
- [ ] Tool-Ordner + Registry-Eintrag (`status: 'active'`)
- [ ] Supabase Setup: `dti_connectors` Tabelle + RLS
- [ ] **Connector-Liste** — Card-Grid
  - Erstellen (Name-Input + Button)
  - Umbenennen (Inline-Edit)
  - Löschen (mit Confirm-Dialog)
  - Card zeigt: Name, API-Key Preview, Datum
- [ ] **Connector-Detail** — Layout mit Sub-Navigation
  - Tab-Leiste: Hierarchy | Model | Files | Assets | Settings
  - Breadcrumb: DTI Connector > {Name} > {Tab}
- [ ] **Settings-Tab**
  - API-Key anzeigen (readonly, monospace)
  - Copy-Button
  - Regenerate-Button (mit Confirm)

### Sprint 2 — Hierarchy & Model
- [ ] Supabase Setup: `dti_hierarchy_levels`, `dti_model_datapoints`
- [ ] **Hierarchy-Editor**
  - Drag & Drop Sortierung
  - Level-Nummern (1, 2, 3…) automatisch
  - Inline-Edit Name (mit Validierung)
  - Add Level (am Ende)
  - Remove Level (mit Warnung: löscht Asset-Values)
  - Save (Confirm-Dialog)
- [ ] **Model-Editor**
  - Tabelle: #, ID, Name, Type
  - Inline-Edit für ID + Name
  - Type-Toggle: Property ↔ File
  - Suchfeld (Filter by ID/Name)
  - Add Datapoint
  - Bulk-Select + Delete
  - Save (Confirm-Dialog)

### Sprint 3 — Files
- [ ] Supabase Setup: `dti_files` + Storage Bucket `dti-files`
- [ ] **File-Liste**
  - Tabelle: File-ID | EN (Status) | DE (Status)
  - Status: ✓ (vorhanden, klickbar) oder — (fehlt)
  - Suchfeld
- [ ] **File Upload**
  - Add-Button → Modal: File-ID + Sprache + Datei wählen
  - Drag & Drop Zone
  - Max 50MB
  - Überschreibt existierende Version
- [ ] **File Preview/Download**
  - Bilder: Inline-Preview
  - Andere: Download-Link
- [ ] **File löschen** (alle Sprachversionen)

### Sprint 4 — Assets
- [ ] Supabase Setup: `dti_assets`, `dti_asset_values`
- [ ] **Asset-Liste**
  - Tabelle: #, Asset-ID
  - Suchfeld
  - Add Asset (Modal mit ID-Input)
  - Umbenennen
  - Löschen (einzeln + Bulk)
- [ ] **Asset-Detail** — 3 klar getrennte Sections:
  1. **Hierarchy-Werte**
     - Ein Feld pro Level (Label: Level-Name, Input: Wert)
     - Kompaktes vertikales Layout
  2. **Property-Werte**
     - Tabelle: Datapoint-ID | EN | DE
     - Suchfeld
     - Inline-Edit
  3. **File-Zuordnung**
     - Tabelle: Datapoint-ID (File-Type) | Zugeordnete Datei
     - Dropdown mit allen verfügbaren File-IDs
- [ ] Save (Confirm-Dialog)
- [ ] Validierung: Keys gegen Hierarchy + Model prüfen

### Sprint 5 — External API
- [ ] Supabase Edge Function: `/v1/{apiKey}/...`
- [ ] **Endpoints:**
  - `GET /Product/ids` — Alle Asset-IDs
  - `GET /Product/hierarchy/levels` — Hierarchy-Level
  - `GET /Product/:itemId/hierarchy` — Hierarchy-Werte eines Assets
  - `POST /Product/:itemId/values` — Datapoint-Werte (mit Sprachfilter)
  - `POST /Product/:itemId/documents` — File-Inhalte (Base64)
  - `GET /model` — Datenmodell
- [ ] API-Key Authentifizierung (Lookup in dti_connectors)
- [ ] API-Docs Seite (im Settings-Tab oder eigener Tab)

### Sprint 6 — Polish
- [ ] i18n: DE + EN (mit Locale-Switch)
- [ ] Loading States für alle async Operationen
- [ ] Error Handling mit Toast/Notifications
- [ ] Empty States für alle Listen
- [ ] Keyboard: Escape schließt Modals, Enter bestätigt
- [ ] Responsive: Mobile-taugliches Layout

## UI Konzept

### Connector-Liste
```
┌─────────────────────────────────────────┐
│  DTI Connector                          │
│  Verwalte deine DTI Connectors.         │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Prod DB  │  │ Test DB  │  │   +    ││
│  │ a3f2...  │  │ 7bc1...  │  │  Neu   ││
│  │ 27.03.26 │  │ 25.03.26 │  │        ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
```

### Connector-Detail
```
┌─────────────────────────────────────────┐
│  ← DTI Connector > Prod DB             │
│                                         │
│  [Hierarchy] [Model] [Files] [Assets]   │
│  ─────────────────────────────────────  │
│                                         │
│  {Aktiver Tab-Inhalt}                   │
│                                         │
└─────────────────────────────────────────┘
```

### Hierarchy-Editor
```
│  Hierarchy Levels                [Save] │
│                                         │
│  ☰  1  [Company___________]  ✕         │
│  ☰  2  [Division__________]  ✕         │
│  ☰  3  [Product___________]  ✕         │
│                                         │
│  [+ Level hinzufügen]                   │
```

### Asset-Detail
```
│  Asset: PUMP-001                        │
│                                         │
│  ── Hierarchy ──────────────────────── │
│  Company    [Siemens_________]          │
│  Division   [Digital Industries]        │
│  Product    [SIMATIC S7-1500__]         │
│                                         │
│  ── Properties ─────────── [Suche: __] │
│  #  ID              EN         DE       │
│  1  description     Pump unit  Pumpe    │
│  2  manufacturer    Siemens    Siemens  │
│                                         │
│  ── Files ──────────────────────────── │
│  #  ID              Datei               │
│  1  manual_pdf      [manual_v2 ▾]       │
│  2  datasheet       [spec_2024 ▾]       │
│                                         │
│                                 [Save]  │
```

## Ordnerstruktur

```
src/tools/dti-connector/
├── plan.md
├── index.tsx              # Router: Liste vs Detail
├── types.ts               # Connector, Level, Datapoint, Asset, File
├── components/
│   ├── ConnectorList.tsx   # Card-Grid
│   ├── ConnectorCard.tsx   # Einzelne Card
│   ├── ConnectorDetail.tsx # Tab-Layout
│   ├── HierarchyEditor.tsx # Drag & Drop Levels
│   ├── ModelEditor.tsx     # Datapoint-Tabelle
│   ├── FileManager.tsx     # File-Liste + Upload
│   ├── AssetList.tsx       # Asset-Tabelle
│   ├── AssetDetail.tsx     # 3-Section Editor
│   └── ConnectorSettings.tsx # API-Key
├── hooks/
│   ├── useConnectors.ts    # CRUD Connectors
│   ├── useHierarchy.ts     # CRUD Levels
│   ├── useModel.ts         # CRUD Datapoints
│   ├── useFiles.ts         # Upload/Delete/List
│   └── useAssets.ts        # CRUD Assets + Values
├── lib/
│   └── validation.ts       # Regex, Limits
└── supabase/
    └── setup.sql           # Tabellen + RLS + Storage
```
