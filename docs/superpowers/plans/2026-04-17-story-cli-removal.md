# Story CLI Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `_debo story` CLI entirely. Replace reads with resolvers and writes with workflow results. Reduce `meta.yml` to pure reference configuration; checks and issues become runtime-only.

**Architecture:** Three mechanisms do the work: (1) Resolvers in task frontmatter (existing + one new `scene-path`) resolve read-side params. (2) Workflow-engine file results write `meta.yml` once during setup-compare (same pattern as create-section). (3) Data-results carry `checks[]` and `issues[]` through the workflow scope — they are never persisted on disk.

**Tech Stack:** TypeScript, vitest, Node.js (addon), YAML (skill artifacts), pnpm workspaces, `_debo`/`npx storybook-addon-designbook` CLI.

**Spec:** [`docs/superpowers/specs/2026-04-17-story-cli-removal-design.md`](../specs/2026-04-17-story-cli-removal-design.md)

---

## File Structure

**New files:**
- `packages/storybook-addon-designbook/src/resolvers/scene-path.ts` — new resolver
- `packages/storybook-addon-designbook/src/resolvers/__tests__/scene-path.test.ts` — tests for resolver

**Modified (code):**
- `packages/storybook-addon-designbook/src/resolvers/registry.ts` — register scene-path
- `packages/storybook-addon-designbook/src/resolvers/index.ts` — export scene-path
- `packages/storybook-addon-designbook/src/story-entity.ts` — remove mutation methods
- `packages/storybook-addon-designbook/src/__tests__/story-entity.test.ts` — remove mutation tests
- `packages/storybook-addon-designbook/src/cli/index.ts` (or equivalent) — remove story command registration

**Deleted:**
- `packages/storybook-addon-designbook/src/cli/story.ts`

**Modified (skill artifacts):**
- `.agents/skills/designbook/design/schemas.yml` — remove `reference.checks`, `reference.summary` from StoryMeta schema
- `.agents/skills/designbook/design/tasks/setup-compare.md`
- `.agents/skills/designbook/design/tasks/capture-storybook.md`
- `.agents/skills/designbook/design/tasks/capture-reference.md`
- `.agents/skills/designbook/design/tasks/compare-screenshots.md`
- `.agents/skills/designbook/design/tasks/verify.md`
- `.agents/skills/designbook/sections/tasks/create-section.md`
- `.agents/skills/designbook/design/resources/story-meta-schema.md`
- `.agents/skills/designbook/resources/cli-workflow.md` (if mentions `_debo story`)

---

## Phase 1 — Baseline & Prep

### Task 1: Verify baseline + survey CLI call sites

**Files:** (read-only)

- [ ] **Step 1: Run baseline tests**

```bash
cd /home/cw/projects/designbook
pnpm check
```

Expected: typecheck + lint + test all pass. If any fails, stop and report — the plan assumes a green baseline.

- [ ] **Step 2: Enumerate every `_debo story` call site in skill artifacts**

```bash
grep -rn "_debo story" .agents/skills/ | tee /tmp/debo-story-sites.txt
```

Expected output — the exact file:line sites that must be migrated:
- `.agents/skills/designbook/design/tasks/capture-reference.md` — `_debo story --scene ${scene}`
- `.agents/skills/designbook/design/tasks/capture-storybook.md` — `_debo story --scene ${scene}`
- `.agents/skills/designbook/design/tasks/compare-screenshots.md` — `_debo story --scene ${scene}`
- `.agents/skills/designbook/design/tasks/setup-compare.md` — `_debo story ${story_id} --create ...`
- `.agents/skills/designbook/design/tasks/verify.md` — `_debo story issues ...` (3x) + `_debo story check ...`
- `.agents/skills/designbook/design/resources/story-meta-schema.md` — doc references (2x)

- [ ] **Step 3: Enumerate CLI-code call sites**

```bash
grep -rn "updateCheck\|updateIssue\|createByScene\|StoryMeta.load\|StoryMeta.list" packages/storybook-addon-designbook/src/ --include="*.ts" | tee /tmp/story-entity-sites.txt
```

Expected: references in `story-entity.ts` (definition), `cli/story.ts` (consumer — to be deleted), `__tests__/story-entity.test.ts`, possibly `vite-plugin.ts`. Note which are producers vs consumers for later tasks.

No commit yet.

---

## Phase 2 — New `scene-path` Resolver

### Task 2: Write failing tests for `scene-path` resolver

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/__tests__/scene-path.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import type { ResolverContext } from '../types.js';
import { scenePathResolver } from '../scene-path.js';

function makeContext(dataDir = '/tmp/db-test'): ResolverContext {
  return { config: { data: dataDir, technology: 'html' }, params: {} };
}

describe('scenePathResolver', () => {
  it('has name "scene_path"', () => {
    expect(scenePathResolver.name).toBe('scene_path');
  });

  it('resolves shell to the design-system shell path', async () => {
    const result = await scenePathResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('design-system/design-system.scenes.yml');
  });

  it('resolves a section id to the section scenes path', async () => {
    const result = await scenePathResolver.resolve('hero', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/hero/hero.section.scenes.yml');
  });

  it('returns unresolved for empty input', async () => {
    const result = await scenePathResolver.resolve('', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('normalises section ids to kebab-case', async () => {
    const result = await scenePathResolver.resolve('Hero Section', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/hero-section/hero-section.section.scenes.yml');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm --filter storybook-addon-designbook test -- resolvers/__tests__/scene-path.test.ts
```

Expected: FAIL with "Cannot find module '../scene-path.js'" or similar — the resolver file doesn't exist yet.

### Task 3: Implement `scene-path` resolver

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/scene-path.ts`

- [ ] **Step 1: Write the resolver**

```typescript
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

function toKebab(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const scenePathResolver: ParamResolver = {
  name: 'scene_path',

  resolve(input: string, _config: Record<string, unknown>, _context: ResolverContext): ResolverResult {
    if (!input || !input.trim()) {
      return { resolved: false, input, error: 'scene id is required' };
    }
    if (input === 'shell') {
      return { resolved: true, value: 'design-system/design-system.scenes.yml', input };
    }
    const id = toKebab(input);
    return {
      resolved: true,
      value: `sections/${id}/${id}.section.scenes.yml`,
      input,
    };
  },
};
```

- [ ] **Step 2: Run tests — expect pass**

```bash
pnpm --filter storybook-addon-designbook test -- resolvers/__tests__/scene-path.test.ts
```

Expected: all 5 tests pass.

### Task 4: Register `scene-path` in registry and index

**Files:**
- Modify: `packages/storybook-addon-designbook/src/resolvers/registry.ts`
- Modify: `packages/storybook-addon-designbook/src/resolvers/index.ts`

- [ ] **Step 1: Add to registry**

Edit `packages/storybook-addon-designbook/src/resolvers/registry.ts`:

Add after the existing resolver imports (around line 5):

```typescript
import { scenePathResolver } from './scene-path.js';
```

Add after the existing `register(breakpointsResolver);` line (around line 34):

```typescript
register(scenePathResolver);
```

- [ ] **Step 2: Add to public index**

Edit `packages/storybook-addon-designbook/src/resolvers/index.ts`:

Add the line:

```typescript
export { scenePathResolver } from './scene-path.js';
```

- [ ] **Step 3: Run full resolver test suite**

```bash
pnpm --filter storybook-addon-designbook test -- resolvers/
```

Expected: all resolver tests (including existing ones + new scene-path) pass.

### Task 5: Commit scene-path resolver

- [ ] **Step 1: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/scene-path.ts \
        packages/storybook-addon-designbook/src/resolvers/__tests__/scene-path.test.ts \
        packages/storybook-addon-designbook/src/resolvers/registry.ts \
        packages/storybook-addon-designbook/src/resolvers/index.ts
git commit -m "feat(resolver): add scene-path resolver for shell + section scenes paths"
```

---

## Phase 3 — Reduce `StoryMeta` Schema & Entity

### Task 6: Reduce `StoryMeta` schema in skill artifacts

**Files:**
- Modify: `.agents/skills/designbook/design/schemas.yml`

- [ ] **Step 1: Remove `checks` and `summary` from the `StoryMeta` schema**

Edit `.agents/skills/designbook/design/schemas.yml`. Find the `StoryMeta:` block (around line 52) and inside its `reference.properties`, delete:
- The entire `checks:` block (approximately lines 94–108)
- The entire `summary:` block (approximately lines 109–120)

After the edit, `StoryMeta.properties.reference.properties` should contain only `source` and `breakpoints`.

- [ ] **Step 2: Verify schema validation still works**

```bash
pnpm --filter storybook-addon-designbook test
```

Expected: if any test loads the schema and checks for `checks` or `summary`, it should fail — note which ones, they get fixed in Task 8.

### Task 7: Remove mutation methods from `StoryMeta` entity

**Files:**
- Modify: `packages/storybook-addon-designbook/src/story-entity.ts`

- [ ] **Step 1: Identify mutation methods**

```bash
grep -n "update\|check\|issue\|summary" packages/storybook-addon-designbook/src/story-entity.ts | head -40
```

List the methods that mutate state: typically `updateCheck`, `updateCheckResult`, `updateIssue`, `updateSummary`, `recomputeSummary`, and any private helpers. Also the TypeScript interfaces `StoryMetaCheck`, `StoryMetaSummary`, etc.

- [ ] **Step 2: Delete the mutation surface**

Remove from `story-entity.ts`:
- All `updateXxx` public methods on the `StoryMeta` class
- The `checks`, `summary` getters if they exist (or make them return `undefined`/`null` if internal callers still need the shape)
- Interfaces that described the removed fields (`StoryMetaCheck`, `StoryMetaSummary`, `StoryMetaScreenshot` if it only existed for check tracking)
- Imports that become unused after removal

Keep:
- `StoryMeta.load(config, storyId)` — read-only entry point
- `StoryMeta.createByScene(config, sceneRef, metaData?)` — used by setup-compare result flush (indirectly)
- `toJSON()` method if it exists, but adjusted to not reference removed fields
- Interfaces for `StoryMeta.reference.source` and `StoryMeta.reference.breakpoints`

- [ ] **Step 3: Run typecheck — expect failures**

```bash
pnpm --filter storybook-addon-designbook typecheck
```

Expected: TypeScript errors in `cli/story.ts` (consumer — gets deleted in Phase 6) and in `__tests__/story-entity.test.ts` (tests — fixed in Task 8). Note the failing locations.

### Task 8: Remove mutation tests from entity test suite

**Files:**
- Modify: `packages/storybook-addon-designbook/src/__tests__/story-entity.test.ts`

- [ ] **Step 1: Delete mutation-related `describe`/`it` blocks**

Remove every test that calls `updateCheck`, `updateIssue`, `updateSummary`, or asserts on `reference.checks`/`reference.summary`. Keep tests for `.load()`, `.createByScene()`, and config-read behaviour.

- [ ] **Step 2: Run entity tests alone**

```bash
pnpm --filter storybook-addon-designbook test -- __tests__/story-entity.test.ts
```

Expected: all remaining tests pass. Typecheck should now be green on this file.

### Task 9: Commit entity + schema reduction

- [ ] **Step 1: Commit**

```bash
git add .agents/skills/designbook/design/schemas.yml \
        packages/storybook-addon-designbook/src/story-entity.ts \
        packages/storybook-addon-designbook/src/__tests__/story-entity.test.ts
git commit -m "refactor(entity): drop StoryMeta.reference.checks and summary — runtime-only"
```

---

## Phase 4 — Migrate Task Frontmatter + Bodies

> Note on the pattern: after migration, each task receives its `meta.yml` content via a file-path param (`path:` + `$ref:`). The workflow engine resolves the path, reads the file, parses it, and passes the content as the param value. Task bodies then reference `${story_meta.reference.source.url}` etc. instead of shelling out to `_debo story`.

### Task 10: Migrate `setup-compare.md`

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/setup-compare.md`

**Load the skill-creator first** (per CLAUDE.md rule):

```
Load designbook-skill-creator skill before editing any task file.
```

- [ ] **Step 1: Rewrite frontmatter**

The new frontmatter declares two results: `story-meta` (file) and `checks` (data array).

```yaml
---
trigger:
  steps: [setup-compare]
params:
  type: object
  required: [story_id, breakpoints]
  properties:
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
    reference: { type: array, default: [] }
    breakpoints: { type: array }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [story-meta, checks]
  properties:
    story-meta:
      path: designbook/stories/{story_id}/meta.yml
      type: object
      $ref: ../schemas.yml#/StoryMeta
    checks:
      type: array
      items:
        $ref: ../schemas.yml#/Check
---
```

- [ ] **Step 2: Rewrite task body — remove CLI call**

Replace the current body. The new body does all computation in-memory, returns both results via `workflow done --data`.

```markdown
# Setup Compare

Builds the `meta.yml` configuration for the story and returns the runtime `checks` matrix that drives the capture + compare stages.

## Step 1: Restart Storybook

Restart Storybook before capture to ensure compiled state matches generated files:

```bash
_debo storybook start --force
```

Wait for `{ ready: true }`. If startup fails, report errors from `_debo storybook logs` and pause.

## Step 2: Determine Regions

Derive regions from the story metadata:
- Shell stories (`story_id` contains `--shell`): regions `["header", "footer"]`
- All other stories: regions `["full"]`

## Step 3: Apply rules that shape the reference

Before building the result, apply all loaded rules for this stage that modify the reference. Rules may resolve provider-specific URLs, set additional fields on `reference.source` (e.g. `hasMarkup`), or transform the seed.

If `reference` param is empty or null: skip compare by completing with an empty `checks` array and a minimal `story-meta` that contains only the breakpoints × regions matrix (no `reference.source`).

## Step 4: Build the result

The result contains two keys:

1. **`story-meta`** — the complete `meta.yml` body:

```json
{
  "reference": {
    "source": {
      "url": "<reference[0].url>",
      "origin": "<reference[0].type>",
      "hasMarkup": true
    },
    "breakpoints": {
      "<bp>": {
        "threshold": <threshold>,
        "regions": {
          "<region>": { "selector": "<selector or empty>", "threshold": <threshold> }
        }
      }
    }
  }
}
```

2. **`checks`** — the runtime matrix as a JSON array. One entry per (breakpoint × region):

```json
[
  { "story_id": "<id>", "breakpoint": "<bp>", "region": "<region>", "threshold": <number> }
]
```

## Step 5: Complete the task

Pass both as a single JSON object via `workflow done --data`. The engine writes `story-meta` to disk and collects `checks` into the workflow scope for the `each: checks` expansion in later stages.
```

- [ ] **Step 3: Validate frontmatter**

If the addon exposes a schema validator for task files, run it:

```bash
pnpm --filter storybook-addon-designbook test -- validators/__tests__/workflow-result.test.ts
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/setup-compare.md
git commit -m "refactor(skill): setup-compare uses task results, no _debo story CLI"
```

### Task 11: Migrate `capture-storybook.md`

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/capture-storybook.md`

- [ ] **Step 1: Add `story_url` resolver param to frontmatter**

Modify the `params.properties` block (around lines 12–23). Add:

```yaml
    story_url:
      type: string
      resolve: story_url
      from: story_id
```

Keep existing params (`scene_id`, `story_id`, `breakpoint`, `region`, `design_tokens`).

- [ ] **Step 2: Remove CLI call from body**

Edit the body (line 43 area). Replace:

```bash
   _debo story --scene ${scene}
```

With: delete that bash block entirely. Reword step 1 to:

```markdown
1. **Use the Storybook URL from the resolved param**: the `story_url` param is pre-resolved to the iframe URL (`http://localhost:<port>/iframe.html?id=<storyId>&viewMode=story`).
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/capture-storybook.md
git commit -m "refactor(skill): capture-storybook uses story_url resolver"
```

### Task 12: Migrate `capture-reference.md`

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/capture-reference.md`

- [ ] **Step 1: Add `story_meta` file-param to frontmatter**

In `params.properties`, add:

```yaml
    story_meta:
      path: designbook/stories/{story_id}/meta.yml
      type: object
      $ref: ../schemas.yml#/StoryMeta
```

Also ensure `story_id` is present in required params.

- [ ] **Step 2: Remove CLI call from body**

Edit the body (around line 35). Replace:

```markdown
1. **Resolve reference URL** from `StoryMeta` entity:
   ```bash
   _debo story --scene ${scene}
   ```
   Read the `reference.url` from the story JSON output. If no reference URL is available, skip with a warning.
```

With:

```markdown
1. **Read reference URL from the `story_meta` param**: `story_meta.reference.source.url`. If unset, skip with a warning.
```

Keep the download-URL curl fallback unchanged.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/capture-reference.md
git commit -m "refactor(skill): capture-reference reads meta.yml via file-path param"
```

### Task 13: Migrate `compare-screenshots.md`

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/compare-screenshots.md`

- [ ] **Step 1: Add `story_meta` param + declare `issues` data result**

Replace `params` block with one including `story_meta` file-path param (same as Task 12 step 1).

Add `result` block at frontmatter:

```yaml
result:
  type: object
  required: [issues]
  properties:
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
```

- [ ] **Step 2: Remove CLI call from body + add issues-output instruction**

Edit the body (around line 38). Replace:

```bash
   _debo story --scene ${scene}
```

With: delete. Reword the surrounding paragraph to use `${story_meta}` (e.g. thresholds from `story_meta.reference.breakpoints.<bp>.regions.<r>.threshold`).

At the end of the body (just before the Output section), add:

```markdown
## Emit issues

On completion, pass the issues array as the task result:

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task <task-id> \
  --data '{"issues": [ ... ]}'
```

Issues are consumed by the `verify` stage via the workflow scope — they are never written to disk.
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/compare-screenshots.md
git commit -m "refactor(skill): compare-screenshots outputs issues as data result"
```

### Task 14: Migrate `verify.md`

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/verify.md`

- [ ] **Step 1: Replace params + add verified-issues result**

Add to `params.properties`:

```yaml
    story_meta:
      path: designbook/stories/{story_id}/meta.yml
      type: object
      $ref: ../schemas.yml#/StoryMeta
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
```

Add a `result` block:

```yaml
result:
  type: object
  required: [verified-issues]
  properties:
    verified-issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
```

- [ ] **Step 2: Rewrite body — remove all four CLI calls**

Delete the three `_debo story issues --scene ...` commands and the `_debo story check --scene ...` command. The new body reads `${issues}` from the param (already filtered to the current check by `each: checks` + workflow scope), re-evaluates each issue, and emits a `verified-issues` array.

Replacement body (section 2 onwards):

```markdown
## Execution

Verify compares existing screenshots (captured by the `recapture` task) — it does NOT restart Storybook or re-capture.

1. **Read issues for this check** from the `issues` param (pre-filtered via workflow scope + `each: checks`).

2. **Re-compare based on issue source:**

   **For screenshot issues** — read both images side by side:
   - Reference: `${reference_folder}/${breakpoint}--${region}.png`
   - Storybook (after polish): `designbook/stories/${story_id}/screenshots/${breakpoint}--${region}.png`

   Compare visually and determine if the issue is resolved.

   **For extraction issues** — if extraction files exist, re-diff the specific properties mentioned in the issue. Otherwise evaluate visually from screenshots.

3. **Emit `verified-issues`** — each input issue copied over with `status: "done"` and `result: "pass" | "fail"` set.

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task <task-id> \
  --data '{"verified-issues": [ ... ]}'
```

The overall check verdict (pass/fail) is derived by downstream tooling from the verified-issues array: `fail` if any issue has `result: "fail"`, else `pass`. No meta.yml write.
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/verify.md
git commit -m "refactor(skill): verify emits verified-issues as data result, no meta.yml write"
```

### Task 15: Migrate `create-section.md` to use `scene-path`

**Files:**
- Modify: `.agents/skills/designbook/sections/tasks/create-section.md`

- [ ] **Step 1: Add `scene_path` resolver param**

In `params.properties`, add:

```yaml
    scene_path:
      type: string
      resolve: scene_path
      from: section_id
```

- [ ] **Step 2: Use the resolved path in the result**

Edit the `result.properties.section-scenes.path`. Replace:

```yaml
      path: $DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml
```

With:

```yaml
      path: $DESIGNBOOK_DATA/{scene_path}
```

This lets the same task produce the file at the shell path (`design-system/design-system.scenes.yml`) when called with `section_id: shell`, or at a section path for any other section id.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/sections/tasks/create-section.md
git commit -m "refactor(skill): create-section uses scene-path resolver for shell and sections"
```

---

## Phase 5 — Remove Story CLI

### Task 16: Delete `cli/story.ts` and its registration

**Files:**
- Delete: `packages/storybook-addon-designbook/src/cli/story.ts`
- Modify: `packages/storybook-addon-designbook/src/cli/index.ts` (or whichever file registers the command)

- [ ] **Step 1: Find the registration site**

```bash
grep -rn "story\." packages/storybook-addon-designbook/src/cli/index.ts packages/storybook-addon-designbook/src/index.ts 2>/dev/null
grep -rn "from.*cli/story" packages/storybook-addon-designbook/src/ --include="*.ts"
```

Locate the `import { register as registerStory } from './story.js'` line or equivalent `storyCommand.register(program)` call.

- [ ] **Step 2: Delete the CLI file**

```bash
rm packages/storybook-addon-designbook/src/cli/story.ts
```

- [ ] **Step 3: Remove the registration**

Edit the file located in step 1 — remove the import line and any `registerStory(program)` / `storyCommand.register(...)` call.

- [ ] **Step 4: Run full check**

```bash
pnpm --filter storybook-addon-designbook typecheck
```

Expected: green. If TypeScript complains about an unused import, delete that too.

```bash
pnpm --filter storybook-addon-designbook test
```

Expected: all tests pass. If any test references `cli/story.ts` or runs `_debo story`, delete or adjust it.

- [ ] **Step 5: Commit**

```bash
git add -u packages/storybook-addon-designbook/
git commit -m "refactor(cli): remove _debo story command entirely"
```

---

## Phase 6 — Documentation Cleanup

### Task 17: Update `story-meta-schema.md`

**Files:**
- Modify: `.agents/skills/designbook/design/resources/story-meta-schema.md`

- [ ] **Step 1: Remove `_debo story check` references**

```bash
grep -n "_debo story" .agents/skills/designbook/design/resources/story-meta-schema.md
```

Edit the two lines shown (around lines 83 and 151 per Task 1 survey). Remove the phrases that reference the CLI. If a section describes the `checks` map being written by `_debo story check`, delete that section (the field is gone from the schema anyway).

- [ ] **Step 2: Reflect schema reduction**

If the file includes an inline YAML snippet of the `meta.yml` shape, update it to match the reduced `StoryMeta` schema — no `reference.checks`, no `reference.summary`.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/resources/story-meta-schema.md
git commit -m "docs(skill): update story-meta-schema for reduced meta.yml"
```

### Task 18: Sweep other docs for stale references

**Files:** any under `.agents/skills/designbook/`

- [ ] **Step 1: Find remaining references**

```bash
grep -rn "_debo story\|updateCheck\|updateIssue" .agents/skills/designbook/ --include="*.md"
```

Expected: empty output after Phase 4+5. Any hit is a stale reference.

- [ ] **Step 2: Update each hit**

For each file and line, either delete the reference or reword to use the new resolver/result pattern. For workflow-level docs (e.g. `resources/cli-workflow.md`), ensure only `_debo workflow`, `_debo storybook`, `_debo config` are mentioned.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/
git commit -m "docs(skill): remove stray _debo story references"
```

---

## Phase 7 — End-to-End Validation

### Task 19: Full test suite + lint + typecheck

- [ ] **Step 1: Run full quality gate**

```bash
pnpm check
```

Expected: typecheck + lint + test all pass. Any failure blocks Phase 8.

### Task 20: Integration smoke test via test workspace

> This requires a live Storybook, a real story, and a reference. If the environment doesn't have that, document the gap and skip the manual test — but Task 19 must still be green.

- [ ] **Step 1: Set up a test workspace**

```bash
./scripts/setup-workspace.sh story-cli-removal-smoke
```

- [ ] **Step 2: Run a fresh design-verify workflow end-to-end**

From the test workspace root, trigger the design-verify workflow for a shell story. The expected flow:

1. setup-compare writes `designbook/stories/<id>/meta.yml` with only `reference.source` + `reference.breakpoints` — no `checks`, no `summary`.
2. `checks[]` appears in the workflow scope for the next stage's `each:` expansion.
3. capture + compare run without any `_debo story` shell calls (check the workflow log).
4. compare emits `issues[]` as a data result.
5. verify emits `verified-issues[]` as a data result.
6. Workflow archives. `meta.yml` is unchanged after archive (compare with post-setup-compare state).

- [ ] **Step 3: Grep the workflow log for any leaked CLI calls**

```bash
grep -n "_debo story\b" designbook/dbo.log 2>/dev/null || echo "clean"
```

Expected: `clean`.

### Task 21: Final commit + plan checkbox closure

- [ ] **Step 1: Re-run `pnpm check` one last time**

```bash
pnpm check
```

- [ ] **Step 2: Amend if needed or no-op commit**

If any doc-touchup or missed file surfaced during integration testing, stage + commit:

```bash
git add -u
git commit -m "chore: post-validation cleanup for story CLI removal"
```

If nothing to commit, skip.

---

## Spec Coverage Check

| Spec item | Implemented in |
|-----------|----------------|
| Remove `cli/story.ts` | Task 16 |
| Remove StoryMeta mutation methods | Task 7 |
| Reduce StoryMeta schema (no checks/summary) | Task 6 |
| New `scene-path` resolver | Tasks 2–5 |
| `setup-compare` migration | Task 10 |
| `capture-storybook` migration | Task 11 |
| `capture-reference` migration | Task 12 |
| `compare-screenshots` migration | Task 13 |
| `verify` migration | Task 14 |
| `create-section` migration | Task 15 |
| Doc cleanup (story-meta-schema.md) | Task 17 |
| General doc sweep | Task 18 |
| End-to-end validation | Tasks 19–21 |

**Open-points-from-spec resolution:**
- Ensure-resolver vs. task-result for meta.yml → resolved as **task-result** (Task 10) for simplicity and parity with create-section
- scene-path input schema → resolved as **`shell` keyword + section_id otherwise** (Task 3)
- reference_url flow → resolved as **file-path param** loading meta.yml (Tasks 12/13/14)
- verify.each granularity → **unchanged (`each: checks`)**, refactor to `each: issues` deferred
