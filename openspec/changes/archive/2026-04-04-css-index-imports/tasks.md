## 1. Skill — neuer generate-index Task

- [x] 1.1 `designbook/css-generate/tasks/generate-index.md` anlegen: liest alle `*.src.css` in `css/tokens/` (außer `index.src.css`), schreibt `css/tokens/index.src.css` mit alphabetisch sortierten `@import`-Einträgen
- [x] 1.2 `css-generate.md` Workflow-Frontmatter: neue Stage `index` mit `steps: [generate-index]` nach der `transform`-Stage eintragen

## 2. Skill — generate-css Task bereinigen

- [x] 2.1 `generate-css.md`: Hinweis entfernen, dass `app.src.css` manuell aktualisiert werden soll (falls vorhanden); Task beschreibt nur noch: run `.jsonata`, verify outputs

## 3. Integration — test-integration-drupal

- [x] 3.1 `packages/integrations/test-integration-drupal/css/tokens/index.src.css` initial anlegen mit `@import` für alle vorhandenen Token-Dateien
- [x] 3.2 `packages/integrations/test-integration-drupal/css/app.src.css`: individuelle Token-Imports durch `@import "./tokens/index.src.css"` ersetzen

## 4. Integration — workspaces/drupal

- [x] 4.1 `workspaces/drupal/css/tokens/index.src.css` initial anlegen
- [x] 4.2 `workspaces/drupal/css/app.src.css`: individuelle Token-Imports durch `@import "./tokens/index.src.css"` ersetzen
