# config-verify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a backend-agnostic `config-verify` workflow that renders from a supplied backend config, captures it, and measures it against the Storybook render as the frozen reference — reusing the design-verify measurement machine.

**Architecture:** `config-verify` mirrors `design-verify`'s `engine: direct` stage chain but flips the reference axis: the Storybook render is frozen as the baseline and the backend render (from a config) is the candidate. A `config_type` param drives per-config-type intake/setup (only `entity_view_display` in v1). `story_id` is derived from the config↔component mapping; `render_url` comes from a new param resolver that shells out to a backend-supplied command string. The Drupal integration (`designbook-drupal`) supplies that command as a drush call. Core adds no backend code.

**Tech Stack:** designbook skill files (YAML front-matter + Markdown) under `.agents/skills/designbook*`; TypeScript resolver in `packages/storybook-addon-designbook` (vitest); Playwright capture + `compare-images` CLI (reused).

## Global Constraints

- Skill files under `.agents/skills/designbook/**`, `.agents/skills/designbook-*/**` MUST be authored with the `designbook-skill-creator` skill loaded first (load the matching per-file-type rule: `schema-files.md`, `workflow-files.md`, `task-files.md`, `rule-files.md`, plus `common-rules.md`). Non-negotiable.
- Tasks say WHAT to produce, never HOW; blueprints are overridable; rules are hard constraints (4-level model).
- Core stays backend-neutral: no backend/drush code in `designbook` core — Drupal specifics = command strings + config in `designbook-drupal` only.
- No migration / back-compat / legacy-artifact code; testing is from scratch.
- Prefer schema enforcement (enums, required, validators) over imperative rules.
- Run `pnpm check` (typecheck → lint → test, fail-fast) before every commit that touches the addon.
- Workflow steps: plain names, never workflow-prefixed. Scan rule files before each stage.
- v1 supports only `config_type: entity_view_display`; leave the dispatch open, add nothing else (YAGNI).

---

### Task 1: config-verify schemas

**Files:**
- Modify: `.agents/skills/designbook/design/schemas.yml`

**Interfaces:**
- Produces: `ConfigType` (enum, v1 = `[entity_view_display]`), `ConfigTarget` (the resolved subject: `{ config_type, config_id, story_id, render_url }`). Reuses existing `VerifyResult`, `ScoreReport`, `Screenshot`, `Reference`, `Element`, `Issue`.

- [ ] **Step 1: Load skill-creator schema rule** — invoke `designbook-skill-creator`, read `rules/schema-files.md` + `rules/common-rules.md`.
- [ ] **Step 2: Add `ConfigType` enum** (`entity_view_display` only) and `ConfigTarget` object schema to `design/schemas.yml`. Do not duplicate `VerifyResult`/`ScoreReport` — reference them.
- [ ] **Step 3: Validate** — run the addon workflow schema validation (`npx addon workflow validate` or `pnpm --filter storybook-addon-designbook test` covering schema load). Expected: schemas parse, no unknown-$ref errors.
- [ ] **Step 4: Commit** — `git add .agents/skills/designbook/design/schemas.yml && git commit`.

---

### Task 2: `render_url` param resolver (addon, TDD)

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/render-url.ts`
- Create: `packages/storybook-addon-designbook/src/resolvers/__tests__/render-url.test.ts`
- Modify: `packages/storybook-addon-designbook/src/resolvers/registry.ts`

**Interfaces:**
- Consumes: `ParamResolver`, `ResolverContext`, `ResolverResult` from `./types.js`.
- Produces: `renderUrlResolver: ParamResolver` (`name: 'render_url'`). Reads a backend command template from `context.config` (the integration supplies it), executes it with the config id as argument, returns the printed URL as `value`. Backend-neutral: it runs whatever command string is configured; it never mentions drupal/drush.

- [ ] **Step 1: Write failing test** — in `render-url.test.ts`, assert: given a config with a `renderUrlCommand` template and a stubbed command runner returning `"https://host/node/1"`, `renderUrlResolver.resolve('viewdisplay.node.article.default', config, ctx)` resolves `{ resolved: true, value: 'https://host/node/1' }`; and given no `renderUrlCommand`, resolves `{ resolved: false, error: /no render command/ }`.

```ts
import { describe, it, expect } from 'vitest';
import { renderUrlResolver } from '../render-url.js';

describe('render_url resolver', () => {
  it('runs the configured backend command and returns its URL', async () => {
    const run = async () => 'https://host/node/1\n';
    const ctx = { config: { renderUrlCommand: 'drush db:url {config_id}' } as any, params: {} };
    const res = await renderUrlResolver.resolve('viewdisplay.node.article.default', { runner: run } as any, ctx);
    expect(res).toMatchObject({ resolved: true, value: 'https://host/node/1' });
  });

  it('fails cleanly when no command is configured', async () => {
    const ctx = { config: {} as any, params: {} };
    const res = await renderUrlResolver.resolve('x', {} as any, ctx);
    expect(res.resolved).toBe(false);
    expect(res.error).toMatch(/render command/i);
  });
});
```

- [ ] **Step 2: Run test, verify it fails** — `pnpm --filter storybook-addon-designbook test render-url` → FAIL (module not found).
- [ ] **Step 3: Implement `render-url.ts`** — a `ParamResolver` named `render_url` that reads the command template from `context.config.renderUrlCommand` (fall back to `config.renderUrlCommand` param-decl), substitutes `{config_id}` with the input, runs it via an injectable runner (default: `node:child_process` exec), trims stdout to the URL, and returns `{ resolved, value, input, error }`. Mirror the shape/style of `story-url.ts`.
- [ ] **Step 4: Register** — add `import { renderUrlResolver } from './render-url.js';` and `register(renderUrlResolver);` in `registry.ts`.
- [ ] **Step 5: Run tests, verify pass** — `pnpm --filter storybook-addon-designbook test render-url` → PASS.
- [ ] **Step 6: `pnpm check`** — typecheck + lint + full test green.
- [ ] **Step 7: Commit** — `git add packages/storybook-addon-designbook/src/resolvers && git commit`.

---

### Task 3: `config-verify` workflow definition

**Files:**
- Create: `.agents/skills/designbook/design/workflows/config-verify.md`

**Interfaces:**
- Consumes: Task 1 schemas; `story_id` + `render_url` resolvers; reused stages `setup-compare`, `capture`, `compare`, `triage`, `re-capture`, `re-compare`.
- Produces: a workflow whose params are `config` (the backend config id), `config_type` (resolve default `entity_view_display`), `story_id` (`resolve: story_id`), `render_url` (`resolve: render_url`, `from: config`). Stages mirror design-verify: `intake → setup-compare → reference → capture → compare → triage → polish → re-capture → re-compare → outtake`, `engine: direct`, `before: css-generate (execute: always)`. The `reference` stage freezes the Storybook baseline; `capture`/`re-capture` shoot the backend render at `render_url`.

- [ ] **Step 1: Load skill-creator workflow rule** — invoke `designbook-skill-creator`, read `rules/workflow-files.md` + `rules/common-rules.md`.
- [ ] **Step 2: Author `config-verify.md`** front-matter (params with resolvers above, stages, `engine: direct`, `before: css-generate`) + body explaining the flipped reference axis (Storybook = frozen baseline, backend render = candidate, fix pass edits the config). Mirror `design-verify.md`; do not restate task logic.
- [ ] **Step 3: Register in SKILL.md** — add `config-verify` to the sub-command list + file-to-workflow mapping in `.agents/skills/designbook/SKILL.md` (skill-creator loaded).
- [ ] **Step 4: Validate** — `npx addon workflow validate config-verify`. Expected: valid stages/params, resolvers found.
- [ ] **Step 5: Commit**.

---

### Task 4: `intake--config-verify` + `entity_view_display` config-type

**Files:**
- Create: `.agents/skills/designbook/design/tasks/intake--config-verify.md`
- Create: `.agents/skills/designbook/design/rules/config-type-entity-view-display.md`

**Interfaces:**
- Consumes: `config`, `config_type`, resolved `story_id`, `render_url`; `ConfigTarget` schema.
- Produces: intake result `{ reference, breakpoints, elements }` (same shape design-verify intake produces) built from the entity-view-display handler. The rule states, for `config_type: entity_view_display`, how `story_id` and the compared elements/selectors are derived from the config↔component mapping.

- [ ] **Step 1: Load skill-creator task + rule rules** — read `rules/task-files.md`, `rules/rule-files.md`, `rules/common-rules.md`.
- [ ] **Step 2: Author `intake--config-verify.md`** — trigger `[config-verify:intake]`, params/result mirroring `intake--design-verify.md` but reference = Storybook render of resolved `story_id`; delegates config-type specifics to the rule.
- [ ] **Step 3: Author `config-type-entity-view-display.md`** — hard rule: how an entity view display maps to a `story_id` and which elements/selectors are the comparison subjects. Backend-neutral (no drush).
- [ ] **Step 4: Validate** — `npx addon workflow validate config-verify` still valid with intake task discovered.
- [ ] **Step 5: Commit**.

---

### Task 5: backend capture + config fix pass

**Files:**
- Create: `.agents/skills/designbook/design/tasks/capture-backend.md`
- Create: `.agents/skills/designbook/design/tasks/polish-config.md`

**Interfaces:**
- Consumes: `render_url`, `Screenshot`, the reused `playwright-capture` rule and `screen-compare` rule; `Issue`s from the `compare` stage.
- Produces: `capture-backend` screenshots the backend render at `render_url` (candidate side; element × state × breakpoint), writing to the story's candidate screenshot paths the `compare` stage reads. `polish-config` applies a single fix pass to the backend config/mapping (never the Storybook component) then hands off to `re-capture`.

- [ ] **Step 1: Load skill-creator task rule** (if not still loaded).
- [ ] **Step 2: Author `capture-backend.md`** — navigate to `render_url`, run non-rest state steps against the backend DOM, capture via `playwright-capture` isolate-and-capture, viewport from `design_tokens` breakpoint. Mirror `capture-storybook.md`.
- [ ] **Step 3: Author `polish-config.md`** — single fix pass editing the backend config (entity view display) to close the deviation; explicitly forbids editing the Storybook component (it is the reference).
- [ ] **Step 4: Wire stages** — ensure `config-verify.md` `capture`/`re-capture` steps point at `capture-backend`, `reference` freezes Storybook via existing `ensure-baseline`/`capture-storybook`, `polish` points at `polish-config`.
- [ ] **Step 5: Validate** — `npx addon workflow validate config-verify`. Expected: every stage step resolves to a task.
- [ ] **Step 6: Commit**.

---

### Task 6: Drupal integration — drush `render_url` command + config-fix guidance

**Files:**
- Create: `.agents/skills/designbook-drupal/data-mapping/rules/config-verify-render-url.md`

**Interfaces:**
- Consumes: the core `render_url` resolver's `renderUrlCommand` config contract from Task 2.
- Produces: the drush command string that, given an entity view display id, returns a render URL (e.g. a representative entity's canonical URL for that bundle/view_mode), plus guidance for the `polish-config` fix pass expressed as Drupal config edits (drush cget/cset / config export) — command strings + config only, no backend code.

- [ ] **Step 1: Load skill-creator rule rule** — read `rules/rule-files.md`, `rules/common-rules.md`; confirm this is an integration rule (may not override core rules).
- [ ] **Step 2: Author the rule** — the `renderUrlCommand` drush template and the config-fix command patterns. Backend specifics live here only.
- [ ] **Step 3: Commit**.

---

### Task 7: End-to-end verification in a test workspace

**Files:** none (verification only).

- [ ] **Step 1: Build a workspace** — `./scripts/setup-workspace.sh config-verify-test` from repo root.
- [ ] **Step 2: Start Storybook** — `npx addon start --force`.
- [ ] **Step 3: Run config-verify** — invoke `/debo config-verify <entity_view_display_id>` against a bundle/view_mode that maps to an existing story. Confirm: `render_url` resolves via drush; Storybook baseline freezes; backend render captures; `compare` yields a first-shot `score-report`.
- [ ] **Step 4: Confirm the fix loop** — introduce a deliberate config deviation, re-run, confirm `polish-config` fix pass + `re-compare` move the score and the final `ScoreReport` reflects `first_shot` vs `final`.
- [ ] **Step 5: Report** — capture the score-report JSON in the coding summary; link the `.feature` blobs.

---

## Self-Review

- **Spec coverage:** flipped reference axis → Task 3 (`reference` freezes Storybook) + Task 5 (`capture-backend`). config_type dispatch → Task 3 param + Task 4 rule. story_id + render_url resolver contract → Task 2 (render_url) + existing story_id + Task 4. drush resolver → Task 6. config fix pass → Task 5 (`polish-config`). Reuse of capture/compare/score → Tasks 3/5 reference existing tasks + Task 1 reuses schemas. Backend-neutral core → Global Constraints + Task 2 (command-string contract) + Task 6 (Drupal-only). Pass threshold → reused `compare-images` CLI severity/diff_percent. All covered.
- **Placeholders:** none — resolver task carries full test + impl contract; skill-file tasks carry exact paths, triggers, and validation commands.
- **Type consistency:** `render_url` / `renderUrlCommand` / `ConfigTarget` / `config_type` used consistently across Tasks 1, 2, 3, 4, 6.
