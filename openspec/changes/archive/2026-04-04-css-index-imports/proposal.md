## Why

`app.src.css` listet alle Token-Dateien manuell als `@import` auf. Wenn `css-generate` neue Token-Dateien erzeugt, muss `app.src.css` von Hand nachgepflegt werden — das ist fehleranfällig und widerspricht dem Ziel, dass der Workflow die CSS-Ausgabe vollständig verwaltet.

## What Changes

- Neuer Task `generate-index` im `css-generate`-Workflow: erzeugt nach dem CSS-Transform `css/tokens/index.src.css` mit einem `@import` pro generierter Token-Datei
- `css-generate` Workflow erhält eine neue Stage `index` nach der `transform`-Stage
- `app.src.css` in `test-integration-drupal` importiert nur noch `./tokens/index.src.css` statt jeder Token-Datei einzeln

## Capabilities

### New Capabilities

- `css-token-index`: Die `css-generate`-Pipeline erzeugt automatisch `css/tokens/index.src.css`, das alle generierten Token-Dateien per `@import` sammelt. `app.src.css` verweist nur noch auf diese eine Datei.

### Modified Capabilities

- `css-generate-stages`: Neue Stage `index` wird nach `transform` ausgeführt. Die Anforderung „update `app.src.css` imports" entfällt — stattdessen wird `index.src.css` generiert.

## Impact

- `.agents/skills/designbook/css-generate/tasks/` — neuer Task `generate-index.md`
- `.agents/skills/designbook/css-generate/workflows/css-generate.md` — neue Stage `index`
- `packages/integrations/test-integration-drupal/css/app.src.css` — Token-Imports durch `@import "./tokens/index.src.css"` ersetzen
- `workspaces/drupal/css/app.src.css` — gleiche Anpassung
