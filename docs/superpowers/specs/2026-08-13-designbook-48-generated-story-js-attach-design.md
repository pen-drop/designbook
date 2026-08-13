# DESIGNBOOK-48 — Generated stories load & attach component JS

**Ticket:** DESIGNBOOK-48 · feature · `work:code` · destination `spec` · `scenario_required: true`
**Package:** `packages/storybook-addon-designbook` (story generation + preview runtime)

## Problem

Component stories come from `*.component.yml`, indexed by `storybook-addon-sdc`; that addon
side-loads a component's co-located `<name>.js` and calls `Drupal.attachBehaviors` after each render
(via a `play` it bakes into the stories it generates). Designbook generates its **scene** and
**entity view-mode** stories itself (`renderer/scene-module-builder.ts`,
`renderer/entity-module-builder.ts` → `renderer/csf-prep.ts`), emitting a `render` that returns the
Twig-compiled **markup string** through `<alias>.default.component({...p, ...s})`. Those stories carry
no `play`, so every component that declares an `interactive[]` `behavior` (nav toggles, disclosures,
off-canvas menus) renders **inert** exactly at the level where a screen is reviewed and where
`design-verify` measures.

## What the investigation established (and where it diverges from the ticket)

The ticket's briefing assumes scene/entity stories load **no** component JS *and* never call
`attachBehaviors`. The runtime mapping of `storybook-addon-sdc@0.22.x` shows the first half is **not**
true in this stack:

- **The `<name>.js` is already loaded.** `storybook-addon-sdc` is a single Vite preset whose
  `.component.yml` loader fires for *any* import ending in `component.yml` — including designbook's
  `import * as alias from '…/foo.component.yml'`. The module it returns begins with **bare
  side-effect imports of every sibling** (`import './foo.js'`, `import './foo.css'`), so the
  co-located `<name>.js` is already evaluated and `Drupal.behaviors.<name>` is already registered when
  a designbook scene/entity story loads. `.default.component()` is only the markup fn; the JS rides
  along as a side effect.
- **The Drupal runtime is already global.** `window.Drupal`, `Drupal.attachBehaviors`, `once()`, and
  `drupalSettings` are injected for **every** story (scene/entity included) by the preset's
  `previewHead` CDN `<script>` tags. AC-4's `once()` availability is therefore already satisfied.
- **The one genuinely missing piece is the invocation.** SDC emits `Drupal.attachBehaviors(...)` only
  inside the `play` of the stories *it* generates; nothing reusable is exported. Designbook's
  generated CSF has no `play`, so behaviors register but never attach.

**Framework:** `@storybook/html-vite` — a story mounts as an HTML string via `innerHTML`; a post-mount
hook (`play` / `canvasElement`) is the correct place to run the attach.

## Decision

**Mechanism: designbook owns both halves (loading + attach); reuse only SDC's Drupal/`once`
globals.** Rather than depend on SDC's private `generateImports` side-effect loading, `csf-prep`
emits the sibling `<name>.js` import itself. This makes AC-1/AC-2 (loading) a designbook-owned,
generator-testable guarantee, keeps the **loading half mechanism-neutral** (load `<name>.js`
regardless of framework — the ticket's open question), and is robust to SDC internals. The **attach
half stays Drupal-specific**. Vite dedupes our `import '<abs>/foo.js'` against SDC's own
`import './foo.js'` (same absolute module id → one evaluation), so there is no double registration.

**Attach anchor: a `play` emitted into each generated story**, calling one exported, unit-tested
helper. This is the SDC-proven post-mount hook for the HTML framework and is directly
generator-testable (AC-8), unlike a preview decorator (HTML-framework decorators run *during* render,
not after mount, and move the guarantee out of the generator).

Rejected — **own the Drupal runtime too** (ship our own `Drupal`/`once`): out of scope (the ticket
says reuse the Drupal runtime; non-Drupal approaches are excluded) and redundant with `previewHead`.

## Design

### 1. Loading (mechanism-neutral) — `renderer/csf-prep.ts`

- The import-emitting loop in `buildCsfModule` (scene) and `buildEntityCsfModule` (entity) is factored
  into one shared helper so the two generators cannot drift.
- Per **distinct** component (built on the existing unique-id `Set`, so once per component — AC-2),
  when a sibling script is resolved, emit a side-effect import: `import '<abs>/<name>.js';`.
- Discovery stays out of `csf-prep` (it is fs-free and resolver-injected). A new injected
  `resolveScriptPath(componentId) → string | null` is added, defaulted in `scene-module-builder.ts`
  and `entity-module-builder.ts` to a `defaultSdcScriptResolver` (the sibling `<name>.js` next to the
  resolved `.component.yml`, `existsSync`-guarded). Built-in `designbook:*`, unresolved, and no-JS
  components emit nothing.

### 2. Attach (Drupal-specific) — new helper + `play`

- New export from `storybook-addon-designbook/renderer` (`renderer-browser.ts`):

  ```ts
  export function attachDrupalBehaviors(root: HTMLElement | undefined): void {
    const g = globalThis as unknown as { Drupal?: { attachBehaviors?: (r: Element, s?: unknown) => void }; drupalSettings?: unknown };
    if (root && g.Drupal?.attachBehaviors) {
      g.Drupal.attachBehaviors(root, g.drupalSettings);
    }
  }
  ```

  Guarded so non-Drupal projects / absent SDC runtime **no-op** instead of throwing.
- The generated module's top import becomes
  `import { renderComponent, attachDrupalBehaviors } from 'storybook-addon-designbook/renderer';`, and
  every generated story (scene and entity view-mode/form-mode) emits
  `play: (ctx) => attachDrupalBehaviors(ctx.canvasElement),`.
- **AC-3** single attach: `play` runs once per render pass over `canvasElement` — not per instance.
- **AC-4** re-render: the HTML framework re-sets `innerHTML` → fresh DOM; `play` re-runs; `once()`
  keys per element → each new trigger is bound exactly once. No `detachBehaviors` needed.

### 3. Reuse boundary / no regression

- We reuse only SDC's `previewHead` Drupal/`once` globals. We do **not** touch SDC's component-story
  path (its own `generateImports` + `play`). Our `play` is emitted only into designbook-generated CSF,
  so **AC-6** holds: component stories still load their JS, still attach once, no double attach.

### Data flow

Build time (`csf-prep`): per distinct component → `import '<yml>'` (markup) + `import '<name>.js'`
(behavior, when present); each story → `render: renderComponent(...)` + `play: attachDrupalBehaviors(canvasElement)`.
Runtime: module eval runs `<name>.js` (registers `Drupal.behaviors.*`) → `render` sets the HTML
string into the canvas → `play` calls `attachDrupalBehaviors(canvasElement)` → `once()` binds triggers.

### Error handling

| Condition | Behavior |
|---|---|
| Drupal runtime absent (non-Drupal project / SDC not registered) | `attachDrupalBehaviors` no-ops (guarded); no throw |
| Component has no sibling `<name>.js` | no script import emitted |
| Built-in `designbook:*` / unresolved component | unchanged (inline render / warning stub); no script |

## Acceptance-criteria coverage

- **AC-1 / AC-2** loading, each distinct component once → `csf-prep` emits one `import '<abs>/<name>.js'`
  per distinct component (nested slots included, via the existing `collectComponentIds` walk).
- **AC-3** exactly once per render pass → single `play` → single `attachBehaviors(canvasElement)`.
- **AC-4** re-render no double-bind + `once()` available → fresh DOM per render + global `once()`.
- **AC-5** entity view-mode stories → same `csf-prep` helper path covers `buildEntityCsfModule`
  (view + form modes).
- **AC-6** component stories unregressed → SDC path untouched; our `play` only on generated CSF.
- **AC-7** browser-observable interaction → playwright-cli scenario (below).
- **AC-8** `pnpm check` + generator-level test locking loading + single-attach into the emitted CSF.

## Testing

- **Generator-level (vitest, `entity-csf-prep.test.ts` string-assertion style):** scene and entity CSF
  contain `import '<abs>/foo.js';` and a `play:` calling `attachDrupalBehaviors(` plus the helper
  import; **no** script import when the component has no sibling JS; exactly one script import per
  distinct component. This is the guard against a future `csf-prep` change silently dropping it (AC-8).
- **Helper unit test:** `attachDrupalBehaviors` calls `Drupal.attachBehaviors` once with the root and
  the settings; no-ops when `Drupal` is absent.
- **Browser scenario (AC-7, `scenario_required = true`), playwright-cli:** on a scene story containing
  a behavior-carrying component — click its `[data-behavior]` trigger → `aria-expanded` flips to
  `true` and the `aria-controls` target's `hidden` toggles; click again → toggles back exactly once
  (AC-4). **Requires a new fixture** (a blueprint `<name>.js` component + a scene placing it), authored
  in coding — no such component/scene exists in `test-integration-drupal` today.
- `pnpm check` (typecheck → lint → test, fail-fast) from the repo root (addon TS change).

## Scope guard

No changes to any component's `<name>.js`, the `js-behavior` blueprint, or `storybook-addon-sdc`.
No backwards-compatibility / migration code — generated output is disposable and regenerated from the
new shape.

## Touched files (anticipated)

- `packages/storybook-addon-designbook/src/renderer/csf-prep.ts` — shared import/`play` emission,
  `resolveScriptPath` option.
- `packages/storybook-addon-designbook/src/renderer/scene-module-builder.ts`,
  `.../entity-module-builder.ts` — default `resolveScriptPath` (`defaultSdcScriptResolver`), thread it
  through.
- `packages/storybook-addon-designbook/src/renderer/renderer.ts` + `src/renderer-browser.ts` — export
  `attachDrupalBehaviors`.
- `packages/storybook-addon-designbook/src/vite-plugin.ts` — thread `resolveScriptPath` if the option
  is surfaced there (parallel to `resolveImportPath`/`wrapImport`).
- Tests: `renderer/__tests__/` generator + helper tests; a behavior-component + scene fixture for the
  playwright-cli scenario.
