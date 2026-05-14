# is-clear Subcommand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only `is-clear` subcommand to `debo-test` that audits whether a specific question is answered by the loaded rules, blueprints, and schema of a given workflow task. Add `_debo workflow definitions` to the CLI so the skill can validate arguments without globbing in its body.

**Architecture:** No runtime workflow involvement. A new shared module enumerates workflow *definition* files via the existing `skills/**/workflows/*.md` glob. The `workflow` command group gains a `definitions` subcommand exposing that listing — plain-text or JSON depending on whether a workflow id is supplied. The `debo-test` skill grows one new section that orchestrates validation via the CLI, plan rendering via `_debo plan`, scope extraction, and AI evaluation against a fixed English output template.

**Tech Stack:** TypeScript (Node), Commander, glob, js-yaml, Vitest. Skill is plain Markdown.

**Spec:** [docs/superpowers/specs/2026-05-15-is-clear-workflow-design.md](../specs/2026-05-15-is-clear-workflow-design.md)

---

## File Structure

**New files:**
- `packages/storybook-addon-designbook/src/cli/workflow-discovery.ts` — exports `listWorkflowDefinitions(agentsDir)`, `loadWorkflowDefinition(workflowId, agentsDir)`, and the file-resolver helper currently duplicated in `plan.ts` and `workflow.ts`.
- `packages/storybook-addon-designbook/src/cli/__tests__/workflow-definitions.test.ts` — unit tests for the new subcommand.
- `packages/storybook-addon-designbook/src/cli/__tests__/fixtures/discovery/skills/alpha/workflows/alpha-flow.md` — fixture workflow A.
- `packages/storybook-addon-designbook/src/cli/__tests__/fixtures/discovery/skills/beta/workflows/beta-flow.md` — fixture workflow B (multi-stage).

**Modified files:**
- `packages/storybook-addon-designbook/src/cli/plan.ts` — drop inline `resolveWorkflowFile`, import from `workflow-discovery.ts`.
- `packages/storybook-addon-designbook/src/cli/workflow.ts` — drop inline `resolveWorkflowFile`, import from `workflow-discovery.ts`, register `definitions` subcommand.
- `.agents/skills/designbook-test/SKILL.md` — add `is-clear` to frontmatter subcommands, dispatch table, and a new top-level `## is-clear` section.

---

## Task 1: Extract workflow-discovery module

**Files:**
- Create: `packages/storybook-addon-designbook/src/cli/workflow-discovery.ts`
- Modify: `packages/storybook-addon-designbook/src/cli/plan.ts` (replace inline helper)
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts:37-43` (replace inline helper)

This task moves the duplicated `resolveWorkflowFile` helper into a shared module and adds two new exported functions used by Task 3. No new behavior — only refactor — so no new tests yet.

- [ ] **Step 1: Create the module with the existing helper plus stubs for the new exports**

Create `packages/storybook-addon-designbook/src/cli/workflow-discovery.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { globSync } from 'glob';
import { basename } from 'node:path';
import { load as parseYaml } from 'js-yaml';

export interface WorkflowStage {
  name: string;
  steps: string[];
}

export interface WorkflowDefinition {
  id: string;
  file: string;
  stages: WorkflowStage[];
}

export function resolveWorkflowFile(workflowId: string, agentsDir: string): string {
  const matches = globSync(`skills/**/workflows/${workflowId}.md`, { cwd: agentsDir, absolute: true });
  if (matches.length === 0) {
    throw new Error(`Workflow file not found for "${workflowId}". No match for skills/**/workflows/${workflowId}.md`);
  }
  return matches[0]!;
}

export function listWorkflowDefinitions(agentsDir: string): string[] {
  const matches = globSync(`skills/**/workflows/*.md`, { cwd: agentsDir, absolute: true });
  const ids = matches.map((p) => basename(p, '.md'));
  return Array.from(new Set(ids)).sort();
}

export function loadWorkflowDefinition(workflowId: string, agentsDir: string): WorkflowDefinition {
  const file = resolveWorkflowFile(workflowId, agentsDir);
  const raw = readFileSync(file, 'utf8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    throw new Error(`Workflow "${workflowId}" has no YAML frontmatter at ${file}`);
  }
  const fm = parseYaml(fmMatch[1]!) as { stages?: Record<string, { steps?: string[] }> } | null;
  const stagesObj = fm?.stages ?? {};
  const stages: WorkflowStage[] = Object.entries(stagesObj).map(([name, def]) => ({
    name,
    steps: def.steps ?? [],
  }));
  return { id: workflowId, file, stages };
}
```

- [ ] **Step 2: Replace the inline helper in `plan.ts`**

Edit `packages/storybook-addon-designbook/src/cli/plan.ts:8-14`. Delete the local `resolveWorkflowFile` function. Add the import alongside the existing ones at the top of the file:

```typescript
import { resolveWorkflowFile } from './workflow-discovery.js';
```

Remove the now-unused `globSync` import if it is no longer referenced anywhere else in the file (it is not — `plan.ts` only used it inside the helper).

- [ ] **Step 3: Replace the inline helper in `workflow.ts`**

Edit `packages/storybook-addon-designbook/src/cli/workflow.ts:37-43`. Delete the local `resolveWorkflowFile` function. Add the import alongside the existing imports:

```typescript
import { resolveWorkflowFile } from './workflow-discovery.js';
```

Do **not** remove the existing `globSync` import from `workflow.ts` — it is used elsewhere in the file (verify with grep before deleting).

- [ ] **Step 4: Run typecheck and the full test suite to verify no regressions**

Run: `pnpm check`
Expected: PASS — every existing test that previously passed still passes; no new test failures.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow-discovery.ts \
        packages/storybook-addon-designbook/src/cli/plan.ts \
        packages/storybook-addon-designbook/src/cli/workflow.ts
git commit -m "refactor(cli): extract workflow-discovery helpers from plan and workflow"
```

---

## Task 2: Create test fixtures for workflow-definitions

**Files:**
- Create: `packages/storybook-addon-designbook/src/cli/__tests__/fixtures/discovery/skills/alpha/workflows/alpha-flow.md`
- Create: `packages/storybook-addon-designbook/src/cli/__tests__/fixtures/discovery/skills/beta/workflows/beta-flow.md`

Fixtures must mirror the real layout: two skills under `skills/`, each with a `workflows/<id>.md` file. `beta-flow` exercises the multi-stage path.

- [ ] **Step 1: Create `alpha-flow.md`**

Create `packages/storybook-addon-designbook/src/cli/__tests__/fixtures/discovery/skills/alpha/workflows/alpha-flow.md`:

```markdown
---
title: Alpha Flow
description: Single-stage fixture for discovery tests.
stages:
  build:
    steps: [build-thing]
---

Body intentionally minimal.
```

- [ ] **Step 2: Create `beta-flow.md`**

Create `packages/storybook-addon-designbook/src/cli/__tests__/fixtures/discovery/skills/beta/workflows/beta-flow.md`:

```markdown
---
title: Beta Flow
description: Multi-stage fixture for discovery tests.
stages:
  intake:
    steps: [intake-beta]
  produce:
    steps: [produce-first, produce-second]
  outtake:
    steps: [outtake-beta]
---

Body intentionally minimal.
```

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/__tests__/fixtures/discovery
git commit -m "test(cli): add discovery fixtures with single- and multi-stage workflows"
```

---

## Task 3: Add `_debo workflow definitions` subcommand (TDD)

**Files:**
- Create: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-definitions.test.ts`
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts` (register subcommand)

The subcommand has two modes: no positional argument (text list) and one positional argument (JSON detail). Tests come first; each step verifies the failing → passing transition.

- [ ] **Step 1: Write the failing test for list mode**

Create `packages/storybook-addon-designbook/src/cli/__tests__/workflow-definitions.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupCliSandbox, type CliSandbox } from './helpers.js';

function seedDiscoveryFixtures(sandbox: CliSandbox): void {
  const agentsDir = resolve(sandbox.tmpRoot, '.agents');
  mkdirSync(agentsDir, { recursive: true });
  cpSync(resolve(__dirname, 'fixtures', 'discovery', 'skills'), resolve(agentsDir, 'skills'), {
    recursive: true,
  });
}

describe('cli: workflow definitions', () => {
  let sandbox: CliSandbox;

  beforeEach(() => {
    sandbox = setupCliSandbox();
    seedDiscoveryFixtures(sandbox);
  });

  afterEach(() => {
    sandbox.cleanup();
    vi.restoreAllMocks();
  });

  it('prints all workflow ids sorted, one per line, when called with no positional', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sandbox.program.parseAsync(['node', 'cli', 'workflow', 'definitions']);

    expect(process.exitCode).toBeFalsy();
    const lines = logSpy.mock.calls
      .flat()
      .filter((c): c is string => typeof c === 'string');
    expect(lines).toEqual(['alpha-flow', 'beta-flow']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-definitions`
Expected: FAIL — Commander reports `error: unknown command 'definitions'` (or similar).

- [ ] **Step 3: Implement list mode in `workflow.ts`**

Edit `packages/storybook-addon-designbook/src/cli/workflow.ts`. Add this near the other `workflow.command(...)` registrations (location: immediately after the `list` subcommand block ending around line 135). The block reads `agentsDir` via the existing `findConfig` + `resolveSkillsRoot` pattern already used in `plan.ts`:

```typescript
  workflow
    .command('definitions [workflow-id]')
    .description('List workflow definitions (skills/**/workflows/*.md). With <workflow-id>, emit JSON detail.')
    .action((workflowId: string | undefined) => {
      const configPath = findConfig();
      const configDir = configPath ? dirname(configPath) : process.cwd();
      const agentsDir = resolveSkillsRoot(configDir);
      if (!workflowId) {
        const ids = listWorkflowDefinitions(agentsDir);
        for (const id of ids) console.log(id);
        return;
      }
      try {
        const def = loadWorkflowDefinition(workflowId, agentsDir);
        console.log(JSON.stringify(def, null, 2));
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
```

Add `dirname` to the existing `node:path` import and add this import line near the other discovery import:

```typescript
import { dirname } from 'node:path';
import { listWorkflowDefinitions, loadWorkflowDefinition, resolveWorkflowFile } from './workflow-discovery.js';
```

Replace the existing single-symbol import line for `resolveWorkflowFile` that Task 1 added. Also verify `findConfig` and `resolveSkillsRoot` are already imported from `../config.js` near the top — they are (line 4 in the file). If `dirname` is already imported, do not re-add it.

- [ ] **Step 4: Run the list test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-definitions`
Expected: PASS.

- [ ] **Step 5: Write the failing test for detail mode**

Append to `packages/storybook-addon-designbook/src/cli/__tests__/workflow-definitions.test.ts`:

```typescript
  it('prints JSON with stages and steps for a known workflow id', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sandbox.program.parseAsync(['node', 'cli', 'workflow', 'definitions', 'beta-flow']);

    expect(process.exitCode).toBeFalsy();
    const output = logSpy.mock.calls
      .flat()
      .filter((c): c is string => typeof c === 'string')
      .join('\n');
    const parsed = JSON.parse(output) as {
      id: string;
      file: string;
      stages: Array<{ name: string; steps: string[] }>;
    };
    expect(parsed.id).toBe('beta-flow');
    expect(parsed.file).toMatch(/skills\/beta\/workflows\/beta-flow\.md$/);
    expect(parsed.stages).toEqual([
      { name: 'intake', steps: ['intake-beta'] },
      { name: 'produce', steps: ['produce-first', 'produce-second'] },
      { name: 'outtake', steps: ['outtake-beta'] },
    ]);
  });
```

- [ ] **Step 6: Run the detail test to verify it passes**

The implementation from Step 3 already covers this. Run to confirm.

Run: `pnpm --filter storybook-addon-designbook test -- workflow-definitions`
Expected: PASS (both tests).

- [ ] **Step 7: Write the failing test for unknown workflow id**

Append:

```typescript
  it('exits 1 with stderr error for an unknown workflow id', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await sandbox.program.parseAsync(['node', 'cli', 'workflow', 'definitions', 'does-not-exist']);

    expect(process.exitCode).toBe(1);
    const errText = errSpy.mock.calls
      .flat()
      .filter((c): c is string => typeof c === 'string')
      .join('\n');
    expect(errText).toMatch(/does-not-exist/);
  });
```

- [ ] **Step 8: Run the unknown-id test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-definitions`
Expected: PASS (all three tests).

- [ ] **Step 9: Run the full check pipeline**

Run: `pnpm check`
Expected: PASS — typecheck, lint, and full test suite.

- [ ] **Step 10: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow.ts \
        packages/storybook-addon-designbook/src/cli/__tests__/workflow-definitions.test.ts
git commit -m "feat(cli): add _debo workflow definitions for listing workflow defs"
```

---

## Task 4: Update designbook-test SKILL.md

**Files:**
- Modify: `.agents/skills/designbook-test/SKILL.md`

Three edits: frontmatter `subcommands` entry, dispatch table row, new `## is-clear` section. The new section is the operational guide the AI follows when the subcommand is invoked.

- [ ] **Step 1: Add the `is-clear` entry to frontmatter `subcommands`**

Edit `.agents/skills/designbook-test/SKILL.md`. Inside the `subcommands:` block (currently has `run` and `research`), add:

```yaml
  is-clear:
    hint: "<workflow> <task> <question>"
    description: Audit whether a specific question is answered by the loaded rules, blueprints, and schema of a workflow task. Suggests rule, schema, or task-body changes when the answer is missing.
```

- [ ] **Step 2: Add the dispatch-table row**

In the dispatch table (the `| Subcommand | Signature | Description |` block under `## Dispatch`), add a new row after the `research` row:

```
| `is-clear` | `<workflow> <task> <question>` | Read-only clarity audit against a workflow's plan |
```

- [ ] **Step 3: Add the `## is-clear` section**

Append a new top-level section after the existing `## research` section and before `## Error Handling`. Content:

````markdown
---

## is-clear

Read-only audit. No workspace setup, no Storybook, no file modification. Treats `_debo plan` output as the source of truth for what rules, blueprints, and schemas a task carries.

Parse `$ARGUMENTS` after `is-clear` as: `<workflow> <task>` followed by everything remaining as `<question>` (no quoting required; rest-of-line is the question).

### 1. Validate `<workflow>`

If `<workflow>` is missing:

```bash
_debo workflow definitions
```

Print the returned ids and stop.

Otherwise verify the id is in that list. If not, print "Unknown workflow: <id>" followed by the list, then stop.

### 2. Validate `<task>`

If `<task>` is missing:

```bash
_debo workflow definitions <workflow>
```

The JSON response has a `stages` array; each stage has a `steps` array of task ids. Print every step id (across all stages) and stop.

Accept the literal `*` as a wildcard meaning "use the entire plan as scope". If `<task>` is neither `*` nor present in any `steps` array, print "Unknown task: <task>" followed by the list of step ids and stop.

### 3. Require `<question>`

If `<question>` is empty after parsing, print `is-clear requires a question` and stop with exit 1.

### 4. Render the plan

```bash
_debo plan <workflow>
```

This produces a self-contained markdown plan with sections for each stage, plus rule, blueprint, and schema appendices.

### 5. Scope to the task

Locate the markdown section under `## Stages Detail` (or the per-stage `## Stage <n> — <name>` blocks) for the requested `<task>`. From that section collect:

- The task body verbatim.
- Every rule path it links to (from its rules subsection).
- Every blueprint path it links to.
- Every schema definition it references via the `result.*` schema slice.

If `<task>` is `*`, use the entire plan as the scope.

### 6. Evaluate the question

Read the scope content. Classify the question as one of:

- **Clear (confirmed)** — scope contains an explicit statement that confirms the question's premise.
- **Clear (refuted)** — scope contains an explicit statement that refutes the question's premise.
- **Unclear** — scope does not address the question.

### 7. Emit a single markdown block

For **Clear (confirmed)**:

```
## Clear (confirmed)

**Question:** <question verbatim>
**Answer:** Yes.
**Source:** <relative path>, line <n>
> "<verbatim quote>"
```

For **Clear (refuted)**:

```
## Clear (refuted)

**Question:** <question verbatim>
**Answer:** No.
**Source:** <relative path>, line <n>
> "<verbatim quote>"
```

For **Unclear**:

```
## Unclear

**Question:** <question verbatim>
**Finding:** <one-sentence description of the gap>.

**Scope checked:**
- task: <path>
- rules: <path>, <path>, ...
- blueprint: <path>
- schema definitions: <name>, <name>

**Suggestions (prioritized):**
1. **Rule** — <suggested rule file + literal proposed text>.
2. **Schema** — <suggested schema definition + literal yaml snippet>.
3. **Task body** — <suggested task file + literal proposed paragraph>.
4. **Follow-up question:** "<follow-up to disambiguate before adding the rule>"
```

Rules for the output:

- Exactly one top-level `##` header per response.
- For Clear responses, the citation is mandatory: relative path, line number, and a literal quote from the source.
- For Unclear responses, the **Scope checked** block is mandatory so the user can challenge it.
- Suggestions are ordered by enforcement strength: rule > schema > task-body > follow-up question. Include only the suggestions that apply; do not pad.

Do not emit prose outside the block. Do not run `_debo workflow create`, do not write files, do not start Storybook.
````

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-test/SKILL.md
git commit -m "feat(skill): add is-clear subcommand to debo-test for plan clarity audit"
```

---

## Task 5: Manual smoke verification

No new code in this task — only running the new subcommand against the real repo to confirm end-to-end behavior matches the spec's "Manual verification" section.

- [ ] **Step 1: Verify list mode in the live workspace**

Run from the worktree root:

```bash
npx storybook-addon-designbook workflow definitions | head -20
```

Expected: a sorted list including `vision`, `design-component`, `design-screen`, `design-shell`, `design-verify`, `data-model`, `tokens`, `sections`, `shape-section`, `css-generate`, `sample-data`, `import`, `sb`.

- [ ] **Step 2: Verify detail mode against `design-component`**

```bash
npx storybook-addon-designbook workflow definitions design-component
```

Expected: JSON with `id: "design-component"`, an absolute `file` path ending in `skills/designbook/design/workflows/design-component.md`, and `stages` containing the steps declared in that workflow's frontmatter.

- [ ] **Step 3: Verify error path**

```bash
npx storybook-addon-designbook workflow definitions does-not-exist; echo "exit=$?"
```

Expected: stderr line containing `does-not-exist`, then `exit=1`.

- [ ] **Step 4: Run `is-clear` for the no-args case via the skill**

In a Claude Code session, invoke:

```
/debo-test is-clear
```

Expected: a list of all workflow ids (from Step 1).

- [ ] **Step 5: Run `is-clear` for a missing task**

```
/debo-test is-clear design-component
```

Expected: a list of `design-component` task ids.

- [ ] **Step 6: Run `is-clear` for a real question against the design-component workflow**

```
/debo-test is-clear design-component create-component may component props contain hyphens?
```

Expected: a single markdown block — one of `## Clear (confirmed)`, `## Clear (refuted)`, or `## Unclear`. If Unclear, the **Suggestions** list contains at least one concrete proposal.

- [ ] **Step 7: Run `is-clear` with the wildcard scope**

```
/debo-test is-clear design-component * what triggers a stage transition?
```

Expected: a single markdown block. If a rule somewhere in the plan covers stage transitions, the result is Clear (confirmed) with citation; otherwise Unclear with suggestions.

- [ ] **Step 8: Commit any documentation tweaks discovered during smoke testing**

If Steps 4–7 reveal that the skill section needs clarification or that the spec missed an edge case, edit the relevant file inline and commit:

```bash
git add <changed-files>
git commit -m "docs: refine is-clear skill section based on smoke testing"
```

If nothing needs changing, skip the commit.

---

## Self-Review Notes

- **Spec coverage:** Every spec section maps to a task. CLI changes → Tasks 1–3. Skill changes → Task 4. Manual verification → Task 5.
- **Type consistency:** `WorkflowDefinition`, `WorkflowStage`, `listWorkflowDefinitions`, `loadWorkflowDefinition`, `resolveWorkflowFile` names are used identically across Tasks 1 and 3.
- **No placeholders:** Each step contains the exact code, command, or markdown block needed. No "TBD", no "implement appropriately".
- **TDD discipline:** Task 3 follows red → green for each of the three modes (list, detail, error). Task 1 is a pure refactor — existing test suite is the safety net (`pnpm check` after the refactor).
- **Commit cadence:** One commit per task; Task 3 commits once after all three modes are green to keep the test file's commit history coherent.
