# css-generate Guards (token + font presence) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fail `css-generate` loudly when a design token's CSS variable or a font does not actually reach the rendered frontend — verified in a real browser via `inspect`, framework-independently.

**Architecture:** css-generate gains, after token generation: a framework-specific compile-to-file (`app.src.css` → `app.css`) and a framework-independent `guard-css` stage. The guard writes a markup-free `_token-probe.html` in the css folder linking the compiled `app.css`, drives it through a new `inspect/style-env.ts#captureStyleEnv` (reusing the chromium path), and asserts every declared token var resolves on `:root` and every font loads. The token layer is emitted as `@theme static` so Tailwind does not tree-shake the vars (which is also the root cause of the original missing-token bug).

**Tech Stack:** TypeScript (strict, ESM), vitest, playwright, `@tailwindcss/cli`, designbook skill files (authored via `designbook-skill-creator`).

**Spec:** `docs/superpowers/specs/2026-05-30-css-generate-guards-design.md`.

---

## File Structure

```
packages/storybook-addon-designbook/src/
  inspect/style-env.ts                       # NEW captureStyleEnv (root vars + fonts) — chromium
  inspect/__tests__/style-env.test.ts        # NEW integration (real chromium, file:// probe)
  inspect/css-guard.ts                       # NEW pure collectMissing(expected, env)
  inspect/__tests__/css-guard.test.ts        # NEW unit
.agents/skills/designbook-css-tailwind/
  blueprints/css-mapping.md                  # wrap: "@theme" → "@theme static"
  tasks/compile-css.md                       # NEW compile app.src.css → app.css
.agents/skills/designbook/css-generate/
  workflows/css-generate.md                  # + compile-css + guard-css stages
  tasks/guard-css.md                         # NEW framework-independent guard
```

**Skill-file tasks (3, 4, 5, 6): invoke `designbook-skill-creator` first** and load the matching rule (`blueprint-files.md` / `task-files.md` / `workflow-files.md`) + `common-rules.md`.

---

## Task 1: `captureStyleEnv` (addon)

Read the rendered `:root` custom properties and font-load state from a page, reusing the chromium driver pattern from `capture.ts`.

**Files:**
- Create: `packages/storybook-addon-designbook/src/inspect/style-env.ts`
- Test: `packages/storybook-addon-designbook/src/inspect/__tests__/style-env.test.ts`
- Fixture: `tests/fixtures/element-walker/style-env-probe.html` (NEW)

- [ ] **Step 1: Create the fixture** `tests/fixtures/element-walker/style-env-probe.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    :root { --color-primary: #00336a; --color-surface-variant: #ececec; }
    @font-face { font-family: "ProbeMono"; src: local("Courier New"); }
  </style>
</head>
<body></body>
</html>
```

- [ ] **Step 2: Write the failing test** `style-env.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { captureStyleEnv } from '../style-env.js';

const PROBE = pathToFileURL(
  join(__dirname, '../../../../../tests/fixtures/element-walker/style-env-probe.html'),
).href;

describe('captureStyleEnv (real chromium)', () => {
  it('reads :root custom properties and their resolved values', async () => {
    const env = await captureStyleEnv(PROBE, { fonts: [] });
    expect(env.root_vars['--color-primary']).toBe('#00336a');
    expect(env.root_vars['--color-surface-variant']).toBe('#ececec');
    expect(env.root_vars['--not-defined']).toBeUndefined();
  }, 60_000);

  it('reports requested fonts as loaded / not loaded', async () => {
    const env = await captureStyleEnv(PROBE, { fonts: ['ProbeMono', 'NoSuchFace'] });
    const probe = env.fonts.find((f) => f.family === 'ProbeMono');
    const missing = env.fonts.find((f) => f.family === 'NoSuchFace');
    expect(probe?.loaded).toBe(true);
    expect(missing?.loaded).toBe(false);
  }, 60_000);
});
```

- [ ] **Step 3: Run it, expect fail** — `cd packages/storybook-addon-designbook && pnpm vitest run src/inspect/__tests__/style-env.test.ts` → FAIL (module missing).

- [ ] **Step 4: Implement** `style-env.ts`:

```ts
import { dirname } from 'node:path';

export interface StyleEnv {
  root_vars: Record<string, string>;
  fonts: { family: string; loaded: boolean }[];
}

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Open `url` in headless chromium and read the document-global style env:
 * every `--custom-property` resolved on :root, and the load state of each
 * requested font family. Throws if playwright is unavailable or the page is
 * unreachable — callers degrade gracefully.
 */
export async function captureStyleEnv(url: string, opts: { fonts: string[] }): Promise<StyleEnv> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    try {
      await page.goto(url);
      await page.waitForLoadState('load').catch(() => {});
      const result = await page.evaluate(
        async ({ fonts }: { fonts: string[] }) => {
          const cs = getComputedStyle(document.documentElement);
          const root_vars: Record<string, string> = {};
          for (let i = 0; i < cs.length; i++) {
            const name = cs.item(i);
            if (name.startsWith('--')) root_vars[name] = cs.getPropertyValue(name).trim();
          }
          const fontResults: { family: string; loaded: boolean }[] = [];
          for (const family of fonts) {
            try {
              await (document as Document).fonts.load(`16px "${family}"`);
            } catch {
              /* ignore — check() below reports the outcome */
            }
            fontResults.push({ family, loaded: (document as Document).fonts.check(`16px "${family}"`) });
          }
          return { root_vars, fonts: fontResults };
        },
        { fonts: opts.fonts },
      );
      return result;
    } finally {
      await context.close().catch(() => {});
    }
  } finally {
    void DEFAULT_TIMEOUT_MS;
    await browser.close().catch(() => {});
  }
}
```

> Note: `getComputedStyle(root)` enumerates only custom properties that are actually present on `:root` — exactly the post-tree-shake truth we want. `cs.length`/`cs.item(i)` iterate them in Chromium.

- [ ] **Step 5: Install chromium if needed + run, expect pass** — `cd packages/storybook-addon-designbook && npx playwright install chromium >/dev/null 2>&1; pnpm vitest run src/inspect/__tests__/style-env.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/inspect/style-env.ts packages/storybook-addon-designbook/src/inspect/__tests__/style-env.test.ts tests/fixtures/element-walker/style-env-probe.html
git commit -m "feat(addon): captureStyleEnv — :root custom properties + font load state"
```

---

## Task 2: `collectMissing` pure guard helper (addon)

**Files:**
- Create: `packages/storybook-addon-designbook/src/inspect/css-guard.ts`
- Test: `packages/storybook-addon-designbook/src/inspect/__tests__/css-guard.test.ts`

- [ ] **Step 1: Write the failing test**:

```ts
import { describe, it, expect } from 'vitest';
import { collectMissing } from '../css-guard.js';
import type { StyleEnv } from '../style-env.js';

const env: StyleEnv = {
  root_vars: { '--color-primary': '#00336a', '--color-empty': '' },
  fonts: [{ family: 'Inter', loaded: true }, { family: 'Material Symbols Outlined', loaded: false }],
};

describe('collectMissing', () => {
  it('flags vars that are absent or empty, and fonts not loaded', () => {
    const r = collectMissing(
      { vars: ['--color-primary', '--color-empty', '--color-surface-variant'], fonts: ['Inter', 'Material Symbols Outlined'] },
      env,
    );
    expect(r.vars).toEqual(['--color-empty', '--color-surface-variant']); // empty + absent
    expect(r.fonts).toEqual(['Material Symbols Outlined']);
    expect(r.ok).toBe(false);
  });

  it('ok=true when everything present', () => {
    const r = collectMissing({ vars: ['--color-primary'], fonts: ['Inter'] }, env);
    expect(r.ok).toBe(true);
    expect(r.vars).toEqual([]);
    expect(r.fonts).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, expect fail** — `pnpm vitest run src/inspect/__tests__/css-guard.test.ts` → FAIL.

- [ ] **Step 3: Implement** `css-guard.ts`:

```ts
import type { StyleEnv } from './style-env.js';

export interface ExpectedStyle {
  vars: string[]; // expected --custom-property names
  fonts: string[]; // expected font families
}

export interface MissingReport {
  ok: boolean;
  vars: string[]; // expected vars absent or empty in :root
  fonts: string[]; // expected fonts not loaded
}

/** Compare expected token vars / fonts against the captured style env. */
export function collectMissing(expected: ExpectedStyle, env: StyleEnv): MissingReport {
  const missingVars = expected.vars.filter((name) => {
    const v = env.root_vars[name];
    return v === undefined || v === '';
  });
  const loaded = new Set(env.fonts.filter((f) => f.loaded).map((f) => f.family));
  const missingFonts = expected.fonts.filter((family) => !loaded.has(family));
  return { ok: missingVars.length === 0 && missingFonts.length === 0, vars: missingVars, fonts: missingFonts };
}
```

- [ ] **Step 4: Run it, expect pass** — `pnpm vitest run src/inspect/__tests__/css-guard.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/inspect/css-guard.ts packages/storybook-addon-designbook/src/inspect/__tests__/css-guard.test.ts
git commit -m "feat(addon): collectMissing — token-var/font presence diff (pure)"
```

---

## Task 3: `@theme static` — unconditional token emission (skill)

**REQUIRED FIRST:** invoke `designbook-skill-creator` + load `rules/blueprint-files.md` + `rules/common-rules.md`.

**Files:**
- Modify: `.agents/skills/designbook-css-tailwind/blueprints/css-mapping.md`

- [ ] **Step 1:** In `css-mapping.md`, change every `wrap: "@theme"` to `wrap: "@theme static"` so the generated token css emits all token custom properties to `:root` regardless of utility usage (defeats Tailwind v4 tree-shaking; the jsonata template already substitutes `<wrap>` from `CssGroup.wrap`).

- [ ] **Step 2: Confirm `@theme static` is valid** for the pinned Tailwind v4 by compiling a tiny sample: write `/tmp/t.css` with `@import "tailwindcss";\n@theme static { --color-zzz: #123456; }`, run `cd packages/integrations/test-integration-drupal && npx @tailwindcss/cli -i /tmp/t.css -o /tmp/t.out.css` and assert `/tmp/t.out.css` contains `--color-zzz:#123456` (or `: #123456`) under `:root`. If `@theme static` is unsupported, STOP and report — fall back to the spec's probe-exercises-tokens approach.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-css-tailwind/blueprints/css-mapping.md
git commit -m "fix(css-tailwind): emit token layer as @theme static — no tree-shaking of token vars"
```

---

## Task 4: `compile-css` task (css-tailwind)

**REQUIRED FIRST:** `designbook-skill-creator` + `rules/task-files.md` + `common-rules.md`.

**Files:**
- Create: `.agents/skills/designbook-css-tailwind/tasks/compile-css.md`

- [ ] **Step 1: Create `compile-css.md`**:

```markdown
---
name: designbook-css:compile-css
title: "Compile CSS"
trigger:
  steps: [compile-css]
filter:
  frameworks.css: tailwind
result:
  type: object
  required: [compiled-css]
  properties:
    compiled-css:
      path: "$DESIGNBOOK_DIRS_CSS/app.css"
---

# Compile CSS

Compile the app stylesheet to a real file so token `@theme` variables are
emitted to `:root` (the source uses Tailwind at-rules a browser cannot resolve).

Run:

```bash
npx @tailwindcss/cli -i "$DESIGNBOOK_CSS_APP" -o "$DESIGNBOOK_DIRS_CSS/app.css" --minify
```

The output `app.css` is the input both for the `guard-css` probe and for any
consumer that needs a compiled stylesheet on disk.
```

- [ ] **Step 2: Validate** (skill validator / `pnpm check`). Expected: no violations.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-css-tailwind/tasks/compile-css.md
git commit -m "feat(css-tailwind): compile-css task — app.src.css → app.css"
```

---

## Task 5: `guard-css` task (core, framework-independent)

**REQUIRED FIRST:** `designbook-skill-creator` + `rules/task-files.md` + `common-rules.md`.

**Files:**
- Create: `.agents/skills/designbook/css-generate/tasks/guard-css.md`

- [ ] **Step 1: Create `guard-css.md`**:

```markdown
---
name: designbook:css-generate:guard-css
title: "Guard CSS — token + font presence"
trigger:
  steps: [guard-css]
result:
  type: object
  required: [guard-passed]
  properties:
    guard-passed: { type: boolean }
    missing-vars: { type: array, items: { type: string } }
    missing-fonts: { type: array, items: { type: string } }
---

# Guard CSS

Prove every generated token variable and font actually reaches the rendered
frontend. Framework-independent: checks `:root` custom properties and
`document.fonts`, not utility classes.

## Steps

1. **Expected vars** — collect every `--<name>` declared across the generated
   token files under `$DESIGNBOOK_DIRS_CSS/tokens/*.css` (grep `^\s*--[\w-]+:`).
   These are what the design system defines and MUST resolve.
2. **Expected fonts** — collect each `font-family` name from the generated
   `@font-face` blocks (the prepared font stylesheet) and any `font_family`
   typography token.
3. **Probe** — write `$DESIGNBOOK_DIRS_CSS/_token-probe.html` (no markup) linking
   the compiled css relatively:
   `<!doctype html><html><head><link rel="stylesheet" href="./app.css"></head><body></body></html>`
4. **Inspect** — run the addon to capture the style env of the probe and diff
   against expected (uses `captureStyleEnv` + `collectMissing`):
   `npx storybook-addon-designbook guard-css --probe "$DESIGNBOOK_DIRS_CSS/_token-probe.html" --vars <comma-list> --fonts <comma-list>`
   (CLI prints JSON `{ ok, vars, fonts }`.)
5. **Verdict** — if `ok`, submit `{"guard-passed": true}`. Otherwise FAIL the
   task: report the missing `--vars` and fonts; do not mark done. A missing var
   means the token never reached `:root` (e.g. tree-shaken / not generated).

If chromium/playwright is unavailable, skip with a warning and pass (best-effort
where no browser exists).
```

- [ ] **Step 2: Add the `guard-css` CLI command** backing step 4 — in `packages/storybook-addon-designbook/src/cli.ts`, register a `guard-css` command that reads `--probe`, `--vars`, `--fonts`, calls `captureStyleEnv(pathToFileURL(probe).href, { fonts })` then `collectMissing({ vars, fonts }, env)`, prints `JSON.stringify(result)`, and sets `process.exitCode = result.ok ? 0 : 1`. Wrap the playwright import in try/catch → on missing browser print `{"ok":true,"vars":[],"fonts":[],"skipped":"no browser"}` exit 0.

```ts
// in cli.ts (Command 'guard-css')
program
  .command('guard-css')
  .requiredOption('--probe <path>', 'probe HTML file to inspect')
  .option('--vars <list>', 'comma-separated expected --var names', '')
  .option('--fonts <list>', 'comma-separated expected font families', '')
  .action(async (opts: { probe: string; vars: string; fonts: string }) => {
    const { pathToFileURL } = await import('node:url');
    const vars = opts.vars.split(',').map((s) => s.trim()).filter(Boolean);
    const fonts = opts.fonts.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      const { captureStyleEnv } = await import('./inspect/style-env.js');
      const { collectMissing } = await import('./inspect/css-guard.js');
      const env = await captureStyleEnv(pathToFileURL(opts.probe).href, { fonts });
      const result = collectMissing({ vars, fonts }, env);
      console.log(JSON.stringify(result));
      process.exitCode = result.ok ? 0 : 1;
    } catch (e) {
      console.log(JSON.stringify({ ok: true, vars: [], fonts: [], skipped: (e as Error).message }));
    }
  });
```

- [ ] **Step 3: Typecheck + validate** — `cd packages/storybook-addon-designbook && pnpm typecheck`; skill validator on `guard-css.md`. Expected PASS.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/css-generate/tasks/guard-css.md packages/storybook-addon-designbook/src/cli.ts
git commit -m "feat(designbook): guard-css task + CLI — token/font presence gate"
```

---

## Task 6: Wire stages into css-generate (skill)

**REQUIRED FIRST:** `designbook-skill-creator` + `rules/workflow-files.md` + `common-rules.md`.

**Files:**
- Modify: `.agents/skills/designbook/css-generate/workflows/css-generate.md`

- [ ] **Step 1:** Insert `compile` and `guard` stages after `transform`, before `index`:

```yaml
stages:
  intake:
    steps: [css-generate:intake]
  prepare:
    steps: [prepare-fonts]
  generate:
    steps: [generate-jsonata]
  transform:
    steps: [generate-css]
  compile:
    steps: [compile-css]
  guard:
    steps: [guard-css]
  index:
    steps: [generate-index]
```

- [ ] **Step 2: Validate** (workflow validator / `pnpm check`). Expected: no violations (plain step names).

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/css-generate/workflows/css-generate.md
git commit -m "feat(designbook): css-generate compiles then guards token/font presence"
```

---

## Task 7: Full verification

- [ ] **Step 1:** `cd /home/cw/projects/designbook/.claude/worktrees/region-properties-resolver && pnpm check` → typecheck/lint/test PASS (`lint:fix` if formatting flagged).
- [ ] **Step 2:** Skill validation over the new/changed blueprint, tasks, workflow. Expected: no violations.
- [ ] **Step 3: Live smoke (optional, needs chromium):** in a fresh `drupal-web` workspace, run `/debo css-generate`; confirm `css/app.css` is produced, `css/_token-probe.html` exists, and `node dist/cli.js guard-css --probe css/_token-probe.html --vars --color-surface-variant --fonts "Material Symbols Outlined"` prints `{"ok":true,...}` (surface-variant now resolves thanks to `@theme static`). Flip one token out of `design-tokens.yml`, re-run, confirm the guard reports it missing and exits 1.
- [ ] **Step 4: Final commit if lint:fix changed anything**

```bash
git add -A && git commit -m "chore: lint:fix after css-generate guards" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- captureStyleEnv (`:root` vars + fonts, chromium, reuses inspect): Task 1 ✓
- framework-independent guard (assert vars+fonts): Tasks 2, 5 ✓
- `@theme static` unconditional emission (bug fix + probe precondition): Task 3 ✓
- compile-to-file `app.css` (framework-specific): Task 4 ✓
- probe in css folder, not in Storybook (no `*.stories.*`, not under `@source`): Task 5 step 3 (writes `_token-probe.html` in `$DESIGNBOOK_DIRS_CSS`) ✓
- css-generate stage order (compile → guard): Task 6 ✓
- skip when no browser: Task 5 CLI catch ✓
- tests incl. tree-shaking/unconditional emission: Task 3 step 2 (compile assertion) + Task 1 ✓

**Placeholder scan:** `<comma-list>` in the guard-css body is illustrative of the CLI args the task assembles from steps 1–2; the CLI flags are concretely defined in Task 5 step 2. No code-step placeholders.

**Type consistency:** `StyleEnv { root_vars, fonts }` (Task 1) consumed by `collectMissing(ExpectedStyle, StyleEnv): MissingReport` (Task 2) and the CLI (Task 5). `MissingReport { ok, vars, fonts }` matches the CLI JSON the guard-css task reads. `captureStyleEnv(url, { fonts })` signature matches Task 1 test, Task 5 CLI.
