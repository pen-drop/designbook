## Why

Validation ist aktuell kein integrierter Teil des Workflow-Systems. Skills rufen separate CLI-Befehle (`validate component`, `validate story`) auf, deren Output nicht nachverfolgbar ist und der Storybook-Panel zeigt keinen Validierungsstatus. Gleichzeitig ist `validate story` zu komplex (vitest + Browser) und zu wenig framework-agnostisch. Das Ziel: Validation wird Teil des Workflow-Lifecycles — jeder Task kennt seine Files und deren Validierungsstatus.

## What Changes

- **WorkflowTask** bekommt `files[]` (betroffene Dateien, relativ zum Designbook-Ordner) und `validation_status` + `validation_results[]`
- **`workflow update --status done --files [...]`** triggert Validation automatisch und gibt JSON-Results zurück — Skills warten synchron auf das Ergebnis
- **Neuer `workflow validate <name> <task-id>`** Befehl zum manuellen Neu-Triggern der Validation (nach einem Fix)
- **`/__validate` HTTP-Endpoint** im Vite-Plugin (`configureServer`) — wird von `workflow update/validate` für Story-Files aufgerufen wenn Storybook läuft; andernfalls `skipped`
- **Alle anderen Validators** (component.yml, data-model, tokens, data, view-mode) laufen direkt in Node.js, kein Storybook nötig
- **`validate [name]`** bleibt als standalone CLI-Befehl für manuelle Nutzung
- **BREAKING**: `validate story` entfernt vitest/Playwright-Spawn, wird intern durch HTTP-Endpoint ersetzt
- **`designbook-component-validate` Skill** wird ersetzt — jeder Skill fixt seine eigenen Files und nutzt `workflow validate` zum Re-triggern
- Alle Skills werden so angepasst dass sie `--files` beim `workflow update` mitgeben
- Fix: `buildExportName` em-dash Bug im dist

## Capabilities

### New Capabilities

- `validate-view-mode`: CLI-Command der `.jsonata`-Files gegen Sample-Daten ausführt und `ComponentNode[]` Output prüft

### Modified Capabilities

- `story-validation`: Vitest/Playwright entfernt, ersetzt durch `/__validate` HTTP-Endpoint auf dem laufenden Storybook Vite-Server. Output ist JSON `{ valid, label, html?, error? }`.
- `addon-cli-validation`: Alle `validate`-Commands geben JSON aus. Neues `validate view-mode`. Validation ist integriert in `workflow update`.
- `workflow-tracking-convention`: `WorkflowTask` bekommt `files`, `validation_status`, `validation_results`. `workflow update` triggert Validation. Neuer `workflow validate` Command.

## Impact

- `packages/storybook-addon-designbook/src/workflow-types.ts` — neue Felder in `WorkflowTask`
- `packages/storybook-addon-designbook/src/workflow.ts` — `workflowUpdate` triggert Validation
- `packages/storybook-addon-designbook/src/cli.ts` — `workflow update` bekommt `--files`, neuer `workflow validate` Command, JSON-Output für alle `validate`-Commands
- `packages/storybook-addon-designbook/src/vite-plugin.ts` — neuer `/__validate` Middleware in `configureServer`
- `packages/storybook-addon-designbook/src/validators/` — neues `view-mode.ts`
- Alle Skills die `workflow update` aufrufen — `--files` hinzufügen
- `designbook-component-validate` Skill — deprecated, durch Skill-eigenen Fix-Loop ersetzt
