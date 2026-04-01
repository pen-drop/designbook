## Context

Der `css-generate`-Workflow erzeugt pro Token-Gruppe eine `.src.css`-Datei in `css/tokens/`. Diese Dateien werden bisher **nicht** automatisch in `app.src.css` eingetragen — stattdessen ist die Liste der Imports dort statisch gepflegt. Das führt dazu, dass nach einem `css-generate`-Lauf neue Token-Dateien in `app.src.css` manuell nachgetragen werden müssen.

Bestehende Stage-Kette: `intake` → `generate` (pro Gruppe: generate-jsonata) → `transform` (generate-css: führt alle .jsonata aus)

## Goals / Non-Goals

**Goals**
- Nach `css-generate` ist `css/tokens/index.src.css` automatisch aktuell
- `app.src.css` pflegt keine Token-Import-Liste mehr
- Die neue Stage passt nahtlos in die bestehende `css-generate`-Architektur

**Non-Goals**
- Keine Glob-Unterstützung in CSS (weder Vite noch Tailwind v4 unterstützen das nativ)
- Kein Umbau der `app.src.css`-Struktur jenseits der Token-Imports
- Keine Änderung am Plugin-Import (bleibt in `app.src.css`)

## Decisions

### Entscheidung: Neue Stage `index` statt Erweiterung von `generate-css`

`generate-css` ist als generischer, framework-unabhängiger Transform-Schritt definiert. Den Index-Generator dort einzubauen würde ihn mit Filesystem-Logik überladen.

**Alternative**: Index-Generierung in `generate-css` integrieren.
**Verworfen weil**: Verletzt Single-Responsibility des Tasks; Index-Generierung ist keine Transform-Operation.

### Entscheidung: `index.src.css` ohne `_`-Präfix

Die Datei soll vom Vite-Glob `css/**/[!_]*.src.css` erfasst werden und als eigener Build-Output existieren (`dist/css/tokens/index.css`). So bleibt sie auch für Projekte nutzbar, die nur die Token-CSS ohne `app.css` einbinden möchten.

**Alternative**: `_index.src.css` mit Underscore-Präfix (nur per Import erreichbar).
**Verworfen weil**: Verliert den Wert als eigenständiger Output.

### Entscheidung: Task liest `css/tokens/`-Verzeichnis zur Laufzeit

Der Index-Task liest alle vorhandenen `*.src.css`-Dateien in `css/tokens/` (außer `index.src.css` selbst) und generiert daraus die `@import`-Liste. Keine statische Konfiguration nötig.

## Risks / Trade-offs

- **[Risiko] Dateireihenfolge**: `@import`-Reihenfolge in `index.src.css` hängt von der Verzeichnisliste ab. Cascading-Konflikte zwischen Token-Dateien sind unwahrscheinlich (Token-Dateien deklarieren nur Custom Properties), aber theoretisch möglich. → Mitigation: Alphabetische Sortierung macht die Reihenfolge stabil und vorhersagbar.
- **[Risiko] `index.src.css` wird mitgebaut**: Als Vite-Entry-Point wird `tokens/index.css` in `dist/` ausgegeben. Das ist gewollt, aber Teams müssen wissen, dass diese Datei nicht für direkten Browser-Einsatz gedacht ist (sie enthält nur `@import`-Anweisungen, die nach dem Build aufgelöst sind). → Kein Handlungsbedarf.

## Migration Plan

1. Neuen Task `generate-index.md` in `designbook/css-generate/tasks/` anlegen
2. Stage `index` in `css-generate.md`-Workflow nach `transform` eintragen
3. `css/tokens/index.src.css` in `test-integration-drupal` und `workspaces/drupal` initial anlegen (oder beim nächsten `css-generate`-Lauf automatisch erzeugen)
4. `app.src.css` in beiden Workspaces: individuelle Token-Imports durch `@import "./tokens/index.src.css"` ersetzen

Rollback: `index.src.css` löschen, individuelle Imports in `app.src.css` wiederherstellen.

## Open Questions

- Soll `index.src.css` auch `@import` für `plugins/`-Dateien übernehmen, oder bleibt der Plugin-Import in `app.src.css`? (Aktuell: nur `tokens/` — Plugins bleiben in `app.src.css`.)
