# Skill: Design System — AAS Tools Platform

## Identität

Die Plattform vermittelt **technische Präzision** und **industrielle Klarheit**. Das Design orientiert sich an Engineering-Tools, Monitoring-Dashboards und industriellen HMIs — nicht an Consumer-SaaS.

## Farbpalette

```css
:root {
  /* Backgrounds */
  --bg-primary: #0A0F1C;      /* App Background */
  --bg-surface: #111827;       /* Cards, Sidebar */
  --bg-elevated: #1F2937;      /* Hover States, Modals */
  --bg-input: #0D1321;         /* Input Fields */

  /* Accent */
  --accent: #06B6D4;           /* Cyan — CTAs, Active States */
  --accent-hover: #22D3EE;     /* Cyan Light */
  --accent-muted: #083344;     /* Cyan sehr dunkel — Hintergründe */

  /* Status */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;

  /* Text */
  --text-primary: #F9FAFB;
  --text-secondary: #9CA3AF;
  --text-muted: #4B5563;

  /* Borders */
  --border: #1F2937;
  --border-hover: #374151;
  --border-accent: #06B6D4;
}
```

## Typografie

| Rolle | Font | Gewicht | Größe |
|---|---|---|---|
| H1 | JetBrains Mono | 700 | 28px |
| H2 | JetBrains Mono | 600 | 22px |
| H3 | JetBrains Mono | 600 | 18px |
| Body | DM Sans | 400 | 14px |
| Body Small | DM Sans | 400 | 13px |
| Label | DM Sans | 500 | 12px, uppercase, tracking-wider |
| Code | JetBrains Mono | 400 | 13px |

## Spacing

- Basis: 4px Grid
- Section Padding: 24px
- Card Padding: 20px
- Element Gap: 12px–16px
- Sidebar Width: 260px
- Header Height: 64px

## Komponenten-Regeln

### Buttons
- Primary: `bg-accent`, `text-bg-primary`, sharp corners (rounded-sm)
- Secondary: `border border-border`, transparent background
- Ghost: Kein Border, nur Hover-State
- Kein `rounded-full` — immer `rounded-sm` oder `rounded`

### Cards
- `bg-surface`, `border border-border`, `rounded` (6px)
- Kein Shadow — stattdessen Border für Tiefe
- Hover: `border-border-hover` Transition

### Inputs
- `bg-input`, `border border-border`, `rounded-sm`
- Focus: `border-accent` mit `ring-1 ring-accent/30`
- Placeholder: `text-muted`

### Sidebar
- Fixed left, `bg-surface`, `border-r border-border`
- Nav Items: 40px Höhe, `rounded-sm`, Icon + Label
- Active: `bg-accent-muted`, `text-accent`, linker 2px Accent-Border
- Hover: `bg-elevated`

### Table (User-Verwaltung)
- Keine Zebra-Stripes — einheitlicher `bg-surface`
- Header: `text-secondary`, `uppercase`, `text-xs`, `tracking-wider`
- Row Hover: `bg-elevated`
- Kein horizontales Scrolling — responsive Spalten

## Do & Don't

### Do
- Monospace für Zahlen, IDs, technische Werte
- Subtle Grid-Pattern oder Dot-Pattern als Hintergrund-Textur
- Accent-Farbe NUR für interaktive Elemente
- Scharfe Kanten — das ist ein Engineering-Tool
- Statusfarben konsistent nutzen

### Don't
- Keine Gradients auf Buttons oder Cards
- Keine Emoji in der UI
- Keine rounded-full (außer Avatare)
- Keine bunten Illustrationen
- Kein Purple — das ist der generische AI-Look
- Keine Schatten — Borders stattdessen
