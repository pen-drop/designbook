# Reference Storage Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all reference data (screenshots, extract.json) into a single hash-based `references/{hash}/` directory, add a `breakpoints` resolver, add an intake rule for extract reference context, and simplify the story screenshot structure.

**Architecture:** All reference-related data is stored per URL hash under `$DESIGNBOOK_DATA/references/{hash}/`. A new `breakpoints` resolver reads breakpoint names from `design-tokens.yml`. All design workflows declare the same resolver-backed params (`story_id`, `reference_folder`, `breakpoints`). Tasks receive `reference_folder` as a param and build paths themselves — no more result-based path passing.

**Tech Stack:** TypeScript (vitest), Markdown skill files (YAML frontmatter)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/resolvers/breakpoints.ts` | New resolver: reads breakpoint keys from design-tokens.yml |
| Create | `src/resolvers/__tests__/breakpoints.test.ts` | Unit tests for breakpoints resolver |
| Modify | `src/resolvers/registry.ts:29` | Register breakpoints resolver |
| Modify | `src/resolvers/index.ts:1-5` | Export breakpoints resolver |
| Create | `.agents/skills/designbook/design/rules/extract-reference-context.md` | Intake rule: read extract.json from reference_folder |
| Modify | `.agents/skills/designbook/design/workflows/design-verify.md:1-33` | Add `breakpoints` param with resolver |
| Modify | `.agents/skills/designbook/design/workflows/design-screen.md:1-29` | Add `reference_url`, `reference_folder`, `breakpoints` params |
| Modify | `.agents/skills/designbook/design/workflows/design-component.md:1-19` | Add `reference_url`, `reference_folder`, `breakpoints` params |
| Modify | `.agents/skills/designbook/design/tasks/capture-reference.md:1-50` | Use `reference_folder` param, remove result path |
| Modify | `.agents/skills/designbook/design/tasks/compare-screenshots.md:1-98` | Add `reference_folder` param, read reference from hash dir |
| Modify | `.agents/skills/designbook/design/tasks/capture-storybook.md:1-50` | Simplify output path (remove `current/` subdir) |
| Modify | `.agents/skills/designbook/design/tasks/verify.md:1-70` | Add `reference_folder` param, read reference from hash dir |
| Modify | `.agents/skills/designbook/design/resources/story-meta-schema.md:239-257` | Update path convention (remove subdirs) |

All paths relative to `/home/cw/projects/designbook/packages/storybook-addon-designbook/` for TypeScript files, and `/home/cw/projects/designbook/` for skill files.

---

### Task 1: Breakpoints Resolver — Tests

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/__tests__/breakpoints.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { ResolverContext } from '../types.js';
import { breakpointsResolver } from '../breakpoints.js';

const tmpDir = join(import.meta.dirname, '__fixtures_breakpoints_resolver__');

function makeContext(params: Record<string, unknown> = {}): ResolverContext {
  return { config: { data: tmpDir, technology: 'html' }, params };
}

const TOKENS_YAML = `
semantic:
  breakpoints:
    $extensions:
      designbook:
        renderer: screen
    sm: { $value: "640px", $type: dimension }
    xl: { $value: "1280px", $type: dimension }
`;

describe('breakpointsResolver', () => {
  beforeAll(() => {
    mkdirSync(join(tmpDir, 'design-system'), { recursive: true });
    writeFileSync(join(tmpDir, 'design-system', 'design-tokens.yml'), TOKENS_YAML);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('has name "breakpoints"', () => {
    expect(breakpointsResolver.name).toBe('breakpoints');
  });

  it('resolves breakpoint names from design-tokens.yml', () => {
    const result = breakpointsResolver.resolve('', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sm,xl');
  });

  it('returns unresolved when design-tokens.yml is missing', () => {
    const ctx = makeContext();
    ctx.config.data = join(tmpDir, 'nonexistent');
    const result = breakpointsResolver.resolve('', {}, ctx);
    expect(result.resolved).toBe(false);
    expect(result.error).toContain('design-tokens.yml');
  });

  it('returns unresolved when no breakpoints section exists', () => {
    const noBreakpointsDir = join(tmpDir, 'no-bp');
    mkdirSync(join(noBreakpointsDir, 'design-system'), { recursive: true });
    writeFileSync(join(noBreakpointsDir, 'design-system', 'design-tokens.yml'), 'semantic:\n  colors: {}');
    const ctx = makeContext();
    ctx.config.data = noBreakpointsDir;
    const result = breakpointsResolver.resolve('', {}, ctx);
    expect(result.resolved).toBe(false);
    expect(result.error).toContain('breakpoints');
  });

  it('ignores $ keys (like $extensions)', () => {
    const result = breakpointsResolver.resolve('', {}, makeContext());
    expect(result.value).not.toContain('$extensions');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/resolvers/__tests__/breakpoints.test.ts`
Expected: FAIL — `breakpoints.js` module not found

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/__tests__/breakpoints.test.ts
git commit -m "test(resolvers): add breakpoints resolver tests"
```

---

### Task 2: Breakpoints Resolver — Implementation

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/breakpoints.ts`
- Modify: `packages/storybook-addon-designbook/src/resolvers/registry.ts:29`
- Modify: `packages/storybook-addon-designbook/src/resolvers/index.ts`

- [ ] **Step 1: Implement the resolver**

Create `packages/storybook-addon-designbook/src/resolvers/breakpoints.ts`:

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

const TOKENS_PATH = 'design-system/design-tokens.yml';

export const breakpointsResolver: ParamResolver = {
  name: 'breakpoints',

  resolve(_input: string, _config: Record<string, unknown>, context: ResolverContext): ResolverResult {
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

- [ ] **Step 2: Register the resolver**

In `packages/storybook-addon-designbook/src/resolvers/registry.ts`, add the import and registration. After line 2 add:

```typescript
import { breakpointsResolver } from './breakpoints.js';
```

After line 30 (`register(referenceFolderResolver);`) add:

```typescript
register(breakpointsResolver);
```

- [ ] **Step 3: Export the resolver**

In `packages/storybook-addon-designbook/src/resolvers/index.ts`, add:

```typescript
export { breakpointsResolver } from './breakpoints.js';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/resolvers/__tests__/breakpoints.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Run full check**

Run: `pnpm check`
Expected: typecheck, lint, all tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/breakpoints.ts \
       packages/storybook-addon-designbook/src/resolvers/registry.ts \
       packages/storybook-addon-designbook/src/resolvers/index.ts
git commit -m "feat(resolvers): implement breakpoints resolver"
```

---

### Task 3: Unify Workflow Params

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-verify.md`
- Modify: `.agents/skills/designbook/design/workflows/design-screen.md`
- Modify: `.agents/skills/designbook/design/workflows/design-component.md`

- [ ] **Step 1: Update design-verify.md**

`design-verify.md` already has `reference_url`, `reference_folder`, and `story_id`. Add `breakpoints`:

Replace the full frontmatter with:

```yaml
---
title: Design Verify
description: Visual testing -- verify screens or components against design references
params:
  story_id:
    type: string
    resolve: story_id
  scene_id: { type: string, default: "" }
  component_id: { type: string, default: "" }
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  breakpoints:
    type: string
    resolve: breakpoints
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  setup-compare:
    steps: [setup-compare]
  capture:
    steps: [capture]
  compare:
    steps: [compare]
  triage:
    steps: [triage]
  polish:
    steps: [polish]
  outtake:
    steps: [outtake]
engine: direct
---
```

- [ ] **Step 2: Update design-screen.md**

Add `reference_url`, `reference_folder`, `breakpoints` params. Replace the full frontmatter with:

```yaml
---
title: Design Screen
description: Create screen design components for a section (one scene per run)
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
  scene_id: { type: string }
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  breakpoints:
    type: string
    resolve: breakpoints
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  component:
    steps: [create-component]
  sample-data:
    steps: [create-sample-data]
  entity-mapping:
    steps: [map-entity]
  scene:
    steps: [create-scene]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
```

- [ ] **Step 3: Update design-component.md**

Add all resolver params. Replace the full frontmatter with:

```yaml
---
title: Design Component
description: Create a new UI component from a design reference
params:
  story_id:
    type: string
    resolve: story_id
  component_id: { type: string }
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  breakpoints:
    type: string
    resolve: breakpoints
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  component:
    steps: [create-component]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
```

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-verify.md \
       .agents/skills/designbook/design/workflows/design-screen.md \
       .agents/skills/designbook/design/workflows/design-component.md
git commit -m "feat(workflows): unify resolver params across all design workflows"
```

---

### Task 4: Intake Rule for Extract Reference Data

**Files:**
- Create: `.agents/skills/designbook/design/rules/extract-reference-context.md`

- [ ] **Step 1: Create the rule file**

Create `.agents/skills/designbook/design/rules/extract-reference-context.md`:

```markdown
---
name: designbook:design:extract-reference-context
when:
  steps: [intake]
---

# Extract Reference Context

When `reference_folder` is available as a workflow param and `extract.json` exists in that directory, read it and use the extracted design data as context for the intake.

## Execution

1. Check if `reference_folder` is set (non-empty) in the workflow params.
2. If set, check if `{reference_folder}/extract.json` exists.
3. If it exists, read it and use the extracted design reference data (tokens, fonts, colors, spacing, landmarks) as context when making intake decisions.

This data was produced by the `extract-reference` stage and contains:
- Semantic color tokens (primary, secondary, accent, surface, etc.)
- Typography (fonts, sizes, weights)
- Spacing rhythm (base unit, common values)
- Border radii tokens
- Landmark descriptions (header, footer, hero, etc.)
- Full-page and region screenshots

Use this context to make informed decisions about component structure, token usage, and design alignment during intake.
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook/design/rules/extract-reference-context.md
git commit -m "feat(rules): add intake rule for extract reference context"
```

---

### Task 5: Update capture-reference Task

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/capture-reference.md`

- [ ] **Step 1: Update frontmatter**

Replace the full frontmatter (lines 1-20) with:

```yaml
---
name: designbook:design:capture-reference
title: "Capture Reference: {scene_id} ({breakpoint}/{region})"
when:
  steps: [capture]
  type: screenshot
priority: 10
params:
  $ref: ../schemas.yml#/Check
  scene_id: { type: string }
  reference_folder: { type: string }
  breakpoints: { type: string }
each:
  checks:
    $ref: ../schemas.yml#/Check
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---
```

Key changes:
- Added `reference_folder` and `breakpoints` params
- Removed `result.screenshot.path` — no result paths returned

- [ ] **Step 2: Update output path in the task body**

Replace the Output section (lines 44-50) with:

```markdown
## Output

Screenshots are written to the reference folder:

| Breakpoint | Region | Path |
|-----------|--------|------|
| sm | header | `{reference_folder}/sm--header.png` |
| sm | footer | `{reference_folder}/sm--footer.png` |
| xl | full | `{reference_folder}/xl--full.png` |
```

Also update the result path reference in Step 2 (line 13 area). The task no longer writes to `$DESIGNBOOK_DATA/stories/{story_id}/screenshots/reference/` — it writes to `{reference_folder}/{breakpoint}--{region}.png`.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/capture-reference.md
git commit -m "feat(tasks): capture-reference uses reference_folder param"
```

---

### Task 6: Update compare-screenshots Task

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/compare-screenshots.md`

- [ ] **Step 1: Add reference_folder param to frontmatter**

In the frontmatter params section (after line 8), add:

```yaml
  reference_folder: { type: string }
```

- [ ] **Step 2: Update Phase 1 output path**

Replace line 55:
```
   - Save to `designbook/stories/${storyId}/screenshots/current/${breakpoint}--${region}.png`
```
with:
```
   - Save to `designbook/stories/${storyId}/screenshots/${breakpoint}--${region}.png`
```

- [ ] **Step 3: Update Phase 2 reference paths**

Replace lines 62-63:
```
   - Reference: `${DESIGNBOOK_DATA}/stories/${storyId}/screenshots/reference/${breakpoint}--${region}.png`
   - Current: `${DESIGNBOOK_DATA}/stories/${storyId}/screenshots/current/${breakpoint}--${region}.png`
```
with:
```
   - Reference: `${reference_folder}/${breakpoint}--${region}.png`
   - Storybook: `${DESIGNBOOK_DATA}/stories/${storyId}/screenshots/${breakpoint}--${region}.png`
```

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/compare-screenshots.md
git commit -m "feat(tasks): compare-screenshots reads reference from reference_folder"
```

---

### Task 7: Update capture-storybook Task

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/capture-storybook.md`

- [ ] **Step 1: Update result path in frontmatter**

Replace line 15:
```yaml
    path: designbook/stories/{story_id}/screenshots/current/{breakpoint}--{region}.png
```
with:
```yaml
    path: designbook/stories/{story_id}/screenshots/{breakpoint}--{region}.png
```

- [ ] **Step 2: Update Output table**

Replace lines 44-50:
```markdown
| Breakpoint | Region | Path |
|-----------|--------|------|
| sm | header | `screenshots/current/sm--header.png` |
| sm | footer | `screenshots/current/sm--footer.png` |
| xl | full | `screenshots/current/xl--full.png` |
```
with:
```markdown
| Breakpoint | Region | Path |
|-----------|--------|------|
| sm | header | `screenshots/sm--header.png` |
| sm | footer | `screenshots/sm--footer.png` |
| xl | full | `screenshots/xl--full.png` |
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/capture-storybook.md
git commit -m "feat(tasks): capture-storybook writes to screenshots/ directly"
```

---

### Task 8: Update verify Task

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/verify.md`

- [ ] **Step 1: Add reference_folder param to frontmatter**

Add to the params section (after line 11):

```yaml
  reference_folder: { type: string }
```

- [ ] **Step 2: Update screenshot paths in the task body**

Replace lines 33-34:
```
   - Reference: `designbook/stories/${storyId}/screenshots/reference/${breakpoint}--${region}.png`
   - Current (after polish): `designbook/stories/${storyId}/screenshots/current/${breakpoint}--${region}.png`
```
with:
```
   - Reference: `${reference_folder}/${breakpoint}--${region}.png`
   - Storybook (after polish): `designbook/stories/${storyId}/screenshots/${breakpoint}--${region}.png`
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/verify.md
git commit -m "feat(tasks): verify reads reference from reference_folder param"
```

---

### Task 9: Update story-meta-schema Path Convention

**Files:**
- Modify: `.agents/skills/designbook/design/resources/story-meta-schema.md`

- [ ] **Step 1: Update the Path Convention section**

Replace lines 239-257 (the "Path Convention" section) with:

```markdown
## Path Convention

All story artifacts live under `designbook/stories/{storyId}/`:

```
designbook/stories/{storyId}/
  meta.yml                                  <- this file (checks + issues)
  screenshots/
    {breakpoint}--{region}.png              <- Storybook captures (gitignored)
  extractions/
    {breakpoint}--spec.yml                  <- AI-generated extraction plan (gitignored)
    {breakpoint}--reference.json            <- computed styles from reference URL (gitignored)
    {breakpoint}--storybook.json            <- computed styles from Storybook URL (gitignored)
```

Reference screenshots live under `designbook/references/{hash}/`:

```
designbook/references/{hash}/
  extract.json                              <- extracted design data
  reference-full.png                        <- full-page screenshot
  reference-header.png                      <- region screenshot (optional)
  {breakpoint}--{region}.png                <- breakpoint screenshots
```

The `{hash}` is computed deterministically from the reference URL by the `reference_folder` resolver. Multiple stories sharing the same reference URL share the same hash directory.

Screenshots always use `{breakpoint}--{region}.png`. For screen scenes, the region is `full` (e.g. `sm--full.png`). For shell scenes, regions match element selectors (e.g. `sm--header.png`, `sm--footer.png`).

Extraction files use `{breakpoint}--{name}` naming, matching the screenshot convention. Only present when `source.hasMarkup` is true.
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook/design/resources/story-meta-schema.md
git commit -m "docs: update story-meta-schema path convention for consolidated references"
```

---

### Task 10: Final Validation

- [ ] **Step 1: Run full check**

Run: `pnpm check`
Expected: typecheck, lint, all tests pass

- [ ] **Step 2: Verify resolver integration**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/resolvers/`
Expected: All resolver tests pass (story-id, reference-folder, breakpoints, registry)

- [ ] **Step 3: Verify no stale references to old paths**

Search for remaining references to old screenshot subdir paths in skill files:

```bash
grep -r 'screenshots/reference/' .agents/skills/
grep -r 'screenshots/current/' .agents/skills/
grep -r 'screenshots/storybook/' .agents/skills/
```

Expected: No matches. If any remain, update them.

- [ ] **Step 4: Commit any fixes**

If Step 3 found stale references, fix and commit:

```bash
git add -A
git commit -m "fix: remove remaining old screenshot path references"
```
