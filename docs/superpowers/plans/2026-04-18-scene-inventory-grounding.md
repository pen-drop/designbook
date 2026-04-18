# Scene Inventory Grounding & Self-describing Result Schemas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate phantom component references by grounding scene generation in Storybook's `/index.json`, and make task-result submission self-describing via a two-axis `submission` / `flush` schema.

**Architecture:** Three interlocking workstreams — (1) split the result lifecycle into `submission: data | direct` and `flush: deferred | immediate`; (2) a new `components_index` resolver fetches the live Storybook index and constrains scene `component:` fields via dynamic schema enum injection; (3) four thin atom blueprints (`button`, `logo`, `link`, `icon`) plus a deterministic intake decomposition rule replace prose-style atom derivation.

**Tech Stack:** TypeScript (addon at `packages/storybook-addon-designbook`), vitest, Markdown-based skill definitions under `.agents/skills/`.

**Spec:** `docs/superpowers/plans/../specs/2026-04-18-scene-inventory-grounding-design.md`

---

## Conventions used by every task

- Every code step shows the code — never "TBD" or "like above".
- Tests run via `pnpm --filter storybook-addon-designbook test <file>`.
- Commits use conventional-commits style (`feat:`, `refactor:`, `docs:`, `test:`).
- Files given with absolute paths rooted at `/home/cw/projects/designbook/`.

---

# Phase 1 — Result Lifecycle: `submission` + `flush`

## Task 1.1: Extend `ResultDeclaration` with `submission`, migrate `flush` enum

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts:65-73` (ResultDeclaration)
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts:1080-1128` (expandResultDeclarations)
- Test: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-write-file.test.ts` (add new describe block)

**Context:** Currently `flush?: 'immediately' | 'external'`. We add `submission?: 'data' | 'direct'` (default `data`), narrow `flush?` to `'deferred' | 'immediate'` (default `deferred`), and reject the legacy values `immediately` and `external` at parse time.

- [ ] **Step 1: Write the failing tests**

Append to `packages/storybook-addon-designbook/src/validators/__tests__/workflow-write-file.test.ts` below the existing `describe('expandResultDeclarations path interpolation', ...)` block:

```typescript
// ── submission + flush semantics ────────────────────────────────────────────

describe('expandResultDeclarations submission + flush', () => {
  it('defaults submission=data and flush=deferred when fields are absent', async () => {
    const resultDecl = {
      properties: {
        component: { path: '/tmp/a.yml', type: 'object' },
      },
    };
    const result = await expandResultDeclarations(resultDecl, undefined, {}, {});
    expect(result?.component?.submission).toBe('data');
    expect(result?.component?.flush).toBe('deferred');
  });

  it('accepts submission=direct and ignores flush regardless of value', async () => {
    const resultDecl = {
      properties: {
        shot: { path: '/tmp/shot.png', submission: 'direct', flush: 'immediate', type: 'string' },
      },
    };
    const result = await expandResultDeclarations(resultDecl, undefined, {}, {});
    expect(result?.shot?.submission).toBe('direct');
    expect(result?.shot?.flush).toBeUndefined();
  });

  it('accepts flush=immediate with submission=data', async () => {
    const resultDecl = {
      properties: {
        extract: { path: '/tmp/extract.json', flush: 'immediate', type: 'object' },
      },
    };
    const result = await expandResultDeclarations(resultDecl, undefined, {}, {});
    expect(result?.extract?.submission).toBe('data');
    expect(result?.extract?.flush).toBe('immediate');
  });

  it('rejects legacy flush: immediately with a rename hint', async () => {
    const resultDecl = {
      properties: {
        x: { path: '/tmp/x.yml', flush: 'immediately', type: 'object' },
      },
    };
    await expect(async () => expandResultDeclarations(resultDecl, undefined, {}, {})).rejects.toThrow(
      /flush: immediately.*no longer supported.*flush: immediate/,
    );
  });

  it('rejects legacy flush: external with a migration hint', async () => {
    const resultDecl = {
      properties: {
        x: { path: '/tmp/x.png', flush: 'external', type: 'string' },
      },
    };
    await expect(async () => expandResultDeclarations(resultDecl, undefined, {}, {})).rejects.toThrow(
      /flush: external.*submission: direct/,
    );
  });

  it('rejects unknown submission values', async () => {
    const resultDecl = {
      properties: {
        x: { path: '/tmp/x.yml', submission: 'external', type: 'object' },
      },
    };
    await expect(async () => expandResultDeclarations(resultDecl, undefined, {}, {})).rejects.toThrow(
      /submission.*must be one of: data, direct/,
    );
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm --filter storybook-addon-designbook test workflow-write-file`
Expected: 6 failures — `flush` still typed as `'immediately' | 'external'`, no `submission` field.

- [ ] **Step 3: Update the type and parser**

Replace the block at `packages/storybook-addon-designbook/src/workflow-resolve.ts:64-73`:

```typescript
/** Result declaration entry in task frontmatter — file results have `path:`, data results don't. */
export interface ResultDeclaration {
  path?: string; // file result path template
  $ref?: string; // schema reference (e.g. ../schemas.yml#/Check)
  validators?: string[]; // semantic validator keys
  /** Who produces the content. `data` (default) = AI submits via --data; `direct` = task code writes the file. */
  submission?: 'data' | 'direct';
  /** When the file lands on disk. `deferred` (default) = at stage flush; `immediate` = on `workflow done`. Ignored when `submission: direct`. */
  flush?: 'deferred' | 'immediate';
  type?: string; // inline JSON Schema type
  items?: unknown; // inline JSON Schema items (for arrays)
  [key: string]: unknown; // additional JSON Schema properties
}
```

Then replace the body of `expandResultDeclarations` inside the `for (const [key, decl] of ...)` loop (lines 1097-1126) with:

```typescript
for (const [key, decl] of Object.entries(properties)) {
  // Legacy value migration — reject with explicit hint
  if (decl.flush === ('immediately' as unknown)) {
    throw new Error(
      `Result '${key}': \`flush: immediately\` is no longer supported. Replace with \`flush: immediate\`.`,
    );
  }
  if (decl.flush === ('external' as unknown)) {
    throw new Error(
      `Result '${key}': \`flush: external\` is no longer supported. Replace with \`submission: direct\`.`,
    );
  }

  // Validate submission enum
  if (decl.submission !== undefined && decl.submission !== 'data' && decl.submission !== 'direct') {
    throw new Error(
      `Result '${key}': \`submission\` must be one of: data, direct (got "${String(decl.submission)}").`,
    );
  }

  // Validate flush enum
  if (decl.flush !== undefined && decl.flush !== 'deferred' && decl.flush !== 'immediate') {
    throw new Error(
      `Result '${key}': \`flush\` must be one of: deferred, immediate (got "${String(decl.flush)}").`,
    );
  }

  const submission: 'data' | 'direct' = decl.submission ?? 'data';
  const flush: 'deferred' | 'immediate' | undefined = submission === 'direct' ? undefined : (decl.flush ?? 'deferred');

  const validators = decl.validators ?? [];
  if (validatorKeys) {
    for (const v of validators) {
      if (v.startsWith('cmd:')) continue;
      if (!validatorKeys.has(v)) {
        throw new Error(
          `Unknown validator key '${v}' in result '${key}'. Available: ${[...validatorKeys].join(', ')}`,
        );
      }
    }
  }

  // Build inline schema from declaration (exclude path, validators, $ref, submission, flush)
  let schema: object | undefined;
  const { path: _path, validators: _validators, $ref: _ref, submission: _sub, flush: _flush, ...schemaProps } = decl;
  if (Object.keys(schemaProps).length > 0) {
    schema = schemaProps as object;
  }

  const entry: {
    path?: string;
    schema?: object;
    validators?: string[];
    submission: 'data' | 'direct';
    flush?: 'deferred' | 'immediate';
  } = { submission };
  if (flush !== undefined) entry.flush = flush;
  if (decl.path) {
    entry.path = await interpolate(decl.path, params, { envMap, lenient });
  }
  if (schema) entry.schema = schema;
  if (validators.length > 0) entry.validators = validators;

  result[key] = entry;
}
```

Also update the function's return type at line 1088:

```typescript
): Promise<Record<string, { path?: string; schema?: object; validators?: string[]; submission: 'data' | 'direct'; flush?: 'deferred' | 'immediate' }> | undefined> {
```

And the inner `result` map type at line 1096:

```typescript
const result: Record<string, { path?: string; schema?: object; validators?: string[]; submission: 'data' | 'direct'; flush?: 'deferred' | 'immediate' }> = {};
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm --filter storybook-addon-designbook test workflow-write-file`
Expected: all tests pass, including the 6 new submission/flush cases.

- [ ] **Step 5: Run typecheck and fix callers**

Run: `pnpm --filter storybook-addon-designbook typecheck`
Expected: the field name change (`flush?: string` → `submission + flush`) will surface a handful of TypeScript errors in callers that destructure `resultEntry.flush`. Fix each error to use the new fields. Key call sites to audit:
- `packages/storybook-addon-designbook/src/workflow.ts` (the file will get explicit handling in Task 1.3 — silence any intermediate errors by keeping a temporary read of the new fields).
- Any test fixture that asserts `.flush === 'immediately'` → update to `'immediate'`.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts \
        packages/storybook-addon-designbook/src/validators/__tests__/workflow-write-file.test.ts
git commit -m "feat(workflow): split result lifecycle into submission + flush"
```

---

## Task 1.2: Render a "Submit results" hint in `workflow instructions`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts:325-343` (instructions action)
- Create: `packages/storybook-addon-designbook/src/cli/submit-results-hint.ts`
- Test: `packages/storybook-addon-designbook/src/cli/__tests__/submit-results-hint.test.ts`

**Context:** The current `workflow instructions` JSON includes only `schema` — the AI has to derive submission shape from the schema properties. We add a rendered `submit_results` string (markdown) to the JSON output so the AI sees an explicit contract.

- [ ] **Step 1: Write the failing test**

Create `packages/storybook-addon-designbook/src/cli/__tests__/submit-results-hint.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderSubmitResultsHint } from '../submit-results-hint.js';

describe('renderSubmitResultsHint', () => {
  it('returns null when no data-submission results exist', () => {
    const schema = {
      result: { properties: { shot: { path: '/x.png', submission: 'direct' } } },
    };
    expect(renderSubmitResultsHint('task-1', schema)).toBeNull();
  });

  it('renders a single-data-result hint with path and $ref type', () => {
    const schema = {
      result: {
        properties: {
          'component-yml': {
            path: 'components/button/button.component.yml',
            $ref: '../schemas.yml#/SdcComponentYaml',
            submission: 'data',
          },
        },
      },
    };
    const hint = renderSubmitResultsHint('task-1', schema)!;
    expect(hint).toContain('workflow done --task task-1 --data');
    expect(hint).toContain('"component-yml": <SdcComponentYaml>');
    expect(hint).toContain('→ components/button/button.component.yml');
  });

  it('annotates flush: immediate results inline', () => {
    const schema = {
      result: {
        properties: {
          story: {
            path: 'button/button.default.story.yml',
            $ref: '../schemas.yml#/SdcStory',
            submission: 'data',
            flush: 'immediate',
          },
        },
      },
    };
    const hint = renderSubmitResultsHint('task-1', schema)!;
    expect(hint).toContain('(flush: immediate)');
  });

  it('lists direct-submission results in a separate block', () => {
    const schema = {
      result: {
        properties: {
          yml: { path: 'a.yml', $ref: '../schemas.yml#/SdcComponentYaml', submission: 'data' },
          shot: { path: 'shot.png', submission: 'direct' },
        },
      },
    };
    const hint = renderSubmitResultsHint('task-1', schema)!;
    expect(hint).toContain('Direct-submission results');
    expect(hint).toContain('→ shot.png');
  });

  it('falls back to inline type when $ref is absent', () => {
    const schema = {
      result: {
        properties: {
          tokens: { path: 'tokens.yml', type: 'object', submission: 'data' },
        },
      },
    };
    const hint = renderSubmitResultsHint('task-1', schema)!;
    expect(hint).toContain('"tokens": <object>');
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm --filter storybook-addon-designbook test submit-results-hint`
Expected: 5 failures — module not found.

- [ ] **Step 3: Implement the renderer**

Create `packages/storybook-addon-designbook/src/cli/submit-results-hint.ts`:

```typescript
interface ResultProperty {
  path?: string;
  $ref?: string;
  type?: string;
  submission?: 'data' | 'direct';
  flush?: 'deferred' | 'immediate';
}

interface SchemaShape {
  result?: { properties?: Record<string, ResultProperty> };
}

function typeLabel(prop: ResultProperty): string {
  if (prop.$ref) {
    const seg = prop.$ref.split('/').pop();
    return `<${seg ?? 'unknown'}>`;
  }
  return `<${prop.type ?? 'any'}>`;
}

export function renderSubmitResultsHint(taskId: string, schema: SchemaShape): string | null {
  const props = schema.result?.properties ?? {};
  const data: Array<[string, ResultProperty]> = [];
  const direct: Array<[string, ResultProperty]> = [];

  for (const [key, prop] of Object.entries(props)) {
    if (!prop.path) continue;
    const sub = prop.submission ?? 'data';
    if (sub === 'direct') {
      direct.push([key, prop]);
    } else {
      data.push([key, prop]);
    }
  }

  if (data.length === 0) return null;

  const lines: string[] = [];
  lines.push('## Submit results');
  lines.push('');
  lines.push('Return every `submission: data` result in a single call:');
  lines.push('');
  lines.push(`    workflow done --task ${taskId} --data '<json>'`);
  lines.push('');
  lines.push('The JSON must match:');
  lines.push('');
  lines.push('    {');
  for (let i = 0; i < data.length; i++) {
    const [key, prop] = data[i]!;
    const comma = i < data.length - 1 ? ',' : '';
    const flushNote = prop.flush === 'immediate' ? ' (flush: immediate)' : '';
    lines.push(`      "${key}": ${typeLabel(prop)}${comma}    // → ${prop.path}${flushNote}`);
  }
  lines.push('    }');

  if (direct.length > 0) {
    lines.push('');
    lines.push('Direct-submission results (written by task code, not submitted via --data):');
    lines.push('');
    for (const [key, prop] of direct) {
      lines.push(`    ${key}    → ${prop.path}`);
    }
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Wire the hint into the instructions output**

In `packages/storybook-addon-designbook/src/cli/workflow.ts`, import near the top:

```typescript
import { renderSubmitResultsHint } from './submit-results-hint.js';
```

Replace lines 326-336 (the `instructionsResult` assembly) with:

```typescript
      // Include schema if present (unified schema block from resolution time)
      const schema = (stage as unknown as Record<string, unknown>).schema ?? undefined;
      const submitResults =
        schema && typeof schema === 'object'
          ? renderSubmitResultsHint(resolvedKey, schema as Parameters<typeof renderSubmitResultsHint>[1])
          : null;

      const instructionsResult = {
        stage: opts.stage,
        task_file: taskFile,
        rules,
        blueprints,
        config_rules: stage.config_rules ?? [],
        config_instructions: stage.config_instructions ?? [],
        ...(schema ? { schema } : {}),
        ...(submitResults ? { submit_results: submitResults } : {}),
      };
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `pnpm --filter storybook-addon-designbook test submit-results-hint && pnpm --filter storybook-addon-designbook typecheck`
Expected: tests pass, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/submit-results-hint.ts \
        packages/storybook-addon-designbook/src/cli/__tests__/submit-results-hint.test.ts \
        packages/storybook-addon-designbook/src/cli/workflow.ts
git commit -m "feat(cli): render submit-results hint in workflow instructions"
```

---

## Task 1.3: Gate direct-write bypass on `submission: direct` + restructure enforcement error

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts:997-1018`
- Test: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-write-file.test.ts` (append test block)

**Context:** Two changes land together because the second is a one-line follow-up to the first:
1. The direct-write rejection skips `submission === 'direct'` instead of `flush === 'external'`.
2. When the rejection fires, the error message includes the Submit-results hint (rendered via the helper from Task 1.3) so the AI can copy-paste the retry call.

**Dependency order:** Executes after Task 1.2 (which defines `renderSubmitResultsHint`). The import in Step 3b will fail if Task 1.2 is not complete.

- [ ] **Step 1: Write the failing test**

Append to `workflow-write-file.test.ts` at the end of the file (after the last existing `describe`):

```typescript
// ── submission enforcement in workflowDone ──────────────────────────────────

describe('workflow done — submission enforcement', () => {
  let dist: string;
  let config: DesignbookConfig;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-sub-'));
    config = { data: dist, technology: 'html', extensions: [] };
  });

  it('rejects submission: data file results that were written directly to disk', async () => {
    const targetPath = resolve(dist, 'phantom.yml');
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'create-phantom',
          title: 'Create Phantom',
          type: 'data',
          files: [{ path: targetPath, key: 'phantom', validators: [] }],
          result: { phantom: { path: targetPath, submission: 'data', flush: 'deferred' } },
        },
      ],
      { execute: { steps: ['create-phantom'] } },
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    // Simulate AI writing directly to final path (bypassing --data)
    writeFileSync(targetPath, 'value: 1\n');

    await expect(workflowDone(dist, name, 'create-phantom')).rejects.toThrow(
      /written directly instead of via `workflow done --data`/,
    );
  });

  it('accepts submission: direct file results already on disk', async () => {
    const targetPath = resolve(dist, 'shot.png');
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'capture',
          title: 'Capture',
          type: 'data',
          files: [{ path: targetPath, key: 'shot', validators: [] }],
          result: { shot: { path: targetPath, submission: 'direct' } },
        },
      ],
      { execute: { steps: ['capture'] } },
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    writeFileSync(targetPath, 'fake-png-bytes');

    const doneResult = await workflowDone(dist, name, 'capture');
    expect(doneResult.archived).toBe(true);
  });

  it('error message includes the submit-results hint for copy-paste retry', async () => {
    const targetPath = resolve(dist, 'comp.yml');
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'create-comp',
          title: 'Create Component',
          type: 'data',
          files: [{ path: targetPath, key: 'comp', validators: [] }],
          result: { comp: { path: targetPath, submission: 'data', flush: 'deferred', type: 'object' } },
        },
      ],
      { execute: { steps: ['create-comp'] } },
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );
    writeFileSync(targetPath, 'name: foo\n');

    await expect(workflowDone(dist, name, 'create-comp')).rejects.toThrow(
      /workflow done --task create-comp --data/,
    );
  });
});
```

Also add `writeFileSync` to the existing `node:fs` import at the top of the file (current import is `{ mkdtempSync, mkdirSync, readFileSync, existsSync }`).

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm --filter storybook-addon-designbook test workflow-write-file`
Expected: three failures — bypass still matches `flush: external`; error lacks the hint text.

- [ ] **Step 3a: Update the direct-write bypass**

In `packages/storybook-addon-designbook/src/workflow.ts:1003`, replace:

```typescript
if (resultEntry.flush === 'external') continue; // flush: external results are written by external tools
```

with:

```typescript
if (resultEntry.submission === 'direct') continue; // direct-submission results are written by task code
```

- [ ] **Step 3b: Restructure the error message to include the hint**

Still in `workflow.ts`, import at the top of the file (next to other imports):

```typescript
import { renderSubmitResultsHint } from './cli/submit-results-hint.js';
```

Replace the `throw new Error(...)` block at lines 1011-1016 with:

```typescript
if (directWrites.length > 0) {
  // Build a per-task schema shape so we can reuse the renderer.
  const hintSchema = {
    result: {
      properties: Object.fromEntries(
        Object.entries(task.result).map(([k, v]) => [
          k,
          { path: v.path, submission: v.submission, flush: v.flush, $ref: (v.schema as Record<string, string> | undefined)?.$ref, type: (v.schema as Record<string, string> | undefined)?.type },
        ]),
      ),
    },
  };
  const hint = renderSubmitResultsHint(taskId, hintSchema) ?? '';
  throw new Error(
    `Cannot mark '${taskId}' as done — ${directWrites.length} file result(s) were written directly instead of via \`workflow done --data\`:\n` +
      directWrites.join('\n') +
      '\n\n' +
      hint,
  );
}
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter storybook-addon-designbook test workflow-write-file && pnpm --filter storybook-addon-designbook typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts \
        packages/storybook-addon-designbook/src/validators/__tests__/workflow-write-file.test.ts
git commit -m "refactor(workflow): gate direct-write bypass on submission + embed hint in error"
```

---

## Task 1.4: Update skill documentation for submission + flush

**Files:**
- Modify: `.agents/skills/designbook/resources/cli-workflow.md:177-192`
- Modify: `.agents/skills/designbook/resources/task-format.md:43,151`
- Modify: `.agents/skills/designbook/resources/workflow-execution.md:186,193-201`
- Modify: `.agents/skills/designbook-skill-creator/rules/principles.md:48`

**Context:** These docs are the authoritative reference for task authors. They currently describe `flush: immediately` (single mode) and `flush: external` (sibling mode). Rewrite them around the two-axis `submission: data | direct` and `flush: deferred | immediate` model.

- [ ] **Step 1: Rewrite `cli-workflow.md` flush section**

Replace the region at `.agents/skills/designbook/resources/cli-workflow.md:177-192`:

```markdown
Results declare two orthogonal fields in the task frontmatter: `submission:` (who produces the content) and `flush:` (when it lands on disk). Both have defaults, so simple tasks need neither.

```yaml
result:
  type: object
  properties:
    extract:
      path: "{{ reference_dir }}/extract.json"
      flush: immediate            # write when `workflow done` completes, before stage flush
    component-yml:
      path: "components/{{name}}/{{name}}.component.yml"
      # submission: data  flush: deferred   (implicit defaults)
    screenshot:
      path: "screenshots/{{ story_id }}.png"
      submission: direct          # task code writes the file (e.g. Playwright); CLI only validates
```

Use `flush: immediate` when the file must be readable by subsequent steps within the same task (e.g. extract-reference writes a file that the same intake task reads next). `submission: direct` is for outputs produced by external tools whose content can't be round-tripped through `--data`.
```

- [ ] **Step 2: Rewrite `task-format.md` flush mentions**

At `.agents/skills/designbook/resources/task-format.md:43`, change:

```markdown
- `result` — declares all task outputs. Each key is a stable identifier. File results include a `path:` template (supports `$ENV` and `{{ param }}`). Optional `flush: immediately` writes to final path on result write instead of staging. Data results declare a JSON Schema type (inline or `$ref`). Both support optional `validators:` for semantic validation.
```

to:

```markdown
- `result` — declares all task outputs. Each key is a stable identifier. File results include a `path:` template (supports `$ENV` and `{{ param }}`) and optional `submission: data | direct` (default `data`) and `flush: deferred | immediate` (default `deferred`). Data results declare a JSON Schema type (inline or `$ref`). Both support optional `validators:` for semantic validation.
```

At line 151, change:

```markdown
- `result:` — output declarations. File results (with `path:`) are written to disk; optional `flush: immediately` bypasses staging. Data results (without `path:`) are passed inline via `--data` on `workflow done`. The engine validates immediately on write (JSON Schema + semantic validators). Data results flow into scope at stage completion.
```

to:

```markdown
- `result:` — output declarations. File results (with `path:`) default to `submission: data` + `flush: deferred` (AI returns the value via `--data`, CLI writes at stage flush). Override `flush: immediate` to write on `workflow done`; override `submission: direct` when an external tool writes the file. Data results (without `path:`) are passed inline via `--data` on `workflow done`. The engine validates immediately on write (JSON Schema + semantic validators). Data results flow into scope at stage completion.
```

- [ ] **Step 3: Rewrite `workflow-execution.md` flush sections**

At lines 185-201, replace the existing paragraph and bullet block with:

```markdown
By default, file results are staged (written to a `.debo` suffix path) and flushed atomically on stage transition. Results declared with `flush: immediate` in the task's result schema are written to their final path as soon as `workflow done` completes — the AI does not need to pass any flush flag.

**Direct-submission file results** (`submission: direct`):

The file is written by an external tool (Playwright screenshot, CLI invocation, etc.). The task code produces the file; the workflow CLI only runs post-write validation. Such results are registered via `workflow result` when produced outside the normal `--data` path.

> The only exception to the `workflow done --data` pattern is `submission: direct` — those results are written by an external tool and registered via `workflow result`.
```

- [ ] **Step 4: Rewrite `principles.md` line 48**

Replace the bullet:

```markdown
- **File results** (with `path:`) — files written to disk. Path template supports `$ENV` and `{{ param }}`. Optional `validators:` for semantic validation. Optional `flush: immediately` to write to final path on result write instead of staging. Optional JSON Schema type (inline or `$ref`).
```

with:

```markdown
- **File results** (with `path:`) — files written to disk. Path template supports `$ENV` and `{{ param }}`. Optional `submission: data | direct` (default `data`) and `flush: deferred | immediate` (default `deferred`) control who writes the file and when. Optional `validators:` for semantic validation. Optional JSON Schema type (inline or `$ref`).
```

- [ ] **Step 5: Grep sanity check**

Run: `Grep pattern: "flush:\s*(immediately|external)" path: .agents/skills`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/resources/cli-workflow.md \
        .agents/skills/designbook/resources/task-format.md \
        .agents/skills/designbook/resources/workflow-execution.md \
        .agents/skills/designbook-skill-creator/rules/principles.md
git commit -m "docs(skill): document submission + flush fields in task-format reference"
```

---

## Task 1.5: Migration guard (CI script)

**Files:**
- Create: `scripts/check-no-legacy-flush.sh`
- Modify: `package.json` (add `check:legacy-flush` script)

**Context:** A repo-wide grep ensures nobody reintroduces `flush: immediately` or `flush: external`.

- [ ] **Step 1: Write the guard script**

Create `scripts/check-no-legacy-flush.sh`:

```bash
#!/usr/bin/env bash
# Fails if any legacy flush value appears in skill or addon source files.
set -euo pipefail

PATTERN='flush:[[:space:]]*(immediately|external)'
ROOTS=(.agents/skills packages/storybook-addon-designbook/src)

MATCHES=$(grep -rEn "$PATTERN" "${ROOTS[@]}" || true)

if [[ -n "$MATCHES" ]]; then
  echo "ERROR: legacy flush values found. Replace 'flush: immediately' with 'flush: immediate'" >&2
  echo "and 'flush: external' with 'submission: direct':" >&2
  echo "$MATCHES" >&2
  exit 1
fi

echo "OK: no legacy flush values in repo"
```

Make executable: `chmod +x scripts/check-no-legacy-flush.sh`.

- [ ] **Step 2: Wire into `pnpm check`**

In root `package.json`, add to the `scripts` map (placement inside the existing check sequence):

```json
"check:legacy-flush": "bash scripts/check-no-legacy-flush.sh",
```

And add `&& pnpm check:legacy-flush` to the composite `check` script.

- [ ] **Step 3: Run and verify clean**

Run: `pnpm check:legacy-flush`
Expected: "OK: no legacy flush values in repo"

- [ ] **Step 4: Commit**

```bash
git add scripts/check-no-legacy-flush.sh package.json
git commit -m "ci: reject legacy flush values in skills + addon sources"
```

---

# Phase 2 — Stories-Index-Grounded Scene Generation

## Task 2.1: Default story-pattern registry

**Files:**
- Create: `packages/storybook-addon-designbook/src/config/story-patterns.ts`
- Test: `packages/storybook-addon-designbook/src/config/__tests__/story-patterns.test.ts`

**Context:** The addon ships a default `import_path_pattern` keyed by `frameworks.component`. SDC is the only built-in today; the structure leaves room for future frameworks.

- [ ] **Step 1: Write the failing test**

Create `packages/storybook-addon-designbook/src/config/__tests__/story-patterns.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { DEFAULT_STORY_PATTERNS, resolveStoryPattern } from '../story-patterns.js';

describe('DEFAULT_STORY_PATTERNS', () => {
  it('exposes an SDC entry with a regex and component name capture group', () => {
    const sdc = DEFAULT_STORY_PATTERNS.sdc;
    expect(sdc).toBeDefined();
    expect(sdc.import_path_pattern).toBeInstanceOf(RegExp);
    expect(sdc.component_name_group).toBe(1);
  });

  it('matches a canonical SDC import path and captures the component name', () => {
    const sdc = DEFAULT_STORY_PATTERNS.sdc;
    const m = './components/button/button.component.yml'.match(sdc.import_path_pattern);
    expect(m?.[1]).toBe('button');
  });

  it('does not match non-SDC import paths', () => {
    const sdc = DEFAULT_STORY_PATTERNS.sdc;
    expect('./components/button/button.stories.tsx'.match(sdc.import_path_pattern)).toBeNull();
    expect('./src/button/button.yml'.match(sdc.import_path_pattern)).toBeNull();
  });
});

describe('resolveStoryPattern', () => {
  it('returns the user override verbatim when present', () => {
    const override = { import_path_pattern: /^foo$/, component_name_group: 2 };
    expect(resolveStoryPattern('sdc', override)).toBe(override);
  });

  it('falls back to the default registry keyed by framework', () => {
    const resolved = resolveStoryPattern('sdc');
    expect(resolved).toBe(DEFAULT_STORY_PATTERNS.sdc);
  });

  it('throws a descriptive error when framework has no default and no override', () => {
    expect(() => resolveStoryPattern('unknown-framework')).toThrow(
      /No story filter for frameworks\.component=unknown-framework/,
    );
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm --filter storybook-addon-designbook test story-patterns`
Expected: module-not-found errors.

- [ ] **Step 3: Implement**

Create `packages/storybook-addon-designbook/src/config/story-patterns.ts`:

```typescript
export interface StoryPattern {
  import_path_pattern: RegExp;
  component_name_group: number;
}

/**
 * Default import-path patterns per `frameworks.component` value.
 * Extend this registry when adding support for a new component framework.
 */
export const DEFAULT_STORY_PATTERNS: Record<string, StoryPattern> = {
  sdc: {
    import_path_pattern: /^\.\/components\/([^/]+)\/\1\.component\.yml$/,
    component_name_group: 1,
  },
};

/**
 * Resolve the pattern to use for a given framework.
 * Precedence: user override → default registry → error with remediation.
 */
export function resolveStoryPattern(framework: string, override?: StoryPattern): StoryPattern {
  if (override) return override;
  const fromDefault = DEFAULT_STORY_PATTERNS[framework];
  if (fromDefault) return fromDefault;
  throw new Error(
    `No story filter for frameworks.component=${framework}. ` +
      `Set component.story_filter in designbook.config.yml or use a supported framework.`,
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter storybook-addon-designbook test story-patterns`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/config/story-patterns.ts \
        packages/storybook-addon-designbook/src/config/__tests__/story-patterns.test.ts
git commit -m "feat(config): default story-pattern registry per frameworks.component"
```

---

## Task 2.2: `components_index` resolver

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/components-index.ts`
- Test: `packages/storybook-addon-designbook/src/resolvers/__tests__/components-index.test.ts`

**Context:** A new `ParamResolver` (like `storyUrlResolver`) that fetches `/index.json`, filters entries whose `importPath` matches the active pattern, and emits `Component[]`.

- [ ] **Step 1: Write the failing test**

Create `packages/storybook-addon-designbook/src/resolvers/__tests__/components-index.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { componentsIndexResolver } from '../components-index.js';
import type { DesignbookConfig } from '../../config.js';
import * as storybook from '../../storybook.js';

const baseConfig = {
  data: '/tmp/data',
  technology: 'html' as const,
  extensions: [],
  'frameworks.component': 'sdc',
  'component.namespace': 'test_integration_drupal',
} as unknown as DesignbookConfig;

function mockFetch(index: { entries?: Record<string, unknown> } | null) {
  return vi.spyOn(storybook, 'fetchJson').mockResolvedValue(index as unknown);
}
function mockDaemon(url: string | null) {
  return vi.spyOn(storybook.StorybookDaemon.prototype, 'status').mockReturnValue(
    url ? ({ running: true, pid: 1, url, port: 6006, cwd: '/tmp', dataDir: '/tmp' } as never) : ({ running: false } as never),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('componentsIndexResolver', () => {
  it('matches SDC import paths and emits <namespace>:<component> ids', async () => {
    mockDaemon('http://localhost:6006');
    mockFetch({
      entries: {
        'drupal-web-shell-button--primary': {
          id: 'drupal-web-shell-button--primary',
          title: 'Drupal Web/Shell/Button',
          importPath: './components/button/button.component.yml',
          type: 'story',
        },
        'drupal-web-shell-navigation--default': {
          id: 'drupal-web-shell-navigation--default',
          title: 'Drupal Web/Shell/Navigation',
          importPath: './components/navigation/navigation.component.yml',
          type: 'story',
        },
      },
    });

    const result = await componentsIndexResolver.resolve('', {}, { config: baseConfig, params: {} });

    expect(result.resolved).toBe(true);
    expect(result.value).toEqual([
      expect.objectContaining({ id: 'test_integration_drupal:button' }),
      expect.objectContaining({ id: 'test_integration_drupal:navigation' }),
    ]);
  });

  it('dedupes when multiple stories exist for the same component', async () => {
    mockDaemon('http://localhost:6006');
    mockFetch({
      entries: {
        'btn--primary': { importPath: './components/button/button.component.yml', type: 'story' },
        'btn--ghost': { importPath: './components/button/button.component.yml', type: 'story' },
      },
    });
    const result = await componentsIndexResolver.resolve('', {}, { config: baseConfig, params: {} });
    const ids = (result.value as Array<{ id: string }>).map((c) => c.id);
    expect(ids).toEqual(['test_integration_drupal:button']);
  });

  it('emits empty array when no entries match the pattern', async () => {
    mockDaemon('http://localhost:6006');
    mockFetch({
      entries: {
        'readme--docs': { importPath: './docs/readme.mdx', type: 'docs' },
      },
    });
    const result = await componentsIndexResolver.resolve('', {}, { config: baseConfig, params: {} });
    expect(result.resolved).toBe(true);
    expect(result.value).toEqual([]);
  });

  it('fails with clear error when Storybook is not running', async () => {
    mockDaemon(null);
    const result = await componentsIndexResolver.resolve('', {}, { config: baseConfig, params: {} });
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/Storybook is not running/);
  });

  it('fails with clear error when framework has no pattern and no override', async () => {
    mockDaemon('http://localhost:6006');
    mockFetch({ entries: {} });
    const cfg = { ...baseConfig, 'frameworks.component': 'unknown-framework' } as DesignbookConfig;
    const result = await componentsIndexResolver.resolve('', {}, { config: cfg, params: {} });
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/No story filter for frameworks\.component=unknown-framework/);
  });

  it('uses user override pattern when component.story_filter is set', async () => {
    mockDaemon('http://localhost:6006');
    mockFetch({
      entries: {
        'x': { importPath: 'src/atoms/badge.tsx', type: 'story' },
      },
    });
    const cfg = {
      ...baseConfig,
      'component.story_filter.import_path_pattern': '^src/atoms/([^.]+)\\.tsx$',
      'component.story_filter.component_name_group': 1,
    } as unknown as DesignbookConfig;
    const result = await componentsIndexResolver.resolve('', {}, { config: cfg, params: {} });
    expect(result.resolved).toBe(true);
    const ids = (result.value as Array<{ id: string }>).map((c) => c.id);
    expect(ids).toEqual(['test_integration_drupal:badge']);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm --filter storybook-addon-designbook test components-index`
Expected: module-not-found.

- [ ] **Step 3: Implement the resolver**

Create `packages/storybook-addon-designbook/src/resolvers/components-index.ts`:

```typescript
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';
import { StorybookDaemon, fetchJson } from '../storybook.js';
import { resolveStoryPattern, type StoryPattern } from '../config/story-patterns.js';

export interface ComponentInventoryEntry {
  id: string;           // `<namespace>:<component-name>`
  import_path: string;  // verbatim from /index.json
  story_id: string;     // first matching story id (stable order)
}

function loadOverride(config: Record<string, unknown>): StoryPattern | undefined {
  const raw = config['component.story_filter.import_path_pattern'];
  const group = config['component.story_filter.component_name_group'];
  if (typeof raw !== 'string') return undefined;
  return {
    import_path_pattern: new RegExp(raw),
    component_name_group: typeof group === 'number' ? group : 1,
  };
}

export const componentsIndexResolver: ParamResolver = {
  name: 'components_index',

  async resolve(_input: string, _config: Record<string, unknown>, context: ResolverContext): Promise<ResolverResult> {
    const config = context.config as unknown as Record<string, unknown>;
    const framework = String(config['frameworks.component'] ?? '');
    const namespace = String(config['component.namespace'] ?? '');

    let pattern: StoryPattern;
    try {
      pattern = resolveStoryPattern(framework, loadOverride(config));
    } catch (err) {
      return { resolved: false, input: '', error: (err as Error).message };
    }

    const daemon = new StorybookDaemon(String(config['data'] ?? ''));
    const status = daemon.status();
    if (!status.running || !daemon.url) {
      return {
        resolved: false,
        input: '',
        error: 'Storybook is not running — start it with "_debo storybook start" before resolving components_index',
      };
    }

    let index: { entries?: Record<string, { importPath?: string; type?: string }> } | null;
    try {
      index = (await fetchJson(`${daemon.url}/index.json`)) as typeof index;
    } catch (err) {
      return {
        resolved: false,
        input: '',
        error: `Could not reach Storybook /index.json at ${daemon.url}: ${(err as Error).message}`,
      };
    }

    const entries = index?.entries ?? {};
    const byComponent = new Map<string, ComponentInventoryEntry>();

    for (const [storyId, entry] of Object.entries(entries)) {
      const importPath = entry?.importPath;
      if (typeof importPath !== 'string') continue;
      const match = importPath.match(pattern.import_path_pattern);
      if (!match) continue;
      const name = match[pattern.component_name_group];
      if (!name) continue;
      const id = `${namespace}:${name}`;
      if (byComponent.has(id)) continue;
      byComponent.set(id, { id, import_path: importPath, story_id: storyId });
    }

    return { resolved: true, input: '', value: Array.from(byComponent.values()) };
  },
};
```

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter storybook-addon-designbook test components-index`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/components-index.ts \
        packages/storybook-addon-designbook/src/resolvers/__tests__/components-index.test.ts
git commit -m "feat(resolver): components_index fetches live Storybook inventory"
```

---

## Task 2.3: Register the resolver

**Files:**
- Modify: `packages/storybook-addon-designbook/src/resolvers/registry.ts:1-37`

- [ ] **Step 1: Update the import block**

At top of `registry.ts`, add:

```typescript
import { componentsIndexResolver } from './components-index.js';
```

- [ ] **Step 2: Register**

After the existing `register(scenePathResolver);` line, add:

```typescript
register(componentsIndexResolver);
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter storybook-addon-designbook typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/registry.ts
git commit -m "chore(resolver): register components_index in resolver registry"
```

---

## Task 2.4: Dynamic enum injection into compiled scene schema

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts` (inside `resolveSchemasForTasks`, lines 231-291)
- Create: `packages/storybook-addon-designbook/src/workflow-resolve-components-enum.ts`
- Test: `packages/storybook-addon-designbook/src/__tests__/workflow-resolve-components-enum.test.ts`

**Context:** At `workflow create` time, after the scene's on-disk schema is loaded, we clone it and inject an `enum:` derived from `components_index` into every `component:` leaf. The enum is scoped to the compiled stage schema — never written back to `scenes/schemas.yml`.

- [ ] **Step 1: Write the failing test**

Create `packages/storybook-addon-designbook/src/__tests__/workflow-resolve-components-enum.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { injectComponentsEnum } from '../workflow-resolve-components-enum.js';

describe('injectComponentsEnum', () => {
  it('adds enum to ComponentNode.component when inventory is non-empty', () => {
    const schema = {
      ComponentNode: {
        type: 'object',
        properties: {
          component: { type: 'string' },
        },
      },
    };
    const inventory = ['ns:button', 'ns:header'];
    const out = injectComponentsEnum(schema, inventory);
    expect(out.ComponentNode.properties.component.enum).toEqual(['ns:button', 'ns:header']);
  });

  it('leaves schema untouched when inventory is empty', () => {
    const schema = {
      ComponentNode: {
        type: 'object',
        properties: { component: { type: 'string' } },
      },
    };
    const out = injectComponentsEnum(schema, []);
    expect(out.ComponentNode.properties.component.enum).toBeUndefined();
  });

  it('does not mutate the input schema', () => {
    const schema = {
      ComponentNode: { type: 'object', properties: { component: { type: 'string' } } },
    };
    injectComponentsEnum(schema, ['ns:btn']);
    expect((schema.ComponentNode.properties.component as Record<string, unknown>).enum).toBeUndefined();
  });

  it('handles schemas without ComponentNode gracefully', () => {
    const schema = { OtherNode: { type: 'object' } };
    const out = injectComponentsEnum(schema, ['ns:a']);
    expect(out).toEqual(schema);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter storybook-addon-designbook test workflow-resolve-components-enum`
Expected: module-not-found.

- [ ] **Step 3: Implement the helper**

Create `packages/storybook-addon-designbook/src/workflow-resolve-components-enum.ts`:

```typescript
/**
 * Clone a compiled schema map and inject an `enum:` into ComponentNode.component
 * when a non-empty inventory is provided. Returns a new object — does not mutate
 * the input.
 */
export function injectComponentsEnum(
  schemas: Record<string, unknown>,
  inventory: string[],
): Record<string, unknown> {
  if (inventory.length === 0) return schemas;
  const clone = JSON.parse(JSON.stringify(schemas)) as Record<string, Record<string, Record<string, Record<string, unknown>>>>;
  const node = clone.ComponentNode as Record<string, Record<string, Record<string, unknown>>> | undefined;
  const compProp = node?.properties?.component as Record<string, unknown> | undefined;
  if (compProp) {
    compProp.enum = [...inventory];
  }
  return clone as unknown as Record<string, unknown>;
}
```

- [ ] **Step 4: Wire it into `resolveSchemasForTasks`**

In `workflow-resolve.ts` around the end of `resolveSchemasForTasks` (just before returning the schemas map — locate the return statement near line 289), add:

```typescript
// Dynamic enum injection — if a `components` param resolved to an inventory,
// constrain ComponentNode.component to those ids.
const inventory = (params?.['components'] as Array<{ id?: string }> | undefined)?.map((c) => c.id).filter(
  (id): id is string => typeof id === 'string',
);
if (inventory && inventory.length > 0) {
  const { injectComponentsEnum } = await import('./workflow-resolve-components-enum.js');
  return injectComponentsEnum(schemas, inventory);
}
```

(Exact splice location depends on the current return signature — read the surrounding 15 lines to ensure the params object is in scope; if not, thread it through.)

- [ ] **Step 5: Run the tests**

Run: `pnpm --filter storybook-addon-designbook test workflow-resolve-components-enum`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve-components-enum.ts \
        packages/storybook-addon-designbook/src/workflow-resolve.ts \
        packages/storybook-addon-designbook/src/__tests__/workflow-resolve-components-enum.test.ts
git commit -m "feat(workflow): inject components enum into compiled scene schema"
```

---

## Task 2.5: Safety-net scene validator

**Files:**
- Modify: `packages/storybook-addon-designbook/src/validators/scene.ts` (locate `validateSceneBuild`)
- Test: `packages/storybook-addon-designbook/src/validators/__tests__/scene-inventory.test.ts`

**Context:** A redundant check on `workflow done` — re-runs `components_index` and verifies every `component:` string is in the inventory. Catches edge cases where the schema enum slipped (dynamic injection missed a gap).

- [ ] **Step 1: Locate and read the existing validator**

Read `packages/storybook-addon-designbook/src/validators/scene.ts` start-to-end to understand the current entry point.

- [ ] **Step 2: Write the failing test**

Create `packages/storybook-addon-designbook/src/validators/__tests__/scene-inventory.test.ts` with two cases: (a) scene referencing an id NOT in the inventory → error with the "Available: …" hint; (b) scene referencing only inventory ids → passes. Use the same mock scaffold as `components-index.test.ts` to stub the resolver.

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as componentsIndex from '../../resolvers/components-index.js';
import { validateSceneAgainstInventory } from '../scene.js';

afterEach(() => vi.restoreAllMocks());

describe('validateSceneAgainstInventory', () => {
  it('passes when every component: id is in the inventory', async () => {
    vi.spyOn(componentsIndex.componentsIndexResolver, 'resolve').mockResolvedValue({
      resolved: true,
      value: [{ id: 'ns:header', import_path: 'x', story_id: 'y' }],
      input: '',
    });
    const scene = { scenes: [{ component: 'ns:header' }] };
    const r = await validateSceneAgainstInventory(scene, { config: {} as never });
    expect(r.valid).toBe(true);
  });

  it('fails when a component: id is missing from the inventory', async () => {
    vi.spyOn(componentsIndex.componentsIndexResolver, 'resolve').mockResolvedValue({
      resolved: true,
      value: [{ id: 'ns:header', import_path: 'x', story_id: 'y' }],
      input: '',
    });
    const scene = { scenes: [{ component: 'ns:logo' }] };
    const r = await validateSceneAgainstInventory(scene, { config: {} as never });
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/Unknown component "ns:logo".*Available: ns:header/);
  });
});
```

- [ ] **Step 3: Run and verify failure**

Run: `pnpm --filter storybook-addon-designbook test scene-inventory`
Expected: `validateSceneAgainstInventory` not exported.

- [ ] **Step 4: Implement the validator helper**

Add to `packages/storybook-addon-designbook/src/validators/scene.ts` (as a named export, after the existing `validateSceneBuild`):

```typescript
import { componentsIndexResolver } from '../resolvers/components-index.js';
import type { DesignbookConfig } from '../config.js';

export async function validateSceneAgainstInventory(
  scene: unknown,
  context: { config: DesignbookConfig },
): Promise<{ valid: boolean; errors: string[] }> {
  const inv = await componentsIndexResolver.resolve('', {}, { config: context.config, params: {} });
  if (!inv.resolved) {
    return { valid: false, errors: [`components_index resolver failed: ${inv.error ?? 'unknown'}`] };
  }
  const ids = new Set((inv.value as Array<{ id: string }>).map((c) => c.id));
  const errors: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (typeof obj.component === 'string' && !ids.has(obj.component)) {
      errors.push(
        `Unknown component "${obj.component}". Available: ${[...ids].sort().join(', ') || '(none)'}`,
      );
    }
    for (const v of Object.values(obj)) walk(v);
  };
  walk(scene);
  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 5: Register in the validation registry**

In `packages/storybook-addon-designbook/src/validation-registry.ts`, inside the `scene` validator entry (around line 42-44), call `validateSceneAgainstInventory` after `validateSceneBuild` and merge errors. (Read the current shape of the entry before editing — it likely looks like `scene: async (data, ctx) => { … }`.)

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter storybook-addon-designbook test scene-inventory`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add packages/storybook-addon-designbook/src/validators/scene.ts \
        packages/storybook-addon-designbook/src/validation-registry.ts \
        packages/storybook-addon-designbook/src/validators/__tests__/scene-inventory.test.ts
git commit -m "feat(validator): safety-net scene inventory check on workflow done"
```

---

## Task 2.6: Wire `components` param into `create-scene` task

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/create-scene.md`

**Context:** Declare the `components` param with `resolve: components_index`, and note the enum constraint applies to all `component:` fields in the scene tree.

- [ ] **Step 1: Read the current task file**

Read `.agents/skills/designbook/design/tasks/create-scene.md` fully so you can extend its existing `params:` block without collisions.

- [ ] **Step 2: Add the `components` param**

Inside the `params.properties` block, insert:

```yaml
components:
  type: array
  resolve: components_index
  description: >
    Live inventory of components currently rendered in Storybook.
    Every `component:` field in the scene result MUST match one of these ids —
    the compiled schema enum enforces this automatically.
  items:
    type: object
    required: [id]
    properties:
      id: { type: string }
      import_path: { type: string }
      story_id: { type: string }
```

- [ ] **Step 3: Verify by compiling a workflow**

Manually from the repo root (or a test workspace): run the designbook-test harness against `drupal-web design-shell` up to (but not including) scene validation. Confirm `workflow instructions` for the scene stage returns the `components` param resolved to the current inventory.

(For fully automated verification, the integration test at Task 3.7 exercises the full flow.)

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/create-scene.md
git commit -m "feat(skill): create-scene consumes components_index inventory"
```

---

# Phase 3 — Reference-driven Intake Decomposition

## Task 3.1: Button atom blueprint

**Files:**
- Create: `.agents/skills/designbook-drupal/components/blueprints/button.md`

- [ ] **Step 1: Create the blueprint**

```markdown
---
type: component
name: button
priority: 10
trigger:
  domain: components
---

# Blueprint: Button

Atomic interactive control for primary and secondary actions.

**Use for:** Any clickable or tappable call-to-action that performs an action or navigates to a distinct destination. Never for inline text links — use `link.md` for those.

## Variants

Declare a `variant` enum that is shared across every button on the design; never encode per-design defaults in the blueprint:

- `primary` — dominant visual weight, brand colour background
- `outline` — border-only, transparent background
- `ghost` — no border, no background, inherits colour
- `default` — neutral weight, used when variant is omitted

## Props

- `label` — string, required
- `variant` — string, enum above
- `size` — enum `[sm, md, lg]`, optional (default unset; theme decides)
- `disabled` — boolean, optional
- `href` — string, optional (renders `<a>` when present; otherwise `<button>`)

## Slots

- `icon` — optional leading icon (render before the label)
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook-drupal/components/blueprints/button.md
git commit -m "feat(skill): add thin button atom blueprint"
```

---

## Task 3.2: Logo atom blueprint

- [ ] **Step 1: Create the blueprint**

Create `.agents/skills/designbook-drupal/components/blueprints/logo.md`:

```markdown
---
type: component
name: logo
priority: 10
trigger:
  domain: components
---

# Blueprint: Logo

Brand mark or wordmark used in header, footer, or authentication contexts.

**Use for:** Any instance where the site's visual identity appears as a clickable or static mark. Never hardcode the image path or alt text in this blueprint — those are per-design content.

## Variants

- `full` — wordmark plus symbol (default for header)
- `mark-only` — symbol without text (compact contexts)
- `inverse` — light-on-dark variant for dark backgrounds

## Props

- `variant` — string, enum above
- `href` — string, optional (default `/` when the logo is clickable)
- `alt` — string, required when `media` slot is empty

## Slots

- `media` — `image` or `element` node providing the actual mark. No default image.
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook-drupal/components/blueprints/logo.md
git commit -m "feat(skill): add thin logo atom blueprint"
```

---

## Task 3.3: Link atom blueprint

- [ ] **Step 1: Create the blueprint**

Create `.agents/skills/designbook-drupal/components/blueprints/link.md`:

```markdown
---
type: component
name: link
priority: 10
trigger:
  domain: components
---

# Blueprint: Link

Inline text anchor. Distinct from `button` — links navigate; buttons trigger actions.

**Use for:** Footer legal rows, inline body-text links, external references. Never for primary CTAs — use `button.md` with `href:` instead.

## Variants

- `default` — inherits colour, underlined on hover
- `subtle` — neutral colour (for secondary navigation)
- `external` — renders an external-link icon after the label

## Props

- `label` — string, required
- `url` — string, required
- `variant` — string, enum above

## Slots

- `icon` — optional trailing icon (ignored when `variant: external`)
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook-drupal/components/blueprints/link.md
git commit -m "feat(skill): add thin link atom blueprint"
```

---

## Task 3.4: Icon atom blueprint

- [ ] **Step 1: Create the blueprint**

Create `.agents/skills/designbook-drupal/components/blueprints/icon.md`:

```markdown
---
type: component
name: icon
priority: 10
trigger:
  domain: components
---

# Blueprint: Icon

Non-text symbol — social glyphs, search affordances, toggle indicators.

**Use for:** Purely decorative or semantically labelled symbols that are not interactive on their own. Icons inside buttons go into the button's `icon` slot, not as a standalone component.

## Props

- `name` — string, required (e.g. `search`, `menu`, `chevron-right`, `instagram`)
- `size` — enum `[sm, md, lg]`, optional (default `md`)
- `label` — string, optional (used as `aria-label` when the icon is decorative-but-meaningful)

## Slots

None.
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook-drupal/components/blueprints/icon.md
git commit -m "feat(skill): add thin icon atom blueprint"
```

---

## Task 3.5: Rewrite intake decomposition rule

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-shell.md` (step 2 of the task body)

- [ ] **Step 1: Read the current task file**

Read `.agents/skills/designbook/design/tasks/intake--design-shell.md` fully. Locate the existing step 2 (the section describing how to enumerate `component[]`).

- [ ] **Step 2: Replace the decomposition prose with a deterministic rule**

Replace the entire step-2 block with:

```markdown
### Result: `component`

Enumerate every component that will be created. The list is derived from two sources with no ad-hoc decisions:

1. **Structural landmarks.** For each top-level entry in `extract.json.landmarks` (`header`, `footer`, `main`, …), emit one component. Nested rows inside a landmark MAY be composed as `section` components when the reference shows distinct backgrounds or borders between rows.

2. **Atoms from prose.** Parse `extract.json.landmarks.*.rows[].content`. For each distinct interactive element or branded mark referenced, emit one component per kind:
   - Logo / wordmark → `logo` (see `logo.md`)
   - CTA button / labelled action → `button` (see `button.md`)
   - Plain text anchor / inline link → `link` (see `link.md`)
   - Non-text symbol (social icons, search glyph, hamburger) → `icon` (see `icon.md`)
   - Anything without a matching convention blueprint → emit a design-specific component with a role-based name (e.g. `lang-switcher`, `search-trigger`, `auth-cta`).

Reuse an existing component when its slots/variants already cover the new need — do not create near-duplicates.
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-shell.md
git commit -m "refactor(skill): deterministic decomposition rule for design-shell intake"
```

---

## Task 3.6: Decomposition-coverage soft validator (optional)

**Files:**
- Create: `.agents/skills/designbook/design/rules/decomposition-coverage.md`

**Context:** Warning-only. Counts atoms referenced in the extract vs. components declared; any gap logs a note. Hard enforcement stays with the Stories-Index enum. This task is OPTIONAL — skip if the integration test in Task 3.7 already catches all gaps. If skipped, proceed to Task 3.7.

- [ ] **Step 1: Decide whether to implement**

Run the integration test from Task 3.7 first (using the current state). If phantom-component cases are already caught by the Stories-Index enum alone, mark this task skipped and move on.

If implementing:

- [ ] **Step 2: Write the rule**

```markdown
---
trigger:
  steps: [intake--design-shell]
---

# Decomposition Coverage (soft)

After the intake stage produces the `component[]` list, the engine counts atomic references in `extract.json.landmarks.*.rows[].content` and compares against the declared components. Any uncovered atom logs a warning in `designbook.log` for audit.

This validator is advisory — it does not fail the stage. Hard enforcement happens at scene generation (the Stories-Index enum rejects references to non-existent components).
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/rules/decomposition-coverage.md
git commit -m "feat(skill): soft coverage warning for intake decomposition"
```

---

## Task 3.7: End-to-end integration test

**Files:**
- None new; exercises `designbook-test drupal-web design-shell`

**Context:** This is the acceptance gate. A full workflow run against the drupal-web fixture must:
- Emit only inventory-valid component references in `design-system.scenes.yml`
- Produce atom components (`button`, `logo`, `link`, `icon` or equivalents) from the intake rule
- Render the scene in Storybook without "Cannot find template" errors
- Complete without the "file result(s) were written directly" error

- [ ] **Step 1: Clean the test workspace**

```bash
rm -rf workspaces/drupal-web
./scripts/setup-workspace.sh drupal-web
./scripts/setup-test.sh drupal-web design-shell --into workspaces/drupal-web
```

- [ ] **Step 2: Start Storybook**

```bash
cd workspaces/drupal-web
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
_debo storybook start
_debo storybook status
```

Expect: `running: true` and a reachable URL.

- [ ] **Step 3: Run the design-shell workflow**

Load `.claude/skills/designbook/design/workflows/design-shell.md` and execute all stages through `validate`. Watch for:
- `workflow instructions` for the scene stage includes a `components` param with a populated inventory.
- `workflow done` for the scene task succeeds — no phantom `component:` references.
- Playwright validate renders `#storybook-root` without errors.

- [ ] **Step 4: Verify the generated scene file**

Open `workspaces/drupal-web/designbook/sections/design-system/design-system.section.scenes.yml`. Assert:
- Every `component:` string matches an id from Storybook's `/index.json` (run `curl http://<storybook>/index.json | jq '.entries[].importPath'` and cross-check).
- Atomic components (button/logo/link/icon or equivalents) were created and appear in the scene tree where the extract's prose called for them.

- [ ] **Step 5: Commit any test-fixture updates** (if acceptance revealed blueprint/rule tuning needs)

Only if Step 4 surfaced issues and you patched blueprints or the intake rule to resolve them:

```bash
git add <touched files>
git commit -m "refactor(skill): acceptance tuning from drupal-web design-shell run"
```

- [ ] **Step 6: Cleanup**

```bash
_debo storybook stop
```

---

# Self-Review Checklist (run before handoff)

- [ ] **Spec coverage:** Every bullet under Workstream 1, 2, 3, "Error Handling & Edge Cases", "Testing", "Rollout" in the spec has a corresponding task above.
- [ ] **Placeholder scan:** No "TBD"/"TODO" text; no "similar to Task N" references; every code step shows complete code.
- [ ] **Type consistency:** `submission` / `flush` field names are identical across tasks 1.1–1.4 and the skill docs in 1.4. Resolver name `components_index` appears identically in task files (2.6), resolver module (2.2), registry (2.3), and scene validator (2.5).
- [ ] **Migration completeness:** `flush: immediately` → `flush: immediate`, `flush: external` → `submission: direct` — both paths covered in Task 1.1 (parser rejection) and Task 1.4 (docs).
- [ ] **Integration acceptance:** Task 3.7 exercises every end-to-end behaviour promised in the spec's "Integration Test" section.
