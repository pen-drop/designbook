# Scene-Payload Env-Var Substitution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the existing `$VAR`/`${VAR}` env-substitution regex from `interpolate.ts` into a shared helper, apply it recursively to every string leaf of `workflow done --data` payloads, and correct the scenes-constraints rule that described this resolution as already happening.

**Architecture:** Pure refactor of `interpolate.ts` to surface its env-substitution primitive, plus a new recursive walker `substituteEnvInData` that reuses that primitive. The walker runs once inside `workflowDone` before the data payload is serialized and written, so literals land on disk for every downstream consumer (scene validator, Storybook scene-builder, schema validation).

**Tech Stack:** TypeScript, vitest, `packages/storybook-addon-designbook/src/template` + `src/workflow.ts` + `.agents/skills/designbook/design/rules/`

**Spec:** `docs/superpowers/specs/2026-04-18-scene-payload-env-substitution-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `packages/storybook-addon-designbook/src/template/substitute-env.ts` (NEW) | Pure helper `substituteEnv(str, envMap, {lenient})`. Holds the two env regexes extracted from `interpolate.ts`. |
| `packages/storybook-addon-designbook/src/template/substitute-env-in-data.ts` (NEW) | Pure recursive walker `substituteEnvInData(value, envMap, {lenient, path})`. Applies `substituteEnv` to every string leaf; threads dotted path for error context. |
| `packages/storybook-addon-designbook/src/template/interpolate.ts` (MODIFY) | Delegate the two env-regex replace passes to `substituteEnv`. No observable behavior change. |
| `packages/storybook-addon-designbook/src/workflow.ts` (MODIFY) | Call `substituteEnvInData(value, envMap)` inside the `--data` loop at `workflow.ts:907`, before `serializeForPath`. Build `envMap` once via existing `buildEnvMap(options.config)`. |
| `packages/storybook-addon-designbook/src/template/__tests__/substitute-env.test.ts` (NEW) | Unit tests for `substituteEnv`. |
| `packages/storybook-addon-designbook/src/template/__tests__/substitute-env-in-data.test.ts` (NEW) | Unit tests for `substituteEnvInData`. |
| `packages/storybook-addon-designbook/src/template/__tests__/interpolate.test.ts` (UNCHANGED) | Existing regression test file. Must stay green after refactor. |
| `packages/storybook-addon-designbook/src/validators/__tests__/workflow-done-env-substitution.test.ts` (NEW) | Integration test: `workflowDone` with `--data` containing `$DESIGNBOOK_*` writes file with resolved literal. |
| `.agents/skills/designbook/design/rules/scenes-constraints.md` (MODIFY) | Replace phantom "Rule 0" reference with accurate engine-substitution note. |

---

## Task 1: Extract `substituteEnv` Helper

**Files:**
- Create: `packages/storybook-addon-designbook/src/template/substitute-env.ts`
- Create: `packages/storybook-addon-designbook/src/template/__tests__/substitute-env.test.ts`

- [ ] **Step 1.1: Write the failing unit tests**

Create `packages/storybook-addon-designbook/src/template/__tests__/substitute-env.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { substituteEnv } from '../substitute-env.js';

const envMap = { DESIGNBOOK_HOME: '/abs/home', DESIGNBOOK_COMPONENT_NAMESPACE: 'ns' };

describe('substituteEnv', () => {
  it('expands $VAR form', () => {
    expect(substituteEnv('$DESIGNBOOK_HOME/file.yml', envMap)).toBe('/abs/home/file.yml');
  });

  it('expands ${VAR} form', () => {
    expect(substituteEnv('${DESIGNBOOK_HOME}/file.yml', envMap)).toBe('/abs/home/file.yml');
  });

  it('expands embedded $VAR:suffix (the scene-namespace case)', () => {
    expect(substituteEnv('$DESIGNBOOK_COMPONENT_NAMESPACE:page', envMap)).toBe('ns:page');
  });

  it('does not match lowercase-leading $foo', () => {
    expect(substituteEnv('$foo/bar', envMap)).toBe('$foo/bar');
  });

  it('does not match numeric-leading $5', () => {
    expect(substituteEnv('Cost: $5', envMap)).toBe('Cost: $5');
  });

  it('does not match $$escaped', () => {
    // The `(?<![\w$])` lookbehind excludes `$$`; the second `$` is not env-matched.
    expect(substituteEnv('$$DESIGNBOOK_HOME', envMap)).toBe('$$DESIGNBOOK_HOME');
  });

  it('throws on unknown $VAR by default', () => {
    expect(() => substituteEnv('$UNKNOWN', envMap)).toThrow(/UNKNOWN/);
  });

  it('throws on unknown ${VAR} by default', () => {
    expect(() => substituteEnv('${UNKNOWN}', envMap)).toThrow(/UNKNOWN/);
  });

  it('leaves unknown var as-is when lenient', () => {
    expect(substituteEnv('$UNKNOWN/x', envMap, { lenient: true })).toBe('$UNKNOWN/x');
    expect(substituteEnv('${UNKNOWN}/x', envMap, { lenient: true })).toBe('${UNKNOWN}/x');
  });

  it('returns string unchanged when no env tokens present', () => {
    expect(substituteEnv('hello world', envMap)).toBe('hello world');
  });

  it('accepts undefined envMap and throws on any env token', () => {
    expect(() => substituteEnv('$DESIGNBOOK_HOME', undefined)).toThrow(/DESIGNBOOK_HOME/);
  });

  it('accepts undefined envMap in lenient mode', () => {
    expect(substituteEnv('$DESIGNBOOK_HOME', undefined, { lenient: true })).toBe('$DESIGNBOOK_HOME');
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

Run: `pnpm --filter storybook-addon-designbook test -- substitute-env.test`
Expected: FAIL — "Cannot find module '../substitute-env.js'" (module does not exist yet)

- [ ] **Step 1.3: Implement `substituteEnv`**

Create `packages/storybook-addon-designbook/src/template/substitute-env.ts`:

```ts
export interface SubstituteEnvOptions {
  lenient?: boolean;
}

/**
 * Substitute $VAR and ${VAR} tokens in a string against envMap.
 *
 * Regex semantics (shared with interpolate()):
 * - Matches `$[A-Z_][A-Z0-9_]*` and `${[A-Z_][A-Z0-9_]*}`.
 * - `(?<![\w$])` excludes `$$ESC` and mid-identifier `foo$BAR`.
 * - Lowercase-leading (`$foo`) and numeric-leading (`$5`) tokens never match.
 *
 * Unknown env vars throw by default; pass `{ lenient: true }` to leave them as-is.
 */
export function substituteEnv(
  input: string,
  envMap: Record<string, string> | undefined,
  options: SubstituteEnvOptions = {},
): string {
  const { lenient = false } = options;

  return input
    .replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (match, name: string) => {
      if (envMap && envMap[name] !== undefined) return envMap[name]!;
      if (lenient) return match;
      throw new Error(`Unknown environment variable: \${${name}}`);
    })
    .replace(/(?<![\w$])\$([A-Z_][A-Z0-9_]*)/g, (match, name: string) => {
      if (envMap && envMap[name] !== undefined) return envMap[name]!;
      if (lenient) return match;
      throw new Error(`Unknown environment variable: $${name}`);
    });
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

Run: `pnpm --filter storybook-addon-designbook test -- substitute-env.test`
Expected: PASS (12/12)

- [ ] **Step 1.5: Commit**

```bash
git add packages/storybook-addon-designbook/src/template/substitute-env.ts \
        packages/storybook-addon-designbook/src/template/__tests__/substitute-env.test.ts
git commit -m "$(cat <<'EOF'
feat(addon): extract substituteEnv helper for $VAR/${VAR} expansion

Shared primitive for env-var substitution in template strings and data
payloads. Same regex and strict-by-default semantics as the inline logic
in interpolate.ts, now callable without JSONata overhead.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Refactor `interpolate` to Use `substituteEnv`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/template/interpolate.ts`
- Unchanged: `packages/storybook-addon-designbook/src/template/__tests__/interpolate.test.ts` (regression test)

- [ ] **Step 2.1: Verify existing tests pass before refactor**

Run: `pnpm --filter storybook-addon-designbook test -- interpolate.test`
Expected: PASS (existing ~11 tests)

- [ ] **Step 2.2: Refactor `interpolate.ts`**

Replace the two inline env-regex blocks (lines 41-51 and 84-92) with calls to `substituteEnv`. The pre-JSONata pass still needs to rewrite `$VAR` into `{{ $env.VAR }}` so JSONata can evaluate it — that special-case path must stay. The post-join pass just does literal substitution and can be replaced.

Apply this exact edit — replace the whole function body of `interpolate`:

```ts
import jsonata from 'jsonata';
import { substituteEnv } from './substitute-env.js';

type Expression = ReturnType<typeof jsonata>;

const cache = new Map<string, Expression>();

function compile(expr: string): Expression {
  const hit = cache.get(expr);
  if (hit) return hit;
  const compiled = jsonata(expr);
  cache.set(expr, compiled);
  return compiled;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === 'object') {
      if ('scene' in first) return String((first as { scene: unknown }).scene);
      if ('storyId' in first) return String((first as { storyId: unknown }).storyId);
    }
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

export interface InterpolateOptions {
  lenient?: boolean;
  envMap?: Record<string, string>;
}

export async function interpolate(
  template: string,
  scope: Record<string, unknown>,
  options: InterpolateOptions = {},
): Promise<string> {
  const { lenient = false, envMap } = options;

  // Pre-JSONata pass: rewrite env tokens into {{ $env.VAR }} so JSONata
  // can evaluate them alongside scope expressions. This behavior is
  // specific to interpolate(); substituteEnv() alone does literal replace.
  const prepared = template
    .replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (match, name: string) => {
      if (envMap && envMap[name] !== undefined) return `{{ $env.${name} }}`;
      if (lenient) return match;
      throw new Error(`Unknown environment variable: \${${name}} in path "${template}"`);
    })
    .replace(/(?<![\w$])\$([A-Z_][A-Z0-9_]*)/g, (match, name: string) => {
      if (envMap && envMap[name] !== undefined) return `{{ $env.${name} }}`;
      if (lenient) return match;
      throw new Error(`Unknown environment variable: $${name} in path "${template}"`);
    });

  const bindings: Record<string, unknown> = {};
  if (envMap) bindings.env = envMap;
  for (const key of Object.keys(scope)) {
    if (key.startsWith('$')) bindings[key.slice(1)] = scope[key];
  }

  const parts = prepared.split(/(\{\{[^}]*\}\})/);
  const resolved = await Promise.all(
    parts.map(async (part) => {
      const match = part.match(/^\{\{\s*(.+?)\s*\}\}$/);
      if (!match) return part;
      const expr = match[1]!;
      let value: unknown;
      try {
        value = await compile(expr).evaluate(scope, bindings);
      } catch (err) {
        if (lenient) return part;
        throw new Error(`Error evaluating {{ ${expr} }} in "${template}": ${(err as Error).message}`);
      }
      if (value === undefined) {
        if (lenient) return part;
        throw new Error(`Unknown expression: {{ ${expr} }} in "${template}"`);
      }
      return stringify(value);
    }),
  );
  let joined = resolved.join('');

  // Post-JSONata pass: any env tokens that survived (e.g. emitted by
  // JSONata output or passed through lenient mode) get final substitution.
  if (envMap) {
    joined = substituteEnv(joined, envMap, { lenient: true });
  }
  return joined;
}
```

Note: the pre-JSONata pass cannot use `substituteEnv` directly because it rewrites env tokens into `{{ $env.VAR }}` (a JSONata expression), not their literal values. Only the post-join pass is eligible for direct delegation, and even there we force `lenient: true` to preserve the legacy behavior of leaving unmatched-but-survivable tokens alone. Attempting stricter delegation at this call site would be a behavior change.

- [ ] **Step 2.3: Run interpolate tests to verify regression**

Run: `pnpm --filter storybook-addon-designbook test -- interpolate.test`
Expected: PASS — same count as before refactor, no test file changes.

- [ ] **Step 2.4: Run substitute-env tests to verify helper still green**

Run: `pnpm --filter storybook-addon-designbook test -- substitute-env.test`
Expected: PASS

- [ ] **Step 2.5: Commit**

```bash
git add packages/storybook-addon-designbook/src/template/interpolate.ts
git commit -m "$(cat <<'EOF'
refactor(addon): delegate interpolate post-pass to substituteEnv

The post-JSONata env-token cleanup in interpolate() shared its regex
with the new substituteEnv helper; delegate to it to keep a single
source of truth. The pre-JSONata pass still rewrites tokens into
{{ \$env.VAR }} expressions and cannot delegate — that path stays
inline.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create `substituteEnvInData` Recursive Walker

**Files:**
- Create: `packages/storybook-addon-designbook/src/template/substitute-env-in-data.ts`
- Create: `packages/storybook-addon-designbook/src/template/__tests__/substitute-env-in-data.test.ts`

- [ ] **Step 3.1: Write the failing tests**

Create `packages/storybook-addon-designbook/src/template/__tests__/substitute-env-in-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { substituteEnvInData } from '../substitute-env-in-data.js';

const envMap = { DESIGNBOOK_COMPONENT_NAMESPACE: 'ns', X: 'ex' };

describe('substituteEnvInData', () => {
  it('resolves $VAR in a top-level string', () => {
    expect(substituteEnvInData('$X:page', envMap)).toBe('ex:page');
  });

  it('resolves in nested object', () => {
    const input = { scenes: [{ items: [{ component: '$DESIGNBOOK_COMPONENT_NAMESPACE:header' }] }] };
    expect(substituteEnvInData(input, envMap)).toEqual({
      scenes: [{ items: [{ component: 'ns:header' }] }],
    });
  });

  it('resolves in array of strings', () => {
    expect(substituteEnvInData(['$X:a', '$X:b'], envMap)).toEqual(['ex:a', 'ex:b']);
  });

  it('leaves non-string leaves untouched', () => {
    const input = { n: 5, b: true, z: null, a: [1, 2], s: '$X' };
    expect(substituteEnvInData(input, envMap)).toEqual({
      n: 5,
      b: true,
      z: null,
      a: [1, 2],
      s: 'ex',
    });
  });

  it('throws with dotted path context on unknown var in object', () => {
    const input = { scenes: [{ items: [{ component: '$UNKNOWN:header' }] }] };
    expect(() => substituteEnvInData(input, envMap)).toThrow(
      /Unknown environment variable.*UNKNOWN.*scenes\[0\]\.items\[0\]\.component/,
    );
  });

  it('throws with bracket path on unknown var in array root', () => {
    expect(() => substituteEnvInData(['$UNKNOWN'], envMap)).toThrow(/\[0\]/);
  });

  it('does not mutate the input object', () => {
    const input = { component: '$X:page' };
    const result = substituteEnvInData(input, envMap);
    expect(input.component).toBe('$X:page');
    expect(result).toEqual({ component: 'ex:page' });
    expect(result).not.toBe(input);
  });

  it('leaves unknown var as-is when lenient', () => {
    const input = { s: '$UNKNOWN' };
    expect(substituteEnvInData(input, envMap, { lenient: true })).toEqual({ s: '$UNKNOWN' });
  });

  it('handles empty object and empty array', () => {
    expect(substituteEnvInData({}, envMap)).toEqual({});
    expect(substituteEnvInData([], envMap)).toEqual([]);
  });
});
```

- [ ] **Step 3.2: Run tests to verify they fail**

Run: `pnpm --filter storybook-addon-designbook test -- substitute-env-in-data.test`
Expected: FAIL — "Cannot find module '../substitute-env-in-data.js'"

- [ ] **Step 3.3: Implement the walker**

Create `packages/storybook-addon-designbook/src/template/substitute-env-in-data.ts`:

```ts
import { substituteEnv, type SubstituteEnvOptions } from './substitute-env.js';

export interface SubstituteEnvInDataOptions extends SubstituteEnvOptions {
  /** Internal: dotted path for error context. Not passed by callers. */
  path?: string;
}

/**
 * Recursively apply substituteEnv() to every string leaf of a JSON-compatible
 * value. Returns a new value; never mutates input.
 *
 * On unknown env vars, throws with a dotted/bracketed path pointing to the
 * offending leaf (e.g. `scenes[0].items[0].component`). Pass `{ lenient: true }`
 * to leave unknown tokens as-is.
 */
export function substituteEnvInData(
  value: unknown,
  envMap: Record<string, string> | undefined,
  options: SubstituteEnvInDataOptions = {},
): unknown {
  const { lenient, path = '' } = options;

  if (typeof value === 'string') {
    try {
      return substituteEnv(value, envMap, { lenient });
    } catch (err) {
      const where = path ? ` at ${path}` : '';
      throw new Error(`${(err as Error).message}${where}`);
    }
  }

  if (Array.isArray(value)) {
    return value.map((item, i) =>
      substituteEnvInData(item, envMap, { lenient, path: `${path}[${i}]` }),
    );
  }

  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const childPath = path ? `${path}.${k}` : k;
      out[k] = substituteEnvInData(v, envMap, { lenient, path: childPath });
    }
    return out;
  }

  return value;
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

Run: `pnpm --filter storybook-addon-designbook test -- substitute-env-in-data.test`
Expected: PASS (9/9)

- [ ] **Step 3.5: Commit**

```bash
git add packages/storybook-addon-designbook/src/template/substitute-env-in-data.ts \
        packages/storybook-addon-designbook/src/template/__tests__/substitute-env-in-data.test.ts
git commit -m "$(cat <<'EOF'
feat(addon): add substituteEnvInData recursive walker

Applies substituteEnv() to every string leaf of a JSON-compatible
value. Threads a dotted/bracketed path so unknown-var errors pinpoint
the offending leaf (e.g. scenes[0].items[0].component).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire Substitution into `workflowDone`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts` (around lines 893-939)
- Create: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-done-env-substitution.test.ts`

- [ ] **Step 4.1: Write the failing integration test**

Create `packages/storybook-addon-designbook/src/validators/__tests__/workflow-done-env-substitution.test.ts`:

```ts
/**
 * Integration: workflowDone substitutes $VAR/${VAR} in data payloads
 * against envMap before writing to disk. Covers the scene-namespace
 * placeholder case that blocked the 2026-04-18 design-shell run.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { load as parseYaml, dump as stringifyYaml } from 'js-yaml';
import { workflowCreate, workflowPlan, workflowDone, type WorkflowFile, type WorkflowTask } from '../../workflow.js';
import type { DesignbookConfig } from '../../config.js';

function readTasksYml(dist: string, name: string): WorkflowFile {
  const changesPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
  if (existsSync(changesPath)) return parseYaml(readFileSync(changesPath, 'utf-8')) as WorkflowFile;
  const archivePath = resolve(dist, 'workflows', 'archive', name, 'tasks.yml');
  return parseYaml(readFileSync(archivePath, 'utf-8')) as WorkflowFile;
}

function writeTasksYml(dist: string, name: string, data: WorkflowFile): void {
  writeFileSync(resolve(dist, 'workflows', 'changes', name, 'tasks.yml'), stringifyYaml(data));
}

function setupWorkflow(dist: string, tasks: WorkflowTask[], stages: Record<string, { steps?: string[] }>): string {
  const name = workflowCreate(dist, 'debo-test', 'Test Workflow', []);
  workflowPlan(dist, name, tasks, stages, undefined, undefined, undefined, undefined, 'direct');
  const data = readTasksYml(dist, name);
  for (const planned of data.tasks) {
    const source = tasks.find((t) => t.id === planned.id);
    if (source?.result) planned.result = source.result;
  }
  writeTasksYml(dist, name, data);
  return name;
}

describe('workflowDone: env-var substitution in --data payload', () => {
  let dist: string;
  let config: DesignbookConfig;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-env-sub-'));
    config = { data: dist, technology: 'html', extensions: [] };
  });

  it('resolves $DESIGNBOOK_COMPONENT_NAMESPACE in scene-file payload before writing to disk', async () => {
    const targetPath = resolve(dist, 'output', 'scene.yml');
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'create-scene',
          title: 'Create Scene',
          type: 'scene',
          step: 'create-scene',
          stage: 'execute',
          status: 'pending',
          result: { 'scene-file': { path: targetPath } },
        } as WorkflowTask,
      ],
      { execute: { steps: ['create-scene'] } },
    );

    // Set COMPONENT_NAMESPACE via config extension so buildEnvMap picks it up.
    const extendedConfig: DesignbookConfig = {
      ...config,
      extensions: [{ name: 'test', env: { DESIGNBOOK_COMPONENT_NAMESPACE: 'test_provider' } }] as DesignbookConfig['extensions'],
    };

    const payload = {
      'scene-file': {
        scenes: [
          {
            items: [
              { component: '$DESIGNBOOK_COMPONENT_NAMESPACE:page' },
              { component: '${DESIGNBOOK_COMPONENT_NAMESPACE}:header' },
            ],
          },
        ],
      },
    };

    await workflowDone(dist, name, 'create-scene', undefined, { data: payload, config: extendedConfig });

    expect(existsSync(targetPath)).toBe(true);
    const written = readFileSync(targetPath, 'utf-8');
    expect(written).toContain('component: test_provider:page');
    expect(written).toContain('component: test_provider:header');
    expect(written).not.toContain('DESIGNBOOK_COMPONENT_NAMESPACE');
  });

  it('fails the CLI call before writing when an env var is undefined', async () => {
    const targetPath = resolve(dist, 'output', 'scene.yml');
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'create-scene',
          title: 'Create Scene',
          type: 'scene',
          step: 'create-scene',
          stage: 'execute',
          status: 'pending',
          result: { 'scene-file': { path: targetPath } },
        } as WorkflowTask,
      ],
      { execute: { steps: ['create-scene'] } },
    );

    const payload = {
      'scene-file': { scenes: [{ items: [{ component: '$UNKNOWN_TYPO:page' }] }] },
    };

    await expect(workflowDone(dist, name, 'create-scene', undefined, { data: payload, config })).rejects.toThrow(
      /UNKNOWN_TYPO.*scene-file\.scenes\[0\]\.items\[0\]\.component/,
    );
    expect(existsSync(targetPath)).toBe(false);
  });

  it('does not substitute lowercase or numeric tokens in user content', async () => {
    const targetPath = resolve(dist, 'output', 'scene.yml');
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'create-scene',
          title: 'Create Scene',
          type: 'scene',
          step: 'create-scene',
          stage: 'execute',
          status: 'pending',
          result: { 'scene-file': { path: targetPath } },
        } as WorkflowTask,
      ],
      { execute: { steps: ['create-scene'] } },
    );

    const payload = { 'scene-file': { notes: 'Cost: $5, Lookup $foo' } };

    await workflowDone(dist, name, 'create-scene', undefined, { data: payload, config });
    const written = readFileSync(targetPath, 'utf-8');
    expect(written).toContain('Cost: $5');
    expect(written).toContain('Lookup $foo');
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-done-env-substitution.test`
Expected: FAIL — first test: written file still contains `$DESIGNBOOK_COMPONENT_NAMESPACE` (substitution not wired yet).

- [ ] **Step 4.3: Wire `substituteEnvInData` into `workflowDone`**

Modify `packages/storybook-addon-designbook/src/workflow.ts`. Find the block starting at line 893 (`if (options?.data && task.result) {`) and the loop at line 907 (`for (const [key, value] of Object.entries(dataPayload))`).

Add the import near the top of the file (with other template imports, or as a new import if none exist):

```ts
import { substituteEnvInData } from './template/substitute-env-in-data.js';
import { buildEnvMap } from './workflow-resolve.js';
```

(`buildEnvMap` may already be imported — check first and add only if missing.)

Inside the `if (options?.data && task.result) {` block, **before** the `for (const [key, value] of Object.entries(dataPayload))` loop, build `envMap` once:

```ts
    if (options?.data && task.result) {
      const dataPayload = options.data;

      // 1.5: Error on unknown keys
      const declaredKeys = new Set(Object.keys(task.result));
      const unknownKeys = Object.keys(dataPayload).filter((k) => !declaredKeys.has(k));
      if (unknownKeys.length > 0) {
        throw new Error(
          `Unknown result key(s) in --data: ${unknownKeys.join(', ')}. Valid keys: ${[...declaredKeys].join(', ')}`,
        );
      }

      // Build envMap once so every result entry sees the same resolved env.
      // Missing config → empty envMap → any $VAR in payload throws with path context.
      const envMap = options.config ? buildEnvMap(options.config) : {};

      // Distribute each key to its result entry
      const validationErrors: string[] = [];
      for (const [key, value] of Object.entries(dataPayload)) {
        const resultEntry = task.result[key];
        if (!resultEntry) continue;

        // Resolve $VAR/${VAR} tokens before serialization so the file
        // on disk holds literals that downstream validators, Storybook's
        // scene-builder, and schema validation already expect.
        const substituted = substituteEnvInData(value, envMap, { path: key });

        if (resultEntry.path) {
          // File result from --data: serialize and write to disk
          const { serializeForPath } = await import('./workflow-serialize.js');
          const serialized = serializeForPath(
            resultEntry.path,
            substituted,
            resultEntry.schema as import('./workflow-serialize.js').SchemaProperty | undefined,
          );

          // ... rest of block unchanged, but use `substituted` everywhere
          // the original `value` was used (schema validation in particular).
```

Apply the following exact edit: change every reference to the loop variable `value` to `substituted` in the block scope starting at `if (resultEntry.path) {` and ending where the loop iteration ends. The key call sites are:
- `serializeForPath(resultEntry.path, substituted, ...)` (was `value`)
- `validateResultEntry(resultEntry, substituted, data.schemas, config, 'data')` (was `value`) at `workflow.ts:944`
- Any data-result-without-path branch further below (if any exists in the current file) that also stores `value` — also use `substituted`.

To minimize diff risk, make the edit as: immediately after `const resultEntry = task.result[key]; if (!resultEntry) continue;` add `const substituted = substituteEnvInData(value, envMap, { path: key });`, then rename downstream `value` → `substituted` only within the loop body for this iteration. Do NOT rename the loop variable itself.

- [ ] **Step 4.4: Run the integration test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-done-env-substitution.test`
Expected: PASS (3/3)

- [ ] **Step 4.5: Run all existing tests to verify no regression**

Run: `pnpm --filter storybook-addon-designbook test`
Expected: All tests pass — in particular `workflow-result.test.ts` and `workflow-lifecycle.test.ts` stay green (they don't use env tokens in payloads, so substitution is a no-op for them).

- [ ] **Step 4.6: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts \
        packages/storybook-addon-designbook/src/validators/__tests__/workflow-done-env-substitution.test.ts
git commit -m "$(cat <<'EOF'
feat(addon): substitute $DESIGNBOOK_* in workflow done --data payloads

Call substituteEnvInData(value, envMap) before serializing and writing
each data result. Uses the existing buildEnvMap(config) to construct
the same envMap that path-interpolation already uses, so the file on
disk holds literal provider ids that downstream validators and
scene-builder expect.

Unknown env vars fail the call with a dotted-path error before any
partial file is written.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Correct `scenes-constraints.md` Rule

**Files:**
- Modify: `.agents/skills/designbook/design/rules/scenes-constraints.md`

- [ ] **Step 5.1: Apply the text edit**

Open `.agents/skills/designbook/design/rules/scenes-constraints.md` and find lines 10-12:

```markdown
> ⛔ **`component:` values MUST always use `provider:component` format.**
> Write `$DESIGNBOOK_COMPONENT_NAMESPACE:header`, NEVER just `header`.
> `DESIGNBOOK_COMPONENT_NAMESPACE` is set by the workflow bootstrap (Rule 0).
```

Replace with:

```markdown
> ⛔ **`component:` values MUST always use `provider:component` format.**
> Write `$DESIGNBOOK_COMPONENT_NAMESPACE:header`, NEVER just `header`.
> The engine substitutes `$DESIGNBOOK_COMPONENT_NAMESPACE` (and any
> `$VAR` / `${VAR}` env token) on `workflow done --data` submission —
> the scene file on disk contains the resolved provider literal
> (e.g. `test_integration_drupal:header`).
```

- [ ] **Step 5.2: Commit**

```bash
git add .agents/skills/designbook/design/rules/scenes-constraints.md
git commit -m "$(cat <<'EOF'
docs(skill): correct env-substitution note in scenes-constraints

Replace the reference to a non-existent "workflow bootstrap (Rule 0)"
with an accurate description of where substitution actually happens
(addon, workflow done --data). The addon change that realizes this
contract landed in the same series.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Full Check

**Files:** none

- [ ] **Step 6.1: Run the project-level quality gate**

Run: `pnpm check` (from repo root `/home/cw/projects/designbook`)
Expected: typecheck → lint → test all pass.

If lint fails on the edited files, fix formatting with `pnpm --filter storybook-addon-designbook lint:fix` and re-run.

- [ ] **Step 6.2: Manual verification in the test workspace**

Run:
```bash
cd /home/cw/projects/designbook
./scripts/setup-workspace.sh drupal-web
# Then, in the new workspace, run a scene submission with the placeholder
# form and confirm the written file contains the resolved literal namespace.
```

The earlier failing invocation was:
```bash
_debo workflow done --workflow <name> --task create-scene-<hash> \
  --data '{"scene-file":{"scenes":[{"items":[{"component":"$DESIGNBOOK_COMPONENT_NAMESPACE:page"}]}]}}'
```

Expected: submission succeeds in one shot; `designbook/design-system/design-system.scenes.yml` on disk contains `component: test_integration_drupal:page`.

- [ ] **Step 6.3: No commit — verification only**
