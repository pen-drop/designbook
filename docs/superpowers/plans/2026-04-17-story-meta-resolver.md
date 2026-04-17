# StoryMeta Resolver Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the orphaned `configure-meta` task, rename the `DeboStory` entity to `StoryMeta` with a public `StoryMetaData` type, and make the `breakpoints` resolver meta-aware (reads from `meta.yml` first, falls back to `design-tokens.yml`).

**Architecture:** The `StoryMeta` entity (formerly `DeboStory`) in `packages/storybook-addon-designbook/src/story-entity.ts` continues to own `meta.yml` I/O. The `breakpoints` resolver gains a dependent param `from: story_id`, calls `StoryMeta.load()` at resolve time, and returns stored breakpoints when the story already exists. Workflows are updated to pass `story_id` into the breakpoints resolver. A `StoryMeta` schema entry is added to `design/schemas.yml` so task authors can reference the yml shape.

**Tech Stack:** TypeScript, vitest, js-yaml, pnpm workspace (`storybook-addon-designbook` package). Storybook addon runtime plus workflow schema YAML under `.agents/skills/designbook/`.

---

## File Structure

**Renamed symbols (same file, no file renames):**
- `packages/storybook-addon-designbook/src/story-entity.ts` — rename class + interfaces
- `packages/storybook-addon-designbook/src/__tests__/story-entity.test.ts` — follow rename
- `packages/storybook-addon-designbook/src/cli/story.ts` — follow rename
- `packages/storybook-addon-designbook/src/vite-plugin.ts` — follow rename

**Modified:**
- `packages/storybook-addon-designbook/src/resolvers/breakpoints.ts` — meta-awareness
- `packages/storybook-addon-designbook/src/resolvers/__tests__/breakpoints.test.ts` — new test cases
- `.agents/skills/designbook/design/workflows/design-verify.md` — add `from: story_id` to breakpoints param
- `.agents/skills/designbook/design/workflows/design-component.md` — add `from: story_id`
- `.agents/skills/designbook/design/workflows/design-screen.md` — add `from: story_id`
- `.agents/skills/designbook/design/schemas.yml` — add `StoryMeta` schema entry

**Deleted:**
- `.agents/skills/designbook/design/tasks/configure-meta.md`

---

### Task 1: Rename `DeboStory` → `StoryMeta`, export `StoryMetaData`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/story-entity.ts` (56 occurrences)
- Modify: `packages/storybook-addon-designbook/src/__tests__/story-entity.test.ts` (30)
- Modify: `packages/storybook-addon-designbook/src/cli/story.ts` (15)
- Modify: `packages/storybook-addon-designbook/src/vite-plugin.ts` (2)

**Rename table:**

| Old | New |
|---|---|
| `class DeboStory` | `class StoryMeta` |
| `interface MetaYml` (private) | `interface StoryMetaData` (exported) |
| `interface DeboStorySummary` | `interface StoryMetaSummary` |
| `interface DeboStoryCheck` | `interface StoryMetaCheck` |
| `interface DeboStoryCheckCurrent` | `interface StoryMetaCheckCurrent` |
| `interface DeboStoryCheckReference` | `interface StoryMetaCheckReference` |
| `interface DeboStoryScreenshot` | `interface StoryMetaScreenshot` |
| `interface DeboStoryReference` | `interface StoryMetaReference` |
| `interface DeboStoryJSON` | `interface StoryMetaJSON` |

Internal leaf helpers (`MetaSource`, `MetaBreakpoint`, `MetaRegion`, `MetaCheckResult`, `MetaSummary`) stay private and keep their names — they are nested inside `StoryMetaData` and not consumed outside `story-entity.ts`.

- [ ] **Step 1: Rename all symbols in `story-entity.ts`**

Open the file and apply each rename from the table above. The class signature must end up as:

```typescript
export class StoryMeta {
  readonly storyId: string;
  readonly section: string;
  readonly storyDir: string;
  reference: StoryMetaReference;

  private _meta: StoryMetaData;
  private readonly _metaPath: string;
  private _allChecks: StoryMetaCheck[];
  private _allScreenshots: StoryMetaScreenshot[] | null = null;

  private constructor(storyId: string, section: string, storyDir: string, meta: StoryMetaData, metaPath: string) {
    // body unchanged
  }

  static load(config: DesignbookConfig, storyId: string): StoryMeta | null { /* unchanged body */ }
  static list(config: DesignbookConfig, filter?: { section?: string }): StoryMeta[] { /* unchanged body */ }
  static loadByScene(config: DesignbookConfig, sceneRef: string): StoryMeta | null { /* unchanged body */ }
  static createByScene(config: DesignbookConfig, sceneRef: string, metaSeed?: Partial<StoryMetaData>): StoryMeta | null { /* unchanged body */ }
  // ...remaining methods unchanged, but internal types follow the rename
}
```

Change `interface MetaYml` to `export interface StoryMetaData` at line 177 of the current file. All internal usages (`_meta: MetaYml`, `meta: MetaYml = {}`, `(parseYaml(content) as MetaYml)`, `Partial<MetaYml>`) become `StoryMetaData`.

- [ ] **Step 2: Update `__tests__/story-entity.test.ts`**

Replace every `DeboStory` with `StoryMeta` (class name) and every `DeboStory<Suffix>` with `StoryMeta<Suffix>`. Any import like `import { DeboStory } from '../story-entity.js'` becomes `import { StoryMeta } from '../story-entity.js'`.

- [ ] **Step 3: Update `cli/story.ts`**

Same rename pattern: imports and usages of `DeboStory` / `DeboStoryJSON` / other helpers become `StoryMeta` / `StoryMetaJSON` / …

- [ ] **Step 4: Update `vite-plugin.ts`**

Same rename pattern (only 2 occurrences).

- [ ] **Step 5: Run typecheck to verify no symbol slipped through**

Run: `pnpm --filter storybook-addon-designbook exec tsc --noEmit`
Expected: PASS with no errors.

If any `DeboStory` / `MetaYml` / `DeboStory*` still remains anywhere, you'll get a typecheck error. Fix the offending file until the typecheck passes.

- [ ] **Step 6: Run tests to confirm behavior is unchanged**

Run: `pnpm --filter storybook-addon-designbook test -- story-entity`
Expected: PASS — all existing story-entity tests continue to pass.

Run: `pnpm --filter storybook-addon-designbook test`
Expected: PASS — full addon test suite.

- [ ] **Step 7: Commit**

```bash
git add packages/storybook-addon-designbook/src/story-entity.ts \
        packages/storybook-addon-designbook/src/__tests__/story-entity.test.ts \
        packages/storybook-addon-designbook/src/cli/story.ts \
        packages/storybook-addon-designbook/src/vite-plugin.ts
git commit -m "refactor(addon): rename DeboStory to StoryMeta, export StoryMetaData"
```

---

### Task 2: Make `breakpoints` resolver meta-aware (TDD)

**Files:**
- Modify: `packages/storybook-addon-designbook/src/resolvers/breakpoints.ts`
- Test: `packages/storybook-addon-designbook/src/resolvers/__tests__/breakpoints.test.ts`

Behaviour after this task:

1. If `config.from` is set and points at a non-empty `story_id` in `context.params`, the resolver calls `StoryMeta.load(context.config, storyId)`.
2. If a `StoryMeta` is returned AND the loaded `StoryMetaData.reference.breakpoints` has at least one non-`$` entry, those keys are returned as a comma-separated string.
3. Otherwise, the resolver falls back to the existing behaviour (read `design-system/design-tokens.yml`, return `semantic.breakpoints` keys).

No writes to `meta.yml`. Fallback is silent (no error) when story missing or meta has no breakpoints.

- [ ] **Step 1: Add failing test — prefers meta breakpoints when story exists**

Append this test to `packages/storybook-addon-designbook/src/resolvers/__tests__/breakpoints.test.ts` (inside the `describe('breakpointsResolver', …)` block, after the existing tests):

```typescript
  it('returns breakpoints from meta.yml when story exists', async () => {
    const storiesDir = join(tmpDir, 'stories', 'foo--bar');
    mkdirSync(storiesDir, { recursive: true });
    writeFileSync(
      join(storiesDir, 'meta.yml'),
      `reference:\n  source: { url: "https://example.com" }\n  breakpoints:\n    md: { threshold: 3, regions: { full: { selector: "body" } } }\n    lg: { threshold: 3, regions: { full: { selector: "body" } } }\n`,
    );

    const ctx = makeContext({ story_id: 'foo--bar' });
    const result = await breakpointsResolver.resolve('', { from: 'story_id' }, ctx);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('md,lg');
  });

  it('falls back to design-tokens when story_id not in meta', async () => {
    const ctx = makeContext({ story_id: 'missing--story' });
    const result = await breakpointsResolver.resolve('', { from: 'story_id' }, ctx);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sm,xl');
  });

  it('falls back to design-tokens when meta has no breakpoints', async () => {
    const storiesDir = join(tmpDir, 'stories', 'empty--meta');
    mkdirSync(storiesDir, { recursive: true });
    writeFileSync(
      join(storiesDir, 'meta.yml'),
      `reference:\n  source: { url: "https://example.com" }\n`,
    );

    const ctx = makeContext({ story_id: 'empty--meta' });
    const result = await breakpointsResolver.resolve('', { from: 'story_id' }, ctx);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sm,xl');
  });

  it('falls back to design-tokens when from config is absent', async () => {
    const result = await breakpointsResolver.resolve('', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sm,xl');
  });
```

Note: the existing `stories` directory under `tmpDir` may not exist yet for the shared `beforeAll`. Add a `mkdirSync(join(tmpDir, 'stories'), { recursive: true })` line inside the existing `beforeAll` to prepare the parent directory, or create per-test subdirs as shown above. Per-test subdirs are sufficient — the `mkdirSync(..., { recursive: true })` calls handle parent creation.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter storybook-addon-designbook test -- breakpoints`
Expected: FAIL — the three new tests fail because the resolver currently returns `'sm,xl'` from design-tokens regardless of `story_id`/meta content.

- [ ] **Step 3: Update the resolver implementation**

Replace the body of `packages/storybook-addon-designbook/src/resolvers/breakpoints.ts` with:

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';
import { StoryMeta } from '../story-entity.js';

const TOKENS_PATH = 'design-system/design-tokens.yml';

function breakpointsFromMeta(context: ResolverContext, config: Record<string, unknown>): string[] | null {
  const fromParam = typeof config.from === 'string' ? config.from : undefined;
  if (!fromParam) return null;

  const storyId = context.params[fromParam];
  if (typeof storyId !== 'string' || storyId === '') return null;

  const story = StoryMeta.load(context.config, storyId);
  if (!story) return null;

  const meta = story.data;
  const bps = meta.reference?.breakpoints;
  if (!bps) return null;

  const keys = Object.keys(bps).filter((k) => !k.startsWith('$'));
  return keys.length > 0 ? keys : null;
}

export const breakpointsResolver: ParamResolver = {
  name: 'breakpoints',

  resolve(_input: string, config: Record<string, unknown>, context: ResolverContext): ResolverResult {
    const metaBreakpoints = breakpointsFromMeta(context, config);
    if (metaBreakpoints) {
      return {
        resolved: true,
        value: metaBreakpoints.join(','),
        input: '',
      };
    }

    const tokensFile = join(context.config.data, TOKENS_PATH);

    if (!existsSync(tokensFile)) {
      return {
        resolved: false,
        input: '',
        error: `design-tokens.yml not found at ${tokensFile}`,
      };
    }

    const content = readFileSync(tokensFile, 'utf-8');
    const tokens = load(content) as Record<string, unknown>;

    const semantic = tokens?.semantic as Record<string, unknown> | undefined;
    const breakpoints = semantic?.breakpoints as Record<string, unknown> | undefined;

    if (!breakpoints) {
      return {
        resolved: false,
        input: '',
        error: 'No semantic.breakpoints section found in design-tokens.yml',
      };
    }

    const names = Object.keys(breakpoints).filter((k) => !k.startsWith('$'));

    if (names.length === 0) {
      return {
        resolved: false,
        input: '',
        error: 'No breakpoints defined in semantic.breakpoints',
      };
    }

    return {
      resolved: true,
      value: names.join(','),
      input: '',
    };
  },
};
```

The resolver references `story.data`. Expose that on `StoryMeta` by adding a public getter inside `story-entity.ts` (right below the private `_meta` field — e.g. after the constructor):

```typescript
  get data(): StoryMetaData {
    return this._meta;
  }
```

This gives read-only access to the parsed yml structure without exposing the internal `_meta` field directly.

- [ ] **Step 4: Run the failing tests to verify they now pass**

Run: `pnpm --filter storybook-addon-designbook test -- breakpoints`
Expected: PASS — all breakpoints resolver tests (old + new) pass.

Run: `pnpm --filter storybook-addon-designbook test -- story-entity`
Expected: PASS — adding the `data` getter does not break existing story-entity tests.

- [ ] **Step 5: Run full addon test suite**

Run: `pnpm --filter storybook-addon-designbook test`
Expected: PASS — no regressions elsewhere.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/breakpoints.ts \
        packages/storybook-addon-designbook/src/resolvers/__tests__/breakpoints.test.ts \
        packages/storybook-addon-designbook/src/story-entity.ts
git commit -m "feat(resolver): breakpoints reads from meta.yml when story exists"
```

---

### Task 3: Update workflows to chain `from: story_id` for breakpoints resolver

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-verify.md`
- Modify: `.agents/skills/designbook/design/workflows/design-component.md`
- Modify: `.agents/skills/designbook/design/workflows/design-screen.md`

Because the resolver falls back gracefully when `from` is missing, existing workflows without the chain still work. But workflows that want the new behaviour must declare the dependency.

> Before editing these files, load `designbook-skill-creator` as required by `CLAUDE.md`.

- [ ] **Step 1: Load designbook-skill-creator**

Invoke the `designbook-skill-creator` skill so the workflow edits conform to the authoring rules.

- [ ] **Step 2: Edit `design-verify.md`**

In `/home/cw/projects/designbook/.agents/skills/designbook/design/workflows/design-verify.md`, find the block:

```yaml
  breakpoints:
    type: string
    resolve: breakpoints
```

Replace with:

```yaml
  breakpoints:
    type: string
    resolve: breakpoints
    from: story_id
```

- [ ] **Step 3: Edit `design-component.md`**

Apply the identical change (add `from: story_id` under the `breakpoints` param).

- [ ] **Step 4: Edit `design-screen.md`**

Apply the identical change (add `from: story_id` under the `breakpoints` param).

- [ ] **Step 5: Run workflow resolve tests**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-resolve`
Expected: PASS — the resolver chain with `from: story_id` resolves correctly.

- [ ] **Step 6: Run full check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-verify.md \
        .agents/skills/designbook/design/workflows/design-component.md \
        .agents/skills/designbook/design/workflows/design-screen.md
git commit -m "feat(workflows): chain breakpoints resolver from story_id"
```

---

### Task 4: Delete the orphaned `configure-meta` task

**Files:**
- Delete: `.agents/skills/designbook/design/tasks/configure-meta.md`

- [ ] **Step 1: Verify the task is not referenced in any live workflow**

Run: `grep -rn "configure-meta" .agents/skills/designbook/ --include='*.md' --include='*.yml'`
Expected: The only match is the task file itself (`.agents/skills/designbook/design/tasks/configure-meta.md`). Historical spec/plan files under `docs/superpowers/` and `openspec/` are out of scope — they document past work, not current runtime behaviour.

If any live workflow/stage/schema references `configure-meta`, stop and report the finding — the deletion is unsafe without first removing that reference.

- [ ] **Step 2: Delete the task file**

Run: `rm .agents/skills/designbook/design/tasks/configure-meta.md`

- [ ] **Step 3: Run full check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A .agents/skills/designbook/design/tasks/configure-meta.md
git commit -m "chore(skills): remove orphaned configure-meta task"
```

---

### Task 5: Add `StoryMeta` schema entry to `design/schemas.yml`

**Files:**
- Modify: `.agents/skills/designbook/design/schemas.yml`

> Before editing this file, load `designbook-skill-creator` as required by `CLAUDE.md`.

- [ ] **Step 1: Load designbook-skill-creator**

Invoke the `designbook-skill-creator` skill.

- [ ] **Step 2: Append the `StoryMeta` schema to `design/schemas.yml`**

Open `/home/cw/projects/designbook/.agents/skills/designbook/design/schemas.yml` and append at the end of the file:

```yaml

StoryMeta:
  type: object
  title: Story Meta
  description: >
    Per-story configuration and verification state stored at
    `designbook/stories/{story_id}/meta.yml`. Single source of truth for
    reference source, breakpoints, per-check results, and aggregated summary.
  properties:
    reference:
      type: object
      properties:
        source:
          type: object
          properties:
            url: { type: string }
            origin:
              type: string
              enum: [stitch, figma, manual]
              description: Where the reference came from.
            screenId:
              type: string
              description: Origin-specific screen identifier (only set when origin is stitch or figma).
            hasMarkup:
              type: boolean
              description: Whether the reference includes DOM markup suitable for inspection.
        breakpoints:
          type: object
          description: Map of breakpoint id to per-breakpoint configuration and regions.
          additionalProperties:
            type: object
            properties:
              threshold:
                type: number
                description: Maximum percentage deviation (0–1) before a check fails at this breakpoint.
              regions:
                type: object
                description: Map of region name to region configuration.
                additionalProperties:
                  type: object
                  properties:
                    selector:
                      type: string
                      description: CSS selector limiting capture to a subregion. Empty = full viewport.
                    threshold:
                      type: number
                      description: Regional override of the breakpoint threshold.
        checks:
          type: object
          description: >
            Per-check results keyed by `{breakpoint}--{region}` (e.g. `sm--header`)
            or `{breakpoint}--markup` for markup checks.
          additionalProperties:
            type: object
            properties:
              status: { type: string, enum: [open, done] }
              result: { type: string, enum: [pass, fail] }
              diff: { type: number }
              issues:
                type: array
                items:
                  $ref: "#/Issue"
        summary:
          type: object
          description: Aggregated verification counts derived from `checks`.
          properties:
            total: { type: number }
            pass: { type: number }
            fail: { type: number }
            unchecked: { type: number }
            maxDiff: { type: number }
            avgDiff: { type: number }
            threshold: { type: number }
```

- [ ] **Step 3: Run full check**

Run: `pnpm check`
Expected: PASS. (If schema-composition or skill-validator tests scan `schemas.yml` they must still parse and resolve `$ref` entries.)

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/schemas.yml
git commit -m "feat(schemas): add StoryMeta schema for per-story meta.yml"
```

---

### Task 6: Final verification

**Files:** none — verification only.

- [ ] **Step 1: Run the full project check**

Run: `pnpm check`
Expected: PASS (typecheck → lint → test, all green).

- [ ] **Step 2: Grep for lingering `DeboStory` / `MetaYml` symbols**

Run: `grep -rn "DeboStory\|\bMetaYml\b" packages/storybook-addon-designbook/src/`
Expected: No matches (empty output).

- [ ] **Step 3: Grep for lingering `configure-meta` runtime references**

Run: `grep -rn "configure-meta" .agents/ packages/storybook-addon-designbook/src/`
Expected: No matches. (Hits in `docs/` and `openspec/` are historical and acceptable.)

- [ ] **Step 4: Manual sanity check (optional but recommended)**

With a test workspace or existing workspace:

1. Pick a story that already has a `meta.yml` with a non-default breakpoint set (e.g. only `md` and `lg` instead of all `sm,md,lg,xl`).
2. Run a verify workflow via the addon CLI so the breakpoints resolver fires with `from: story_id`.
3. Confirm the capture step only runs for the breakpoints stored in `meta.yml`, not the full design-tokens list.

- [ ] **Step 5: Report completion**

Summarise:
- Files renamed (count)
- Resolver updated
- Tests added (count)
- Files deleted (1)
- Schema entry added

---

## Self-Review (run before handoff)

**Spec coverage:**

| Spec section | Implemented in |
|---|---|
| 1. Rename DeboStory → StoryMeta | Task 1 |
| 2. Entfernen configure-meta | Task 4 |
| 3. breakpoints resolver meta-aware | Task 2 |
| 3. Workflow update `from: story_id` | Task 3 |
| 4. Schema öffentlich machen | Task 1 (export StoryMetaData) + Task 5 (StoryMeta schema) |
| Testing — pnpm check green | Task 6 step 1 |
| Testing — sanity check | Task 6 step 4 |

No gaps found.

**Placeholder scan:** no "TBD", "TODO", or hand-waving in implementation steps — all file paths, symbols, test assertions, and commands are concrete.

**Type consistency:** `StoryMeta` class referenced consistently; `StoryMetaData` interface used for the yml shape in both Task 1 (definition) and Task 2 (consumption via `story.data`). Helper interfaces follow the `StoryMeta*` pattern uniformly.
