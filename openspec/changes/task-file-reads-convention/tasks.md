## 1. designbook-addon-skills — Konvention dokumentieren

- [x] 1.1 In `designbook-addon-skills/SKILL.md` `reads:` zum task file frontmatter template hinzufügen (nach `params:`, vor `files:`) mit Struktur (`path`, `workflow`) und Beschreibung
- [x] 1.2 AI-Regel hinzufügen: vor jedem Stage alle `reads:` Pfade prüfen — fehlt eine Datei → stop + "❌ `<file>` not found. Run `/<workflow>` first."
- [x] 1.3 `files:` Konvention dokumentieren: Pflicht-Prefix `$DESIGNBOOK_DIST/` oder `$DESIGNBOOK_DRUPAL_THEME/`, keine bare paths

## 2. designbook-workflow — AI Rules erweitern

- [x] 2.1 In `designbook-workflow/SKILL.md` eine neue AI Rule hinzufügen (nach der bestehenden "Task Execution" Rule): vor Ausführung eines Stage-Tasks `reads:` aus dem task file frontmatter lesen und alle Dateien prüfen — bei fehlendem File sofort stoppen mit dem Workflow-Hinweis

## 3. files: Pfade fixen — $DESIGNBOOK_DIST prefix

- [x] 3.1 `designbook-tokens/tasks/create-tokens.md` — `design-system/design-tokens.yml` → `$DESIGNBOOK_DIST/design-system/design-tokens.yml`
- [x] 3.2 `designbook-css-daisyui/tasks/create-tokens.md` — prefix hinzufügen
- [x] 3.3 `designbook-css-tailwind/tasks/create-tokens.md` — prefix hinzufügen (falls vorhanden)
- [x] 3.4 `designbook-css-daisyui/tasks/generate-jsonata.md` — alle 4 paths mit `$DESIGNBOOK_DIST/` prefixen
- [x] 3.5 `designbook-css-tailwind/tasks/generate-jsonata.md` — beide paths mit `$DESIGNBOOK_DIST/` prefixen
- [x] 3.6 `designbook-css-generate/tasks/generate-css.md` — `css/tokens/*.src.css` → `$DESIGNBOOK_DRUPAL_THEME/css/tokens/*.src.css`
- [x] 3.7 `designbook-css-generate/tasks/create-css.md` — paths mit `$DESIGNBOOK_DRUPAL_THEME/` prefixen
- [x] 3.8 `designbook-data-model/tasks/create-data-model.md` — `data-model.yml` → `$DESIGNBOOK_DIST/data-model.yml`
- [x] 3.9 `designbook-sample-data/tasks/create-sample-data.md` — `sections/{{ section_id }}/data.yml` → `$DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml`
- [x] 3.10 `designbook-view-modes/tasks/create-view-modes.md` — path mit `$DESIGNBOOK_DIST/` prefixen
- [x] 3.11 `designbook-scenes/tasks/create-shell-scene.md` — `design-system/design-system.scenes.yml` → `$DESIGNBOOK_DIST/design-system/design-system.scenes.yml`
- [x] 3.12 `designbook-scenes/tasks/create-scene.md` — path mit `$DESIGNBOOK_DIST/` prefixen

## 4. reads: hinzufügen — Tasks mit Abhängigkeiten

- [x] 4.1 `designbook-css-daisyui/tasks/generate-jsonata.md` — reads: `$DESIGNBOOK_DIST/design-system/design-tokens.yml` (workflow: `debo-design-tokens`)
- [x] 4.2 `designbook-css-tailwind/tasks/generate-jsonata.md` — reads: `$DESIGNBOOK_DIST/design-system/design-tokens.yml` (workflow: `debo-design-tokens`)
- [x] 4.3 `designbook-css-generate/tasks/generate-css.md` — reads: `$DESIGNBOOK_DIST/design-system/design-tokens.yml` (workflow: `debo-design-tokens`)
- [x] 4.4 `designbook-sample-data/tasks/create-sample-data.md` — reads: `$DESIGNBOOK_DIST/data-model.yml` (workflow: `debo-data-model`)
- [x] 4.5 `designbook-view-modes/tasks/create-view-modes.md` — reads: `$DESIGNBOOK_DIST/data-model.yml` (workflow: `debo-data-model`)
- [x] 4.6 `designbook-scenes/tasks/create-scene.md` — reads: `$DESIGNBOOK_DIST/data-model.yml` (workflow: `debo-data-model`)
