# `debo-test --research` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an autonomous skill-improvement loop to `debo-test`. Running `debo-test <suite> <case> --research` sets up a fresh workspace, runs the case, scores it via a composite metric, proposes one targeted change to the loaded skill files (or CLI source) per iteration via a subagent, re-runs and scores, then keeps or discards based on the score delta. Stops on score target / iteration cap / plateau. Removes `_debo --research` entirely.

**Architecture:** Two-tier git: experiments commit at the repo root, the workspace `git reset --hard`s to a baseline per iteration. State lives at `research-runs/<slug>/` (gitignored). The loop is orchestrated by a Claude session driven by a new `research.md` skill file. TypeScript provides three new CLI surfaces: `_debo workflow score` (composite metric + assertion sandbox), the `dbo.log` digester library, and a repo-root guard in config resolution. Subagent-delegated ideation keeps main context bounded.

**Tech Stack:** Node 20 + TypeScript, `commander` for CLI, `vitest` for tests, `vm` (built-in) for assertion sandbox, `js-yaml` for case YAML, existing `loadConfig` / `logger` / `workflow` modules. Skills are markdown with YAML frontmatter under `.agents/skills/`.

---

## Spec reference

This plan implements `docs/superpowers/specs/2026-05-01-debo-test-research-mode-design.md`. Read that first.

## File structure

### New files

| Path | Responsibility |
|---|---|
| `packages/storybook-addon-designbook/src/log/digest.ts` | Read tagged dbo.log entries, group by error/retry/unresolved/long-running |
| `packages/storybook-addon-designbook/src/log/__tests__/digest.test.ts` | Unit tests for digester |
| `packages/storybook-addon-designbook/src/scoring/composite.ts` | Composite-score formula + assertion sandbox |
| `packages/storybook-addon-designbook/src/scoring/__tests__/composite.test.ts` | Unit tests for composite + sandbox |
| `packages/storybook-addon-designbook/src/cli/workflow-score.ts` | `_debo workflow score` subcommand wiring |
| `packages/storybook-addon-designbook/src/cli/__tests__/workflow-score.test.ts` | CLI integration tests for score |
| `.agents/skills/designbook-test/research.md` | The loop protocol that Claude follows when --research is set |
| `.agents/skills/designbook-test/research-audit.md` | Audit criteria (extracted from current --research Step 3) |

### Modified files

| Path | Change |
|---|---|
| `packages/storybook-addon-designbook/src/config.ts` | Add repo-root guard in `loadConfig` |
| `packages/storybook-addon-designbook/src/__tests__/config.test.ts` | Tests for repo-root guard (file may exist; if not, create) |
| `packages/storybook-addon-designbook/src/cli/workflow.ts` | Register `score` subcommand |
| `.agents/skills/designbook-test/SKILL.md` | Add `--research` dispatch branch |
| `.gitignore` | Replace 4 `designbook/*` entries with single `designbook/`, add `research-runs/` |
| `.agents/skills/designbook/SKILL.md` | Remove `--research` from flag table + parser |
| `.agents/skills/designbook/resources/workflow-execution.md` | Remove "Research Pass" section |
| `.agents/skills/designbook-skill-creator/SKILL.md` | Remove --research reference link |
| `.agents/skills/designbook-skill-creator/resources/research.md` | Rewrite as a thin pointer to the new location, retain audit-criteria table |

### Deletions

- `<repo-root>/designbook/` — runtime data folder, deleted from disk (CLI guard prevents recreation).

---

## Phase 1 — Foundation

### Task 1: CLI repo-root guard

**Files:**
- Modify: `packages/storybook-addon-designbook/src/config.ts` (`loadConfig` function around the `designbook.data` resolution block, lines ~190–210)
- Modify or create: `packages/storybook-addon-designbook/src/__tests__/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create or extend `packages/storybook-addon-designbook/src/__tests__/config.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../config.js';

describe('loadConfig — repo-root guard', () => {
  it('refuses to resolve DESIGNBOOK_DATA inside a directory containing pnpm-workspace.yaml AND .git', () => {
    const root = resolve(tmpdir(), `designbook-test-rootguard-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    mkdirSync(resolve(root, '.git'), { recursive: true });
    writeFileSync(resolve(root, 'pnpm-workspace.yaml'), 'packages:\n  - x\n');
    // No designbook.config.yml → loadConfig falls back to default which uses cwd.
    try {
      expect(() => loadConfig(root)).toThrow(
        /repo root/i,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('allows DESIGNBOOK_DATA in a workspace directory (no pnpm-workspace.yaml at the data parent)', () => {
    const root = resolve(tmpdir(), `designbook-test-okworkspace-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    // No .git, no pnpm-workspace.yaml — looks like a workspace.
    try {
      expect(() => loadConfig(root)).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/storybook-addon-designbook
npx vitest run src/__tests__/config.test.ts
```

Expected: both new tests fail. The first because no guard is implemented; the second may pass already (no error today either).

- [ ] **Step 3: Add the guard to `loadConfig`**

In `packages/storybook-addon-designbook/src/config.ts`, after the line that sets `config.data = dataDir;` (inside `loadConfig`, in the no-config-file branch and the with-config branch), add a guard helper and call it. Insert before both `return config;`-ish lines:

```typescript
function assertNotRepoRoot(dataDir: string): void {
  const parent = dirname(dataDir);
  const hasPnpmWorkspace = existsSync(resolve(parent, 'pnpm-workspace.yaml'));
  const hasGit = existsSync(resolve(parent, '.git'));
  if (hasPnpmWorkspace && hasGit) {
    throw new Error(
      `_debo cannot write runtime data to the repo root (resolved DESIGNBOOK_DATA=${dataDir}). ` +
        `Run from a workspace (cd workspaces/<suite>) or set DESIGNBOOK_DATA explicitly.`,
    );
  }
}
```

Then in `loadConfig`, after the `dataDir` is finalized in BOTH branches (the no-config-found fallback at the top of the function AND the with-config branch lower down), call:

```typescript
assertNotRepoRoot(dataDir);
```

The `dirname` import is already present. `existsSync` is already imported. No new imports.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/storybook-addon-designbook
npx vitest run src/__tests__/config.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Run full check to confirm no regressions**

```bash
pnpm check
```

Expected: typecheck ✓, lint ✓, test ✓.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/config.ts \
        packages/storybook-addon-designbook/src/__tests__/config.test.ts
git commit -m "feat(cli): refuse to write DESIGNBOOK_DATA inside repo root"
```

### Task 2: gitignore consolidation + designbook/ deletion

**Files:**
- Modify: `.gitignore`
- Delete: `<repo-root>/designbook/` (working tree)

- [ ] **Step 1: Replace the four `designbook/...` entries with a single `designbook/` and add `research-runs/`**

Edit `.gitignore`. Find the block:

```
.pnpm-store/
designbook/dbo.log
designbook/references/
designbook/stories/
designbook/workflows/
```

Replace with:

```
.pnpm-store/
designbook/
research-runs/
```

- [ ] **Step 2: Delete the local `designbook/` folder**

```bash
rm -rf designbook/
```

- [ ] **Step 3: Verify nothing tracked is now ignored**

```bash
git ls-files designbook/ 2>/dev/null
```

Expected: empty (we already untracked `dbo.log` in the workflow-result PR).

- [ ] **Step 4: Verify the CLI guard prevents recreation**

```bash
cd /tmp && /home/cw/projects/designbook/packages/storybook-addon-designbook/dist/cli.js workflow list 2>&1 | head -3
```

(Note: `dist/cli.js` may not exist if the build hasn't run. If so: `pnpm --filter storybook-addon-designbook build`, then re-run the smoke check.)

Expected: command runs, does not create `<repo-root>/designbook/`. (Running from `/tmp`, the guard isn't relevant; this just sanity-checks no regressions.)

Now run from the repo root to verify the guard fires:

```bash
cd /home/cw/projects/designbook
node packages/storybook-addon-designbook/dist/cli.js workflow list 2>&1 | head -3
```

Expected: error message containing "repo root" and exit non-zero. No `<repo-root>/designbook/` recreated.

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore: consolidate designbook/ gitignore and remove repo-root runtime dir"
```

---

## Phase 2 — Scoring infrastructure

### Task 3: dbo.log digester

**Files:**
- Create: `packages/storybook-addon-designbook/src/log/digest.ts`
- Create: `packages/storybook-addon-designbook/src/log/__tests__/digest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/storybook-addon-designbook/src/log/__tests__/digest.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { digestLog } from '../digest.js';

function makeLog(dir: string, entries: object[]): string {
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, 'dbo.log');
  writeFileSync(path, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return path;
}

describe('digestLog', () => {
  const tmp = resolve(tmpdir(), `dbo-digest-${Date.now()}`);

  it('keeps only tagged entries', () => {
    const log = makeLog(tmp, [
      { ts: '2026-05-01T00:00:00Z', cmd: 'workflow create', tagged: true },
      { ts: '2026-05-01T00:00:01Z', cmd: 'config' /* no tagged */ },
    ]);
    const digest = digestLog(log);
    expect(digest.entries).toHaveLength(1);
    expect(digest.entries[0]!.cmd).toBe('workflow create');
    rmSync(tmp, { recursive: true });
  });

  it('groups errors, retries, unresolved, and long-running', () => {
    const log = makeLog(tmp, [
      { ts: '2026-05-01T00:00:00Z', cmd: 'workflow create', tagged: true, error: 'YAML parse failed' },
      { ts: '2026-05-01T00:00:01Z', cmd: 'workflow done', tagged: true, args: { task: 'a' } },
      { ts: '2026-05-01T00:00:02Z', cmd: 'workflow done', tagged: true, args: { task: 'a' } },
      { ts: '2026-05-01T00:00:03Z', cmd: 'workflow create', tagged: true, result: { unresolved: ['param'] } },
      { ts: '2026-05-01T00:00:04Z', cmd: 'workflow render', tagged: true, duration_ms: 12000 },
    ]);
    const digest = digestLog(log);
    expect(digest.errors).toHaveLength(1);
    expect(digest.retries).toHaveLength(1);
    expect(digest.retries[0]!.count).toBeGreaterThanOrEqual(2);
    expect(digest.unresolved).toHaveLength(1);
    expect(digest.longRunning).toHaveLength(1);
    rmSync(tmp, { recursive: true });
  });

  it('returns empty digest if log is missing', () => {
    const digest = digestLog(resolve(tmpdir(), 'nonexistent.log'));
    expect(digest.entries).toEqual([]);
    expect(digest.errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/storybook-addon-designbook
npx vitest run src/log/__tests__/digest.test.ts
```

Expected: tests fail because `digest.ts` does not exist.

- [ ] **Step 3: Implement the digester**

Create `packages/storybook-addon-designbook/src/log/digest.ts`:

```typescript
/**
 * Read the tagged subset of dbo.log and group entries by friction signal.
 * Used by `_debo workflow score` and by research-mode subagent context bundles.
 */

import { readFileSync, existsSync } from 'node:fs';

export interface LogEntry {
  ts: string;
  cmd: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration_ms?: number;
  tagged?: boolean;
}

export interface RetryGroup {
  cmd: string;
  argsKey: string;
  count: number;
  entries: LogEntry[];
}

export interface LogDigest {
  entries: LogEntry[];
  errors: LogEntry[];
  retries: RetryGroup[];
  unresolved: LogEntry[];
  longRunning: LogEntry[];
}

const LONG_RUNNING_MS = 10_000;

export function digestLog(logPath: string): LogDigest {
  if (!existsSync(logPath)) {
    return { entries: [], errors: [], retries: [], unresolved: [], longRunning: [] };
  }
  const raw = readFileSync(logPath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  const all: LogEntry[] = [];
  for (const line of lines) {
    try {
      const e = JSON.parse(line) as LogEntry;
      if (e.tagged) all.push(e);
    } catch {
      // skip malformed
    }
  }

  const errors = all.filter((e) => typeof e.error === 'string' && e.error.length > 0);

  const unresolved = all.filter((e) => {
    const r = e.result as { unresolved?: unknown } | undefined;
    return Array.isArray(r?.unresolved) && (r!.unresolved as unknown[]).length > 0;
  });

  const longRunning = all.filter(
    (e) => typeof e.duration_ms === 'number' && e.duration_ms >= LONG_RUNNING_MS,
  );

  // Group consecutive entries with the same cmd + same key args (best-effort)
  const retries: RetryGroup[] = [];
  let cursor: RetryGroup | null = null;
  for (const e of all) {
    const argsKey = JSON.stringify(e.args ?? {});
    if (cursor && cursor.cmd === e.cmd && cursor.argsKey === argsKey) {
      cursor.count += 1;
      cursor.entries.push(e);
    } else {
      if (cursor && cursor.count >= 2) retries.push(cursor);
      cursor = { cmd: e.cmd, argsKey, count: 1, entries: [e] };
    }
  }
  if (cursor && cursor.count >= 2) retries.push(cursor);

  return { entries: all, errors, retries, unresolved, longRunning };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/storybook-addon-designbook
npx vitest run src/log/__tests__/digest.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/log/digest.ts \
        packages/storybook-addon-designbook/src/log/__tests__/digest.test.ts
git commit -m "feat(score): add dbo.log digester"
```

### Task 4: Composite-score formula + assertion sandbox

**Files:**
- Create: `packages/storybook-addon-designbook/src/scoring/composite.ts`
- Create: `packages/storybook-addon-designbook/src/scoring/__tests__/composite.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/storybook-addon-designbook/src/scoring/__tests__/composite.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { computeScore, evalAssertions, type ScoreInput } from '../composite.js';

describe('computeScore', () => {
  it('combines success_rate, assertions, and friction (max 130)', () => {
    const input: ScoreInput = {
      successRate: 0.7,
      assertions: { passed: 3, total: 4, failures: ['x'] },
      errors: 0,
      retries: 1,
      unresolved: 0,
    };
    const r = computeScore(input);
    // 0.7*100 + (3/4)*30 - 0 - 1*2 - 0 = 70 + 22.5 - 2 = 90.5
    expect(r.score).toBeCloseTo(90.5, 1);
    expect(r.computedFrom).toBe('composite');
  });

  it('falls back to friction-only when neither success_rate nor assertions are present', () => {
    const input: ScoreInput = { errors: 4, retries: 5, unresolved: 1 };
    const r = computeScore(input);
    // -4*5 -5*2 -1*3 = -20 -10 -3 = -33
    expect(r.score).toBe(-33);
    expect(r.computedFrom).toBe('friction');
  });

  it('uses success_rate alone when assertions are absent', () => {
    const r = computeScore({ successRate: 1.0, errors: 0, retries: 0, unresolved: 0 });
    expect(r.score).toBe(100);
    expect(r.computedFrom).toBe('composite');
  });

  it('uses assertions alone when success_rate is absent', () => {
    const r = computeScore({
      assertions: { passed: 4, total: 4, failures: [] },
      errors: 0,
      retries: 0,
      unresolved: 0,
    });
    expect(r.score).toBe(30);
    expect(r.computedFrom).toBe('composite');
  });
});

describe('evalAssertions', () => {
  it('passes assertions that return truthy', () => {
    const r = evalAssertions(
      [{ type: 'javascript', value: 'output.x === 1' }],
      { x: 1 },
    );
    expect(r.passed).toBe(1);
    expect(r.total).toBe(1);
    expect(r.failures).toEqual([]);
  });

  it('records failures with their source', () => {
    const r = evalAssertions(
      [{ type: 'javascript', value: 'output.x === 2' }],
      { x: 1 },
    );
    expect(r.passed).toBe(0);
    expect(r.failures).toEqual(['output.x === 2']);
  });

  it('isolates from outer scope (no access to process)', () => {
    const r = evalAssertions(
      [{ type: 'javascript', value: 'typeof process === "undefined"' }],
      {},
    );
    expect(r.passed).toBe(1);
  });

  it('treats throws as failures', () => {
    const r = evalAssertions(
      [{ type: 'javascript', value: 'output.missing.deep.thing' }],
      {},
    );
    expect(r.passed).toBe(0);
    expect(r.failures).toHaveLength(1);
  });

  it('skips assertions with unknown type', () => {
    const r = evalAssertions(
      [{ type: 'regex', value: 'foo' }],
      {},
    );
    expect(r.total).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/storybook-addon-designbook
npx vitest run src/scoring/__tests__/composite.test.ts
```

Expected: tests fail because `composite.ts` doesn't exist.

- [ ] **Step 3: Implement composite + sandbox**

Create `packages/storybook-addon-designbook/src/scoring/composite.ts`:

```typescript
/**
 * Composite metric for research-mode loop.
 *
 * score = success_rate*100 + (assertions.passed/total)*30
 *       - errors*5 - retries*2 - unresolved*3
 *
 * Falls back to friction-only when no correctness signal is present.
 */

import vm from 'node:vm';

export interface AssertionResult {
  passed: number;
  total: number;
  failures: string[];
}

export interface ScoreInput {
  successRate?: number;
  assertions?: AssertionResult;
  errors?: number;
  retries?: number;
  unresolved?: number;
}

export interface ScoreResult {
  score: number;
  components: {
    successRate?: number;
    assertions?: AssertionResult;
    errors: number;
    retries: number;
    unresolved: number;
  };
  computedFrom: 'composite' | 'friction';
}

const SUCCESS_WEIGHT = 100;
const ASSERTIONS_WEIGHT = 30;
const ERROR_PENALTY = 5;
const RETRY_PENALTY = 2;
const UNRESOLVED_PENALTY = 3;

export function computeScore(input: ScoreInput): ScoreResult {
  const errors = input.errors ?? 0;
  const retries = input.retries ?? 0;
  const unresolved = input.unresolved ?? 0;

  const hasSuccess = typeof input.successRate === 'number';
  const hasAssertions = !!input.assertions && input.assertions.total > 0;

  let positive = 0;
  if (hasSuccess) positive += input.successRate! * SUCCESS_WEIGHT;
  if (hasAssertions) {
    const ratio = input.assertions!.passed / input.assertions!.total;
    positive += ratio * ASSERTIONS_WEIGHT;
  }

  const friction = errors * ERROR_PENALTY + retries * RETRY_PENALTY + unresolved * UNRESOLVED_PENALTY;
  const score = positive - friction;

  const computedFrom: 'composite' | 'friction' = hasSuccess || hasAssertions ? 'composite' : 'friction';

  return {
    score,
    components: {
      ...(hasSuccess ? { successRate: input.successRate } : {}),
      ...(hasAssertions ? { assertions: input.assertions } : {}),
      errors,
      retries,
      unresolved,
    },
    computedFrom,
  };
}

export interface Assertion {
  type: string;
  value: string;
}

const ASSERTION_TIMEOUT_MS = 1000;

export function evalAssertions(assertions: Assertion[], output: unknown): AssertionResult {
  let passed = 0;
  let total = 0;
  const failures: string[] = [];

  for (const a of assertions) {
    if (a.type !== 'javascript') continue;
    total += 1;
    const ctx = vm.createContext({ output }, { codeGeneration: { strings: false, wasm: false } });
    try {
      const result = vm.runInContext(a.value, ctx, { timeout: ASSERTION_TIMEOUT_MS });
      if (result) {
        passed += 1;
      } else {
        failures.push(a.value);
      }
    } catch {
      failures.push(a.value);
    }
  }

  return { passed, total, failures };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/storybook-addon-designbook
npx vitest run src/scoring/__tests__/composite.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/scoring/composite.ts \
        packages/storybook-addon-designbook/src/scoring/__tests__/composite.test.ts
git commit -m "feat(score): add composite metric and assertion sandbox"
```

### Task 5: `_debo workflow score` subcommand

**Files:**
- Create: `packages/storybook-addon-designbook/src/cli/workflow-score.ts`
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts` (register the new subcommand)
- Create: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-score.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `packages/storybook-addon-designbook/src/cli/__tests__/workflow-score.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { runScore, type ScoreOptions } from '../workflow-score.js';

function setupWorkspace(name: string) {
  const root = resolve(tmpdir(), `score-${name}-${Date.now()}`);
  const dataDir = resolve(root, 'designbook');
  mkdirSync(dataDir, { recursive: true });
  return { root, dataDir };
}

describe('runScore', () => {
  it('reads dbo.log + workflow output and emits composite JSON', () => {
    const { root, dataDir } = setupWorkspace('happy');
    // dbo.log
    writeFileSync(
      resolve(dataDir, 'dbo.log'),
      JSON.stringify({ ts: '2026-05-01T00:00:00Z', cmd: 'workflow create', tagged: true }) + '\n',
    );
    // workflow archive
    const archive = resolve(dataDir, 'workflows', 'archive', 'design-screen');
    mkdirSync(archive, { recursive: true });
    writeFileSync(
      resolve(archive, 'output.json'),
      JSON.stringify({ success_rate: 0.8, metrics: { validation_errors: 0, retries: 0 } }),
    );
    // case file
    const caseFile = resolve(root, 'cases', 'design-screen.yaml');
    mkdirSync(resolve(root, 'cases'), { recursive: true });
    writeFileSync(
      caseFile,
      'fixtures: []\nprompt: x\nassert:\n  - type: javascript\n    value: "output.workflowOutput.success_rate >= 0.8"\n',
    );

    const opts: ScoreOptions = { dataDir, workflowName: 'design-screen', caseFile };
    const r = runScore(opts);
    expect(r.score).toBeGreaterThan(0);
    expect(r.computedFrom).toBe('composite');
    expect(r.components.assertions?.passed).toBe(1);
    rmSync(root, { recursive: true });
  });

  it('falls back to friction-only when no success_rate and no assertions', () => {
    const { root, dataDir } = setupWorkspace('friction');
    writeFileSync(
      resolve(dataDir, 'dbo.log'),
      [
        JSON.stringify({ ts: '2026-05-01T00:00:00Z', cmd: 'workflow create', tagged: true, error: 'oops' }),
        JSON.stringify({ ts: '2026-05-01T00:00:01Z', cmd: 'workflow done', tagged: true }),
      ].join('\n') + '\n',
    );
    const opts: ScoreOptions = { dataDir, workflowName: 'design-screen' };
    const r = runScore(opts);
    expect(r.computedFrom).toBe('friction');
    expect(r.score).toBeLessThan(0);
    rmSync(root, { recursive: true });
  });

  it('returns components even when output.json is missing', () => {
    const { root, dataDir } = setupWorkspace('no-output');
    writeFileSync(resolve(dataDir, 'dbo.log'), '');
    const r = runScore({ dataDir, workflowName: 'design-screen' });
    expect(r.components.errors).toBe(0);
    rmSync(root, { recursive: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/storybook-addon-designbook
npx vitest run src/cli/__tests__/workflow-score.test.ts
```

Expected: tests fail because `workflow-score.ts` doesn't exist.

- [ ] **Step 3: Implement `workflow-score.ts`**

Create `packages/storybook-addon-designbook/src/cli/workflow-score.ts`:

```typescript
/**
 * `_debo workflow score` — emit composite metric for the most recent run of a case.
 *
 * Reads:
 *   - $DATA/dbo.log               (filtered to tagged: true)
 *   - $DATA/workflows/archive/<workflow>/output.json (if present)
 *   - <case file>                 (if provided, evaluates assert: block)
 *
 * Emits JSON to stdout. Used by the research-mode loop in designbook-test.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { load as parseYaml } from 'js-yaml';
import { loadConfig } from '../config.js';
import { digestLog } from '../log/digest.js';
import { computeScore, evalAssertions, type Assertion, type AssertionResult } from '../scoring/composite.js';

export interface ScoreOptions {
  dataDir: string;
  workflowName: string;
  caseFile?: string;
}

export interface ScoreCliResult {
  score: number;
  components: {
    successRate?: number;
    assertions?: AssertionResult;
    errors: number;
    retries: number;
    unresolved: number;
  };
  computedFrom: 'composite' | 'friction';
  workflow: string;
}

interface WorkflowOutput {
  success_rate?: number;
  metrics?: { validation_errors?: number; retries?: number };
}

export function runScore(opts: ScoreOptions): ScoreCliResult {
  const digest = digestLog(resolve(opts.dataDir, 'dbo.log'));
  const errors = digest.errors.length;
  const retries = digest.retries.reduce((acc, g) => acc + (g.count - 1), 0);
  const unresolved = digest.unresolved.length;

  // Workflow output (optional)
  const outputPath = resolve(opts.dataDir, 'workflows', 'archive', opts.workflowName, 'output.json');
  let workflowOutput: WorkflowOutput | undefined;
  if (existsSync(outputPath)) {
    try {
      workflowOutput = JSON.parse(readFileSync(outputPath, 'utf-8')) as WorkflowOutput;
    } catch {
      workflowOutput = undefined;
    }
  }

  // Case file (optional, for assertions)
  let assertions: AssertionResult | undefined;
  if (opts.caseFile && existsSync(opts.caseFile)) {
    const caseDoc = parseYaml(readFileSync(opts.caseFile, 'utf-8')) as { assert?: Assertion[] } | null;
    const assertList = caseDoc?.assert ?? [];
    if (assertList.length > 0) {
      const output = {
        workflowOutput: workflowOutput ?? null,
        errors: digest.errors,
        retries: digest.retries,
      };
      assertions = evalAssertions(assertList, output);
    }
  }

  const r = computeScore({
    successRate: workflowOutput?.success_rate,
    assertions,
    errors,
    retries,
    unresolved,
  });

  return { ...r, workflow: opts.workflowName };
}

export function register(workflow: Command): void {
  workflow
    .command('score')
    .description('Compute composite metric for the most recent run of a case.')
    .requiredOption('--workflow <name>', 'Workflow name (e.g., design-screen)')
    .option('--case <file>', 'Optional path to a case YAML to evaluate its assert: block')
    .option('--json', 'Emit JSON (default: pretty-printed)')
    .action((opts: { workflow: string; case?: string; json?: boolean }) => {
      const config = loadConfig();
      const r = runScore({ dataDir: config.data, workflowName: opts.workflow, caseFile: opts.case });
      if (opts.json) {
        console.log(JSON.stringify(r));
      } else {
        console.log(`score: ${r.score.toFixed(2)}  (${r.computedFrom})`);
        console.log(JSON.stringify(r.components, null, 2));
      }
      process.exitCode = 0;
    });
}
```

- [ ] **Step 4: Wire `register` into `workflow.ts`**

Open `packages/storybook-addon-designbook/src/cli/workflow.ts`. At the top of the file, after the existing imports, add:

```typescript
import { register as registerScore } from './workflow-score.js';
```

At the bottom of the existing `register(program: Command)` function, just before the final closing `}`, add:

```typescript
  registerScore(workflow);
```

(The variable `workflow` is the existing `program.command('workflow')` reference inside `register` — find where it's created near the top of the function.)

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/storybook-addon-designbook
npx vitest run src/cli/__tests__/workflow-score.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 6: Run full check**

```bash
pnpm check
```

Expected: typecheck ✓, lint ✓, test ✓.

- [ ] **Step 7: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow-score.ts \
        packages/storybook-addon-designbook/src/cli/workflow.ts \
        packages/storybook-addon-designbook/src/cli/__tests__/workflow-score.test.ts
git commit -m "feat(cli): add _debo workflow score subcommand"
```

---

## Phase 3 — Skill files

### Task 6: `research-audit.md` (audit criteria, extracted)

**Files:**
- Create: `.agents/skills/designbook-test/research-audit.md`

This is markdown only — no tests needed.

- [ ] **Step 1: Load the skill-creator skill**

Per the project's CLAUDE.md, before creating any rule/blueprint/task/schema/workflow file under `.agents/skills/`, load `designbook-skill-creator` first. Since this is a resource file (not a task/rule/blueprint), the rule is more lenient — but reading the skill once gives us the conventions for the file shape. Use `Skill designbook-skill-creator` once.

- [ ] **Step 2: Create the file**

Create `.agents/skills/designbook-test/research-audit.md`:

```markdown
---
name: research-audit
description: Audit criteria for files loaded during a research-mode workflow run. Used as a context signal by the research-mode subagent and as a final-summary reporter.
---

# Research Audit

Systematic file-level review applied after a workflow completes. Output is a Markdown table (one row per loaded file) with an `Issues` column that flags violations of the 4-level skill model.

## When to load

- During a `debo-test --research` iteration: reads tasks.yml + dbo.log digest, produces audit table for `research-runs/<slug>/iterations/<N>/audit.md`.
- After a research run terminates: produces `final-audit.md` so the user sees what's still flagged.

## Inputs

| Input | Source |
|---|---|
| Resolved file list | `<workspace>/<DATA>/workflows/archive/<workflow>/tasks.yml` — tasks, rules, blueprints, schemas |
| Per-file content | Read each path |
| Friction signals | Output of `digestLog($DATA/dbo.log)` |

## Audit dimensions

For each loaded file, check:

### Type correctness

| File type | Must contain | Must NOT contain |
|---|---|---|
| Task | Output declarations (`result:`, `params:`) | Style guidance, framework-specific logic |
| Rule | Hard constraints, `when:` conditions, optional `extends:`/`provides:`/`constrains:` | Overridable suggestions, examples that vary by integration |
| Blueprint | Overridable starting points, optional `extends:`/`provides:` | `constrains:`, absolute constraints that should be rules |

### Domain responsibility

- Core skill files (`designbook/`) — must be integration-agnostic. Flag if they contain framework-specific logic.
- Integration skill files (`designbook-*/`) — must handle their specific concern. Flag if they duplicate core logic or reach into another integration's domain.

### Loading correctness

- Were all relevant integration rules loaded for this run? Cross-reference `when:` conditions against the active config.
- Were any rules loaded that shouldn't have been? (wrong `when` scope, outdated step names)

### Duplication

- Cross-file: do two files describe the same constraint or mapping?
- Cross-layer: does a task repeat what a rule already enforces?
- Cross-skill: do two integration skills handle the same concern?

### Content coherence

- Does the file reference CLI commands or params that exist?
- Does it describe manual steps that the CLI handles automatically?
- Are `domain:` values current (valid taxonomy, no stale domains)?
- Do `result:` schemas match the actual outputs being produced?

### Friction correlation

For each error/retry/unresolved entry in the friction signal, identify which loaded file is responsible (by matching the `cmd` to the file that triggered the call). Surface in the `Issues` column.

## Output shape

```
| File | Type | Domain | Issues |
|------|------|--------|--------|
| intake--tokens.md | task | core | ⚠ Missing `## Result:` section for data result |
| renderer-hints.md | rule | core | ✓ OK |
| ... | ... | ... | ... |
```

Save to `research-runs/<slug>/iterations/<N>/audit.md`.

The final-audit (post-loop) writes the same shape to `research-runs/<slug>/final-audit.md`.
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-test/research-audit.md
git commit -m "feat(skill): add research-audit module for designbook-test"
```

### Task 7: `research.md` — the loop protocol

**Files:**
- Create: `.agents/skills/designbook-test/research.md`

- [ ] **Step 1: Load the skill-creator skill** (already loaded if Task 6 just ran; otherwise reload).

- [ ] **Step 2: Create the file**

Create `.agents/skills/designbook-test/research.md`:

```markdown
---
name: research
description: Autonomous skill-improvement loop for a single test case. Run case → score → ideate one change via subagent → re-run → keep or discard → repeat until target / iteration cap / plateau.
---

# Research Mode

This file is loaded by `debo-test/SKILL.md` when `--research` is parsed from `$ARGUMENTS`.

## Inputs (parsed by SKILL.md before loading this file)

| Variable | Source |
|---|---|
| `$SUITE` | `<suite>` arg |
| `$CASE` | `<case>` arg |
| `$ITERATIONS` | `--iterations N`, default 25 |
| `$TARGET` | `--target T`, default 100 |
| `$PLATEAU` | `--plateau M`, default 5 |
| `$BASELINE_ONLY` | `--baseline-only`, boolean |
| `$SCOPE` | `--scope <glob,glob,...>`, default = files resolved from `tasks.yml` + `packages/storybook-addon-designbook/src/**` |

## Setup

1. Resolve workspace path: `workspaces/$SUITE`.
2. Run `./scripts/setup-workspace.sh $SUITE`. This deletes any prior workspace and rebuilds from scratch (rsync, symlinks, `git init`, `pnpm install`, baseline commit).
3. Run `./scripts/setup-test.sh $SUITE $CASE --into workspaces/$SUITE` to layer the case fixtures.
4. Start Storybook via the addon CLI (cd into the workspace first):
   ```
   _debo() { npx storybook-addon-designbook "$@"; }
   eval "$(_debo config)"
   _debo storybook start
   ```
5. Tag the workspace baseline: `cd workspaces/$SUITE && git tag workspace-baseline`.
6. Tag the repo baseline: `cd <repo-root> && git tag research-baseline-$(date +%Y-%m-%d-%H%M)`.
7. Compute the slug: `<YYYY-MM-DD-HHMM>-$SUITE-$CASE`.
8. Create the run dir: `research-runs/<slug>/` with empty `score-history.tsv` (header row), `overview.md`, `scope.txt`.

## Iteration 0 — baseline

1. Inside the workspace, run the case prompt (read `fixtures/$SUITE/cases/$CASE.yaml` `prompt:` field).
2. Every `_debo workflow …` CLI call inside the case run MUST be invoked with `--log` so dbo.log entries are tagged.
3. After the run completes, inside the workspace:
   - `_debo workflow score --workflow <id> --case ../../fixtures/$SUITE/cases/$CASE.yaml --json` → write to `research-runs/<slug>/iterations/000-baseline/score.json`.
4. Generate the audit table per `research-audit.md` → `research-runs/<slug>/iterations/000-baseline/audit.md`.
5. Save the dbo.log digest: copy the JSON output of `digestLog` (or run a small node one-liner that imports it) → `iterations/000-baseline/log-digest.json`.
6. Append a row to `score-history.tsv`:
   ```
   iter	hypothesis	score	delta	decision
   0	baseline	<score>	—	keep
   ```
7. If `$BASELINE_ONLY`: print the baseline score and stop.

## Loop iteration N (N ≥ 1)

### 1. Build subagent context bundle

Write/refresh these files under `research-runs/<slug>/`:
- `scope.txt` — list of editable file paths (one per line) derived from tasks.yml + `packages/storybook-addon-designbook/src/**`
- `last-kept.patch` — symlink (or copy) of the most recent kept iteration's `proposed.patch` (skip on iter 1)

### 2. Dispatch subagent

Use the `Agent` tool with `subagent_type: "general-purpose"`. Pass this prompt verbatim, replacing `<slug>` and `<N-1>`:

```
Goal: propose ONE change to improve composite score on this run.

Context bundle (read these files):
- research-runs/<slug>/iterations/<N-1>/audit.md
- research-runs/<slug>/iterations/<N-1>/log-digest.json
- research-runs/<slug>/iterations/<N-1>/score.json
- research-runs/<slug>/score-history.tsv
- research-runs/<slug>/scope.txt
- research-runs/<slug>/last-kept.patch  (skip if missing)

Constraints:
- One change. One file. Smallest possible diff.
- Only edit files listed in scope.txt.
- Avoid hypotheses already discarded (see decision column in score-history.tsv).
- Read the file before editing.

Return: a one-paragraph hypothesis followed by a unified diff in your final message. Do NOT apply the diff yourself.
```

### 3. Apply the diff

1. Save the subagent's reply to `iterations/<N>/hypothesis.md` (full text, including diff).
2. Extract the unified diff into `iterations/<N>/proposed.patch`.
3. Validate scope: `git apply --check iterations/<N>/proposed.patch` from the repo root. If patch fails check, OR diff touches a file not in scope.txt → mark as `ideate-failed`, re-dispatch with hint (max 3 ideate-failures in a row → bail).
4. Apply: `git apply iterations/<N>/proposed.patch` (no commit yet).

### 4. Reset workspace

Inside the workspace:
```
git reset --hard workspace-baseline
git clean -fdx designbook/ workflows/
```

### 5. Re-verify + score

Re-run the case prompt with `--log` on every `_debo workflow …` call, then:
- `_debo workflow score --workflow <id> --case <path> --json` → `iterations/<N>/score.json`
- Generate audit → `iterations/<N>/audit.md`
- Generate digest → `iterations/<N>/log-digest.json`

### 6. Decide

Compare `iterations/<N>/score.json:.score` with the **best-so-far** score (max from previous keeps + baseline).

| Outcome | Condition | Action |
|---|---|---|
| keep | new > best | Repo root: `git commit -am "experiment: <hypothesis-headline>"`. Update best. |
| discard | new ≤ best, no crash | Repo root: `git restore <files-touched-by-patch>`. |
| crash | re-run threw / score CLI failed | Repo root: `git restore`. Retry SAME hypothesis up to 3 times. |
| blocked | crash count ≥ 3 | Log as blocked, ideate again next iteration with this discard recorded. |

Write `iterations/<N>/decision.txt` with one of: `keep`, `discard`, `crash`, `blocked`.

### 7. Append history

Append to `score-history.tsv`:
```
<N>	<hypothesis-headline>	<score>	<delta>	<decision>
```

### 8. Termination check (after EVERY iteration)

Stop if any condition holds:
- Best score ≥ `$TARGET` → terminate-target
- N ≥ `$ITERATIONS` → terminate-cap
- Last `$PLATEAU` iterations all have decision != `keep` → terminate-plateau

Otherwise continue to iteration N+1.

## Termination

1. Append final row to `score-history.tsv` with `decision: terminate-<reason>`.
2. Run audit one last time on the current state → `final-audit.md`.
3. Write `overview.md` with: config, baseline score, best score, total kept/discarded/crashed, list of kept hypotheses (one per line).
4. Print overview to stdout.
5. Leave workspace + Storybook running so the user can inspect.

## Resume semantics

If `research-runs/<slug>/` already exists at launch:
- If workspace `git status` is clean: prompt "resume from iteration N+1 or start fresh?" — start fresh deletes the run dir and re-runs setup.
- If workspace has uncommitted scope-file changes: refuse with a message; user must clean up manually.

## Failure modes

| Failure | Recovery |
|---|---|
| Workflow crash mid-run | `git restore`, retry same hypothesis up to 3, then `blocked`. |
| `_debo workflow score` returns non-zero | Bail loop. Print `score CLI failed — inspect <path>`. |
| Subagent returns invalid patch | Re-dispatch with hint, max 3 in a row, then bail. |
| Workspace reset fails | Bail. Tell user to rebuild via `debo-test $SUITE $CASE`. |
| User Ctrl-C | Stop after current iteration completes. Print partial summary. |
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-test/research.md
git commit -m "feat(skill): add research-mode loop protocol"
```

### Task 8: `designbook-test/SKILL.md` — `--research` dispatch

**Files:**
- Modify: `.agents/skills/designbook-test/SKILL.md`

- [ ] **Step 1: Read the existing dispatch logic**

Open `.agents/skills/designbook-test/SKILL.md` and review the current `Workflow` section (steps 1–5).

- [ ] **Step 2: Add the dispatch branch**

After step 1 ("List cases") and before step 2 ("Setup workspace"), insert:

```markdown
### 1b. Parse `--research` flags (research mode)

Parse from `$ARGUMENTS`:
- `--research` (boolean) — enables research mode
- `--iterations N` (default 25)
- `--target T` (default 100)
- `--plateau M` (default 5)
- `--baseline-only` (boolean)
- `--scope <glob>` (comma-separated)

If `--research` is present:
- If only `<suite>` is provided (no `<case>`): error "research mode requires a case", list cases, stop.
- Else: run setup steps 2–3 (workspace + start storybook), then **load `research.md` and follow it**. Skip steps 4 (prompt confirm) and 5 (snapshot offer).
```

- [ ] **Step 3: Verify the change parses correctly**

Re-read the file and ensure section numbering still makes sense.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-test/SKILL.md
git commit -m "feat(skill): add --research dispatch to debo-test"
```

---

## Phase 4 — Removal of `_debo --research`

### Task 9: Remove `--research` from `designbook/SKILL.md`

**Files:**
- Modify: `.agents/skills/designbook/SKILL.md`

- [ ] **Step 1: Locate the `--research` row in the flag table**

Open the file. Find the table containing `--research`.

- [ ] **Step 2: Delete the row and any text describing the flag**

Remove the entire `--research` table row. Also remove any sentences that mention combining flags like `--optimize --research` — keep `--optimize` references intact, just drop `--research`. The `--log` flag stays.

- [ ] **Step 3: Verify nothing references the removed flag**

```bash
grep -n -- "--research" .agents/skills/designbook/SKILL.md
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/SKILL.md
git commit -m "refactor(skill): remove --research flag from _debo SKILL.md"
```

### Task 10: Remove "Research Pass" section from `workflow-execution.md`

**Files:**
- Modify: `.agents/skills/designbook/resources/workflow-execution.md`

- [ ] **Step 1: Find the "Research" / "Research Pass" section**

```bash
grep -n -i "research" .agents/skills/designbook/resources/workflow-execution.md
```

- [ ] **Step 2: Delete the entire section (heading + body)**

The section is described in the spec as "the Research Pass section". Remove it cleanly without leaving an orphan heading or a dangling "see also" link to it.

- [ ] **Step 3: Verify**

```bash
grep -n -i "research" .agents/skills/designbook/resources/workflow-execution.md
```

Expected: no remaining mentions of `--research` or "Research Pass". (Other uses of the word "research" outside this context are fine if any exist.)

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/resources/workflow-execution.md
git commit -m "refactor(skill): remove Research Pass section from workflow-execution"
```

### Task 11: Update `designbook-skill-creator/SKILL.md` reference

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/SKILL.md`

- [ ] **Step 1: Find the link to `resources/research.md`**

```bash
grep -n "resources/research.md" .agents/skills/designbook-skill-creator/SKILL.md
```

- [ ] **Step 2: Update the link**

Change the description so it points at the new home — `designbook-test/research.md`. Wording target:

> See `.agents/skills/designbook-test/research.md` for the autonomous research-mode loop protocol. The audit criteria are in `.agents/skills/designbook-test/research-audit.md`.

Replace whatever the current sentence is with that.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-skill-creator/SKILL.md
git commit -m "docs(skill): point skill-creator at new research-mode home"
```

### Task 12: Rewrite `designbook-skill-creator/resources/research.md`

**Files:**
- Modify (rewrite): `.agents/skills/designbook-skill-creator/resources/research.md`

- [ ] **Step 1: Replace the file contents**

Overwrite with a thin pointer that retains the audit-criteria reference (since skill-creator users may still want to know HOW the audit works conceptually):

```markdown
---
name: research
description: Pointer to the autonomous research-mode loop and audit criteria. The user-facing loop lives in designbook-test; skill-creator users consult the audit criteria when authoring tasks/rules/blueprints.
---

# Research (relocated)

The `--research` flag was removed from `_debo` and replaced by the autonomous loop on `debo-test`:

```
debo-test <suite> <case> --research
```

See:
- `.agents/skills/designbook-test/research.md` — the loop protocol
- `.agents/skills/designbook-test/research-audit.md` — audit criteria (used by the loop and as a checklist when authoring skill files)

When authoring or reviewing a task/rule/blueprint, the audit dimensions are useful even outside a research run:
- Type correctness (task vs rule vs blueprint)
- Domain responsibility (core vs integration)
- Duplication (cross-file, cross-layer, cross-skill)
- Content coherence (CLI commands exist, schemas match)
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook-skill-creator/resources/research.md
git commit -m "docs(skill): rewrite research.md as pointer to debo-test loop"
```

---

## Phase 5 — Smoke validation

### Task 13: Manual smoke run

**Files:** none modified — purely verification.

- [ ] **Step 1: Build the addon**

```bash
pnpm --filter storybook-addon-designbook build
```

Expected: dist/ updated, no errors.

- [ ] **Step 2: Run a baseline-only research invocation on an existing case**

Pick a small existing case (e.g. `drupal-petshop tokens` if it exists; otherwise the smallest one):

```bash
ls fixtures/drupal-petshop/cases/
```

Then via Claude (this skill is invoked from a Claude session):

```
debo-test drupal-petshop <smallest-case> --research --baseline-only
```

Expected: workspace built, storybook started, case ran, `research-runs/<slug>/iterations/000-baseline/{audit.md,log-digest.json,score.json}` populated, `score-history.tsv` has a baseline row, then stops.

- [ ] **Step 3: Inspect run dir**

```bash
ls research-runs/
ls research-runs/*/
ls research-runs/*/iterations/000-baseline/
cat research-runs/*/score-history.tsv
```

Expected: layout matches the spec; `score.json` has reasonable values.

- [ ] **Step 4: Run a 2-iteration research loop**

```
debo-test drupal-petshop <smallest-case> --research --iterations 2
```

Expected: 2 iterations run; `iterations/001/` and `iterations/002/` populated with `hypothesis.md`, `proposed.patch`, audit, digest, score, decision; `score-history.tsv` has 3 rows (baseline + 2). Workspace storybook still running.

- [ ] **Step 5: Verify final-audit + overview**

```bash
cat research-runs/*/final-audit.md | head -20
cat research-runs/*/overview.md
```

Expected: audit table present, overview lists baseline → best score and counts.

- [ ] **Step 6: Commit any tweaks discovered during smoke**

If the smoke run reveals issues that require a fix, commit each fix as a focused commit citing what failed in the smoke run.

---

## Phase 6 — Final validation

### Task 14: Full project check

- [ ] **Step 1: Run `pnpm check`**

```bash
pnpm check
```

Expected: typecheck ✓, lint ✓, test ✓.

- [ ] **Step 2: Verify branch state**

```bash
git status
git log --oneline origin/main..HEAD
```

Expected: clean working tree; commit log shows the planned tasks in order.

- [ ] **Step 3: Verify removed surfaces stay removed**

```bash
grep -rn -- "--research" .agents/skills/designbook/ .agents/skills/designbook-skill-creator/SKILL.md \
  | grep -v "designbook-test/research.md" \
  | grep -v "research.md - Pointer"
```

Expected: only the pointer reference remains in skill-creator. No live `--research` flag handling in `designbook/`.

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin feat/research-mode
```

Use `gh pr create` with a title under 70 chars; body should mention the spec doc path and link to a sample `research-runs/<slug>/overview.md` (omit if not preserved on disk).

---

## Self-review checklist (engineer should re-confirm before marking done)

- [ ] All 8 modify-scope decisions in the spec are honored: scope = files in `tasks.yml` + CLI source.
- [ ] Composite formula in code matches spec section "Composite metric" exactly (weights: 100, 30, 5, 2, 3).
- [ ] No `_debo --research` references remain anywhere except the rewritten pointer.
- [ ] `research-runs/` is gitignored at repo root.
- [ ] `<repo-root>/designbook/` is deleted and CLI guard prevents recreation.
- [ ] All new tests pass; `pnpm check` clean.
- [ ] Smoke run produces the documented run-dir layout.
