# DESIGNBOOK-63 — Plan naming contract + Workflow-panel removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename Designbook's persisted-plan naming scheme to a date+slug folder-per-initiative contract, and completely remove the Workflow-/Designbook-Log panel (component, notifications, exclusive endpoint) from the Storybook addon, without touching Structure/Inspect/Visual Compare or CLI plan generation/execution.

**Architecture:** Two independent blocks. Block 1 touches only `packages/storybook-addon-designbook/src/workflow/*`, `src/cli/intake.ts`, `src/cli/plan.ts`, their tests, two `promptfoo/skills/designbook-plan/*.yaml` fixtures, and seven skill docs. Block 2 deletes `WorkflowPanel.tsx` + `manager-notifications.ts` + the `shared/log/` module, and edits `manager.tsx` + `vite-plugin.ts` + `constants.ts`. No file is touched by both blocks; order between them is arbitrary.

**Tech Stack:** TypeScript, Vitest, Commander (CLI), Storybook manager-api/React (addon UI), Vite dev-server middleware.

**Spec:** `docs/superpowers/specs/2026-09-13-designbook-63-plan-naming-workflow-panel-removal-design.md`

## Global Constraints

- No migration/backwards-compatibility/repair code for existing `*.plan.md` artifacts — testing is from scratch (project CLAUDE.md).
- `pnpm check` (typecheck → lint → test, fail-fast) must be green before the final commit.
- Any edit to a `SKILL.md` under `.agents/skills/designbook/` or `.agents/skills/designbook-gaia/` requires loading `designbook-skill-creator` first (project CLAUDE.md guardrail) — Task 6 below.
- No blanket deletion of files merely containing "workflow" in the name — only code exclusively serving the Workflow-/Designbook-Log panel (Task 7-9).
- Commit after each task.

---

## Block 1 — Plan naming contract

### Task 1: `intake-resolve.ts` — `plan_path` → `plans_dir`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow/intake-resolve.ts:73-75` (interface field), `:313` (return value)
- Test: `packages/storybook-addon-designbook/src/__tests__/intake-resolve.test.ts:45-48`

**Interfaces:**
- Produces: `IntakeContext.plans_dir: string` — the plans **directory** (`${config.data}/plans`), replacing the old `plan_path: string` file path. Every other `IntakeContext` field is unchanged.

- [ ] **Step 1: Update the failing test first**

In `src/__tests__/intake-resolve.test.ts`, replace:

```ts
  it('emits the canonical plan_path under DESIGNBOOK_DATA/plans', async () => {
    const ctx = await resolveIntakeContext('design-shell', { agentsDir: agents, config });
    expect(ctx.plan_path).toBe(`${config.data}/plans/design-shell.plan.md`);
  });
```

with:

```ts
  it('emits the plans_dir under DESIGNBOOK_DATA/plans', async () => {
    const ctx = await resolveIntakeContext('design-shell', { agentsDir: agents, config });
    expect(ctx.plans_dir).toBe(`${config.data}/plans`);
  });
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter storybook-addon-designbook test -- intake-resolve` (from repo root) or `cd packages/storybook-addon-designbook && npx vitest run src/__tests__/intake-resolve.test.ts`
Expected: FAIL — `ctx.plans_dir` is `undefined`.

- [ ] **Step 3: Update the interface and computation**

In `src/workflow/intake-resolve.ts`, change the field:

```ts
export interface IntakeContext {
  workflow: string;
  /** Canonical path the intake must save the MD plan to: `<DESIGNBOOK_DATA>/plans/<workflow>.plan.md`. */
  plan_path: string;
```

to:

```ts
export interface IntakeContext {
  workflow: string;
  /** Directory persisted plans live under: `<DESIGNBOOK_DATA>/plans`. The final file path is only
   * known once `plan build` also has the caller's `--name` (see cli/plan.ts); this field is a
   * directory hint, not the exact target — never reconstruct a plan path from it. */
  plans_dir: string;
```

and the return statement:

```ts
  return {
    workflow: workflowId,
    plan_path: `${String(config.data)}/plans/${workflowId}.plan.md`,
```

to:

```ts
  return {
    workflow: workflowId,
    plans_dir: `${String(config.data)}/plans`,
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/__tests__/intake-resolve.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow/intake-resolve.ts packages/storybook-addon-designbook/src/__tests__/intake-resolve.test.ts
git commit -m "DESIGNBOOK-63: intake-resolve emits plans_dir (directory) instead of plan_path (file)"
```

---

### Task 2: `plan-build.ts` — passthrough rename

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow/plan-build.ts:41-44,122,165`
- Test: `packages/storybook-addon-designbook/src/__tests__/plan-build.test.ts:24-40`

**Interfaces:**
- Consumes: `IntakeContext.plans_dir` from Task 1.
- Produces: `BuildResult.plans_dir: string` (was `plan_path`) — passed through unchanged from the intake.

- [ ] **Step 1: Update the failing test first**

In `src/__tests__/plan-build.test.ts`, change:

```ts
    const { plan, plan_path, errors } = await buildPlan(
```

to:

```ts
    const { plan, plans_dir, errors } = await buildPlan(
```

and change:

```ts
    expect(plan_path).toBe(`${config.data}/plans/vision.plan.md`);
```

to:

```ts
    expect(plans_dir).toBe(`${config.data}/plans`);
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/__tests__/plan-build.test.ts`
Expected: FAIL — `plans_dir` destructured as `undefined` (the function still returns `plan_path`).

- [ ] **Step 3: Update `plan-build.ts`**

Change the interface:

```ts
export interface BuildResult {
  plan: Plan | null;
  /** Canonical path the plan should be written to (`<DESIGNBOOK_DATA>/plans/<workflow>.plan.md`). */
  plan_path: string;
  errors: string[];
}
```

to:

```ts
export interface BuildResult {
  plan: Plan | null;
  /** Directory persisted plans live under (`<DESIGNBOOK_DATA>/plans`) — see IntakeContext.plans_dir. */
  plans_dir: string;
  errors: string[];
}
```

Change the early-return on validation errors:

```ts
  if (errors.length > 0) return { plan: null, plan_path: intake.plan_path, errors };
```

to:

```ts
  if (errors.length > 0) return { plan: null, plans_dir: intake.plans_dir, errors };
```

Change the final return:

```ts
  return { plan, plan_path: intake.plan_path, errors: [] };
```

to:

```ts
  return { plan, plans_dir: intake.plans_dir, errors: [] };
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/__tests__/plan-build.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow/plan-build.ts packages/storybook-addon-designbook/src/__tests__/plan-build.test.ts
git commit -m "DESIGNBOOK-63: plan-build passes through plans_dir instead of plan_path"
```

---

### Task 3: `cli/intake.ts` — palette emits `plans_dir`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/intake.ts:29`

**Interfaces:**
- Consumes: `IntakeContext.plans_dir` from Task 1.
- Produces: the `intake --palette` JSON now carries `plans_dir` instead of `plan_path` — the field an agent reads to know the plans directory (not the final file).

- [ ] **Step 1: Update the palette function**

In `src/cli/intake.ts`, in `toPalette`, change:

```ts
  return {
    workflow: ctx.workflow,
    plan_path: ctx.plan_path,
```

to:

```ts
  return {
    workflow: ctx.workflow,
    plans_dir: ctx.plans_dir,
```

Also update the function's docstring comment (above `toPalette`) that says "the canonical `plan_path`" to "the `plans_dir` directory hint (the final file is only known after `plan build` also has `--name`)".

- [ ] **Step 2: No dedicated unit test exists for `toPalette`'s field shape** — this is covered end-to-end by Task 4's `cli/plan.ts` tests, which exercise the full `intake → build` path through the same `resolveIntakeContext`/`buildPlan` functions. Skip ahead to typecheck.

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit`
Expected: PASS (no `plan_path` references left unresolved in this file)

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/intake.ts
git commit -m "DESIGNBOOK-63: intake palette emits plans_dir"
```

---

### Task 4: `cli/plan.ts` — `--name`, slugify, folder-per-initiative, bare-`.md` ephemeral

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/plan.ts:1,61-98`
- Test: `packages/storybook-addon-designbook/src/cli/__tests__/plan.test.ts` (update the existing `plan build --ephemeral` describe block; add a new `plan build --name` describe block)

**Interfaces:**
- Consumes: `BuildResult.plans_dir` from Task 2.
- Produces: `resolveTarget(plansDir: string, opts: { output?: string; ephemeral?: boolean; name?: string }): string` and `slugify(name: string): string` — new module-private helpers in `cli/plan.ts`, not exported (no other module needs them).

- [ ] **Step 1: Write the failing tests first**

In `src/cli/__tests__/plan.test.ts`, replace the whole `describe('plan build --ephemeral', …)` block (currently the last block in the file) with:

```ts
describe('plan build --ephemeral', () => {
  it('seals under plans/.ephemeral as a bare .md file, not the canonical folder', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-ephemeral-'));
    const dataDir = join(dir, 'data');
    const configPath = join(dir, 'config.json');
    const tasksPath = join(dir, 'tasks.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        data: dataDir,
        technology: 'html',
        backend: 'drupal',
        'frameworks.component': 'sdc',
        'frameworks.css': 'tailwind',
        extensions: [],
      }),
    );
    writeFileSync(
      tasksPath,
      JSON.stringify({
        workflow: 'vision',
        tasks: [{ step: 'create-vision', task: 'create-vision', title: 'v', params: {} }],
      }),
    );
    try {
      process.exitCode = undefined;
      const out = await run([
        'plan',
        'build',
        'vision',
        '--tasks',
        tasksPath,
        '--ephemeral',
        '--config-dir',
        workspaceRoot,
        '--config',
        configPath,
      ]);
      expect(process.exitCode ?? 0).toBe(0);
      const result = JSON.parse(out);
      expect(result.ok).toBe(true);
      expect(result.ephemeral).toBe(true);
      expect(result.plan).toContain('.ephemeral');
      expect(result.plan.endsWith('.md')).toBe(true);
      expect(result.plan.endsWith('.plan.md')).toBe(false);
      expect(existsSync(result.plan)).toBe(true);
      expect(result.steps).toBeGreaterThan(0);
      expect(result.tasks).toBeGreaterThan(0);
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('plan build --name', () => {
  function setupFixture() {
    const dir = mkdtempSync(join(tmpdir(), 'plan-name-'));
    const dataDir = join(dir, 'data');
    const configPath = join(dir, 'config.json');
    const tasksPath = join(dir, 'tasks.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        data: dataDir,
        technology: 'html',
        backend: 'drupal',
        'frameworks.component': 'sdc',
        'frameworks.css': 'tailwind',
        extensions: [],
      }),
    );
    writeFileSync(
      tasksPath,
      JSON.stringify({
        workflow: 'vision',
        tasks: [{ step: 'create-vision', task: 'create-vision', title: 'v', params: {} }],
      }),
    );
    return { dir, dataDir, configPath, tasksPath };
  }

  it('refuses to persist a plan without --name, --output, or --ephemeral', async () => {
    const { dir, configPath, tasksPath } = setupFixture();
    try {
      process.exitCode = undefined;
      await run(['plan', 'build', 'vision', '--tasks', tasksPath, '--config-dir', workspaceRoot, '--config', configPath]);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes plans/<date>-<slug>/plan.md and returns that exact path', async () => {
    const { dir, dataDir, configPath, tasksPath } = setupFixture();
    const today = new Date().toISOString().slice(0, 10);
    try {
      process.exitCode = undefined;
      const out = await run([
        'plan',
        'build',
        'vision',
        '--tasks',
        tasksPath,
        '--name',
        'Panel Removal!',
        '--config-dir',
        workspaceRoot,
        '--config',
        configPath,
      ]);
      expect(process.exitCode ?? 0).toBe(0);
      const result = JSON.parse(out);
      expect(result.ok).toBe(true);
      expect(result.plan).toBe(join(dataDir, 'plans', `${today}-panel-removal`, 'plan.md'));
      expect(existsSync(result.plan)).toBe(true);
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('auto-suffixes the slug on a same-day collision instead of overwriting', async () => {
    const { dir, dataDir, configPath, tasksPath } = setupFixture();
    const today = new Date().toISOString().slice(0, 10);
    try {
      process.exitCode = undefined;
      const first = JSON.parse(
        await run([
          'plan', 'build', 'vision', '--tasks', tasksPath, '--name', 'panel removal',
          '--config-dir', workspaceRoot, '--config', configPath,
        ]),
      );
      const second = JSON.parse(
        await run([
          'plan', 'build', 'vision', '--tasks', tasksPath, '--name', 'panel removal',
          '--config-dir', workspaceRoot, '--config', configPath,
        ]),
      );
      expect(first.plan).toBe(join(dataDir, 'plans', `${today}-panel-removal`, 'plan.md'));
      expect(second.plan).toBe(join(dataDir, 'plans', `${today}-panel-removal-2`, 'plan.md'));
      expect(existsSync(first.plan)).toBe(true);
      expect(existsSync(second.plan)).toBe(true);
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a --name that normalizes to an empty slug', async () => {
    const { dir, configPath, tasksPath } = setupFixture();
    try {
      process.exitCode = undefined;
      await run([
        'plan', 'build', 'vision', '--tasks', tasksPath, '--name', '!!!',
        '--config-dir', workspaceRoot, '--config', configPath,
      ]);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/cli/__tests__/plan.test.ts`
Expected: FAIL — `--name` doesn't exist yet, `buildPlan` still returns `plan_path`, target still resolves to the old `.plan.md` shape.

- [ ] **Step 3: Implement in `cli/plan.ts`**

Change the import line:

```ts
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
```

to:

```ts
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
```

Add these two helpers directly below the existing `writePlan` function (still above `findTask`):

```ts
/** Normalize a caller-supplied initiative name into a filesystem-safe slug. */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error('--name produced an empty slug');
  return slug;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Compute the file `plan build` actually writes to. `--output` wins outright.
 * `--ephemeral` writes a flat, sidecar-free file under `.ephemeral/` (no slug
 * needed — the UUID is the identity). Otherwise a per-initiative folder
 * `<date>-<slug>/plan.md`, auto-suffixing the slug on a same-day collision so a
 * colliding name never overwrites a different initiative (AC-2).
 */
function resolveTarget(plansDir: string, opts: { output?: string; ephemeral?: boolean; name?: string }): string {
  if (opts.output) return opts.output;
  if (opts.ephemeral) return join(plansDir, '.ephemeral', `${randomUUID()}.md`);
  const base = slugify(opts.name!);
  const date = todayIso();
  let slug = base;
  let n = 2;
  while (existsSync(join(plansDir, `${date}-${slug}`))) slug = `${base}-${n++}`;
  return join(plansDir, `${date}-${slug}`, 'plan.md');
}
```

Replace the `build` command's options and action:

```ts
    .option('--output <path>', 'Write the plan here instead of the canonical plan_path')
    .option('--ephemeral', 'Seal under plans/.ephemeral/ instead of the durable plan_path')
    .option('--config-dir <path>', 'Workspace dir to resolve skills root and sources from')
    .option('--config <path>', 'Draft configuration JSON (skips designbook.config.yml lookup)')
    .action(
      async (
        workflow: string,
        opts: { tasks: string; output?: string; ephemeral?: boolean; configDir?: string; config?: string },
      ) => {
        const taskList = JSON.parse(readFileSync(opts.tasks, 'utf8')) as TaskList;
        taskList.workflow = workflow;
        const draft = opts.config ? JSON.parse(readFileSync(opts.config, 'utf8')) : undefined;
        const {
          plan: built,
          plan_path,
          errors,
        } = await buildPlan(taskList, {
          configDir: opts.configDir,
          config: draft,
        });
        if (!built) {
          console.error(errors.join('\n'));
          process.exitCode = 1;
          return;
        }
        const target = opts.ephemeral
          ? join(dirname(plan_path), '.ephemeral', `${randomUUID()}.plan.md`)
          : (opts.output ?? plan_path);
        writePlan(target, serializePlan(built));
        print({
          ok: true,
          plan: target,
          ...(opts.ephemeral ? { ephemeral: true } : {}),
          steps: built.steps.length,
          tasks: built.steps.flatMap((s) => s.tasks).length,
        });
      },
    );
```

with:

```ts
    .option('--output <path>', 'Write the plan here instead of the computed plans_dir target')
    .option('--ephemeral', 'Seal under plans/.ephemeral/ instead of a durable per-initiative folder')
    .option(
      '--name <text>',
      'Concrete initiative name — required to persist a plan (ignored with --ephemeral, overridden by --output)',
    )
    .option('--config-dir <path>', 'Workspace dir to resolve skills root and sources from')
    .option('--config <path>', 'Draft configuration JSON (skips designbook.config.yml lookup)')
    .action(
      async (
        workflow: string,
        opts: {
          tasks: string;
          output?: string;
          ephemeral?: boolean;
          name?: string;
          configDir?: string;
          config?: string;
        },
      ) => {
        if (!opts.output && !opts.ephemeral && !opts.name) {
          return fail('--name is required to persist a plan (or pass --output/--ephemeral)');
        }
        const taskList = JSON.parse(readFileSync(opts.tasks, 'utf8')) as TaskList;
        taskList.workflow = workflow;
        const draft = opts.config ? JSON.parse(readFileSync(opts.config, 'utf8')) : undefined;
        const {
          plan: built,
          plans_dir,
          errors,
        } = await buildPlan(taskList, {
          configDir: opts.configDir,
          config: draft,
        });
        if (!built) {
          console.error(errors.join('\n'));
          process.exitCode = 1;
          return;
        }
        let target: string;
        try {
          target = resolveTarget(plans_dir, opts);
        } catch (err: unknown) {
          return fail(err instanceof Error ? err.message : String(err));
        }
        writePlan(target, serializePlan(built));
        print({
          ok: true,
          plan: target,
          ...(opts.ephemeral ? { ephemeral: true } : {}),
          steps: built.steps.length,
          tasks: built.steps.flatMap((s) => s.tasks).length,
        });
      },
    );
```

Note: `dirname` is still used by `writePlan` — no import changes needed beyond adding `existsSync`.

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/cli/__tests__/plan.test.ts`
Expected: PASS (all `plan build` tests, including the four new `--name` cases and the updated `--ephemeral` case)

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/plan.ts packages/storybook-addon-designbook/src/cli/__tests__/plan.test.ts
git commit -m "DESIGNBOOK-63: plan build --name, folder-per-initiative, bare-.md ephemeral"
```

---

### Task 5: Update Promptfoo fixtures to the new contract

**Files:**
- Modify: `promptfoo/skills/designbook-plan/design-shell-plan.yaml:26,33-35`
- Modify: `promptfoo/skills/designbook-plan/extract-reference.yaml:31,36`

**Interfaces:**
- Consumes: nothing code-level — these are Promptfoo fixture prompt bodies (prose instructions to a fixture agent), not TypeScript.

- [ ] **Step 1: Read current prose to locate exact lines**

Run: `grep -n "plan_path" promptfoo/skills/designbook-plan/design-shell-plan.yaml promptfoo/skills/designbook-plan/extract-reference.yaml`

- [ ] **Step 2: Update `design-shell-plan.yaml`**

Replace every occurrence of "the intake context's `plan_path`" with "the intake context's `plans_dir` plus a concrete `--name` for this initiative", and replace bare `<plan_path>` placeholders used as the argument to later commands (`plan validate <plan_path>`, `plan seal <plan_path>`) with `<plan>` (the path `plan build` itself returned in its JSON `plan` field) plus a short note: "use the exact `plan` value `plan build` returned — never reconstruct a path from `plans_dir`."

- [ ] **Step 3: Update `extract-reference.yaml`**

Same substitution for "author the MD plan at the intake context's `plan_path`" and the `--owner <plan_path>` flag example — replace with `--owner <plan>` referencing the returned path.

- [ ] **Step 4: Verify no fixture still references the old field name**

Run: `grep -rn "plan_path" promptfoo/skills/designbook-plan/`
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add promptfoo/skills/designbook-plan/design-shell-plan.yaml promptfoo/skills/designbook-plan/extract-reference.yaml
git commit -m "DESIGNBOOK-63: update designbook-plan fixtures to plans_dir/--name contract"
```

---

### Task 6: Update skill documentation (requires `designbook-skill-creator`)

**Files:**
- Modify: `.agents/skills/designbook/SKILL.md:20`
- Modify: `.agents/skills/designbook/resources/cli-workflow.md:16,25,29-31`
- Modify: `.agents/skills/designbook/resources/workflow-building.md:13,52,68-73`
- Modify: `.agents/skills/designbook/resources/workflow-execution.md:1-3,49-51`
- Modify: `.agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md:18,97`
- Modify: `.agents/skills/designbook-gaia/skills/debo-config-sync/SKILL.md:18,95`

**Interfaces:** none (prose only).

- [ ] **Step 1: Load the guardrail skill before touching any file below**

Load `designbook-skill-creator` (per project CLAUDE.md — editing `.agents/skills/designbook*/**/SKILL.md`/resources without it regularly produces invalid output).

- [ ] **Step 2: `SKILL.md:20`**

Replace:

> after a durable `plan_path` handoff (**persist**), or ask which

with:

> after a durable persisted-plan handoff (**persist**) — the exact path `plan build` returned, never a reconstructed one — or ask which

- [ ] **Step 3: `resources/cli-workflow.md`**

Replace the palette description (line 16):

> the `open_selectors` with their `gated` tasks, and the canonical `plan_path`.

with:

> the `open_selectors` with their `gated` tasks, and `plans_dir` (the plans directory — the exact file is only known once `plan build` also has `--name`).

Replace line 25 ("writes the [MD plan](workflow-building.md) to `plan_path`") with "writes the [MD plan](workflow-building.md) under a per-initiative folder inside `plans_dir` (see the write-paths table below)".

Replace the write-paths table:

```markdown
| Invocation | Plan location | Notes |
|---|---|---|
| `plan build <wf> --tasks … --name <text>` | Canonical durable `plan_path` from intake | Default; use for **persist** (stop before execute) |
| `plan build <wf> --tasks … --ephemeral` | `$DESIGNBOOK_DATA/plans/.ephemeral/<uuid>.plan.md` | Same seal; stdout JSON includes `ephemeral: true` and `plan`; does not write the durable `plan_path` |
| `plan build <wf> --tasks … --output <path>` | Caller path | Kept; when both `--ephemeral` and `--output` are passed, `--ephemeral` wins |
```

with:

```markdown
| Invocation | Plan location | Notes |
|---|---|---|
| `plan build <wf> --tasks … --name <text>` | `$DESIGNBOOK_DATA/plans/<date>-<slug>/plan.md` | Default; use for **persist** (stop before execute). `--name` is required unless `--output`/`--ephemeral` is given; a same-day slug collision auto-suffixes (`-2`, `-3`, …), never overwrites |
| `plan build <wf> --tasks … --ephemeral` | `$DESIGNBOOK_DATA/plans/.ephemeral/<uuid>.md` | Same seal; stdout JSON includes `ephemeral: true` and `plan`; `--name` is ignored; does not write a durable folder |
| `plan build <wf> --tasks … --output <path>` | Caller path | Kept; `--output` wins over both `--name` and `--ephemeral` |
```

Add a line stating the CLI's stdout `plan` field is the single source of truth: every later command (`plan done/steps/instructions/validate/summary`) must be given that exact returned path, never one reconstructed from `plans_dir`.

- [ ] **Step 4: `resources/workflow-building.md`**

Replace line 13's "the canonical `plan_path`" with "`plans_dir` (the plans directory)".

Replace the mode table's `persist` row ("Yes (canonical `plan_path`)") with "Yes (folder `plans_dir/<date>-<slug>/plan.md`, `--name` required)".

Replace the `persist`/`ephemeral` mode-action bullets (currently referencing "the durable `plan_path`" and "`$DESIGNBOOK_DATA/plans/.ephemeral/<unique>.plan.md`") with the new shapes: persist → "`plan build <workflow> --tasks tasks.json --name <concrete initiative name>` … Hand the CLI's returned `plan` path out"; ephemeral → "writes `$DESIGNBOOK_DATA/plans/.ephemeral/<unique>.md`".

- [ ] **Step 5: `resources/workflow-execution.md`**

Replace the intro's "durable `plan_path`" with "durable persisted-plan path (the exact `plan` field `plan build` returned)".

Replace the Problems-sidecar path rule:

> **Path:** same directory as the plan; replace a trailing `.plan.md` with
> `.problems.md` (e.g. `design-shell.plan.md` → `design-shell.problems.md`). Create
> the file on the first entry; append thereafter.

with:

> **Path:** `problems.md` in the same per-initiative folder as `plan.md` (no
> suffix-derivation — the folder already disambiguates the initiative). Create
> the file on the first entry; append thereafter.

- [ ] **Step 6: `designbook-gaia/skills/debo-designbook-design/SKILL.md` and `debo-config-sync/SKILL.md`**

In both files, replace "a durable `plan_path` from a persist handoff" (appears once in the `inputs.design`/`inputs.build` default and once in the numbered flow) with "a durable persisted-plan path from a persist handoff (the exact `plan` field `plan build` returned)".

- [ ] **Step 7: Verify no doc still names the old field**

Run: `grep -rln "plan_path\|\.plan\.md" .agents/skills/designbook*/ 2>/dev/null`
Expected: no matches (aside from this plan/spec's own historical description of the old baseline, which live outside `.agents/skills/`).

- [ ] **Step 8: Commit**

```bash
git add .agents/skills/designbook/SKILL.md .agents/skills/designbook/resources/cli-workflow.md .agents/skills/designbook/resources/workflow-building.md .agents/skills/designbook/resources/workflow-execution.md .agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md .agents/skills/designbook-gaia/skills/debo-config-sync/SKILL.md
git commit -m "DESIGNBOOK-63: update skill docs to plans_dir/--name/folder-per-initiative contract"
```

---

## Block 2 — Workflow-panel removal

### Task 7: Delete `WorkflowPanel.tsx` + `manager-notifications.ts`; edit `manager.tsx`

**Files:**
- Delete: `packages/storybook-addon-designbook/src/addon/components/panels/WorkflowPanel.tsx`
- Delete: `packages/storybook-addon-designbook/src/addon/manager-notifications.ts`
- Modify: `packages/storybook-addon-designbook/src/addon/manager.tsx:4,10,15,18-23`

**Interfaces:** none produced — this task only removes registrations; `VisualCompareTool`, `InspectTool`, `StructurePanel` and their registrations are untouched.

- [ ] **Step 1: Confirm no test references the files being deleted**

Run: `grep -rln "WorkflowPanel\|manager-notifications\|startWorkflowNotifications" packages/storybook-addon-designbook/src --include="*.test.ts" --include="*.test.tsx"`
Expected: no matches (confirms Task's premise — no test coverage is dropped by this deletion).

- [ ] **Step 2: Delete the two files**

```bash
git rm packages/storybook-addon-designbook/src/addon/components/panels/WorkflowPanel.tsx
git rm packages/storybook-addon-designbook/src/addon/manager-notifications.ts
```

- [ ] **Step 3: Edit `manager.tsx`**

Remove these two import lines:

```ts
import { WorkflowPanel } from './components/panels/WorkflowPanel';
```

and:

```ts
import { startWorkflowNotifications } from './manager-notifications';
```

Change the constants import from:

```ts
import { ADDON_ID, PANEL_ID, INSPECT_TOOL_ID, STRUCTURE_PANEL_ID, VISUAL_TOOL_ID } from '../shared/constants';
```

to:

```ts
import { ADDON_ID, INSPECT_TOOL_ID, STRUCTURE_PANEL_ID, VISUAL_TOOL_ID } from '../shared/constants';
```

Remove the notification-start call and its comment:

```ts
  // Start workflow notification polling — runs always, independent of panel state
  startWorkflowNotifications(api);

```

Remove the panel registration block and its comment:

```ts
  // Register a panel (Designbook workflow panel)
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Designbook',
    match: () => true,
    render: ({ active }) => <WorkflowPanel active={active} />,
  });

```

The resulting `addons.register(ADDON_ID, (api) => { ... })` body starts directly with the Visual Compare tool registration.

- [ ] **Step 4: Typecheck**

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit`
Expected: PASS — no dangling references to `WorkflowPanel`, `startWorkflowNotifications`, or `PANEL_ID` remain in this file. (`PANEL_ID` itself is removed from `constants.ts` in Task 9, after confirming no other file needs it.)

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/addon/manager.tsx
git commit -m "DESIGNBOOK-63: remove Workflow panel registration, notifications, and their imports"
```

---

### Task 8: Remove the `/__designbook/log` route + delete the now-orphaned `shared/log/` module

**Files:**
- Modify: `packages/storybook-addon-designbook/src/addon/vite-plugin.ts:12,366-376`
- Delete: `packages/storybook-addon-designbook/src/shared/log/digest.ts`
- Delete: `packages/storybook-addon-designbook/src/shared/log/__tests__/digest.test.ts`

**Interfaces:** none — verified below that `digestLog` has exactly one production caller (the route being removed) and one dedicated test file, both fully removed together.

- [ ] **Step 1: Verify `digestLog` has no caller beyond the route being removed**

Run: `grep -rn "digestLog" packages/storybook-addon-designbook/src --include="*.ts" --include="*.tsx"`
Expected: three matches — the route in `vite-plugin.ts:368`, its own `digest.ts:35` definition, and its own test file. (The `cli/verify.ts` `score` command does **not** import it — confirmed separately; `digest.ts`'s docstring claim about `workflow score` is stale.) If this grep ever returns a fourth caller, stop and re-scope this task — do not delete a helper still in use.

- [ ] **Step 2: Remove the route from `vite-plugin.ts`**

Remove the import:

```ts
import { digestLog } from '../shared/log/digest.js';
```

Remove the middleware block:

```ts
      // HTTP endpoint: serve the digested CLI log (the panel is a logs-only view)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use('/__designbook/log', (_req: IncomingMessage, res: any) => {
        try {
          const digest = digestLog(resolve(designbookDir, 'dbo.log'));
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ designbookDir, ...digest }));
        } catch (err: unknown) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });

```

Leave every other route (`/__designbook/status`, `/__designbook/list`, `/__designbook/load`, `/__designbook/file`, `/__designbook/story`) untouched — they serve Structure/Inspect/Visual Compare.

- [ ] **Step 3: Delete the orphaned module and its test**

```bash
git rm packages/storybook-addon-designbook/src/shared/log/digest.ts
git rm packages/storybook-addon-designbook/src/shared/log/__tests__/digest.test.ts
rmdir packages/storybook-addon-designbook/src/shared/log/__tests__ packages/storybook-addon-designbook/src/shared/log 2>/dev/null || true
```

- [ ] **Step 4: Typecheck + full test run**

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit && npx vitest run`
Expected: PASS — no import errors, no orphaned test file failures.

- [ ] **Step 5: Commit**

```bash
git add -A packages/storybook-addon-designbook/src/addon/vite-plugin.ts packages/storybook-addon-designbook/src/shared/log
git commit -m "DESIGNBOOK-63: remove /__designbook/log route and the now-unused digestLog module"
```

---

### Task 9: Remove `PANEL_ID` if unused elsewhere

**Files:**
- Modify: `packages/storybook-addon-designbook/src/shared/constants.ts:4`

**Interfaces:** none.

- [ ] **Step 1: Confirm no remaining reference**

Run: `grep -rn "PANEL_ID\b" packages/storybook-addon-designbook/src --include="*.ts" --include="*.tsx" | grep -v "STRUCTURE_PANEL_ID"`
Expected: no matches after Task 7's `manager.tsx` edit (the only other reference, in the deleted `manager-notifications.ts`, is gone). If any match remains, stop and leave `PANEL_ID` in place — do not delete a constant still referenced.

- [ ] **Step 2: Remove the constant**

Remove this line from `src/shared/constants.ts`:

```ts
export const PANEL_ID = `${ADDON_ID}/panel`;
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/storybook-addon-designbook/src/shared/constants.ts
git commit -m "DESIGNBOOK-63: remove unused PANEL_ID constant"
```

---

### Task 10: Browser smoke test (AC-4 / AC-6)

**Files:** none modified — manual verification against a locally started Storybook instance, per the Spec's Gherkin scenario.

**Interfaces:** none.

- [ ] **Step 1: Start a fresh Storybook instance**

Run (from a test workspace set up via `./scripts/setup-workspace.sh <name>`, or the repo's own Storybook): `npx storybook dev` (or the project's documented start command) and open the addon's manager UI in a browser.

- [ ] **Step 2: Verify no Workflow panel exists**

In the browser, inspect the addon panel tabs. Confirm no tab titled "Designbook" (the former Workflow-/Log panel) is present. Structure, Visual Compare (toolbar), and Inspect (toolbar) must still be present and functional.

- [ ] **Step 3: Verify no `/__designbook/log` network requests**

Open the browser's network panel, reload, and wait at least 8 seconds (two multiples of the old 4s poll interval). Confirm zero requests to `/__designbook/log`.

- [ ] **Step 4: Verify no workflow notifications**

Add and then remove a file under `<designbook-data>/workflows/changes/` while the Storybook tab is open. Confirm no "Workflow started"/"Workflow completed" toast notification appears.

- [ ] **Step 5: Record the result**

Note pass/fail for each of the three checks above in the ticket's `coding` handoff — this is the evidence for AC-4/AC-6, since it has no automated browser test in this repo's suite.

---

## Final gate

- [ ] **Run the full repo check**

```bash
pnpm check
```

Expected: typecheck → lint → test all green.

- [ ] **Final commit (if any stray changes remain)**

```bash
git status --short
```

Expected: clean (everything already committed task-by-task above).
