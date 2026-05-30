# Region Properties — Refactor: Walker in die CLI, Integration prunen, Testbarkeit

**Date:** 2026-05-30
**Status:** Draft
**Supersedes (partial):** `2026-05-09-region-properties-design.md` — gleicher Feature-Kern (`region_properties`-Resolver), aber drei strukturelle Korrekturen.

## Motivation

Der bestehende `region_properties`-PR funktioniert (e2e gegen leando.de validiert), hat aber drei Schwächen:

1. **Ausführbare Logik liegt im Skill, nicht in der CLI.** `element-walker.js` liegt unter `.agents/skills/designbook/design/resources/`. Der Resolver (im addon-Paket) findet ihn zur Laufzeit per `locateWalker()` — 4-Kandidaten-Pfadraten — und lädt ihn via `import(file://)`. Jeder andere Resolver ist self-contained im addon. Nur dieser greift raus.
2. **Skill-Integration unscharf.** `region_properties` ist in `create-component` UND `create-scene` deklariert; in `create-scene` wird es jedoch nie konsumiert (Body referenziert es nicht). Drei Rules triggern auf beide Steps.
3. **Voller Pfad nur manuell testbar.** Walker-Unit (jsdom) + Resolver-Unit (gemocktes `CapturedSource`) existieren. Der echte Pfad (Browser → computed styles + bbox → `source.json` → `locateRegion`) ist nur manuell geprüft. Die area-basierte Tie-Break-Sortierung und der Visibility-Filter sind unter jsdom (null Layout) nicht testbar.

## Was unverändert bleibt

- **Feature-Verhalten.** Resolver-Output (`RegionProperties`), Schema, Cache unter `{reference_folder}/.element-tree/source.json`, Match-Strategien (role → heading → label → none).
- **`RegionProperties` / `PropertyNode` Schemas** in `designbook/design/schemas.yml`.
- **`extract-reference`, `extract.json`, Workflows** — kein Eingriff.

---

## Change 1 — Walker in die CLI (`src/inspect/`)

Ausführbare Logik wandert ins addon-Paket. `region-properties.ts` enthält heute drei vermischte Verantwortlichkeiten mit unterschiedlichen Abhängigkeiten; sie werden getrennt.

### Ziel-Layout

```
packages/storybook-addon-designbook/src/inspect/
  element-walker.ts     # walkDocument + PAGE_SCRIPT (browser-side)
  capture.ts            # runWalker + waitForReady (playwright SDK)
  region.ts             # locateRegion, descendantsOf, promoteToContainer,
                        #   pickRegionLabel, ROLE_HINTS (pure, kein Browser)
  __tests__/
src/resolvers/region-properties.ts   # dünn: orchestriert capture + region
```

### Umzug

| Von | Nach |
|---|---|
| `.agents/skills/designbook/design/resources/element-walker.js` | `src/inspect/element-walker.ts` |
| `region-properties.ts#runWalker` + `waitForReady` | `src/inspect/capture.ts` |
| `region-properties.ts#locateRegion` + `descendantsOf` + `promoteToContainer` + `pickRegionLabel` + `ROLE_HINTS` | `src/inspect/region.ts` |

### Gelöscht

- `locateWalker()` (4-Kandidaten-Pfadraten)
- `import(pathToFileURL(walkerPath))` — Walker wird normal importiert
- Skill-Resource `element-walker.js` + zugehörige `.d.ts`

### Walker als `.ts`

`element-walker.ts` bleibt browser-side Logik. `PAGE_SCRIPT` serialisiert die Helper weiterhin per `fn.toString()` für `page.evaluate(eval(script))`. Zur Laufzeit (kompiliertes JS / esbuild-transpiliert in vitest) sind TS-Typen bereits gestript → `toString()` liefert gültiges Runtime-JS. tsup bündelt das Modul mit; `playwright`/`playwright-core` bleiben in `tsup.config.ts` external.

### Dünner Resolver

`region-properties.ts` reduziert sich auf Orchestrierung:

1. `input`/type prüfen (nur `https?://`).
2. `refDir`/`sourcePath` aus `context.params.reference_folder` (oder lokal aus URL-Hash) bestimmen.
3. Cache-miss → `capture(url, sourcePath)` (aus `src/inspect/capture.ts`).
4. `source.json` lesen + validieren.
5. `pickRegionLabel(context.params)` → `locateRegion(captured, label)` (aus `src/inspect/region.ts`).
6. `RegionProperties` zurückgeben.

Alle Fehlerpfade (kein Walker, capture wirft, corrupt source.json) → `value: undefined`, wie heute.

---

## Change 2 — Skill-Integration prunen

`region_properties` lebt nur dort, wo es konsumiert wird: `create-component`.

| Datei | Änderung |
|---|---|
| `designbook/scenes/tasks/create-scene.md` | Param `region_properties` **entfernen** (deklariert-aber-ungenutzt) |
| `designbook/design/rules/region-properties.md` | trigger `[create-component, create-scene]` → `[create-component]` |
| `designbook-css-tailwind/rules/region-properties.md` | dito |
| `designbook-drupal/components/rules/region-properties.md` | dito |
| `designbook-drupal/components/tasks/create-component.md` | Param **bleibt** — einzige Deklaration, echter Konsum |
| `designbook/design/schemas.yml` | unverändert |

**Begründung:** Scene-Assembly ist Komposition + Daten-Binding, nicht Pixel-Styling. Die Style-Wahrheit gehört zu `create-component`. `create-component` läuft in allen konsumierenden Workflows (design-screen, design-shell) immer zusammen mit `create-scene`, also braucht `create-scene` die Daten nie eigenständig. Die per-Task-Deklaration ist architektonisch erzwungen (Rules dürfen keine Resolver tragen — `rule-files.md`: *"Rules Never Declare params"*); das Prunen entfernt die echte Redundanz statt sie zu umgehen.

**Capture nicht gehoistet.** Der Capture hängt nur an `reference_url` und könnte am Workflow-Start einmalig laufen. Bewusst nicht umgesetzt: er ist bereits idempotent gecacht (`.element-tree/source.json`), also faktisch einmal pro Source. Das Matching kann ohnehin nicht kollabieren (N Komponenten via `each`-Loop, header+footer im Shell → N Regionen pro Lauf).

**Implementierungs-Reihenfolge:** Edits an Rules/Tasks/Schemas erfordern laut `CLAUDE.md` vorheriges Laden von `designbook-skill-creator` (matching per-file-type Rule + `common-rules.md`).

---

## Change 3 — Testbarkeit

### Test-Layout

| Test | Umgebung | Deckt |
|---|---|---|
| `src/inspect/__tests__/element-walker.test.ts` | jsdom | pure Mapping: role/kind, hex-Normalisierung, deterministische IDs, padding/margin, visibility-Gates (verschoben aus heutigem `src/__tests__/element-walker.test.ts`) |
| `src/inspect/__tests__/region.test.ts` | node, Hand-`CapturedSource` | alle `locateRegion`-Strategien (role/heading/label/none), `promoteToContainer`, area-tiebreak, `pickRegionLabel` (verschoben aus heutigem `region-properties.test.ts`) |
| `src/inspect/__tests__/capture.test.ts` | **echtes headless-chromium** vs `file://` Fixture | **NEU** — voller Pfad: echte `bbox ≠ 0`, hex computed colors in `source.json`, dann `locateRegion` end-to-end auf echtem Output (header/nav/main) |
| `src/resolvers/__tests__/region-properties.test.ts` | node | schlank: nur Orchestrierung (cache-hit/miss, type≠url → undefined, corrupt source.json → re-walk). Matching-Assertions nach `region.test.ts` gewandert |

### playwright als harte devDep

`playwright` von optionaler peerDep → **devDependency** des addon, damit `capture.test.ts` verlässlich in CI läuft. Der optionale peerDep-Eintrag (für Konsumenten des addon) bleibt bestehen. CI-Schritt: `playwright install chromium` vor `pnpm test` (falls nicht vorhanden).

### Fixture

`tests/fixtures/element-walker/` erweitern (oder zweites Fixture) so dass jsdom-blinde Logik abgedeckt wird:

- **Mehrere `banner`-Kandidaten unterschiedlicher Größe** → testet area-Tie-Break ("prefer largest").
- **Versteckte Elemente** (`display:none`, `opacity:0`) → testet Visibility-Filter.
- **header / nav / main / footer mit Headings** → testet alle Match-Strategien end-to-end.

---

## Change 4 — `playwright-cli` Dependency-Hygiene

`playwright-cli` (Skill-Browser-Automation für Screenshots/capture-Stage, heute rein per `npx` geholt) wird im richtigen Kontext gepinnt — **nicht** im addon (das addon ruft es nie auf; es nutzt das inline `playwright` SDK).

- **`packages/integrations/test-integration-drupal/package.json`**: `playwright-cli` (gepinnt) als dependency. Der Workspace wird aus diesem Template gebaut (`pnpm install`); `npx playwright-cli` löst dann lokal aus `node_modules/.bin` statt remote zu fetchen. Reproduzierbar, offline, kein Fetch pro Aufruf.
- **`.agents/skills/designbook/resources/cli-playwright.md`**: Invocation auf `npx playwright-cli@<ver>` pinnen — portabler Fallback für Konsumenten-Projekte, deren package.json nicht kontrolliert wird.
- **addon-package.json**: kein `playwright-cli`.

`runWalker` bleibt auf dem inline `playwright` SDK — `playwright-cli run-code` kann den Walker nicht treiben (`vm.runInContext`-Sandbox ohne `process`/`fs`/`import`, nur ein Callable; siehe Commit b6356cb).

---

## Non-Goals

- Keine Änderung am Resolver-Output-Schema oder den Match-Heuristiken.
- Kein CLI-Subcommand für `inspect` (nur Modul, kein `commander`-Command).
- Kein Hoisten des Captures auf Workflow-Ebene.
- Keine Figma-/Screenshot-Adapter.

## Risiken

| Risiko | Abhilfe |
|---|---|
| `PAGE_SCRIPT` via `toString()` bricht, wenn Walker TS-only-Konstrukte zur Laufzeit behält | Walker-Funktionen rein in laufzeit-gültigem JS halten; `capture.test.ts` fängt es (echter eval im Browser) |
| chromium fehlt in CI | `playwright install chromium` als CI-Schritt; `capture.test.ts` schlägt sonst hart fehl (gewollt — nicht self-skip) |
| Skill-Datei-Edits ohne `designbook-skill-creator` → invalide Outputs | Plan erzwingt Laden der Rule vor jedem Skill-File-Edit |
