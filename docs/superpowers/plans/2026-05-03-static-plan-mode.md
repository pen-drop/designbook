# Static Plan Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `plan` CLI subcommand that resolves a workflow definition into a single self-contained markdown document — inlining every referenced task, rule, blueprint, schema, and example, with explicit input source classification per Terraform-`plan`-without-state-refresh semantics.

**Architecture:** New `src/plan/` module sits beside the existing `src/cli/` and `src/workflow-resolve.ts`. The plan command reuses the runtime's `resolveAllStages()` (workflow → stage → task graph, $ref-resolved schemas) directly — no new wrapper data type. Five small pure modules layer on top: input source classifier, example resolver, reverse-index builder, anchor slug helper, and a sectional markdown renderer (one function per section, joined at the end). Workflow params are NOT executed; per spec, all four input source kinds are read straight from frontmatter.

**Tech Stack:** TypeScript, Commander, Vitest, js-yaml, front-matter (all already in package). Output is plain markdown to stdout.

**Spec:** `docs/superpowers/specs/2026-05-03-static-plan-mode-design.md`

---

## Design Decisions

Three decisions made during plan review (recorded here so the implementer doesn't re-derive them):

1. **No new "PlanDocument" type vocabulary.** `resolveAllStages()` already returns `step_resolved`, `stages`, `expected_params`, etc. The renderer consumes those structures plus a few small Maps (`Map<taskFile, body>`, reverse-index dicts) directly. Adding a parallel `PlanDocument`/`PlanStage`/`PlanTask` type tree would just shuffle the same data through extra hops.

2. **Tasks without `result:` skip the output schema/example blocks entirely.** Three real tasks (`outtake--design`, `polish`, `validate`) declare no `result:`. The renderer omits both `**Output schema**` and `**Output example**` for those. They also contribute nothing to `priorOutputs`, so downstream tasks with same-named inputs fall through to `(workflow params)`.

3. **Four input source kinds, classified in declaration order, with iteration checked before produced.** The fourth kind covers `each:`-expansion tasks like `polish` (1 task per `issues[]` item produced by `triage`). Detection from frontmatter only — no execution. Classifier signature: `classifyInputs(paramProps, eachKeys, priorOutputs)`.

4. **Schema `$ref`s aggregate into a global `# Schemas` appendix.** Output-schema YAML blocks emit `$ref: '#/definitions/Component'` rather than expanding inline. `buildSchemaBlock` already collects `definitions` per task; the resolver merges them across all tasks (PascalCase keys → same definition by convention, conflicts would have surfaced at runtime already). The renderer emits a `# Schemas` section before `# Rules` containing every collected definition. This keeps the document JSON-Schema-valid (every `$ref` resolves within the document), avoids inline duplication when the same type is referenced from multiple tasks, and stays consistent with how rules/blueprints get their own appendix.

| Kind | Detection | Render |
|---|---|---|
| `file` | `params.properties.<n>.path` present | `← `<path>` *(file)*` |
| `iteration` | `<n>` is a key in `each:` frontmatter | `← (per-item from \`each: <expr>\`)` |
| `produced` | `<n>` matches `result.properties.<n>` of an earlier stage's task | `← (produced by stage N: <task>)` |
| `workflow` | otherwise | `← (workflow params)` |

Order matters: `iteration` is checked before `produced` because the each-item name (e.g. `issue`) might collide with a same-named upstream result.

---

## Sample Output

This is the exact markdown `renderPlan` produces from the Task 7 fixture (`example` workflow, 3 stages: extract → intake → polish; rule `format`, blueprint `style`, schema `Component`). The implementer can use this as the ground-truth target for visual regression while building Tasks 6–7.

`````markdown
# Plan: Example

> Three-stage example used to test the plan command.

## Workflow Parameters
- `scene_id` (string) — default: `example:scene`
- `reference_url` (string) — default: ``

## Stages
| # | Stage | Tasks |
|---|-------|-------|
| 1 | reference | extract |
| 2 | intake | intake |
| 3 | polish | polish |

---

## Stage 1 — reference

### Task: extract
**References**: rule [format](#rule-format)

**Inputs**
- `reference_url` ← (workflow params)

# Extract

Fetch the reference and produce an extract.

## Example output

```yaml
extract:
  title: Sample Site
issues: []
```

**Output schema**
```yaml
type: object
properties:
  extract:
    type: object
    properties:
      title:
        type: string
  issues:
    type: array
    items:
      type: object
      properties:
        id:
          type: string
```

**Output example**
```yaml
extract:
  title: Sample Site
issues: []
```

---

## Stage 2 — intake

### Task: intake
**References**: rule [format](#rule-format), blueprint [style](#blueprint-style)

**Inputs**
- `vision` ← `$DESIGNBOOK_DATA/vision.yml` *(file)*
- `extract` ← (produced by stage 1: extract)
- `scene_id` ← (workflow params)

# Intake

Plan the components.

**Output schema**
```yaml
type: object
properties:
  components:
    type: array
    items:
      $ref: '#/definitions/Component'
```

**Output example**
```yaml
components:
  - name: <string>
    slots:
      - <string>
```

---

## Stage 3 — polish
*Iteration*: 1 task per item in `issues`

### Task: polish

**Inputs**
- `issue` ← (per-item from `each: issues`)

# Polish

Fix one issue.

---

# Schemas

## Schema: Component
*Used in tasks*: intake.intake

```yaml
type: object
required:
  - name
properties:
  name:
    type: string
  slots:
    type: array
    items:
      type: string
```

# Rules

## Rule: format
*Triggered on*: `extract`, `example:intake`
*Applied in tasks*: reference.extract, intake.intake

# Format Rule

Output must be deterministic.

# Blueprints

## Blueprint: style
*Triggered on*: `example:intake`
*Applied in tasks*: intake.intake

# Blueprint: Style

Components carry a style token reference.
`````

Things to note in the sample:

- **Stage 3 has the iteration banner** because `polish` declares `each: { issue: { expr: "issues" } }`.
- **Stage 3 task has no `**Output schema**`/`**Output example**` blocks** because `polish` has no `result:` in frontmatter.
- **`extract` task shows two YAML blocks at the bottom**: the inlined body still contains its `## Example output` markdown section (verbatim), and the renderer adds a separate `**Output example**` block resolved from the same source. They match because the body's section IS the source — that redundancy is the cost of inlining bodies verbatim.
- **`intake` task uses the schema-derived placeholder** because no `## Example output` exists in its body. The placeholder follows the `Component` `$ref` two levels deep into `name`/`slots`.
- **`reference_url`'s `default: \`\`` looks awkward** because the workflow declares an empty-string default. Faithful to the input — special-casing can land later if it turns out to be ugly across the four real workflows.
- **`# Schemas` appendix** holds every `$ref`'d definition collected across all tasks. The `intake` task's output schema points to `#/definitions/Component`, which resolves to the entry below. Reverse-index (`*Used in tasks*: …`) mirrors the rule/blueprint pattern.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/plan/anchors.ts` | `slugifyArtifactName(filePath)` — kebab-case slug from filename |
| `src/plan/sources.ts` | `InputSource` union + `classifyInputs(paramProps, eachKeys, priorOutputs)` |
| `src/plan/examples.ts` | `extractExample(bodyMd)` and `derivePlaceholderFromSchema(schema, defs)` |
| `src/plan/reverse-index.ts` | `buildArtifactIndex(stepResolved, stages, kind)` — Map<slug, refs[]> |
| `src/plan/render.ts` | `renderPlan(ctx): string` with one function per section — header, params, stages-table, per-stage detail, schemas appendix, rules appendix, blueprints appendix. `RenderContext` is an internal record type, not exported as a public schema. |
| `src/plan/resolve.ts` | `buildRenderContext(workflowFile, agentsDir): RenderContext` — calls `resolveAllStages`, reads task/rule/blueprint bodies, classifies inputs, attaches examples, aggregates schema definitions across tasks, builds reverse indices (rules, blueprints, schemas) |
| `src/plan/__tests__/*.test.ts` | One test file per module above + a `smoke.test.ts` against the real `design-shell` workflow |
| `src/plan/__tests__/fixtures/skills/example/**` | Two-stage fixture workflow exercising all four source kinds, $ref, `each:`, and a no-`result:` task |
| `src/cli/plan.ts` | Commander registration: `plan <workflow>` action that calls `buildRenderContext` + `renderPlan`, prints to stdout, exits non-zero on resolution errors |
| `src/cli.ts` | Wire `registerPlan(program)` after `registerWorkflow` and `registerStorybook` |

Files **not** modified:
- `src/workflow-resolve.ts` — consumed via imports; no changes
- `src/schema-block.ts` — consumed via `buildSchemaBlock`
- Any task/rule/blueprint authoring file under `.agents/skills/`

---

## Task 1: Anchor Slug Helper

**Files:**
- Create: `packages/storybook-addon-designbook/src/plan/anchors.ts`
- Test: `packages/storybook-addon-designbook/src/plan/__tests__/anchors.test.ts`

Markdown anchor links use kebab-case slugs derived from filenames. Per spec §Open Decisions: kebab-case slugs from rule/blueprint filenames. Needed before the renderer because rule slugs end up both in task `**References**:` lines AND in appendix headers.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { slugifyArtifactName } from '../anchors.js';

describe('slugifyArtifactName', () => {
  it('strips path and extension', () => {
    expect(slugifyArtifactName('/abs/path/skills/design/rules/markup-derivation.md')).toBe('markup-derivation');
  });

  it('lowercases and preserves dashes', () => {
    expect(slugifyArtifactName('rules/Screen-Compare.md')).toBe('screen-compare');
  });

  it('replaces underscores and spaces with hyphens', () => {
    expect(slugifyArtifactName('rules/playwright_capture rule.md')).toBe('playwright-capture-rule');
  });

  it('collapses runs of separators and trims them at the edges', () => {
    expect(slugifyArtifactName('rules/--foo__bar  baz--.md')).toBe('foo-bar-baz');
  });

  it('strips characters outside [a-z0-9-]', () => {
    expect(slugifyArtifactName('rules/!hello?world.md')).toBe('helloworld');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/anchors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `packages/storybook-addon-designbook/src/plan/anchors.ts`:

```typescript
import { basename, extname } from 'node:path';

export function slugifyArtifactName(filePath: string): string {
  const stem = basename(filePath, extname(filePath));
  return stem
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/anchors.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/plan/anchors.ts packages/storybook-addon-designbook/src/plan/__tests__/anchors.test.ts
git commit -m "feat(plan): add filename → kebab-case slug helper"
```

---

## Task 2: Input Source Classifier

**Files:**
- Create: `packages/storybook-addon-designbook/src/plan/sources.ts`
- Test: `packages/storybook-addon-designbook/src/plan/__tests__/sources.test.ts`

Classifies every task input into one of four kinds (see Design Decision 3). Iteration is checked before produced because the each-item name might collide with an upstream result of the same name.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { classifyInputs, type PriorTaskOutput } from '../sources.js';

describe('classifyInputs', () => {
  const priorOutputs: PriorTaskOutput[] = [
    { stage: 'reference', task: 'extract-reference', properties: { extract: { type: 'object' } } },
    { stage: 'triage', task: 'triage', properties: { issues: { type: 'array' } } },
    { stage: 'intake', task: 'intake', properties: { components: { type: 'array' } } },
  ];

  it('classifies a param with `path:` as file', () => {
    expect(classifyInputs({ vision: { path: '$D/vision.yml', type: 'object' } }, [], priorOutputs)).toEqual([
      { kind: 'file', name: 'vision', path: '$D/vision.yml' },
    ]);
  });

  it('classifies a param matching an earlier task result by name as produced', () => {
    expect(classifyInputs({ components: { type: 'array' } }, [], priorOutputs)).toEqual([
      { kind: 'produced', name: 'components', stage: 'intake', task: 'intake' },
    ]);
  });

  it('classifies an each-key as iteration with its expr', () => {
    const eachKeys = { issue: { expr: 'issues' } };
    expect(classifyInputs({ issue: { type: 'object' } }, eachKeys, priorOutputs)).toEqual([
      { kind: 'iteration', name: 'issue', expr: 'issues' },
    ]);
  });

  it('iteration takes precedence over produced when names collide', () => {
    // `issues` is produced by triage, but if a task declares `each: { issues: ... }`
    // we want iteration semantics, not produced.
    const eachKeys = { issues: { expr: 'issues' } };
    expect(classifyInputs({ issues: { type: 'array' } }, eachKeys, priorOutputs)).toEqual([
      { kind: 'iteration', name: 'issues', expr: 'issues' },
    ]);
  });

  it('classifies a param with no path/each/upstream match as workflow', () => {
    expect(classifyInputs({ scene_id: { type: 'string' } }, [], priorOutputs)).toEqual([
      { kind: 'workflow', name: 'scene_id' },
    ]);
  });

  it('preserves declaration order in output', () => {
    const out = classifyInputs(
      {
        scenes: { type: 'array' },
        vision: { path: '/v.yml', type: 'object' },
        scene_id: { type: 'string' },
      },
      [],
      [{ stage: 'intake', task: 'intake', properties: { scenes: {} } }],
    );
    expect(out.map((s) => [s.name, s.kind])).toEqual([
      ['scenes', 'produced'],
      ['vision', 'file'],
      ['scene_id', 'workflow'],
    ]);
  });

  it('matches the EARLIEST prior task when name appears in multiple stages', () => {
    const dup: PriorTaskOutput[] = [
      { stage: 's1', task: 't1', properties: { x: {} } },
      { stage: 's2', task: 't2', properties: { x: {} } },
    ];
    expect(classifyInputs({ x: {} }, [], dup)).toEqual([
      { kind: 'produced', name: 'x', stage: 's1', task: 't1' },
    ]);
  });

  it('returns an empty array for empty params', () => {
    expect(classifyInputs({}, [], priorOutputs)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/sources.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the classifier**

Create `packages/storybook-addon-designbook/src/plan/sources.ts`:

```typescript
export type InputSource =
  | { kind: 'file'; name: string; path: string }
  | { kind: 'iteration'; name: string; expr: string }
  | { kind: 'produced'; name: string; stage: string; task: string }
  | { kind: 'workflow'; name: string };

export interface PriorTaskOutput {
  stage: string;
  task: string;
  properties: Record<string, unknown>;
}

export function classifyInputs(
  paramProperties: Record<string, unknown>,
  eachKeys: Record<string, { expr?: string }>,
  priorOutputs: PriorTaskOutput[],
): InputSource[] {
  const out: InputSource[] = [];

  for (const [name, declRaw] of Object.entries(paramProperties)) {
    const decl = (declRaw && typeof declRaw === 'object' ? declRaw : {}) as Record<string, unknown>;

    if (typeof decl.path === 'string') {
      out.push({ kind: 'file', name, path: decl.path });
      continue;
    }

    if (name in eachKeys) {
      const expr = typeof eachKeys[name]?.expr === 'string' ? eachKeys[name]!.expr! : name;
      out.push({ kind: 'iteration', name, expr });
      continue;
    }

    const upstream = priorOutputs.find((po) => name in po.properties);
    if (upstream) {
      out.push({ kind: 'produced', name, stage: upstream.stage, task: upstream.task });
      continue;
    }

    out.push({ kind: 'workflow', name });
  }

  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/sources.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/plan/sources.ts packages/storybook-addon-designbook/src/plan/__tests__/sources.test.ts
git commit -m "feat(plan): classify task inputs as file/iteration/produced/workflow"
```

---

## Task 3: Example Resolver — Author-Written Path

**Files:**
- Create: `packages/storybook-addon-designbook/src/plan/examples.ts`
- Test: `packages/storybook-addon-designbook/src/plan/__tests__/examples.test.ts`

Per spec §Output Examples, source-resolution order is (1) author-written from `## Example output` markdown section, (2) schema-derived placeholder fallback. This task handles (1) only — placeholder fallback in Task 4.

Detection rule: scan the markdown body for a heading `## Example output` (case-insensitive). Return the verbatim content of the first fenced code block that follows that heading and **before** the next H1/H2. Return `null` when absent or when no fenced block precedes the next heading.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { extractExample } from '../examples.js';

describe('extractExample (author-written)', () => {
  it('returns the body of the first fenced block under `## Example output`', () => {
    const body = `# Task

Some prose.

## Example output

\`\`\`yaml
components:
  - name: page
    slots: [header, content, footer]
\`\`\`

## Other section
`;
    expect(extractExample(body)).toBe('components:\n  - name: page\n    slots: [header, content, footer]');
  });

  it('matches case-insensitively and tolerates trailing whitespace', () => {
    const body = `## EXAMPLE OUTPUT   \n\n\`\`\`json\n{"x":1}\n\`\`\`\n`;
    expect(extractExample(body)).toBe('{"x":1}');
  });

  it('returns null when the heading is absent', () => {
    expect(extractExample('# Task\n\nNo example here.')).toBeNull();
  });

  it('returns null when the heading is present but no fenced block follows', () => {
    expect(extractExample('## Example output\n\nProse only.\n## Other')).toBeNull();
  });

  it('does not pick up a fenced block from a later H2 section', () => {
    const body = '## Example output\n\nProse only.\n\n## Later\n\n```yaml\nnope: true\n```\n';
    expect(extractExample(body)).toBeNull();
  });

  it('preserves leading whitespace inside the fenced block', () => {
    const body = '## Example output\n\n```\n  indented: yes\n  child:\n    deep: 1\n```\n';
    expect(extractExample(body)).toBe('  indented: yes\n  child:\n    deep: 1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/examples.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement extractExample**

Create `packages/storybook-addon-designbook/src/plan/examples.ts`:

```typescript
const HEADING_RE = /^##\s+example\s+output\s*$/i;
const FENCE_OPEN_RE = /^```[\w-]*\s*$/;
const FENCE_CLOSE_RE = /^```\s*$/;
const ANY_HEADING_RE = /^#{1,2}\s+/;

export function extractExample(bodyMarkdown: string): string | null {
  const lines = bodyMarkdown.split('\n');

  let headingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (HEADING_RE.test(lines[i]!.trim())) {
      headingIdx = i;
      break;
    }
  }
  if (headingIdx === -1) return null;

  for (let i = headingIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (ANY_HEADING_RE.test(trimmed) && !HEADING_RE.test(trimmed)) return null;
    if (FENCE_OPEN_RE.test(trimmed)) {
      const buf: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (FENCE_CLOSE_RE.test(lines[j]!.trim())) return buf.join('\n');
        buf.push(lines[j]!);
      }
      return null; // unterminated fence
    }
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/examples.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/plan/examples.ts packages/storybook-addon-designbook/src/plan/__tests__/examples.test.ts
git commit -m "feat(plan): extract author-written example from `## Example output`"
```

---

## Task 4: Schema-Derived Placeholder Fallback

**Files:**
- Modify: `packages/storybook-addon-designbook/src/plan/examples.ts`
- Modify: `packages/storybook-addon-designbook/src/plan/__tests__/examples.test.ts`

Per spec §Open Decisions: simple type placeholders (`<string>`, `<number>`, `<boolean>`, `<unknown>`). Walks JSON-Schema-shaped objects (the same shape `buildSchemaBlock` produces). Recursion through self-referential definitions is bounded with a depth cap of 6. Output is YAML.

- [ ] **Step 1: Append failing tests**

Append to `packages/storybook-addon-designbook/src/plan/__tests__/examples.test.ts`:

```typescript
import { derivePlaceholderFromSchema } from '../examples.js';

describe('derivePlaceholderFromSchema', () => {
  it('emits a single scalar placeholder for primitive schemas', () => {
    expect(derivePlaceholderFromSchema({ type: 'string' }, {})).toBe('<string>');
    expect(derivePlaceholderFromSchema({ type: 'number' }, {})).toBe('<number>');
    expect(derivePlaceholderFromSchema({ type: 'boolean' }, {})).toBe('<boolean>');
  });

  it('renders an object as YAML key/value lines', () => {
    expect(
      derivePlaceholderFromSchema(
        { type: 'object', properties: { name: { type: 'string' }, count: { type: 'number' } } },
        {},
      ),
    ).toBe('name: <string>\ncount: <number>');
  });

  it('renders an array as a single-item YAML list using items schema', () => {
    expect(derivePlaceholderFromSchema({ type: 'array', items: { type: 'string' } }, {})).toBe('- <string>');
  });

  it('renders an array of objects with proper indentation', () => {
    expect(
      derivePlaceholderFromSchema(
        {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'string' }, n: { type: 'number' } } },
        },
        {},
      ),
    ).toBe('- id: <string>\n  n: <number>');
  });

  it('resolves $ref against the supplied definitions map', () => {
    expect(
      derivePlaceholderFromSchema(
        { $ref: '#/definitions/Component' },
        { Component: { type: 'object', properties: { name: { type: 'string' } } } },
      ),
    ).toBe('name: <string>');
  });

  it('renders <unknown> when type is missing and no $ref', () => {
    expect(derivePlaceholderFromSchema({}, {})).toBe('<unknown>');
  });

  it('caps recursion at depth 6 for self-referential schemas', () => {
    const defs = {
      Tree: {
        type: 'object',
        properties: { name: { type: 'string' }, child: { $ref: '#/definitions/Tree' } },
      },
    };
    const out = derivePlaceholderFromSchema({ $ref: '#/definitions/Tree' }, defs);
    expect(out).toContain('name: <string>');
    expect(out.split('\n').length).toBeLessThanOrEqual(50);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/examples.test.ts`
Expected: FAIL — `derivePlaceholderFromSchema` not exported.

- [ ] **Step 3: Implement the placeholder generator**

Append to `packages/storybook-addon-designbook/src/plan/examples.ts`:

```typescript
const MAX_DEPTH = 6;

interface SchemaNode {
  type?: string;
  $ref?: string;
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
}

export function derivePlaceholderFromSchema(schema: object, definitions: Record<string, object>): string {
  return renderNode(schema as SchemaNode, definitions, 0);
}

function renderNode(node: SchemaNode, defs: Record<string, object>, depth: number): string {
  if (depth > MAX_DEPTH) return '<...>';

  if (node.$ref) {
    const refName = node.$ref.replace(/^#\/definitions\//, '');
    const target = defs[refName];
    if (target) return renderNode(target as SchemaNode, defs, depth + 1);
    return `<${refName}>`;
  }

  if (node.type === 'object') {
    const props = node.properties ?? {};
    const keys = Object.keys(props);
    if (keys.length === 0) return '{}';
    return keys
      .map((k) => {
        const child = props[k]!;
        const rendered = renderNode(child, defs, depth + 1);
        if (rendered.includes('\n') || isContainerHeader(child)) {
          return `${k}:\n${indentBlock(rendered, '  ')}`;
        }
        return `${k}: ${rendered}`;
      })
      .join('\n');
  }

  if (node.type === 'array') {
    const item = (node.items ?? {}) as SchemaNode;
    const rendered = renderNode(item, defs, depth + 1);
    if (rendered.includes('\n')) {
      const [first, ...rest] = rendered.split('\n');
      return [`- ${first}`, ...rest.map((l) => `  ${l}`)].join('\n');
    }
    return `- ${rendered}`;
  }

  if (node.type === 'string') return '<string>';
  if (node.type === 'number' || node.type === 'integer') return '<number>';
  if (node.type === 'boolean') return '<boolean>';
  return '<unknown>';
}

function isContainerHeader(node: SchemaNode): boolean {
  return node.type === 'object' || node.type === 'array' || typeof node.$ref === 'string';
}

function indentBlock(text: string, prefix: string): string {
  return text.split('\n').map((l) => prefix + l).join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/examples.test.ts`
Expected: PASS (13 tests total — 6 from Task 3 + 7 new)

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/plan/examples.ts packages/storybook-addon-designbook/src/plan/__tests__/examples.test.ts
git commit -m "feat(plan): generate schema-derived YAML placeholder for missing examples"
```

---

## Task 5: Reverse-Index Builder

**Files:**
- Create: `packages/storybook-addon-designbook/src/plan/reverse-index.ts`
- Test: `packages/storybook-addon-designbook/src/plan/__tests__/reverse-index.test.ts`

Per spec §Document Properties bullet 5 — `Applied in tasks: ...`. Walks the resolved step→rules/blueprints map and emits, per slug, the list of `(stage, task)` references. Computed once after `resolveAllStages` returns.

The builder reads slugs by running `slugifyArtifactName` over the rule/blueprint paths in `step_resolved` — same slug derivation as in the task `**References**:` line and the appendix headers. This guarantees they match.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { buildArtifactIndex } from '../reverse-index.js';
import type { ResolvedStep } from '../../workflow-resolve.js';

describe('buildArtifactIndex', () => {
  const stepResolved: Record<string, ResolvedStep | ResolvedStep[]> = {
    'extract-reference': {
      task_file: '/x/extract-reference.md',
      rules: ['/x/rules/screen-compare.md'],
      blueprints: [],
      config_rules: [],
      config_instructions: [],
    },
    intake: {
      task_file: '/x/intake--design-shell.md',
      rules: ['/x/rules/screen-compare.md', '/x/rules/markup-derivation.md'],
      blueprints: ['/x/blueprints/static-assets.md'],
      config_rules: [],
      config_instructions: [],
    },
  };
  const stages = {
    reference: { steps: ['extract-reference'] },
    intake: { steps: ['intake'] },
  };

  it('returns one entry per unique rule slug', () => {
    const idx = buildArtifactIndex(stepResolved, stages, 'rule');
    expect(Object.keys(idx).sort()).toEqual(['markup-derivation', 'screen-compare']);
  });

  it('lists every (stage, task) reference for a slug, in stage order', () => {
    const idx = buildArtifactIndex(stepResolved, stages, 'rule');
    expect(idx['screen-compare']).toEqual([
      { stage: 'reference', task: 'extract-reference' },
      { stage: 'intake', task: 'intake' },
    ]);
  });

  it('builds blueprint index independently from rule index', () => {
    expect(buildArtifactIndex(stepResolved, stages, 'blueprint')).toEqual({
      'static-assets': [{ stage: 'intake', task: 'intake' }],
    });
  });

  it('returns empty when no task references the artifact kind', () => {
    expect(buildArtifactIndex({}, {}, 'rule')).toEqual({});
  });

  it('handles an array-form ResolvedStep (multiple tasks per step)', () => {
    const multi: Record<string, ResolvedStep | ResolvedStep[]> = {
      multi: [
        { task_file: '/a.md', rules: ['/x/rules/a.md'], blueprints: [], config_rules: [], config_instructions: [] },
        { task_file: '/b.md', rules: ['/x/rules/a.md'], blueprints: [], config_rules: [], config_instructions: [] },
      ],
    };
    const idx = buildArtifactIndex(multi, { only: { steps: ['multi'] } }, 'rule');
    expect(idx.a).toEqual([
      { stage: 'only', task: 'multi' },
      { stage: 'only', task: 'multi' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/reverse-index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the builder**

Create `packages/storybook-addon-designbook/src/plan/reverse-index.ts`:

```typescript
import type { ResolvedStep } from '../workflow-resolve.js';
import { slugifyArtifactName } from './anchors.js';

export type ArtifactKind = 'rule' | 'blueprint';
export type ArtifactIndex = Record<string, Array<{ stage: string; task: string }>>;

export function buildArtifactIndex(
  stepResolved: Record<string, ResolvedStep | ResolvedStep[]>,
  stages: Record<string, { steps?: string[] }>,
  kind: ArtifactKind,
): ArtifactIndex {
  const out: ArtifactIndex = {};

  for (const [stageName, stageDef] of Object.entries(stages)) {
    for (const step of stageDef.steps ?? []) {
      const raw = stepResolved[step];
      if (!raw) continue;
      const list = Array.isArray(raw) ? raw : [raw];
      for (const rs of list) {
        const paths = kind === 'rule' ? rs.rules : rs.blueprints;
        for (const p of paths) {
          const slug = slugifyArtifactName(p);
          if (!out[slug]) out[slug] = [];
          out[slug]!.push({ stage: stageName, task: step });
        }
      }
    }
  }

  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/reverse-index.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/plan/reverse-index.ts packages/storybook-addon-designbook/src/plan/__tests__/reverse-index.test.ts
git commit -m "feat(plan): reverse-index rules/blueprints by referencing tasks"
```

---

## Task 6: Markdown Renderer

**Files:**
- Create: `packages/storybook-addon-designbook/src/plan/render.ts`
- Test: `packages/storybook-addon-designbook/src/plan/__tests__/render.test.ts`

The renderer is a pure function `(RenderContext) => string`. `RenderContext` is an internal record (not a public schema) that bundles everything the renderer needs: workflow frontmatter, `resolveAllStages` output, file-body maps, classified inputs map, examples map, and the two reverse-index dicts. The actual field shape is defined alongside the implementation; tests construct it inline.

Output sections rendered in order: header, workflow params, stages table, per-stage detail (with iteration annotation when applicable), schemas appendix, rules appendix, blueprints appendix.

Tasks without `result:` skip both `**Output schema**` and `**Output example**`.

Schemas appendix: one entry per unique definition name across all tasks, in alphabetical order. Reverse-indexed by which tasks reference each definition (`*Used in tasks*: …`).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { renderPlan, type RenderContext } from '../render.js';

const CTX: RenderContext = {
  workflowId: 'design-shell',
  workflowFrontmatter: {
    title: 'Design Shell',
    description: 'Design the application shell -- header/content/footer slots',
    params: {
      scene_id: { type: 'string', default: 'design-system:shell' },
      reference_url: { type: 'string' },
    },
    stages: {
      reference: { steps: ['extract-reference'] },
      intake: { steps: ['intake'] },
      polish: { steps: ['polish'] },
    },
  },
  taskBodies: new Map([
    ['/x/extract-reference.md', '# Extract reference\n\nFetch the reference site.'],
    ['/x/intake--design-shell.md', '## Steps\n\n1. Determine layout'],
    ['/x/polish.md', '# Polish\n\nFix one issue.'],
  ]),
  ruleBodies: new Map([['/x/rules/markup-derivation.md', '# Markup Derivation\n\nDerive markup from reference.']]),
  blueprintBodies: new Map([['/x/blueprints/static-assets.md', '# Blueprint: Static Assets\n\nUse public/.']]),
  taskFrontmatter: new Map([
    ['/x/extract-reference.md', { result: { properties: { extract: { type: 'object' } } } }],
    [
      '/x/intake--design-shell.md',
      {
        result: { properties: { components: { type: 'array' } } },
      },
    ],
    ['/x/polish.md', { each: { issue: { expr: 'issues' } } }], // no result:
  ]),
  stepResolved: {
    'extract-reference': { task_file: '/x/extract-reference.md', rules: [], blueprints: [], config_rules: [], config_instructions: [] },
    intake: {
      task_file: '/x/intake--design-shell.md',
      rules: ['/x/rules/markup-derivation.md'],
      blueprints: ['/x/blueprints/static-assets.md'],
      config_rules: [],
      config_instructions: [],
    },
    polish: { task_file: '/x/polish.md', rules: [], blueprints: [], config_rules: [], config_instructions: [] },
  },
  inputs: new Map([
    ['extract-reference', [{ kind: 'workflow', name: 'reference_url' }]],
    [
      'intake',
      [
        { kind: 'file', name: 'vision', path: '$DESIGNBOOK_DATA/vision.yml' },
        { kind: 'produced', name: 'extract', stage: 'reference', task: 'extract-reference' },
        { kind: 'workflow', name: 'scene_id' },
      ],
    ],
    [
      'polish',
      [
        { kind: 'iteration', name: 'issue', expr: 'issues' },
        { kind: 'file', name: 'design_tokens', path: '$DESIGNBOOK_DATA/design-system/design-tokens.yml' },
      ],
    ],
  ]),
  outputSchemas: new Map([
    ['extract-reference', { type: 'object', properties: { extract: { type: 'object' } } }],
    ['intake', { type: 'object', properties: { components: { type: 'array' } } }],
  ]),
  outputExamples: new Map([
    ['extract-reference', 'extract:\n  title: Sample'],
    ['intake', 'components:\n  - name: page'],
  ]),
  ruleIndex: { 'markup-derivation': [{ stage: 'intake', task: 'intake' }] },
  blueprintIndex: { 'static-assets': [{ stage: 'intake', task: 'intake' }] },
  ruleTriggerSteps: new Map([['/x/rules/markup-derivation.md', ['create-component', 'create-scene']]]),
  blueprintTriggerSteps: new Map([['/x/blueprints/static-assets.md', ['create-scene', 'design-shell:intake']]]),
  schemaDefinitions: {
    Component: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
    DesignHint: { type: 'object', properties: { variant: { type: 'string' } } },
  },
  schemaIndex: {
    Component: [{ stage: 'intake', task: 'intake' }],
    DesignHint: [{ stage: 'intake', task: 'intake' }],
  },
};

describe('renderPlan', () => {
  const out = renderPlan(CTX);

  it('starts with the workflow heading and description blockquote', () => {
    expect(out.split('\n').slice(0, 3)).toEqual([
      '# Plan: Design Shell',
      '',
      '> Design the application shell -- header/content/footer slots',
    ]);
  });

  it('lists every workflow param with type and default', () => {
    expect(out).toMatch(/## Workflow Parameters\n- `scene_id` \(string\) — default: `design-system:shell`\n- `reference_url` \(string\)/);
  });

  it('renders the stages table', () => {
    expect(out).toMatch(
      /## Stages\n\| # \| Stage \| Tasks \|\n\|---\|-------\|-------\|\n\| 1 \| reference \| extract-reference \|\n\| 2 \| intake \| intake \|\n\| 3 \| polish \| polish \|/,
    );
  });

  it('renders each stage as `## Stage N — <name>`', () => {
    expect(out).toMatch(/## Stage 1 — reference/);
    expect(out).toMatch(/## Stage 3 — polish/);
  });

  it('annotates an each-stage with iteration source', () => {
    expect(out).toMatch(/## Stage 3 — polish\n\*Iteration\*: 1 task per item in `issues`/);
  });

  it('renders task `**References**:` line with anchor links', () => {
    expect(out).toMatch(
      /\*\*References\*\*: rule \[markup-derivation\]\(#rule-markup-derivation\), blueprint \[static-assets\]\(#blueprint-static-assets\)/,
    );
  });

  it('renders all four input source kinds in spec format', () => {
    expect(out).toMatch(/- `vision` ← `\$DESIGNBOOK_DATA\/vision.yml` \*\(file\)\*/);
    expect(out).toMatch(/- `extract` ← \(produced by stage 1: extract-reference\)/);
    expect(out).toMatch(/- `scene_id` ← \(workflow params\)/);
    expect(out).toMatch(/- `issue` ← \(per-item from `each: issues`\)/);
  });

  it('inlines the task body markdown verbatim', () => {
    expect(out).toContain('## Steps\n\n1. Determine layout');
  });

  it('renders the output schema and example for tasks WITH result:', () => {
    expect(out).toMatch(/\*\*Output schema\*\*\n```yaml\ntype: object\nproperties:\n  components:/);
    expect(out).toMatch(/\*\*Output example\*\*\n```yaml\ncomponents:\n  - name: page\n```/);
  });

  it('omits output schema and example for tasks WITHOUT result:', () => {
    // polish has no result: in fixture — must NOT have these blocks
    const polishSection = out.slice(out.indexOf('## Stage 3 — polish'));
    expect(polishSection).not.toMatch(/\*\*Output schema\*\*/);
    expect(polishSection).not.toMatch(/\*\*Output example\*\*/);
  });

  it('emits a `# Schemas` appendix before `# Rules`', () => {
    expect(out.indexOf('# Schemas')).toBeGreaterThan(-1);
    expect(out.indexOf('# Schemas')).toBeLessThan(out.indexOf('# Rules'));
  });

  it('renders each schema definition with `*Used in tasks*` and a YAML body', () => {
    expect(out).toMatch(
      /## Schema: Component\n\*Used in tasks\*: intake\.intake\n\n```yaml\ntype: object\nrequired:\n  - name\nproperties:\n  name:\n    type: string\n```/,
    );
  });

  it('renders schemas in alphabetical order', () => {
    const cIdx = out.indexOf('## Schema: Component');
    const dIdx = out.indexOf('## Schema: DesignHint');
    expect(cIdx).toBeGreaterThan(-1);
    expect(dIdx).toBeGreaterThan(cIdx);
  });

  it('renders rules appendix with trigger steps and applied-in-tasks', () => {
    expect(out).toMatch(
      /# Rules\n\n## Rule: markup-derivation\n\*Triggered on\*: `create-component`, `create-scene`\n\*Applied in tasks\*: intake\.intake/,
    );
  });

  it('renders blueprints appendix with each blueprint inlined', () => {
    expect(out).toMatch(/# Blueprints\n\n## Blueprint: static-assets/);
    expect(out).toContain('Use public/.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/render.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the renderer**

Create `packages/storybook-addon-designbook/src/plan/render.ts`:

```typescript
import { dump as dumpYaml } from 'js-yaml';
import type { ResolvedStep } from '../workflow-resolve.js';
import type { InputSource } from './sources.js';
import type { ArtifactIndex } from './reverse-index.js';

export interface RenderContext {
  workflowId: string;
  workflowFrontmatter: {
    title?: string;
    description?: string;
    params?: Record<string, { type?: string; default?: unknown }>;
    stages?: Record<string, { steps?: string[]; each?: string }>;
  };
  taskBodies: Map<string, string>;
  ruleBodies: Map<string, string>;
  blueprintBodies: Map<string, string>;
  taskFrontmatter: Map<string, { result?: { properties?: Record<string, unknown> }; each?: Record<string, { expr?: string }> }>;
  stepResolved: Record<string, ResolvedStep | ResolvedStep[]>;
  inputs: Map<string, InputSource[]>;            // keyed by step name
  outputSchemas: Map<string, object>;            // keyed by step name; absent when no result:
  outputExamples: Map<string, string>;           // keyed by step name; absent when no result:
  ruleIndex: ArtifactIndex;
  blueprintIndex: ArtifactIndex;
  ruleTriggerSteps: Map<string, string[]>;       // keyed by rule file path
  blueprintTriggerSteps: Map<string, string[]>;
  schemaDefinitions: Record<string, object>;     // aggregated across all tasks
  schemaIndex: ArtifactIndex;                    // keyed by definition name
}

export function renderPlan(ctx: RenderContext): string {
  return [
    ...renderHeader(ctx),
    ...renderParams(ctx),
    ...renderStagesTable(ctx),
    ...renderStagesDetail(ctx),
    ...renderSchemasAppendix(ctx),
    ...renderRulesAppendix(ctx),
    ...renderBlueprintsAppendix(ctx),
  ].join('\n');
}

function renderHeader(ctx: RenderContext): string[] {
  return [`# Plan: ${ctx.workflowFrontmatter.title ?? ctx.workflowId}`, '', `> ${ctx.workflowFrontmatter.description ?? ''}`, ''];
}

function renderParams(ctx: RenderContext): string[] {
  const out = ['## Workflow Parameters'];
  const params = ctx.workflowFrontmatter.params ?? {};
  if (Object.keys(params).length === 0) {
    out.push('_(none)_');
  } else {
    for (const [name, decl] of Object.entries(params)) {
      const type = decl.type ?? 'string';
      const def = 'default' in decl ? ` — default: \`${formatScalar(decl.default)}\`` : '';
      out.push(`- \`${name}\` (${type})${def}`);
    }
  }
  out.push('');
  return out;
}

function renderStagesTable(ctx: RenderContext): string[] {
  const out = ['## Stages', '| # | Stage | Tasks |', '|---|-------|-------|'];
  const stages = Object.entries(ctx.workflowFrontmatter.stages ?? {});
  stages.forEach(([name, def], i) => {
    const tasks = (def.steps ?? []).join(', ');
    out.push(`| ${i + 1} | ${name} | ${tasks} |`);
  });
  out.push('', '---', '');
  return out;
}

function renderStagesDetail(ctx: RenderContext): string[] {
  const out: string[] = [];
  const stages = Object.entries(ctx.workflowFrontmatter.stages ?? {});
  stages.forEach(([stageName, stageDef], i) => {
    out.push(`## Stage ${i + 1} — ${stageName}`);

    // Iteration annotation: emit when ANY task in this stage has each: in frontmatter
    const iterationExprs = collectIterationExprs(stageDef.steps ?? [], ctx);
    if (iterationExprs.length > 0) {
      out.push(`*Iteration*: 1 task per item in ${iterationExprs.map((e) => `\`${e}\``).join(', ')}`);
    }
    out.push('');

    for (const step of stageDef.steps ?? []) {
      out.push(...renderTask(step, stages, ctx));
    }
    out.push('---', '');
  });
  return out;
}

function collectIterationExprs(steps: string[], ctx: RenderContext): string[] {
  const exprs: string[] = [];
  for (const step of steps) {
    const raw = ctx.stepResolved[step];
    if (!raw) continue;
    const list = Array.isArray(raw) ? raw : [raw];
    for (const rs of list) {
      const each = ctx.taskFrontmatter.get(rs.task_file)?.each ?? {};
      for (const k of Object.keys(each)) {
        const expr = each[k]?.expr ?? k;
        if (!exprs.includes(expr)) exprs.push(expr);
      }
    }
  }
  return exprs;
}

function renderTask(step: string, stages: Array<[string, { steps?: string[] }]>, ctx: RenderContext): string[] {
  const out = [`### Task: ${step}`];

  const raw = ctx.stepResolved[step];
  if (!raw) return [...out, ''];
  const rs = Array.isArray(raw) ? raw[0]! : raw;

  const ruleSlugs = rs.rules.map(slugFromPath);
  const blueprintSlugs = rs.blueprints.map(slugFromPath);
  const refs: string[] = [];
  for (const s of ruleSlugs) refs.push(`rule [${s}](#rule-${s})`);
  for (const s of blueprintSlugs) refs.push(`blueprint [${s}](#blueprint-${s})`);
  if (refs.length > 0) out.push(`**References**: ${refs.join(', ')}`);
  out.push('');

  out.push('**Inputs**');
  const inputs = ctx.inputs.get(step) ?? [];
  if (inputs.length === 0) {
    out.push('- _(none)_');
  } else {
    for (const input of inputs) out.push(formatInput(input, stages));
  }
  out.push('');

  const body = ctx.taskBodies.get(rs.task_file) ?? '';
  out.push(body, '');

  if (ctx.outputSchemas.has(step)) {
    out.push('**Output schema**', '```yaml', dumpYaml(ctx.outputSchemas.get(step)!).trimEnd(), '```', '');
  }
  if (ctx.outputExamples.has(step)) {
    out.push('**Output example**', '```yaml', ctx.outputExamples.get(step)!, '```', '');
  }
  return out;
}

function formatInput(input: InputSource, stages: Array<[string, { steps?: string[] }]>): string {
  if (input.kind === 'file') return `- \`${input.name}\` ← \`${input.path}\` *(file)*`;
  if (input.kind === 'iteration') return `- \`${input.name}\` ← (per-item from \`each: ${input.expr}\`)`;
  if (input.kind === 'produced') {
    const stageIdx = stages.findIndex(([n]) => n === input.stage) + 1;
    return `- \`${input.name}\` ← (produced by stage ${stageIdx}: ${input.task})`;
  }
  return `- \`${input.name}\` ← (workflow params)`;
}

function renderSchemasAppendix(ctx: RenderContext): string[] {
  const names = Object.keys(ctx.schemaDefinitions).sort();
  if (names.length === 0) return [];

  const out = ['# Schemas', ''];
  for (const name of names) {
    const refs = ctx.schemaIndex[name] ?? [];
    out.push(
      `## Schema: ${name}`,
      `*Used in tasks*: ${refs.map((r) => `${r.stage}.${r.task}`).join(', ') || '_(none)_'}`,
      '',
      '```yaml',
      dumpYaml(ctx.schemaDefinitions[name]!).trimEnd(),
      '```',
      '',
    );
  }
  return out;
}

function renderRulesAppendix(ctx: RenderContext): string[] {
  const out = ['# Rules', ''];
  const seen = new Set<string>();
  for (const slug of Object.keys(ctx.ruleIndex)) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const filePath = findFilePathBySlug(ctx.ruleBodies, slug);
    if (!filePath) continue;
    const triggers = ctx.ruleTriggerSteps.get(filePath) ?? [];
    const refs = ctx.ruleIndex[slug] ?? [];
    out.push(
      `## Rule: ${slug}`,
      `*Triggered on*: ${triggers.map((s) => `\`${s}\``).join(', ') || '_(none)_'}`,
      `*Applied in tasks*: ${refs.map((r) => `${r.stage}.${r.task}`).join(', ') || '_(none)_'}`,
      '',
      ctx.ruleBodies.get(filePath) ?? '',
      '',
    );
  }
  return out;
}

function renderBlueprintsAppendix(ctx: RenderContext): string[] {
  const out = ['# Blueprints', ''];
  const seen = new Set<string>();
  for (const slug of Object.keys(ctx.blueprintIndex)) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const filePath = findFilePathBySlug(ctx.blueprintBodies, slug);
    if (!filePath) continue;
    const triggers = ctx.blueprintTriggerSteps.get(filePath) ?? [];
    const refs = ctx.blueprintIndex[slug] ?? [];
    out.push(
      `## Blueprint: ${slug}`,
      `*Triggered on*: ${triggers.map((s) => `\`${s}\``).join(', ') || '_(none)_'}`,
      `*Applied in tasks*: ${refs.map((r) => `${r.stage}.${r.task}`).join(', ') || '_(none)_'}`,
      '',
      ctx.blueprintBodies.get(filePath) ?? '',
      '',
    );
  }
  return out;
}

function findFilePathBySlug(bodies: Map<string, string>, slug: string): string | undefined {
  for (const path of bodies.keys()) {
    if (slugFromPath(path) === slug) return path;
  }
  return undefined;
}

function slugFromPath(filePath: string): string {
  // Inline equivalent of slugifyArtifactName — kept here to avoid a circular
  // import path; resolve.ts imports the real helper.
  const base = filePath.split('/').pop()!.replace(/\.md$/, '');
  return base
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatScalar(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/render.test.ts`
Expected: PASS (15 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/plan/render.ts packages/storybook-addon-designbook/src/plan/__tests__/render.test.ts
git commit -m "feat(plan): render plan as self-contained markdown via section functions"
```

---

## Task 7: Plan Resolver — Workflow → RenderContext

**Files:**
- Create: `packages/storybook-addon-designbook/src/plan/resolve.ts`
- Create: `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/workflows/example.md`
- Create: `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/tasks/extract.md`
- Create: `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/tasks/intake--example.md`
- Create: `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/tasks/polish.md`
- Create: `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/rules/format.md`
- Create: `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/blueprints/style.md`
- Create: `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/schemas.yml`
- Test: `packages/storybook-addon-designbook/src/plan/__tests__/resolve.test.ts`

`buildRenderContext()` orchestrates: calls `resolveAllStages` (no params — purely static), reads task/rule/blueprint markdown bodies, classifies inputs (`file` / `iteration` / `produced` / `workflow`), attaches output examples (with placeholder fallback), builds reverse indices.

The fixture is a 3-stage workflow: stage-1 task with file param + author example + result, stage-2 task with all four input kinds + $ref result, stage-3 `polish` task with `each:` + no `result:`.

- [ ] **Step 1: Build the fixture workflow file**

Create `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/workflows/example.md`:

```markdown
---
title: Example
description: Three-stage example used to test the plan command.
params:
  scene_id:
    type: string
    default: example:scene
  reference_url:
    type: string
    default: ""
stages:
  reference:
    steps: [extract]
  intake:
    steps: [intake]
  polish:
    steps: [polish]
engine: direct
---
```

- [ ] **Step 2: Build stage-1 task fixture (with author-written example)**

Create `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/tasks/extract.md`:

```markdown
---
trigger:
  steps: [extract]
params:
  type: object
  properties:
    reference_url: { type: string, default: "" }
result:
  type: object
  required: [extract, issues]
  properties:
    extract:
      type: object
      properties:
        title: { type: string }
    issues:
      type: array
      items:
        type: object
        properties:
          id: { type: string }
---

# Extract

Fetch the reference and produce an extract.

## Example output

```yaml
extract:
  title: Sample Site
issues: []
```
```

- [ ] **Step 3: Build stage-2 task fixture (all four input kinds, no author example, $ref result)**

Create `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/tasks/intake--example.md`:

```markdown
---
trigger:
  steps: [example:intake]
params:
  type: object
  required: [vision]
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      type: object
    extract:
      type: object
    scene_id:
      type: string
result:
  type: object
  required: [components]
  properties:
    components:
      type: array
      items:
        $ref: ../schemas.yml#/Component
---

# Intake

Plan the components.
```

- [ ] **Step 4: Build stage-3 task fixture (`each:`, no `result:`)**

Create `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/tasks/polish.md`:

```markdown
---
trigger:
  steps: [polish]
params:
  type: object
  required: [issue]
  properties:
    issue:
      type: object
each:
  issue:
    expr: "issues"
---

# Polish

Fix one issue.
```

- [ ] **Step 5: Build rule, blueprint, schemas.yml**

Create `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/rules/format.md`:

```markdown
---
trigger:
  steps: [extract, example:intake]
---

# Format Rule

Output must be deterministic.
```

Create `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/blueprints/style.md`:

```markdown
---
type: blueprint
name: style
trigger:
  steps: [example:intake]
---

# Blueprint: Style

Components carry a style token reference.
```

Create `packages/storybook-addon-designbook/src/plan/__tests__/fixtures/skills/example/schemas.yml`:

```yaml
Component:
  type: object
  required: [name]
  properties:
    name:
      type: string
    slots:
      type: array
      items:
        type: string
```

- [ ] **Step 6: Write the failing resolver test**

Create `packages/storybook-addon-designbook/src/plan/__tests__/resolve.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dump as dumpYaml } from 'js-yaml';
import { buildRenderContext } from '../resolve.js';

interface Sandbox {
  root: string;
  agentsDir: string;
  workflowFile: string;
  cleanup: () => void;
}

function setupSandbox(): Sandbox {
  const root = mkdtempSync(join(tmpdir(), 'plan-resolve-'));
  const dataDir = join(root, 'designbook');
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(root, 'designbook.config.yml'), dumpYaml({ designbook: { data: 'designbook' } }));
  const agentsDir = join(root, '.agents');
  mkdirSync(agentsDir, { recursive: true });
  cpSync(resolve(__dirname, 'fixtures/skills'), join(agentsDir, 'skills'), { recursive: true });
  const workflowFile = join(agentsDir, 'skills/example/workflows/example.md');
  return { root, agentsDir, workflowFile, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

describe('buildRenderContext', () => {
  let sandbox: Sandbox;
  let previousCwd: string;

  beforeEach(() => {
    sandbox = setupSandbox();
    previousCwd = process.cwd();
    process.chdir(sandbox.root);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    sandbox.cleanup();
  });

  it('returns workflow id, title and description from frontmatter', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.workflowId).toBe('example');
    expect(ctx.workflowFrontmatter.title).toBe('Example');
    expect(ctx.workflowFrontmatter.description).toMatch(/Three-stage example/);
  });

  it('preserves workflow params with defaults', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.workflowFrontmatter.params).toEqual({
      scene_id: { type: 'string', default: 'example:scene' },
      reference_url: { type: 'string', default: '' },
    });
  });

  it('classifies vision (path:) as file source', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    const intakeInputs = ctx.inputs.get('intake')!;
    expect(intakeInputs.find((i) => i.name === 'vision')).toEqual({
      kind: 'file',
      name: 'vision',
      path: '$DESIGNBOOK_DATA/vision.yml',
    });
  });

  it('classifies extract as produced by stage 1 task `extract`', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    const intakeInputs = ctx.inputs.get('intake')!;
    expect(intakeInputs.find((i) => i.name === 'extract')).toEqual({
      kind: 'produced',
      name: 'extract',
      stage: 'reference',
      task: 'extract',
    });
  });

  it('classifies scene_id as workflow params', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    const intakeInputs = ctx.inputs.get('intake')!;
    expect(intakeInputs.find((i) => i.name === 'scene_id')).toEqual({ kind: 'workflow', name: 'scene_id' });
  });

  it('classifies polish.issue as iteration with expr from each:', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    const polishInputs = ctx.inputs.get('polish')!;
    expect(polishInputs.find((i) => i.name === 'issue')).toEqual({
      kind: 'iteration',
      name: 'issue',
      expr: 'issues',
    });
  });

  it('uses author-written `## Example output` when present', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.outputExamples.get('extract')).toContain('extract:\n  title: Sample Site');
  });

  it('falls back to schema-derived placeholder when no author example exists', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    const intakeExample = ctx.outputExamples.get('intake')!;
    expect(intakeExample).toContain('components:');
    expect(intakeExample).toContain('- name: <string>');
  });

  it('omits output schema and example for tasks without `result:`', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.outputSchemas.has('polish')).toBe(false);
    expect(ctx.outputExamples.has('polish')).toBe(false);
  });

  it('does not add a result-less task to priorOutputs (no name collision propagation)', async () => {
    // polish has no result:; downstream tasks (none here, but covered by signature)
    // would not see polish's params as produced. We assert the priorOutputs invariant
    // indirectly: ctx.outputSchemas only contains keys for tasks that DO have result.
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect([...ctx.outputSchemas.keys()].sort()).toEqual(['extract', 'intake']);
  });

  it('builds rule reverse-index keyed by slug with stage/task references', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.ruleIndex.format).toEqual([
      { stage: 'reference', task: 'extract' },
      { stage: 'intake', task: 'intake' },
    ]);
  });

  it('builds blueprint reverse-index', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.blueprintIndex.style).toEqual([{ stage: 'intake', task: 'intake' }]);
  });

  it('aggregates schema definitions from $refs across all tasks', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.schemaDefinitions.Component).toMatchObject({
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, slots: { type: 'array' } },
    });
  });

  it('builds schema reverse-index from $refs in result schemas', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.schemaIndex.Component).toEqual([{ stage: 'intake', task: 'intake' }]);
  });

  it('inlines task/rule/blueprint markdown bodies (frontmatter stripped)', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.taskBodies.get([...ctx.taskBodies.keys()].find((p) => p.endsWith('extract.md'))!)).toContain(
      '# Extract',
    );
    expect([...ctx.taskBodies.values()][0]!).not.toContain('---\ntrigger:');
    const formatRulePath = [...ctx.ruleBodies.keys()].find((p) => p.endsWith('format.md'))!;
    expect(ctx.ruleBodies.get(formatRulePath)).toContain('Output must be deterministic.');
  });

  it('throws on a workflow file pointing at a non-existent step', async () => {
    writeFileSync(
      sandbox.workflowFile,
      `---
title: Broken
description: ""
stages:
  reference:
    steps: [does-not-exist]
engine: direct
---
`,
    );
    await expect(buildRenderContext(sandbox.workflowFile, sandbox.agentsDir)).rejects.toThrow(
      /no matching task file|step.*does-not-exist/i,
    );
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/resolve.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement the resolver**

Create `packages/storybook-addon-designbook/src/plan/resolve.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import fm from 'front-matter';
import { load as parseYaml } from 'js-yaml';
import { loadConfig, findConfig } from '../config.js';
import {
  resolveAllStages,
  parseFrontmatter,
  buildEnvMap,
  type ResolvedStep,
} from '../workflow-resolve.js';
import { buildSchemaBlock } from '../schema-block.js';
import { classifyInputs, type InputSource, type PriorTaskOutput } from './sources.js';
import { extractExample, derivePlaceholderFromSchema } from './examples.js';
import { buildArtifactIndex } from './reverse-index.js';
import type { RenderContext } from './render.js';

interface FmPayload {
  attributes: Record<string, unknown>;
  body: string;
}

function readBody(filePath: string): string {
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = fm<Record<string, unknown>>(raw) as unknown as FmPayload;
  return parsed.body.trim();
}

function readTriggerSteps(filePath: string): string[] {
  const fmAttrs = parseFrontmatter(filePath) as Record<string, unknown> | null;
  const trigger = fmAttrs?.trigger as { steps?: string[] } | undefined;
  return trigger?.steps ?? [];
}

export async function buildRenderContext(workflowFilePath: string, agentsDir: string): Promise<RenderContext> {
  const config = loadConfig();
  const configPath = findConfig();
  const rawConfig = configPath
    ? ((parseYaml(readFileSync(configPath, 'utf-8')) as Record<string, unknown>) ?? {})
    : {};
  const skillsRoot = resolvePath(agentsDir, 'skills');
  const envMap = buildEnvMap(config);

  const resolved = await resolveAllStages(workflowFilePath, config, rawConfig, agentsDir);
  const wfFm = (parseFrontmatter(workflowFilePath) as Record<string, unknown> | null) ?? {};
  const workflowId = workflowFilePath.split('/').pop()!.replace(/\.md$/, '');

  // Collect per-step state.
  const taskBodies = new Map<string, string>();
  const ruleBodies = new Map<string, string>();
  const blueprintBodies = new Map<string, string>();
  const taskFrontmatter = new Map<string, { result?: { properties?: Record<string, unknown> }; each?: Record<string, { expr?: string }> }>();
  const inputs = new Map<string, InputSource[]>();
  const outputSchemas = new Map<string, object>();
  const outputExamples = new Map<string, string>();
  const ruleTriggerSteps = new Map<string, string[]>();
  const blueprintTriggerSteps = new Map<string, string[]>();
  const schemaDefinitions: Record<string, object> = {};
  const schemaIndex: Record<string, Array<{ stage: string; task: string }>> = {};

  const stagesEntries = Object.entries(resolved.stages ?? {});
  const priorOutputs: PriorTaskOutput[] = [];

  for (const [stageName, stageDef] of stagesEntries) {
    for (const step of (stageDef as { steps?: string[] }).steps ?? []) {
      const raw = resolved.step_resolved[step];
      if (!raw) {
        throw new Error(`Step "${step}" in stage "${stageName}" has no matching task file (resolveAllStages skipped it).`);
      }
      const list: ResolvedStep[] = Array.isArray(raw) ? raw : [raw];
      const rs = list[0]!;

      // Task body + frontmatter
      if (!taskBodies.has(rs.task_file)) taskBodies.set(rs.task_file, readBody(rs.task_file));
      const taskFm = (parseFrontmatter(rs.task_file) as Record<string, unknown> | null) ?? {};
      const paramsFm = (taskFm.params ?? {}) as { properties?: Record<string, unknown> };
      const paramProps = (paramsFm.properties ?? {}) as Record<string, unknown>;
      const each = (taskFm.each ?? {}) as Record<string, { expr?: string }>;
      const resultFm = taskFm.result as { properties?: Record<string, unknown> } | undefined;
      taskFrontmatter.set(rs.task_file, { result: resultFm, each });

      // Inputs
      inputs.set(step, classifyInputs(paramProps, each, priorOutputs));

      // Output schema + example — only when result: present and non-empty
      if (resultFm?.properties && Object.keys(resultFm.properties).length > 0) {
        const schemaBlock = await buildSchemaBlock({
          params: paramsFm,
          result: resultFm,
          taskFilePath: rs.task_file,
          skillsRoot,
          envMap,
        });
        const schemaObj = renderResultSchemaObject(schemaBlock);
        outputSchemas.set(step, schemaObj);
        const body = taskBodies.get(rs.task_file)!;
        const example = extractExample(body) ?? derivePlaceholderFromSchema(schemaObj, schemaBlock.definitions);
        outputExamples.set(step, example);

        // Aggregate schema definitions + build per-task reverse index
        for (const [defName, defSchema] of Object.entries(schemaBlock.definitions)) {
          if (!schemaDefinitions[defName]) schemaDefinitions[defName] = defSchema;
          const refsForThisTask = collectRefNamesFromSchema(schemaObj);
          if (refsForThisTask.has(defName)) {
            if (!schemaIndex[defName]) schemaIndex[defName] = [];
            schemaIndex[defName]!.push({ stage: stageName, task: step });
          }
        }

        priorOutputs.push({ stage: stageName, task: step, properties: resultFm.properties });
      }

      // Rule + blueprint bodies and trigger steps
      for (const rulePath of rs.rules) {
        if (!ruleBodies.has(rulePath)) {
          ruleBodies.set(rulePath, readBody(rulePath));
          ruleTriggerSteps.set(rulePath, readTriggerSteps(rulePath));
        }
      }
      for (const bpPath of rs.blueprints) {
        if (!blueprintBodies.has(bpPath)) {
          blueprintBodies.set(bpPath, readBody(bpPath));
          blueprintTriggerSteps.set(bpPath, readTriggerSteps(bpPath));
        }
      }
    }
  }

  const stages = (resolved.stages ?? {}) as Record<string, { steps?: string[]; each?: string }>;
  const ruleIndex = buildArtifactIndex(resolved.step_resolved, stages, 'rule');
  const blueprintIndex = buildArtifactIndex(resolved.step_resolved, stages, 'blueprint');

  return {
    workflowId,
    workflowFrontmatter: {
      title: wfFm.title as string | undefined,
      description: wfFm.description as string | undefined,
      params: wfFm.params as Record<string, { type?: string; default?: unknown }> | undefined,
      stages,
    },
    taskBodies,
    ruleBodies,
    blueprintBodies,
    taskFrontmatter,
    stepResolved: resolved.step_resolved,
    inputs,
    outputSchemas,
    outputExamples,
    ruleIndex,
    blueprintIndex,
    ruleTriggerSteps,
    blueprintTriggerSteps,
    schemaDefinitions,
    schemaIndex,
  };
}

/**
 * Walk a schema and collect all `#/definitions/<name>` ref targets used in it.
 * Used to know which definitions a given task actually references.
 */
function collectRefNamesFromSchema(schema: unknown): Set<string> {
  const out = new Set<string>();
  walk(schema);
  return out;

  function walk(node: unknown): void {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.$ref === 'string') {
      const m = obj.$ref.match(/^#\/definitions\/(.+)$/);
      if (m) out.add(m[1]!);
    }
    Object.values(obj).forEach(walk);
  }
}

function renderResultSchemaObject(schemaBlock: { result: Record<string, unknown> }): object {
  const props: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(schemaBlock.result)) {
    const e = entry as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(e)) {
      if (k === 'path' || k === 'exists' || k === 'content') continue;
      cleaned[k] = v;
    }
    props[key] = cleaned;
  }
  return { type: 'object', properties: props };
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/resolve.test.ts`
Expected: PASS (16 tests)

If `resolveAllStages` returns silently when a step has no matching task (it currently logs `[Designbook] step "X" skipped — no matching task file`), the iteration above still throws because it checks `resolved.step_resolved[step]` directly. That throw is what the broken-step test verifies.

- [ ] **Step 10: Commit**

```bash
git add packages/storybook-addon-designbook/src/plan/resolve.ts \
        packages/storybook-addon-designbook/src/plan/__tests__/resolve.test.ts \
        packages/storybook-addon-designbook/src/plan/__tests__/fixtures/
git commit -m "feat(plan): build RenderContext from a workflow file"
```

---

## Task 8: CLI Wiring

**Files:**
- Create: `packages/storybook-addon-designbook/src/cli/plan.ts`
- Modify: `packages/storybook-addon-designbook/src/cli.ts`
- Test: `packages/storybook-addon-designbook/src/cli/__tests__/plan.test.ts`

CLI surface: `plan <workflow>` — single argument, no flags, output to stdout, exit 0 on success, exit 1 with stderr message on resolution errors. Workflow ID resolved via the same `skills/**/workflows/<id>.md` glob `workflow create` uses (`cli/workflow.ts:36-43`).

- [ ] **Step 1: Write the failing CLI test**

Create `packages/storybook-addon-designbook/src/cli/__tests__/plan.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { setupCliSandbox, type CliSandbox } from './helpers.js';
import { register as registerPlan } from '../plan.js';

function seedFixtures(sandbox: CliSandbox): void {
  const agentsDir = resolve(sandbox.tmpRoot, '.agents');
  mkdirSync(agentsDir, { recursive: true });
  cpSync(
    resolve(__dirname, '..', '..', 'plan', '__tests__', 'fixtures', 'skills'),
    resolve(agentsDir, 'skills'),
    { recursive: true },
  );
}

function programWithPlan(): Command {
  const program = new Command();
  program.exitOverride();
  registerPlan(program);
  return program;
}

describe('cli: plan <workflow>', () => {
  let sandbox: CliSandbox;

  beforeEach(() => {
    sandbox = setupCliSandbox();
    seedFixtures(sandbox);
  });

  afterEach(() => {
    sandbox.cleanup();
    vi.restoreAllMocks();
  });

  it('writes the resolved markdown plan to stdout for a known workflow', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = programWithPlan();
    await program.parseAsync(['node', 'cli', 'plan', 'example']);

    expect(process.exitCode).toBeFalsy();
    const output = logSpy.mock.calls.flat().filter((c): c is string => typeof c === 'string').join('\n');
    expect(output).toMatch(/^# Plan: Example/);
    expect(output).toContain('## Stage 1 — reference');
    expect(output).toContain('## Stage 3 — polish');
    expect(output).toContain('## Rule: format');
    expect(output).toContain('## Blueprint: style');
    expect(output).toMatch(/\*Iteration\*: 1 task per item in `issues`/);
  });

  it('exits non-zero with stderr on unknown workflow id', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const program = programWithPlan();
    await program.parseAsync(['node', 'cli', 'plan', 'does-not-exist']);

    expect(process.exitCode).toBe(1);
    const errText = errSpy.mock.calls.flat().filter((c): c is string => typeof c === 'string').join('\n');
    expect(errText).toMatch(/workflow.*does-not-exist|not found/i);
  });

  it('exits non-zero on a resolution error inside the workflow', async () => {
    writeFileSync(
      resolve(sandbox.tmpRoot, '.agents/skills/example/workflows/example.md'),
      `---
title: Broken
description: ""
stages:
  reference:
    steps: [no-such-step]
engine: direct
---
`,
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const program = programWithPlan();
    await program.parseAsync(['node', 'cli', 'plan', 'example']);

    expect(process.exitCode).toBe(1);
    const errText = errSpy.mock.calls.flat().filter((c): c is string => typeof c === 'string').join('\n');
    expect(errText.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test cli/__tests__/plan.test.ts`
Expected: FAIL — `../plan.js` not found.

- [ ] **Step 3: Implement the CLI subcommand**

Create `packages/storybook-addon-designbook/src/cli/plan.ts`:

```typescript
import { dirname } from 'node:path';
import type { Command } from 'commander';
import { globSync } from 'glob';
import { findConfig, resolveSkillsRoot } from '../config.js';
import { buildRenderContext } from '../plan/resolve.js';
import { renderPlan } from '../plan/render.js';

function resolveWorkflowFile(workflowId: string, agentsDir: string): string {
  const matches = globSync(`skills/**/workflows/${workflowId}.md`, { cwd: agentsDir, absolute: true });
  if (matches.length === 0) {
    throw new Error(`Workflow not found: "${workflowId}". No match for skills/**/workflows/${workflowId}.md`);
  }
  return matches[0]!;
}

export function register(program: Command): void {
  program
    .command('plan <workflow>')
    .description('Resolve a workflow definition into a self-contained markdown plan written to stdout.')
    .action(async (workflowId: string) => {
      try {
        const configPath = findConfig();
        const configDir = configPath ? dirname(configPath) : process.cwd();
        const agentsDir = resolveSkillsRoot(configDir);
        const workflowFile = resolveWorkflowFile(workflowId, agentsDir);

        const ctx = await buildRenderContext(workflowFile, agentsDir);
        const md = renderPlan(ctx);
        console.log(md);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
}
```

- [ ] **Step 4: Wire into the main CLI**

Modify `packages/storybook-addon-designbook/src/cli.ts:6-7`. Add the import:

```typescript
import { register as registerWorkflow } from './cli/workflow.js';
import { register as registerStorybook } from './cli/storybook.js';
import { register as registerPlan } from './cli/plan.js';
```

…and at the end of the file (after `registerStorybook(program);`):

```typescript
registerPlan(program);
```

- [ ] **Step 5: Run all CLI tests**

Run: `pnpm --filter storybook-addon-designbook test cli/`
Expected: PASS (existing tests still pass + 3 new plan tests)

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/plan.ts \
        packages/storybook-addon-designbook/src/cli.ts \
        packages/storybook-addon-designbook/src/cli/__tests__/plan.test.ts
git commit -m "feat(cli): wire `plan <workflow>` subcommand"
```

---

## Task 9: End-to-End Smoke Against `design-shell`

**Files:**
- Test: `packages/storybook-addon-designbook/src/plan/__tests__/smoke.test.ts`

Per spec §Acceptance #1, `plan design-shell` MUST produce a self-contained document. This test runs the full pipeline against the real workflow under `.agents/skills/designbook/design/workflows/design-shell.md` (read-only — no fixture copy) and asserts shape-level invariants:

1. Document starts with `# Plan: …`
2. Every `**References**:` slug has a matching appendix heading
3. Every input source line is one of the four kinds
4. Every task with `result:` has both schema and example blocks; tasks without skip them

- [ ] **Step 1: Write the smoke test**

Create `packages/storybook-addon-designbook/src/plan/__tests__/smoke.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { buildRenderContext } from '../resolve.js';
import { renderPlan } from '../render.js';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');
const AGENTS_DIR = resolve(REPO_ROOT, '.agents');
const WORKFLOW = resolve(AGENTS_DIR, 'skills/designbook/design/workflows/design-shell.md');

describe('smoke: design-shell plan', () => {
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
    process.chdir(REPO_ROOT);
  });

  afterEach(() => {
    process.chdir(previousCwd);
  });

  it('produces a plan whose every `**References**:` slug exists in the appendix', async () => {
    const ctx = await buildRenderContext(WORKFLOW, AGENTS_DIR);
    const md = renderPlan(ctx);

    const refSlugs = [...md.matchAll(/\(#(rule|blueprint)-([a-z0-9-]+)\)/g)].map((m) => `${m[1]}:${m[2]}`);
    for (const slug of refSlugs) {
      const [kind, name] = slug.split(':');
      const heading = kind === 'rule' ? `## Rule: ${name}` : `## Blueprint: ${name}`;
      expect(md, `missing appendix entry for ${slug}`).toContain(heading);
    }
  });

  it('classifies every task input into one of file / iteration / produced / workflow', async () => {
    const ctx = await buildRenderContext(WORKFLOW, AGENTS_DIR);
    for (const sources of ctx.inputs.values()) {
      for (const input of sources) {
        expect(['file', 'iteration', 'produced', 'workflow']).toContain(input.kind);
      }
    }
  });

  it('tasks with result: have both schema and example; tasks without have neither', async () => {
    const ctx = await buildRenderContext(WORKFLOW, AGENTS_DIR);
    for (const step of ctx.inputs.keys()) {
      const hasSchema = ctx.outputSchemas.has(step);
      const hasExample = ctx.outputExamples.has(step);
      expect(hasSchema).toBe(hasExample);
    }
  });

  it('every `$ref: #/definitions/Foo` in the rendered markdown has a matching `## Schema: Foo` heading', async () => {
    const ctx = await buildRenderContext(WORKFLOW, AGENTS_DIR);
    const md = renderPlan(ctx);
    const refNames = new Set(
      [...md.matchAll(/\$ref:\s*['"]?#\/definitions\/([A-Z][A-Za-z0-9]*)['"]?/g)].map((m) => m[1]!),
    );
    for (const name of refNames) {
      expect(md, `missing schema appendix entry for ${name}`).toContain(`## Schema: ${name}`);
    }
  });

  it('renders to a single string starting with `# Plan: Design Shell`', async () => {
    const ctx = await buildRenderContext(WORKFLOW, AGENTS_DIR);
    const md = renderPlan(ctx);
    expect(md.split('\n')[0]).toBe('# Plan: Design Shell');
  });
});
```

- [ ] **Step 2: Run the smoke test**

Run: `pnpm --filter storybook-addon-designbook test plan/__tests__/smoke.test.ts`
Expected: PASS (5 tests)

If a `**References**:` slug fails the appendix check, the cause is almost certainly a missing entry in the rule/blueprint dedup loop in Task 7 Step 8 — fix the resolver, not the test.

- [ ] **Step 3: Run the full suite**

Run: `pnpm check`
Expected: typecheck + lint + all tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/storybook-addon-designbook/src/plan/__tests__/smoke.test.ts
git commit -m "test(plan): smoke-test plan resolution against design-shell"
```

---

## Task 10: Manual Acceptance

**Files:** none (verification only)

Per spec §Acceptance #4, the document must, when pasted into Claude with a clarity-check prompt, get a useful evaluation. Manual verification — the engineer runs the CLI against each of the four target workflows and inspects the output.

- [ ] **Step 1: Build the package**

Run: `pnpm --filter storybook-addon-designbook build`
Expected: `dist/cli.js` is regenerated.

- [ ] **Step 2: Run plan against the four target workflows**

```bash
node packages/storybook-addon-designbook/dist/cli.js plan design-shell > /tmp/plan-design-shell.md
node packages/storybook-addon-designbook/dist/cli.js plan design-screen > /tmp/plan-design-screen.md
node packages/storybook-addon-designbook/dist/cli.js plan design-component > /tmp/plan-design-component.md
node packages/storybook-addon-designbook/dist/cli.js plan design-verify > /tmp/plan-design-verify.md
```

For each output file verify by hand:
- Non-empty, starts with `# Plan: …`
- `## Stages` table lists at least the workflow's declared stages
- `# Schemas` appendix exists when any task references a `$ref` definition
- `# Rules` and `# Blueprints` appendices contain entries (or are empty when no rules/blueprints are pulled in)
- Tasks with `result:` have `**Output schema**` + `**Output example**` blocks
- Tasks without `result:` have neither
- Each-stages (`polish`, `verify`, `compare`) carry the `*Iteration*: …` annotation
- Quick grep: `grep -oE '#/definitions/[A-Z][A-Za-z0-9]+' /tmp/plan-design-shell.md | sort -u` — every name should also appear as `## Schema: <Name>` in the same file

- [ ] **Step 3: Paste one plan into Claude and clarity-check it**

Pick `/tmp/plan-design-shell.md` and paste with this prompt:

```
You are reviewing a workflow plan document. The document below is the
fully-resolved configuration for one workflow — every rule, blueprint,
schema, and example is inlined.

Evaluate it for clarity:
- Are any inputs ambiguous about where they come from?
- Are any rules contradictory or redundant?
- Are there steps where a reader cannot tell what "done" looks like?
- Are any references broken?

Return a short list of findings.
```

Confirm Claude returns something *substantive* — not "looks fine". If the response is "I cannot evaluate — no examples / unclear inputs", that's feedback the plan command must address before declaring v1 done.

- [ ] **Step 4: Final commit (if acceptance reveals touch-ups)**

If small touch-ups land:

```bash
git add <changed files>
git commit -m "fix(plan): adjust <area> from acceptance review"
```

If nothing to fix, no commit needed.

---

## Self-Review

**Spec coverage:**

| Spec section | Tasks |
|---|---|
| §Output Document Structure | Task 6 |
| §Document Properties (self-contained, linear, anchor links, deduped, reverse index, input sources) | Tasks 1, 2, 5, 6, 7 |
| §Output Examples (author + schema-derived) | Tasks 3, 4, 7 |
| §Resolution Semantics step 1 (read workflow) | Task 7 |
| §Resolution Semantics step 2-4 (task discovery, rules/blueprints, $ref) | Task 7 (reuses `resolveAllStages` + `buildSchemaBlock`); $ref definitions aggregated into a `# Schemas` appendix |
| §Resolution Semantics step 5 (input source classification) | Task 2, with iteration source added |
| §Resolution Semantics step 6 (reverse index) | Task 5 |
| §Resolution Semantics step 7 (render) | Task 6 |
| §CLI Surface | Task 8 |
| §Limitations (only renders explicitly-declared) | Inherited from `resolveAllStages` |
| §Acceptance #1 (self-contained for four workflows) | Task 10 |
| §Acceptance #2 (every reference resolves) | Task 9 (smoke) |
| §Acceptance #3 (resolution errors → non-zero exit) | Task 8 (CLI test) + Task 7 (resolver throws) |
| §Acceptance #4 (Claude clarity-check) | Task 10 |
| §Open Decisions: example location → `## Example output` markdown section | Task 3 |
| §Open Decisions: placeholder format → simple type placeholders | Task 4 |
| §Open Decisions: anchor slugs → kebab-case from filename | Task 1 |

**Type consistency:** `InputSource` (Task 2) is the only input-source type; `RenderContext` (Task 6) and `buildRenderContext` (Task 7) both use it directly. `ArtifactIndex` (Task 5) is the rule/blueprint reverse-index type used by both render.ts and resolve.ts. `ResolvedStep` and the `step_resolved` map come from existing `workflow-resolve.ts` — not duplicated.

**Placeholder scan:** No `TBD`, `TODO`, "implement later", "similar to Task N", "appropriate error handling". All steps have complete code or commands.

**Cross-task references:** Task 6's `slugFromPath` helper is a deliberate inline copy of Task 1's `slugifyArtifactName` — kept inline so `render.ts` does not import from `anchors.ts` indirectly through `reverse-index.ts` (which already does). The two implementations must stay in sync; if Task 1's slug rule changes, Task 6's inline must update too. (A reasonable refactor target post-v1: collapse them once the module graph stabilizes.)

---

## Notes for the Implementer

- `resolveAllStages` already handles workflow-qualified step matching (`design-shell:intake`), AND combinators, and domain filtering — Task 7 inherits all of this. Do not reimplement matching.
- Existing `cli/__tests__/helpers.ts` `setupCliSandbox` chdirs into a tmpdir and registers a fresh Commander program — reuse for any new CLI test.
- Vitest runs the **forks pool** (per-file isolation) because `process.chdir()` is used in the test sandbox. Do not switch pools.
- `pnpm check` runs typecheck → lint → test fail-fast. Run once at the end of Task 9.
- The `debo` invocation in the spec is a user shell alias; the actual binary is `storybook-addon-designbook`. The CLI subcommand registers as `plan` regardless.
- All four input source kinds (`file` / `iteration` / `produced` / `workflow`) are detected from frontmatter only — no workflow execution, no param resolution. This is what makes the command static.
