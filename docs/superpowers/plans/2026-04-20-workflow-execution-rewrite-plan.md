# Workflow Execution Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the designbook skill's workflow-execution story — consolidate execution docs, rewrite the CLI reference, drop authoring content (moves to `designbook-skill-creator`), and make targeted CLI code changes (implicit config, explicit `resume`, `config --var`, provider rules on results).

**Architecture:** Three phases, executed in order. Phase 1 lands CLI code changes behind tests so the new behavior is verifiable. Phase 2 rewrites the two execution docs against the Phase 1 behavior. Phase 3 removes the dropped files and updates skill-creator + SKILL.md, closing the content migration.

**Tech Stack:**
- TypeScript (Node 20+) with Commander for CLI, located in `packages/storybook-addon-designbook/src/cli/`
- Library functions in `packages/storybook-addon-designbook/src/workflow.ts` (~1800 lines)
- Vitest for unit + integration tests, located in `src/**/__tests__/*.test.ts`
- Markdown docs under `.agents/skills/designbook/resources/` and `.agents/skills/designbook-skill-creator/`
- `pnpm check` = typecheck + lint + test (fail-fast); `pnpm --filter storybook-addon-designbook lint:fix` for auto-fix

**Spec:** `docs/superpowers/specs/2026-04-20-workflow-execution-rewrite-design.md`

---

## File Structure

### Files created

| Path | Responsibility |
|---|---|
| `packages/storybook-addon-designbook/src/cli/__tests__/workflow-resume.test.ts` | Tests for the new `workflow resume` command |
| `packages/storybook-addon-designbook/src/cli/__tests__/workflow-config.test.ts` | Tests for the new `workflow config --var` subcommand |
| `packages/storybook-addon-designbook/src/cli/__tests__/workflow-auto-transition.test.ts` | Tests asserting the removed auto-transition no longer fires |
| `packages/storybook-addon-designbook/src/__tests__/workflow-provides-result.test.ts` | Tests for provider rules on result keys |

### Files modified

| Path | Change |
|---|---|
| `packages/storybook-addon-designbook/src/workflow.ts` | Remove auto-transition blocks (4 locations); add `workflowResume()` function |
| `packages/storybook-addon-designbook/src/cli/workflow.ts` | Remove auto-transition in `buildInstructions`; add `resume` subcommand; add `config` subcommand |
| `packages/storybook-addon-designbook/src/workflow-resolve.ts` | Extend provider rule logic to cover result keys |
| `.agents/skills/designbook/SKILL.md` | Remove links to removed files |
| `.agents/skills/designbook/resources/workflow-execution.md` | Rewrite from scratch |
| `.agents/skills/designbook/resources/cli-workflow.md` | Rewrite from scratch |
| `.agents/skills/designbook-skill-creator/rules/structure.md` | Absorb frontmatter + file-structure gaps from removed docs (after dedupe) |
| `.agents/skills/designbook-skill-creator/resources/schemas.md` | Absorb `schemas.yml`, `$ref`, JSONata interpolation gaps (after dedupe) |

### Files deleted

| Path | Reason |
|---|---|
| `.agents/skills/designbook/resources/architecture.md` | Authoring content migrated to skill-creator; execution content folded into workflow-execution.md |
| `.agents/skills/designbook/resources/task-format.md` | Same split — authoring → skill-creator, tasks.yml runtime → workflow-execution.md |

---

## Phase 1 — CLI code changes

Target Phase 1 to land CLI behavior that Phase 2 docs can describe accurately.

### Task 1: Make auto-transition removal test-visible

Before removing auto-transition, lock down the new expected behavior with tests.

**Files:**
- Create: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-auto-transition.test.ts`

- [ ] **Step 1: Write failing tests asserting the absence of auto-transition**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import { buildInstructions } from '../workflow.js';
import { workflowResult, workflowDone } from '../../workflow.js';

describe('waiting→running auto-transition removal', () => {
  let dataDir: string;
  let workflowName: string;
  let tasksYmlPath: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'wf-auto-'));
    workflowName = 'test-wf-2026-04-20-abcd';
    const dir = join(dataDir, 'workflows', 'changes', workflowName);
    mkdirSync(dir, { recursive: true });
    tasksYmlPath = join(dir, 'tasks.yml');
    writeFileSync(
      tasksYmlPath,
      dumpYaml({
        title: 'Test',
        workflow: 'test-wf',
        status: 'waiting',
        waiting_message: 'Preview OK?',
        stages: { intake: { steps: ['intake'] } },
        stage_loaded: {
          intake: { task_file: '/abs/intake.md', rules: [], blueprints: [], config_rules: [], config_instructions: [] },
        },
        tasks: [{ id: 'intake', status: 'in-progress', title: 'Intake', stage: 'intake' }],
      }),
    );
  });

  afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

  it('buildInstructions does NOT flip waiting→running', () => {
    buildInstructions(dataDir, workflowName, 'intake');
    const raw = parseYaml(require('node:fs').readFileSync(tasksYmlPath, 'utf-8')) as { status: string; waiting_message?: string };
    expect(raw.status).toBe('waiting');
    expect(raw.waiting_message).toBe('Preview OK?');
  });
});
```

- [ ] **Step 2: Run tests — expected FAIL ("expected 'running' to be 'waiting'")**

Run: `pnpm --filter storybook-addon-designbook vitest run src/cli/__tests__/workflow-auto-transition.test.ts`

Expected: test fails because current code flips waiting→running.

- [ ] **Step 3: Remove auto-transition in `buildInstructions`**

File: `packages/storybook-addon-designbook/src/cli/workflow.ts` — delete lines 73-78:

```typescript
// DELETE these lines:
// Transition from waiting back to running when AI resumes work
if (data.status === 'waiting') {
  data.status = 'running';
  delete data.waiting_message;
  writeWorkflowAtomic(tasksYmlPath, data);
}
```

- [ ] **Step 4: Run tests — expect buildInstructions test to PASS**

Run: `pnpm --filter storybook-addon-designbook vitest run src/cli/__tests__/workflow-auto-transition.test.ts`

Expected: `buildInstructions does NOT flip waiting→running` passes.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/__tests__/workflow-auto-transition.test.ts \
        packages/storybook-addon-designbook/src/cli/workflow.ts
git commit -m "refactor: remove waiting→running auto-transition from buildInstructions"
```

### Task 2: Remove auto-transition in `workflow.ts` — three result-write sites

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts:1492-1496, 1668-1672, 1709-1713`
- Modify: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-auto-transition.test.ts`

- [ ] **Step 1: Extend the test file to cover `workflowDone` and `workflowResult`**

Add to `workflow-auto-transition.test.ts`:

```typescript
  it('workflowResult --json (data) does NOT flip waiting→running', async () => {
    // Arrange: tasks.yml with status waiting + a data result task
    // … (reuse beforeEach)
    // Act:
    await workflowResult(dataDir, workflowName, 'intake', 'someKey', { foo: 1 }, { /* config stub */ } as any);
    // Assert: status remains waiting
    const raw = parseYaml(require('node:fs').readFileSync(tasksYmlPath, 'utf-8')) as { status: string };
    expect(raw.status).toBe('waiting');
  });

  it('workflowDone does NOT flip waiting→running', async () => {
    // Arrange: minimal tasks.yml with one in-progress task, status: waiting
    // Act:
    await workflowDone(dataDir, workflowName, 'intake', undefined, { summary: 'x', config: { /* stub */ } as any });
    // Assert:
    const raw = parseYaml(require('node:fs').readFileSync(tasksYmlPath, 'utf-8')) as { status: string };
    expect(raw.status).toBe('waiting');
  });
```

Note: fill in the beforeEach with a tasks.yml shape that matches what `workflowDone` and `workflowResult` expect. Check existing tests in `src/__tests__/workflow-*.test.ts` for reference fixtures.

- [ ] **Step 2: Run tests — expect two new FAILs**

Run: `pnpm --filter storybook-addon-designbook vitest run src/cli/__tests__/workflow-auto-transition.test.ts`

Expected: `workflowDone` and `workflowResult` tests fail with `expected 'running' to be 'waiting'`.

- [ ] **Step 3: Remove the three auto-transition blocks in `workflow.ts`**

Delete the five-line block at each of these locations (they are identical):

Lines 1492-1496:
```typescript
// Transition from waiting back to running on first write
if (data.status === 'waiting') {
  data.status = 'running';
  delete data.waiting_message;
}
```

Lines 1668-1672:
```typescript
// Transition from waiting back to running
if (data.status === 'waiting') {
  data.status = 'running';
  delete data.waiting_message;
}
```

Lines 1709-1713:
```typescript
// Transition from waiting back to running
if (data.status === 'waiting') {
  data.status = 'running';
  delete data.waiting_message;
}
```

(Line numbers will shift after each deletion — use the comment pattern `Transition from waiting back to running` to locate each block.)

- [ ] **Step 4: Run tests — expect all three PASS**

Run: `pnpm --filter storybook-addon-designbook vitest run src/cli/__tests__/workflow-auto-transition.test.ts`

Expected: all three tests pass.

- [ ] **Step 5: Also run the full workflow test suite to catch regressions**

Run: `pnpm --filter storybook-addon-designbook vitest run src/__tests__/ src/cli/__tests__/`

Expected: any previously-passing tests that implicitly relied on auto-transition must be found and either updated to run `workflowResume` first, or to accept the new behavior. Fix any regressions before proceeding. Do not proceed to Task 3 if tests fail.

- [ ] **Step 6: Inspect `workflow.ts:1162` for the fifth transition reference**

Run: `grep -n "data.status = 'running'" packages/storybook-addon-designbook/src/workflow.ts`

If the match at line ~1162 is also a `waiting → running` auto-transition (not e.g. a normal "create new workflow in running state" init), delete it the same way and update tests. If it's not an auto-transition, leave it.

- [ ] **Step 7: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts \
        packages/storybook-addon-designbook/src/cli/__tests__/workflow-auto-transition.test.ts
git commit -m "refactor: remove waiting→running auto-transition from done/result sites"
```

### Task 3: Add `workflowResume()` library function

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts` — add `workflowResume()` near `workflowWait()` (around line 219)

- [ ] **Step 1: Write failing test**

Create: `packages/storybook-addon-designbook/src/__tests__/workflow-resume.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import { workflowResume } from '../workflow.js';

describe('workflowResume', () => {
  let dataDir: string;
  let workflowName: string;
  let tasksYmlPath: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'wf-resume-'));
    workflowName = 'test-wf-2026-04-20-abcd';
    const dir = join(dataDir, 'workflows', 'changes', workflowName);
    mkdirSync(dir, { recursive: true });
    tasksYmlPath = join(dir, 'tasks.yml');
  });

  afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

  it('transitions waiting → running and clears waiting_message', () => {
    writeFileSync(
      tasksYmlPath,
      dumpYaml({ status: 'waiting', waiting_message: 'Preview OK?', tasks: [], stages: {} }),
    );
    workflowResume(dataDir, workflowName);
    const raw = parseYaml(readFileSync(tasksYmlPath, 'utf-8')) as { status: string; waiting_message?: string };
    expect(raw.status).toBe('running');
    expect(raw.waiting_message).toBeUndefined();
  });

  it('is a no-op if workflow is already running', () => {
    writeFileSync(tasksYmlPath, dumpYaml({ status: 'running', tasks: [], stages: {} }));
    expect(() => workflowResume(dataDir, workflowName)).not.toThrow();
    const raw = parseYaml(readFileSync(tasksYmlPath, 'utf-8')) as { status: string };
    expect(raw.status).toBe('running');
  });

  it('throws if workflow is completed', () => {
    writeFileSync(tasksYmlPath, dumpYaml({ status: 'completed', tasks: [], stages: {} }));
    expect(() => workflowResume(dataDir, workflowName)).toThrow(/completed/);
  });

  it('throws if workflow does not exist', () => {
    expect(() => workflowResume(dataDir, 'nonexistent-wf')).toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (`workflowResume is not a function`)**

Run: `pnpm --filter storybook-addon-designbook vitest run src/__tests__/workflow-resume.test.ts`

Expected: import error because function doesn't exist yet.

- [ ] **Step 3: Implement `workflowResume()` in `workflow.ts`**

Open `packages/storybook-addon-designbook/src/workflow.ts` and add immediately after the existing `workflowWait()` function (around line 230+):

```typescript
export function workflowResume(dataDir: string, name: string): void {
  const tasksYmlPath = resolve(dataDir, 'workflows', 'changes', name, 'tasks.yml');
  if (!existsSync(tasksYmlPath)) {
    throw new Error(`workflow not found: ${name}`);
  }
  const data = readWorkflow(tasksYmlPath);
  if (data.status === 'running') return;
  if (data.status !== 'waiting') {
    throw new Error(`Cannot resume: workflow "${name}" is ${data.status}, expected waiting or running`);
  }
  data.status = 'running';
  delete data.waiting_message;
  writeWorkflowAtomic(tasksYmlPath, data);
}
```

(Imports `resolve`, `existsSync`, `readWorkflow`, `writeWorkflowAtomic` — verify they are already imported at the top of the file; add missing ones.)

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter storybook-addon-designbook vitest run src/__tests__/workflow-resume.test.ts`

Expected: all four tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts \
        packages/storybook-addon-designbook/src/__tests__/workflow-resume.test.ts
git commit -m "feat: add workflowResume() to flip waiting→running explicitly"
```

### Task 4: Add `workflow resume` CLI subcommand

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts` — add `.command('resume')` block near the `wait` subcommand (line ~576)
- Create: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-resume.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import { execFileSync } from 'node:child_process';

describe('workflow resume CLI', () => {
  let dataDir: string;
  const workflowName = 'test-wf-2026-04-20-abcd';

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'wf-resume-cli-'));
    const dir = join(dataDir, 'workflows', 'changes', workflowName);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'tasks.yml'),
      dumpYaml({ status: 'waiting', waiting_message: 'q', tasks: [], stages: {} }),
    );
  });

  afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

  it('flips status to running and prints JSON response', () => {
    // Note: this is a shape test. Wire up an in-process test similar to other CLI tests.
    // Use the test harness style from workflow-skip-intake.test.ts which invokes the CLI in-process.
    // Verify stdout contains { "status": "running", "workflow": "<name>" }.
  });
});
```

(Model this test after `workflow-skip-intake.test.ts` which already runs CLI in-process. If that file uses a different harness, copy its pattern.)

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm --filter storybook-addon-designbook vitest run src/cli/__tests__/workflow-resume.test.ts`

- [ ] **Step 3: Implement CLI subcommand**

In `packages/storybook-addon-designbook/src/cli/workflow.ts`, add after the `wait` command (~line 597, before `abandon`):

```typescript
workflow
  .command('resume')
  .description('Transition workflow status from waiting to running (call after user answers).')
  .requiredOption('--workflow <name>', 'Workflow name')
  .action((opts: { workflow: string }) => {
    const config = loadConfig();
    try {
      workflowResume(config.data, opts.workflow);
      log({ cmd: 'workflow resume', args: { workflow: opts.workflow } });
      console.log(JSON.stringify({ status: 'running', workflow: opts.workflow }));
    } catch (err) {
      log({ cmd: 'workflow resume', args: { workflow: opts.workflow }, error: (err as Error).message });
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });
```

And add `workflowResume` to the import list at the top of the file:

```typescript
import {
  workflowCreate,
  workflowResult,
  workflowGetFile,
  workflowList,
  workflowDone,
  workflowAbandon,
  workflowWait,
  workflowResume,   // <-- add
  workflowMerge,
  readWorkflow,
  writeWorkflowAtomic,
  expandTasksFromParams,
} from '../workflow.js';
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm --filter storybook-addon-designbook vitest run src/cli/__tests__/workflow-resume.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow.ts \
        packages/storybook-addon-designbook/src/cli/__tests__/workflow-resume.test.ts
git commit -m "feat: add workflow resume CLI subcommand"
```

### Task 5: Add `workflow config --var <NAME>` subcommand

Purpose: one-shot variable fetch for task bodies that need a single shell var without full eval.

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts`
- Create: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-config.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
// use the in-process CLI harness pattern from existing tests

describe('workflow config --var', () => {
  it('returns a single variable value to stdout', () => {
    // Arrange: minimal designbook.config.yml with known DESIGNBOOK_DIRS_CSS value
    // Act: run CLI: workflow config --var DESIGNBOOK_DIRS_CSS
    // Assert: stdout is the resolved absolute path, exit code 0
  });

  it('exits non-zero on unknown var', () => {
    // Act: run CLI: workflow config --var UNKNOWN_VAR
    // Assert: exit code non-zero, stderr mentions "unknown"
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm --filter storybook-addon-designbook vitest run src/cli/__tests__/workflow-config.test.ts`

- [ ] **Step 3: Implement subcommand**

Add to `packages/storybook-addon-designbook/src/cli/workflow.ts`, near the other commands:

```typescript
workflow
  .command('config')
  .description('Return a single config variable value. For templates that need one $DESIGNBOOK_* var without full eval.')
  .requiredOption('--var <name>', 'Variable name (e.g. DESIGNBOOK_DIRS_CSS)')
  .action((opts: { var: string }) => {
    const config = loadConfig();
    const env = buildEnvMap(config);  // same env map used during template resolution
    const value = env[opts.var];
    if (value === undefined) {
      console.error(`Error: unknown variable "${opts.var}"`);
      process.exitCode = 1;
      return;
    }
    console.log(value);
  });
```

(If `buildEnvMap(config)` needs a second argument or a different import, check `workflow-resolve.ts` for the current signature.)

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow.ts \
        packages/storybook-addon-designbook/src/cli/__tests__/workflow-config.test.ts
git commit -m "feat: add workflow config --var for single-variable lookup"
```

### Task 6: Extend provider rules to result keys

Today rules with `provides: <param>` in frontmatter resolve params at task time. Extend this so `provides: <result-key>` similarly routes to the rule's instructions for producing that result.

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts`
- Create: `packages/storybook-addon-designbook/src/__tests__/workflow-provides-result.test.ts`

- [ ] **Step 1: Read the current `provides:` logic**

Run: `grep -rn "provides" packages/storybook-addon-designbook/src/ --include="*.ts" | grep -v __tests__ | grep -v ".test.ts"`

Read every site that touches `provides` — you need to know where the param-level mechanism lives before extending it. Summarize in a comment block what you found before continuing.

- [ ] **Step 2: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
// arrange: a task with result: { extractedValue: { type: string } }
// and a rule with frontmatter: { trigger: { steps: [someStep] }, provides: 'extractedValue' }
// plus rule body text describing how to extract the value
// act: run workflow resolution for that step
// assert: the rule is marked as the "provider" for result key 'extractedValue' in the resolved stage data

describe('provider rules for result keys', () => {
  it('marks a rule as the provider when frontmatter `provides:` matches a result key', () => {
    // TODO: fill in using the pattern from existing resolution tests
  });

  it('still supports param-level provides: (backward compat)', () => {
    // TODO: existing param behavior untouched
  });
});
```

- [ ] **Step 3: Run test — expect FAIL**

- [ ] **Step 4: Extend `workflow-resolve.ts`**

Find the resolver that inspects `provides:` on loaded rules. Extend the logic so that, in addition to param resolution, each result key declared in the task's `result:` is looked up against `provides:` on loaded rules. For each match, attach the rule's file path to the result declaration (e.g. `result.<key>.provider_rule: /abs/path/rule.md`).

Downstream: the task-execution AI reads `result.<key>.provider_rule` (if present) to know which rule's instructions produce that key.

Concrete edit sketch (adjust to real symbols after reading Step 1):

```typescript
// after existing param-provider resolution:
for (const [resultKey, decl] of Object.entries(task.result ?? {})) {
  const providerRule = loadedRules.find((r) => r.frontmatter.provides === resultKey);
  if (providerRule) {
    (decl as ResultDeclaration).provider_rule = providerRule.path;
  }
}
```

- [ ] **Step 5: Run test — expect PASS**

- [ ] **Step 6: Verify `tasks.yml` output carries the new field**

Run the full CLI against a fixture workflow that has a provider rule on a result key. Spot-check the written `tasks.yml` to confirm `provider_rule:` appears under that result.

- [ ] **Step 7: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts \
        packages/storybook-addon-designbook/src/__tests__/workflow-provides-result.test.ts
git commit -m "feat: provider rules can now provide result keys, not only params"
```

### Task 7: Run full check pipeline

- [ ] **Step 1: Type + lint + test**

Run: `pnpm check`

Expected: all pass. Fix anything broken from Phase 1.

- [ ] **Step 2: Commit any fixes**

```bash
git add -p  # review carefully
git commit -m "fix: resolve Phase 1 typecheck/lint fallout"
```

(If no fixes, skip.)

---

## Phase 2 — Docs rewrite

All Phase 2 tasks edit markdown files under `.agents/skills/designbook/resources/`. No code changes. TDD does not apply; verification is "read end-to-end as if you're new to the repo; does it make sense?".

### Task 8: Rewrite `workflow-execution.md` from scratch

**Files:**
- Modify: `.agents/skills/designbook/resources/workflow-execution.md`

- [ ] **Step 1: Read the spec and confirm target sections**

Open `docs/superpowers/specs/2026-04-20-workflow-execution-rewrite-design.md` and re-read the "New workflow-execution.md Structure" section. The file's new outline is:

1. Main Loop (engine lens) — ~5 bullets
2. Running a Workflow (AI lens)
3. Task Loop (schema-centric) — 7 steps
4. Param Resolution (behavior)
5. Results
6. Hooks (before + after with walk-through)
7. Untracked Workflows (`track: false`)
8. Optimize / Research passes

- [ ] **Step 2: Replace the file with the new content**

Write the new content. Key constraints:
- No `eval "$(_debo config)"` anywhere
- No "Step 0.5" / "bootstrap" headings
- `_debo()` appears exactly once as an inline alias: `_debo() { npx storybook-addon-designbook "$@"; }` in a plain sentence ("we use `_debo` as shorthand for `npx storybook-addon-designbook`"), never in a code block styled as a "step"
- Task loop follows the spec's 7 steps: schema → providers/user → body → rules+blueprints → resolve → done → follow response
- Step 5 documents the `wait → resume` flow: `_debo workflow wait --message "<q>"` → ask user → `_debo workflow resume --workflow $WORKFLOW_NAME` → `workflow done --data`
- Param Resolution section describes behavior, not a step
- Results section merges today's File Results + Data Results content, carries the global rule about forbidden direct Write-tool writes
- Hooks section includes a concrete walk-through (e.g., `design-screen → design-verify`)
- Section 7 (untracked workflows) preserves the existing 3-bullet content
- Section 8 (optimize/research) preserves existing content, minus references to the removed bootstrap

Do NOT include:
- Authoring content (task frontmatter spec, each: JSONata details, $ref syntax, domain taxonomy)
- References to `architecture.md` or `task-format.md`
- `workflow plan` (stale — CLI command is `create`)
- `workflow instructions` in the happy-path task loop

- [ ] **Step 3: Re-read and self-review**

Read the file end-to-end pretending you're an AI opening this for the first time in a workflow run. Check:
- Can you start a workflow using only this doc? (yes → good)
- Is there any jargon that's undefined in this doc but also not in cli-workflow.md? (should be zero)
- Does every command mentioned link to or appear in cli-workflow.md? (spot-check 3 commands)

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/resources/workflow-execution.md
git commit -m "docs: rewrite workflow-execution.md — main loop, schema-centric task loop, explicit resume"
```

### Task 9: Rewrite `cli-workflow.md` from scratch

**Files:**
- Modify: `.agents/skills/designbook/resources/cli-workflow.md`

- [ ] **Step 1: Enumerate the target commands**

Per spec, the new `cli-workflow.md` covers:

`create`, `list`, `resume` (new), `done`, `result`, `get-file`, `wait`, `instructions` (demoted), `config` (new), `abandon`, `merge`.

Each section: purpose → syntax → options table → response shape → notes.

- [ ] **Step 2: Replace the file with the new content**

Constraints:
- `list` documents `--workflow <id>` as required (matches actual code — this is the docs-vs-code sync fix)
- `resume` has its own section: `_debo workflow resume --workflow <name>` transitions `waiting → running`
- `wait` section describes the explicit transition back via `resume`; no mention of auto-transition
- `config` has a brief section: `_debo workflow config --var <NAME>` returns a single var value
- `instructions` section includes the line "Rarely needed in normal execution — the `create` response already carries enough to proceed. Use to re-read the current stage's files when context was lost mid-workflow."
- No `eval "$(_debo config)"` guidance anywhere
- No `_debo()` helper shown as a standalone code block — if the file needs to mention it, do so inline once

- [ ] **Step 3: Validate against the code**

Spot-check three sections by comparing syntax/options to the actual CLI definitions in `packages/storybook-addon-designbook/src/cli/workflow.ts`. For each command you document:
- Required options match `.requiredOption(...)`
- Optional options match `.option(...)`
- Response shape matches the actual `console.log` payload

If any mismatch, fix the doc (not the code) unless the code is wrong — in which case, note it and fix code separately.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/resources/cli-workflow.md
git commit -m "docs: rewrite cli-workflow.md — add resume/config, demote instructions, sync list flag"
```

---

## Phase 3 — File removal, migration, SKILL.md

### Task 10: Content dedupe pass against `designbook-skill-creator`

Before deleting `architecture.md` and `task-format.md`, verify what's already in skill-creator to avoid duplication during migration.

- [ ] **Step 1: Inventory skill-creator content**

Read these files and note what's already covered:
- `.agents/skills/designbook-skill-creator/rules/structure.md`
- `.agents/skills/designbook-skill-creator/rules/principles.md`
- `.agents/skills/designbook-skill-creator/rules/validate-params.md`
- `.agents/skills/designbook-skill-creator/resources/schemas.md`
- `.agents/skills/designbook-skill-creator/resources/schema-composition.md`
- `.agents/skills/designbook-skill-creator/resources/validate.md`

Write a short inventory (comment in a scratch file or just keep in memory) of which of these topics is already covered:

| Topic | File |
|---|---|
| `schemas.yml` format | |
| `$ref` syntax | |
| JSONata `{{ … }}` interpolation | |
| Task frontmatter fields (name/as/priority/trigger/filter/params/each/result) | |
| Rule frontmatter fields | |
| Blueprint frontmatter fields | |
| 4-level model (workflow → stage → task/rule/blueprint) | |
| Domain taxonomy | |
| Before/After hook frontmatter | |
| Unified extension model (name/as/priority) | |
| Stage-based architecture authoring | |
| `each:` iteration syntax | |

- [ ] **Step 2: Identify gaps**

Topics present in `architecture.md` or `task-format.md` but missing from skill-creator → these must be imported.

### Task 11: Import gaps into skill-creator

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/rules/structure.md` or `resources/schemas.md` (choose based on content type)

- [ ] **Step 1: For each gap identified in Task 10, add it to the appropriate skill-creator file**

Guideline:
- Frontmatter field specs → `rules/structure.md` (add/extend existing sections)
- Schema syntax, `$ref`, JSONata, `schemas.yml` format → `resources/schemas.md`
- Principles (WHAT not HOW, etc.) → already in `rules/principles.md`; only add if genuinely new

**Before loading any skill-creator file for writing:** the skill-creator itself is sensitive territory per CLAUDE.md:

> Before creating OR editing any task/rule/blueprint/workflow/schemas.yml under `.agents/skills/designbook/`, `.agents/skills/designbook-*/` (drupal, css-tailwind, stitch, devtools), or the skill-creator's own `rules/` and `resources/`, you MUST load `designbook-skill-creator` first.

So: invoke the `designbook-skill-creator` skill first, then edit its own files.

- [ ] **Step 2: Commit each skill-creator edit separately**

```bash
git add .agents/skills/designbook-skill-creator/rules/structure.md
git commit -m "docs(skill-creator): import frontmatter spec from designbook/architecture.md"

git add .agents/skills/designbook-skill-creator/resources/schemas.md
git commit -m "docs(skill-creator): import JSONata/\$ref details from designbook/task-format.md"
```

(Commit per file for smaller, reviewable diffs.)

### Task 12: Delete `architecture.md` and `task-format.md`

- [ ] **Step 1: Grep for remaining references**

Run these two commands and fix every hit before deletion:

```bash
grep -rn "architecture.md" .agents/ docs/superpowers/
grep -rn "task-format.md" .agents/ docs/superpowers/
```

Update each reference to either:
- Point to the skill-creator equivalent (for authoring content)
- Point to `workflow-execution.md` (for execution content that folded in)
- Remove the link entirely (if obsolete)

- [ ] **Step 2: Fold tasks.yml runtime format into `workflow-execution.md`**

From `task-format.md`, the tasks.yml section (lines 99-160) documents what the AI sees at runtime: status values, task fields, result state semantics. This is execution info — it belongs in `workflow-execution.md` Section 5 (Results) as a small subsection titled "tasks.yml runtime format".

Copy only what the executing AI needs to know:
- tasks.yml top-level fields: `title`, `workflow`, `status`, `parent`, `stages`, `tasks`
- Task status values: `pending | in-progress | done | incomplete`
- Workflow status values: `running | waiting | completed | incomplete`
- Result state semantics: `valid` absent / `valid: true` / `valid: false`

Do not copy authoring-side content (`write_root`, `root_dir`, `config_rules`, `config_instructions`, `task_file`/`rules`/`blueprints` arrays) — those are fields the engine populates, not fields the AI reads directly.

- [ ] **Step 3: Delete the two files**

```bash
rm .agents/skills/designbook/resources/architecture.md
rm .agents/skills/designbook/resources/task-format.md
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(designbook): drop architecture.md + task-format.md (authoring moved to skill-creator)"
```

### Task 13: Update `SKILL.md`

**Files:**
- Modify: `.agents/skills/designbook/SKILL.md`

- [ ] **Step 1: Edit the Resources section**

Replace the current Resources list (lines ~82-86) with:

```markdown
## Resources

- [workflow-execution.md](resources/workflow-execution.md) — Execution guide
- [cli-reference.md](resources/cli-reference.md) — CLI command index
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook/SKILL.md
git commit -m "docs(designbook): SKILL.md Resources list — only execution guide + CLI index remain"
```

### Task 14: Final pnpm check + integration walk-through

- [ ] **Step 1: Full check pipeline**

Run: `pnpm check`

Expected: typecheck, lint, test all pass.

- [ ] **Step 2: Run a real workflow end-to-end in a test workspace**

```bash
./scripts/setup-workspace.sh workflow-execution-test
cd /path/to/workflow-execution-test/
# follow the new workflow-execution.md step by step for a simple workflow (e.g. vision)
_debo workflow create --workflow vision
# … resolve params, ask wait, resume, done …
```

Verify:
- No `eval config` needed anywhere
- `workflow resume` works after `wait`
- `workflow config --var DESIGNBOOK_DIRS_CSS` returns a path
- `workflow done` no longer flips `waiting → running` implicitly
- A provider rule on a result key (if any exist or you add a test rule) routes correctly

- [ ] **Step 3: Fix any issues discovered, commit per fix**

- [ ] **Step 4: Final commit message summary**

Confirm the branch has, in order:
1. Phase 1: 7 commits (auto-transition removal × 2, resume function, resume CLI, config CLI, provider-rules result, check fixes)
2. Phase 2: 2 commits (workflow-execution.md, cli-workflow.md)
3. Phase 3: ~4-6 commits (skill-creator imports × N, delete + fold, SKILL.md)

---

## Self-review checklist (before opening PR)

1. **Spec coverage:**
   - [ ] Main loop opener in workflow-execution.md ✓
   - [ ] Schema-centric 7-step task loop ✓
   - [ ] Wait → Resume explicit flow ✓
   - [ ] No eval / no bootstrap ✓
   - [ ] `workflow resume` command ✓
   - [ ] `workflow config --var` command ✓
   - [ ] `workflow list --workflow` docs fixed ✓
   - [ ] Provider rules on result keys ✓
   - [ ] Auto-transition removed (all 4-5 sites) ✓
   - [ ] architecture.md deleted ✓
   - [ ] task-format.md deleted ✓
   - [ ] SKILL.md updated ✓
   - [ ] skill-creator has all authoring content (no gaps) ✓

2. **Regression check:**
   - [ ] All existing tests still pass
   - [ ] `pnpm check` clean
   - [ ] A real workflow run end-to-end works

3. **No placeholders:**
   - [ ] No TODO / TBD in any committed doc
   - [ ] No references to deleted files
   - [ ] No references to `workflow plan` (stale command name)
