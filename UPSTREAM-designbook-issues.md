# Upstream designbook — Issues

Issues im designbook-Core/Addon, beobachtet bei einem downstream design-verify-Run.
Hier gesammelt zur Behebung upstream. Pfade relativ zum Repo-Root.

Status-Legende: **confirmed** = im Code verifiziert · **hypothesis** = plausibel
lokalisiert, Repro/Root-Cause noch zu bestätigen.

---

## In Arbeit (separater Spec/Plan)

- **Screenshot-Isolation** statt Bounding-Box-Crop — Selektor stellt das erste
  Element frei (Hoist ans body-Root, full-page transparent) statt es zu croppen.
  - Spec: `docs/superpowers/specs/2026-06-23-screenshot-element-isolation-design.md`
  - Plan: `docs/superpowers/plans/2026-06-23-screenshot-element-isolation.md`

---

## 1. CLI: `playwright-cli`-Dependency fehlt / nicht gepinnt — **confirmed**

**Symptom:** Capture-Stage ruft `npx playwright-cli` auf, ohne dass das Paket als
Dependency deklariert/gepinnt ist → bei jedem Aufruf Remote-Fetch über `npx`,
Version unbestimmt, offline-/CI-brüchig.

**Evidence:**
- Aufruf rein per `npx playwright-cli` (keine Version):
  - `.agents/skills/designbook/resources/cli-playwright.md` (durchgehend, z.B. Z. 3, 6, 14, 24, 28)
  - `.agents/skills/designbook/design/rules/playwright-capture.md` (Z. 33–38, 55–62)
- Addon-Paket hat `playwright` (SDK) in dev/peer, aber **kein** `playwright-cli`:
  - `packages/storybook-addon-designbook/package.json` (`playwright` ^1.58.2 in devDeps Z. ~101, peer Z. ~116–122)
- Workspace-Template hat `@playwright/cli` ^0.1.13, aber **nicht** `playwright-cli`
  (anderer Paketname als im Skill referenziert):
  - `packages/integrations/test-integration-drupal/package.json` (Z. ~17)

**Fix-Richtung:** `playwright-cli` (gepinnte Version) als Dependency im
**Workspace-Template** deklarieren (nicht im Addon — das ruft es nie auf, nutzt das
inline `playwright`-SDK), und die `npx`-Aufrufe in `cli-playwright.md` auf
`npx playwright-cli@<ver>` pinnen. Paketname (`playwright-cli` vs `@playwright/cli`)
vereinheitlichen.

**Hinweis:** bereits skizziert in
`docs/superpowers/specs/2026-05-30-region-properties-refactor-design.md` (Change 4,
Z. 118–126) — noch nicht umgesetzt.

---

## 2. Plugin-Cache-Doppelregistrierung bricht design-verify an `{{ check.file_suffix }}` — **hypothesis**

**Symptom:** design-verify bricht bei der Pfad-Interpolation `{{ check.file_suffix }}`;
Capture-Tasks scheinen doppelt zu registrieren, wenn Plugin-Cache-Version UND
Projekt-/Worktree-Version derselben Task-Datei aufgelöst werden.

**Evidence:**
- `file_suffix` ist auf dem `Check`-Schema definiert (computed von setup-compare):
  - `.agents/skills/designbook/design/schemas.yml:154-161`
  - gesetzt in `.agents/skills/designbook/design/tasks/setup-compare.md:59-67`
- interpoliert in den Capture-Pfaden:
  - `.agents/skills/designbook/design/tasks/capture-storybook.md:28`
  - `.agents/skills/designbook/design/tasks/capture-reference.md:30`
- Dedup vorhanden in `resolveTaskFilesRich` (`deduplicateByNameAs(preferProjectRoot(...))`):
  - `packages/storybook-addon-designbook/src/workflow-resolve.ts:1224` (Fn 1176–1244)
- **aber** `resolveAllStages` nutzt das Ergebnis ohne erneutes `preferProjectRoot`,
  und ein zweiter `resolveTaskFilesRich`-Aufruf (Fallback mit `workflowId:`-Prefix)
  kann Duplikate zurückbringen:
  - `packages/storybook-addon-designbook/src/workflow-resolve.ts:1830-1839`
- mehrere `ResolvedStep` → `expandTasksFromParams` iteriert ALLE Einträge:
  - `packages/storybook-addon-designbook/src/workflow.ts:726, 806-815`

**Suspected cause:** `stageLoaded`/`stepResolved` wird in `resolveAllStages` aus
Projekt- **und** Plugin-Cache-Quelle befüllt, ohne `preferProjectRoot`-Filter →
dieselbe Capture-Task doppelt expandiert; die zweite Instanz kollidiert/fehl­
interpoliert bei `file_suffix`.

**Fix-Richtung:** `preferProjectRoot` + Name-Dedup auch in `resolveAllStages`
anwenden (nicht nur in `resolveTaskFilesRich`), bzw. den Fallback-Aufruf (Z. 1833)
gegen das schon aufgelöste Set deduplizieren. **Vor Fix:** minimalen Repro mit
beiden Quellen bestätigen.

---

## 3. Color-Tokens landen nicht in Storybook-`:root` — **confirmed (Verhalten), Scope zu prüfen**

**Symptom:** guard-css meldet Color-Token-`--vars` als fehlend, weil sie nicht auf
`:root` ankommen. Ursache: Theme-skopierte Tokens landen unter
`@layer theme { [data-theme=…] { … } }` statt in `:root`.

**Evidence:**
- guard-css liest ausschließlich `:root`:
  - `packages/storybook-addon-designbook/src/inspect/style-env.ts:25` (`getComputedStyle(document.documentElement)`)
  - `packages/storybook-addon-designbook/src/inspect/css-guard.ts:17-18` (prüft nur `env.root_vars`)
  - Erwartung dokumentiert: `.agents/skills/designbook/css-generate/tasks/guard-css.md:25-26,52`
- Theme-Switch per `data-theme`-Attribut (scopt Tokens auf `[data-theme=…]`):
  - `packages/storybook-addon-designbook/src/preview.ts:58` (`attributeName: 'data-theme'`)
- Generierte CSS (Workspace-Beispiel `drupal-stitch`): primitive Tokens in
  `:root,:host{…}`, semantische/Theme-Tokens in `@layer theme{[data-theme=…]{…}}`:
  - `workspaces/drupal-stitch/dist/css/app.css:1` (compiled)
  - Quelle `@theme`-Wrapper: `workspaces/drupal-stitch/css/tokens/primitive-color.src.css:1`

**Suspected cause:** Tailwind v4 `@theme` + Theme-Varianten erzeugen einen
`@layer theme`-Cascade, der semantische Color-Tokens an `[data-theme=…]` bindet,
nicht an `:root`. guard-css (nur `:root`) wertet sie als fehlend.

**Fix-Richtung (Optionen):** (a) Default-Theme-Tokens zusätzlich in `:root`
emittieren, oder (b) guard-css gegen den effektiv aktiven `[data-theme]`-Scope
prüfen statt nur `document.documentElement`. **Scope:** Evidence stammt aus einem
generierten Workspace — am kanonischen Generator-Output gegenprüfen.

---

## 4. `reference_folder` nicht an `Check`/`StoryMeta` modelliert — **confirmed**

**Symptom (aus dem Run):** „reference_selector/reference_folder nicht modelliert".
**Korrektur nach Code-Check:** `reference_selector` **ist** modelliert; die echte
Lücke ist `reference_folder`.

**Evidence:**
- `reference_selector` korrekt auf `Check`:
  - `.agents/skills/designbook/design/schemas.yml:129-135`
  - genutzt: `packages/storybook-addon-designbook/src/story-entity.ts:48,373`
- `reference_folder` nur als **Standalone-Type** + **Output**, nicht auf
  `Check`/`StoryMeta`:
  - Standalone `ReferenceFolder`: `.agents/skills/designbook/design/schemas.yml:96-103`
  - im Output: `.agents/skills/designbook/design/schemas.yml:861-862`
  - **fehlt** in `StoryMeta`: `.agents/skills/designbook/design/schemas.yml:267-334`
- zur Laufzeit als Task-Param/Resolver erwartet:
  - `.agents/skills/designbook/design/tasks/setup-compare.md:14-15`
  - `.agents/skills/designbook/design/tasks/capture-reference.md:20-21,30`
  - `.agents/skills/designbook/design/tasks/compare-screenshots.md:8-22`
  - Resolver: `packages/storybook-addon-designbook/src/resolvers/reference-folder.ts:22`
  - Verwendung: `packages/storybook-addon-designbook/src/resolvers/region-properties.ts:39`

**Fix-Richtung:** `reference_folder` als modelliertes Feld dort verankern, wo es
gelesen wird (StoryMeta bzw. der jeweilige Task-Param-Block) statt nur als loser
Standalone-Type/Output. Schema-Änderung via `designbook-skill-creator`
(`rules/schema-files.md`).
