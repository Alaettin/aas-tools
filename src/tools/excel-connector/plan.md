# Excel Connector — Plan

## Vision
Excel-Datei als Live-Backend für einen DTI Connector. User bearbeitet Excel im Browser (Univer), API liest die Datei direkt aus Supabase Storage. Gleiche API-Endpoints wie der DTI Connector.

## Excel-Format (transponiert)
- Spalte A = Element-Name (mit EN:/DE: Prefix für Sprache)
- Spalte B = Type (Property / Document)
- Spalten C+ = Assets (Header = Asset-ID)
- Hierarchy-Block oben (zwischen "Hierarchy levels" Marker und Leerzeile)
- Document-Werte = Dateiname aus documents/ Ordner

## Features
### Sprint 1 — Basis + File Manager
- [ ] Connector CRUD (Liste, Erstellen, Löschen)
- [ ] Tab-Layout: Excel | Documents | API
- [ ] Documents Tab: Upload, Download, Delete, Preview

### Sprint 2 — Spreadsheet Editor (Univer)
- [ ] Excel laden/bearbeiten/speichern im Browser

### Sprint 3 — API (Edge Function)
- [ ] Gleiche Endpoints wie DTI Connector
- [ ] Excel live parsen bei jedem Request

### Sprint 4 — Polish
- [ ] Drag & Drop, Validierung, Auto-Save
