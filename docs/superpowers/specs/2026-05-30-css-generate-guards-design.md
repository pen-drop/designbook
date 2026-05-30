# css-generate Guards: framework-independent token + font presence check via inspect

**Date:** 2026-05-30
**Status:** Draft

## Problem

The design-shell A/B runs failed to render correctly because design-token CSS
variables silently failed to reach the rendered frontend — e.g. `--color-surface-variant`
was never emitted into the compiled CSS, so `bg-[var(--color-surface-variant)]`
resolved to nothing and the region rendered unstyled. The failure surfaced only
at visual-compare time (a screenshot diff), far from the cause, as noise.

`css-generate` today has only a weak guard: `generate-css` flags an *empty or
missing* output file. It does NOT verify that the *specific* tokens the design
system defines actually appear in the rendered CSS, nor that fonts load.

## Goal

A **guard that proves the design tokens and fonts actually reach the rendered
frontend** — at generation time, framework-independent, before any scene exists.
If a token variable is missing/empty or a font fails to load, `css-generate`
fails loudly with the exact list, instead of leaking a render artifact into a
later compare.

## Key constraints (from brainstorming)

- **Frontend truth, not source truth.** Checking the token `.src.css` is not
  enough; only the *rendered* state proves the chain token → compiled `:root`
  var → loaded. Verify via a real browser (Playwright), reusing `inspect`.
- **Framework-independent.** Do not check Tailwind utility names. Check the
  web primitives every framework produces: CSS custom properties on `:root`
  and `document.fonts`. (The *compile* is framework-specific; the *guard* is not.)
- **Scene-independent.** `css-generate` runs early (before-hook, before any
  component/scene/Storybook exists). The guard MUST NOT target a scene/story.
  → a **standalone, self-contained probe page** (`file://`), not a Storybook
  story. (A token-probe Storybook story MAY also exist — acceptable, optional,
  gives a later serving-level check — but is not required by this guard.)
- **Post-build.** Token CSS uses Tailwind v4 `@theme`; the `--vars` only land on
  `:root` after a compile. The guard runs after a compile-to-file step.

## Architecture

```
css-generate:
  … → generate-css (token .src.css)
      → compile-css   (framework step: app.src.css → <css>/_token-probe.css)  [css-tailwind]
      → guard-css     (framework-independent)                                 [core]
            write  <css>/_token-probe.html  (links _token-probe.css, no markup)
            inspect file://<css>/_token-probe.html → captureStyleEnv → { root_vars, fonts }
            assert: every expected --token present & non-empty
                    every expected font loaded
            hard-fail with the missing list
      → generate-index
```

**Probe artifacts live in the css folder** (`${DESIGNBOOK_CSS}/_token-probe.{html,css}`),
persisted, not in `/tmp`. They are naturally invisible to Storybook: the probe
is not a `*.stories.*` file (Storybook story discovery ignores it) and the css
folder is not under Tailwind's `@source` globs (`templates/`, `components/`),
so it is neither indexed as a story nor scanned for utilities. The underscore
prefix marks it as a generated internal artifact.

## Components

### 1. `inspect/style-env.ts` (addon, NEW) — `captureStyleEnv`

A sibling to the element-walker (token/font state is document-global, not
per-element, so it is NOT part of `walkDocument`). Reuses `capture.ts`'s chromium
launch / wait-for-ready / in-page eval.

```ts
export interface StyleEnv {
  root_vars: Record<string, string>;   // every --custom-property on :root, resolved
  fonts: { family: string; loaded: boolean }[];
}
// in-page eval (browser):
//   - root_vars: read getComputedStyle(documentElement); collect every property
//     starting with '--' (or, given a requested list, just those) → resolved value.
//   - fonts: for each requested family, await document.fonts.load(`16px "${family}"`)
//     then document.fonts.check(...) → { family, loaded }.
export async function captureStyleEnv(url: string, opts: { fonts: string[] }): Promise<StyleEnv>;
```

`captureStyleEnv` shares the browser-driver path with `capture()` (the
`globalThis` bridge pattern); factor the shared launch/wait into a helper if
that keeps both readable.

### 2. compile-to-file (css-tailwind, framework-specific)

A `compile-css` step/task in the tailwind integration: `@tailwindcss/cli`
compiles `${DESIGNBOOK_CSS_APP}` (app.src.css) → `${DESIGNBOOK_CSS}/_token-probe.css`.
Other CSS integrations provide their own compile to that path; the guard does
not care how.

### 3. guard-css (core, framework-independent)

A `guard-css` task:
- Reads the expected token variable names from `design-tokens.yml` (iterate the
  token map → the `--<group>-<flat>` names css-generate would emit).
- Reads the expected font families (typography tokens / font config).
- Writes `${DESIGNBOOK_CSS}/_token-probe.html` linking `_token-probe.css`
  (relative). Persisted in the css folder; kept out of Storybook (not a
  `*.stories.*` file, not under `@source`).
- Calls `captureStyleEnv(file://…/_token-probe.html, { fonts })`.
- Asserts each expected `--var` is in `root_vars` and non-empty; each font
  `loaded`. On any miss → fail the task with the exact missing names.

## Data flow

`design-tokens.yml` → (expected var names + font families) → guard
`app.src.css` → compile → `probe.app.css` → `probe.html` → inspect → `StyleEnv`
guard compares expected vs `StyleEnv` → pass / hard-fail(list).

## Error behavior

| Case | Behavior |
|---|---|
| A token var missing/empty in `root_vars` | Fail `guard-css`, list the missing `--vars`. This is the surface-variant bug, caught at source. |
| A font not loaded | Fail, list the families. Catches Material-Symbols / Google-font not loaded. |
| Compiled CSS file absent | Fail (compile step did not run / produced nothing). |
| Playwright/chromium unavailable | Skip with a warning (like the region_properties resolver) — do not hard-fail CI that lacks a browser; the guard is best-effort where no browser exists. |
| No tokens defined | Nothing to assert; pass. |

## Framework independence

The **guard** only reads `:root` custom properties + `document.fonts` — produced
by any CSS framework. Tailwind appears only in the **compile-to-file** step,
which lives in the css-tailwind integration. A future framework supplies its own
compile; the guard and `captureStyleEnv` are unchanged.

## Non-goals

- Checking Tailwind utility classes (`bg-primary`) — framework-specific; the
  arbitrary-value form already depends only on the `--var`, which the guard covers.
- Verifying Storybook actually serves the CSS into its iframe — that is
  `verify-capture`'s job (it renders the real story). This guard is the
  content-truth layer; verify-capture is the serving/application layer.
- Surfacing the probe in Storybook — explicitly NOT shown there; it is a
  generated internal artifact in the css folder, kept out of story discovery
  and the `@source` scan.

## Testing

- `captureStyleEnv` integration (real chromium) against a fixture probe HTML that
  links a CSS with a known `:root { --x: #123 }` + an `@font-face`/import:
  assert `root_vars['--x'] === '#123'` and the font reports loaded; assert a
  deliberately-absent `--y` is not present.
- `guard-css` assertion unit (pure): given expected names + a `StyleEnv`, returns
  the correct missing list (empty when all present; lists the gaps otherwise).
- css-generate stage-order smoke: `compile-css` + `guard-css` resolve in order.
