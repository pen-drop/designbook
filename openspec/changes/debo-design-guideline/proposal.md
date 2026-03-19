## Why

Design-System-Workflows haben heute keinen gemeinsamen Ausgangspunkt für Designentscheidungen. Welche Skills genutzt werden, welche Naming-Conventions gelten, welche Figma-Referenzen existieren — all das ist implizit oder wiederholt sich in jedem Workflow-Dialog neu. Eine persistente `guidelines.yml` gibt allen Design-Workflows einen gemeinsamen Startpunkt und macht Designentscheidungen explizit, versionierbar und sichtbar.

## What Changes

- Neuer Workflow `debo-design-guideline` — führt den User durch einen Dialog zur Erfassung von Design-Skills, Naming-Conventions, Referenzen und Prinzipien
- Neues File `$DESIGNBOOK_DIST/design-system/guidelines.yml` — persistiert die Guideline-Entscheidungen
- Alle Design-System-Workflows (`debo-design-tokens`, `debo-design-component`, `debo-design-screen`, `debo-design-shell`) erhalten `reads: design-system/guidelines.yml` in ihren Task-File-Frontmatters — sie prüfen die Datei vor Ausführung und laden die konfigurierten Skills automatisch
- Neuer "Guidelines"-Tab im Design-System-UI — erscheint vor dem Token-Tab, zeigt die guidelines.yml als lesbare Übersicht
- Dashboard: neues Badge für `design-system/guidelines.yml`

## Capabilities

### New Capabilities

- `design-guidelines`: Der `debo-design-guideline` Workflow + `guidelines.yml` Dateiformat — Dialog, Validierung, Skill-Auto-Loading via `reads:`, Tab-Anzeige im Design System

### Modified Capabilities

- `design-system-react-components`: Neuer Guidelines-Tab vor dem Token-Tab im Design-System-UI
- `dashboard-page`: Neues Badge für `design-system/guidelines.yml` in der Design-System StatusBox
- `design-system-workflow`: `debo-design-tokens`-Workflow und verwandte Workflows erhalten `reads:` dependency auf guidelines.yml

## Impact

- Neue Skill-Files: `.claude/skills/debo-design-guideline/`, `.claude/skills/designbook-guidelines/`
- Geänderte Task-Files: alle design-system-relevanten workflow task files
- React-Komponenten: Design-System-Tab-Komponente erweitert
- Dashboard-API: `/__designbook/status` liefert guidelines-Badge-Status
