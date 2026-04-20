# Domain-Based Rule/Blueprint Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `when.steps` in rules and blueprints with semantic `domain:` tags so integration authors don't need to know workflow internals.

**Architecture:** New `matchDomain()` function in `workflow-resolve.ts` handles prefix-based domain matching. `resolveFiles()` gains a `domain` code path alongside the existing `when.steps` path (backwards compat). `resolveAllStages()` reads `domain:` from task frontmatter and workflow stage definitions, computes the union, and passes it to rule/blueprint resolution. All rule/blueprint files are migrated from `when.steps` to `domain:`.

**Tech Stack:** TypeScript, Vitest, YAML frontmatter

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `packages/storybook-addon-designbook/src/workflow-resolve.ts` | Add `matchDomain()`, modify `resolveFiles()`, `matchRuleFiles()`, `matchBlueprintFiles()`, `resolveAllStages()` |
| Modify | `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts` | Tests for domain matching |
| Modify | 19 rule files across `designbook-drupal`, `designbook-css-tailwind`, `designbook-stitch`, `designbook` | Replace `when.steps` with `domain:` |
| Modify | 20 blueprint files across `designbook-drupal`, `designbook`, `designbook-css-tailwind` | Replace `when.steps` with `domain:` |
| Modify | 15 task files in `designbook` | Add `domain:` field |
| Modify | 4 workflow files in `designbook` | Add `domain:` to stage definitions |
| Modify | `.agents/skills/designbook/resources/architecture.md` | Document domain system |

---

### Task 1: `matchDomain()` — Pure Matching Function

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts`
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts`

- [ ] **Step 1: Write failing tests for `matchDomain()`**

Add a new `describe('matchDomain')` block in the test file, after the existing `checkWhen` tests (around line 840):

```typescript
describe('matchDomain', () => {
  it('exact match', () => {
    expect(matchDomain('components', ['components'])).toBe(true);
  });

  it('no match — different domain', () => {
    expect(matchDomain('scenes', ['components'])).toBe(false);
  });

  it('broad need loads sub-domain rule', () => {
    // Task needs "components" → loads rule with "components.layout"
    expect(matchDomain('components.layout', ['components'])).toBe(true);
  });

  it('specific need loads parent rule', () => {
    // Task needs "components.layout" → loads rule with "components"
    expect(matchDomain('components', ['components.layout'])).toBe(true);
  });

  it('specific need does NOT load sibling', () => {
    // Task needs "components.layout" → does NOT load "components.discovery"
    expect(matchDomain('components.discovery', ['components.layout'])).toBe(false);
  });

  it('matches against any domain in the set', () => {
    expect(matchDomain('scenes', ['components', 'scenes'])).toBe(true);
  });

  it('does not partial-match without dot boundary', () => {
    // "components" must NOT match "components-extra"
    expect(matchDomain('components-extra', ['components'])).toBe(false);
  });

  it('deep subcontext matches parent', () => {
    expect(matchDomain('design', ['design.intake'])).toBe(true);
  });

  it('deep subcontext matches exact', () => {
    expect(matchDomain('design.intake', ['design.intake'])).toBe(true);
  });

  it('empty effective domains matches nothing', () => {
    expect(matchDomain('components', [])).toBe(false);
  });

  it('rule with array domain matches if any element matches', () => {
    // A rule declares domain: [components, scenes]
    expect(matchDomain('components', ['scenes'])).toBe(false);
    expect(matchDomain('scenes', ['scenes'])).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/validators/__tests__/workflow-resolve.test.ts -t "matchDomain"`
Expected: FAIL — `matchDomain` is not exported

- [ ] **Step 3: Implement `matchDomain()`**

In `workflow-resolve.ts`, add after the `checkWhen()` function (around line 432):

```typescript
/**
 * Check whether a rule's domain matches any of the effective domains.
 *
 * Matching rules (dot-delimited prefix matching):
 * - Exact: "components" matches "components"
 * - Rule is child of need: need "components" matches rule "components.layout"
 * - Rule is parent of need: need "components.layout" matches rule "components"
 * - No partial segment: "components" does NOT match "components-extra"
 */
export function matchDomain(ruleDomain: string, effectiveDomains: string[]): boolean {
  for (const need of effectiveDomains) {
    if (ruleDomain === need) return true;
    if (ruleDomain.startsWith(need + '.')) return true;
    if (need.startsWith(ruleDomain + '.')) return true;
  }
  return false;
}
```

- [ ] **Step 4: Add `matchDomain` to the test file import**

In the test file, add `matchDomain` to the import from `../../workflow-resolve.js`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/validators/__tests__/workflow-resolve.test.ts -t "matchDomain"`
Expected: PASS — all 11 cases green

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts
git commit -m "feat(resolve): add matchDomain() for domain-based rule matching"
```

---

### Task 2: Domain-Aware `resolveFiles()`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts`
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts`

- [ ] **Step 1: Write failing tests for domain-aware `resolveFiles()`**

Add a new `describe('resolveFiles with domain')` block after the existing `resolveFiles` tests:

```typescript
describe('resolveFiles with domain', () => {
  it('matches rule by domain instead of when.steps', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-drupal',
      'scene-constraints',
      'domain: scenes\nwhen:\n  backend: drupal',
    );

    const context = buildRuntimeContext('create-scene');
    const config = buildEnrichedConfig(baseConfig);
    const results = resolveFiles('skills/**/rules/*.md', context, config, agentsDir, true, ['scenes']);
    expect(results.map((r) => r.path)).toContain(rulePath);
  });

  it('domain rule NOT matched when effective domains empty', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(
      agentsDir,
      'designbook-drupal',
      'scene-constraints',
      'domain: scenes\nwhen:\n  backend: drupal',
    );

    const context = buildRuntimeContext('create-scene');
    const config = buildEnrichedConfig(baseConfig);
    const results = resolveFiles('skills/**/rules/*.md', context, config, agentsDir, true, []);
    expect(results).toEqual([]);
  });

  it('domain rule excluded when config condition fails', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(
      agentsDir,
      'designbook-drupal',
      'scene-constraints',
      'domain: scenes\nwhen:\n  backend: wordpress',
    );

    const context = buildRuntimeContext('create-scene');
    const config = buildEnrichedConfig(baseConfig);
    const results = resolveFiles('skills/**/rules/*.md', context, config, agentsDir, true, ['scenes']);
    expect(results).toEqual([]);
  });

  it('subcontext: broad need loads sub-domain rule', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-drupal',
      'layout-constraints',
      'domain: components.layout\nwhen:\n  backend: drupal',
    );

    const context = buildRuntimeContext('create-component');
    const config = buildEnrichedConfig(baseConfig);
    const results = resolveFiles('skills/**/rules/*.md', context, config, agentsDir, true, ['components']);
    expect(results.map((r) => r.path)).toContain(rulePath);
  });

  it('legacy when.steps still works when no domain and no effectiveDomains', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-legacy',
      'old-rule',
      'when:\n  steps: [create-scene]',
    );

    const context = buildRuntimeContext('create-scene');
    const config = buildEnrichedConfig(baseConfig);
    // No effectiveDomains passed → falls back to legacy when.steps matching
    const results = resolveFiles('skills/**/rules/*.md', context, config, agentsDir);
    expect(results.map((r) => r.path)).toContain(rulePath);
  });

  it('domain takes precedence over when.steps when both present', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    // Rule has domain AND when.steps — domain should be used
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-drupal',
      'dual-rule',
      'domain: scenes\nwhen:\n  steps: [old-step]\n  backend: drupal',
    );

    const context = buildRuntimeContext('old-step');
    const config = buildEnrichedConfig(baseConfig);
    // Effective domains include 'scenes' — should match via domain
    const results = resolveFiles('skills/**/rules/*.md', context, config, agentsDir, true, ['scenes']);
    expect(results.map((r) => r.path)).toContain(rulePath);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/validators/__tests__/workflow-resolve.test.ts -t "resolveFiles with domain"`
Expected: FAIL — `resolveFiles` doesn't accept a 6th argument

- [ ] **Step 3: Modify `resolveFiles()` to support domain matching**

In `workflow-resolve.ts`, modify the `resolveFiles()` function signature and body (around line 553):

```typescript
export function resolveFiles(
  globPattern: string,
  context: Record<string, unknown>,
  config: Record<string, unknown>,
  agentsDir: string,
  requireWhen = true,
  effectiveDomains?: string[],
): ResolvedFile[] {
  const results: ResolvedFile[] = [];
  const paths = globSync(globPattern, { cwd: agentsDir, absolute: true });

  for (const filePath of paths) {
    const frontmatter = parseFrontmatter(filePath);
    const when = frontmatter?.when as Record<string, unknown> | undefined;
    const name = deriveArtifactName(filePath, agentsDir, frontmatter);
    const domain = frontmatter?.domain as string | string[] | undefined;

    // Domain-based matching: if file has domain and effectiveDomains are provided
    if (domain && effectiveDomains && effectiveDomains.length > 0) {
      const domains = Array.isArray(domain) ? domain : [domain];
      const domainMatched = domains.some((d) => matchDomain(d, effectiveDomains));
      if (!domainMatched) continue;

      // Check remaining when conditions (excluding steps)
      if (when) {
        const configOnly = { ...when };
        delete configOnly['steps'];
        delete configOnly['stages'];
        if (Object.keys(configOnly).length > 0) {
          const specificity = checkWhen(configOnly, context, config);
          if (specificity === false) continue;
          results.push({ path: filePath, name, specificity: specificity + 1, frontmatter });
          continue;
        }
      }
      results.push({ path: filePath, name, specificity: 1, frontmatter });
      continue;
    }

    // Domain file but no effectiveDomains passed → skip (domain files require domain matching)
    if (domain && (!effectiveDomains || effectiveDomains.length === 0)) {
      continue;
    }

    // Legacy when.steps path (unchanged)
    if (!when || Object.keys(when).length === 0) {
      if (requireWhen) {
        continue;
      }
      results.push({ path: filePath, name, specificity: 0, frontmatter });
      continue;
    }

    const specificity = checkWhen(when, context, config);
    if (specificity !== false) {
      results.push({ path: filePath, name, specificity, frontmatter });
    }
  }

  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/validators/__tests__/workflow-resolve.test.ts -t "resolveFiles with domain"`
Expected: PASS

- [ ] **Step 5: Run full test suite to check no regressions**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/validators/__tests__/workflow-resolve.test.ts`
Expected: All existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts
git commit -m "feat(resolve): domain-aware resolveFiles with backwards compat"
```

---

### Task 3: Wire Domain Into `matchRuleFiles()`, `matchBlueprintFiles()`, and `resolveAllStages()`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts`
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts`

- [ ] **Step 1: Write failing integration test**

Add a test that exercises the full path: workflow with stage `domain:`, task with `domain:`, rule with `domain:`:

```typescript
describe('matchRuleFiles with domain', () => {
  it('matches rule by domain', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-drupal',
      'scene-rules',
      'domain: scenes\nwhen:\n  backend: drupal',
    );

    const result = matchRuleFiles('create-scene', baseConfig, agentsDir, undefined, ['scenes']);
    expect(result).toContain(rulePath);
  });

  it('does not match rule when domain does not overlap', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(
      agentsDir,
      'designbook-drupal',
      'scene-rules',
      'domain: scenes\nwhen:\n  backend: drupal',
    );

    const result = matchRuleFiles('create-component', baseConfig, agentsDir, undefined, ['components']);
    expect(result).toEqual([]);
  });

  it('legacy when.steps rules still matched when no effectiveDomains', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-scenes',
      'scene-rules',
      'when:\n  stages: [create-scene]',
    );

    const result = matchRuleFiles('create-scene', baseConfig, agentsDir);
    expect(result).toContain(rulePath);
  });
});

describe('matchBlueprintFiles with domain', () => {
  it('matches blueprint by domain with type+name dedup', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const dir = resolve(agentsDir, 'skills', 'designbook-drupal', 'blueprints');
    mkdirSync(dir, { recursive: true });
    const bpPath = resolve(dir, 'header.md');
    writeFileSync(bpPath, '---\ntype: component\nname: header\npriority: 10\ndomain: components.shell\nwhen:\n  backend: drupal\n---\n# Header');

    const result = matchBlueprintFiles('intake', baseConfig, agentsDir, undefined, ['components.shell']);
    expect(result).toContain(bpPath);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/validators/__tests__/workflow-resolve.test.ts -t "matchRuleFiles with domain"`
Expected: FAIL — `matchRuleFiles` doesn't accept 5th argument

- [ ] **Step 3: Modify `matchRuleFiles()` to accept `effectiveDomains`**

In `workflow-resolve.ts`, modify `matchRuleFiles()` (around line 786):

```typescript
export function matchRuleFiles(
  stage: string,
  config: DesignbookConfig,
  agentsDir: string,
  extraConditions?: Record<string, string>,
  effectiveDomains?: string[],
): string[] {
  const context = buildRuntimeContext(stage, extraConditions);
  const enrichedConfig = buildEnrichedConfig(config);
  const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, effectiveDomains);
  return matches.map((m) => m.path);
}
```

- [ ] **Step 4: Modify `matchBlueprintFiles()` to accept `effectiveDomains`**

In `workflow-resolve.ts`, modify `matchBlueprintFiles()` (around line 809):

```typescript
export function matchBlueprintFiles(
  stage: string,
  config: DesignbookConfig,
  agentsDir: string,
  extraConditions?: Record<string, string>,
  effectiveDomains?: string[],
): string[] {
  const context = buildRuntimeContext(stage, extraConditions);
  const enrichedConfig = buildEnrichedConfig(config);
  const matches = resolveFiles('skills/**/blueprints/*.md', context, enrichedConfig, agentsDir, true, effectiveDomains);

  // Deduplicate by type+name — highest priority wins, equal priority = last match wins
  const byKey = new Map<string, { path: string; priority: number }>();
  for (const m of matches) {
    const type = m.frontmatter?.['type'] as string | undefined;
    const name = m.frontmatter?.['name'] as string | undefined;
    if (type && name) {
      const key = `${type}:${name}`;
      const priority = typeof m.frontmatter?.['priority'] === 'number' ? (m.frontmatter['priority'] as number) : 0;
      const existing = byKey.get(key);
      if (!existing || priority >= existing.priority) {
        byKey.set(key, { path: m.path, priority });
      }
    }
  }
  return Array.from(byKey.values()).map((v) => v.path);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/validators/__tests__/workflow-resolve.test.ts -t "matchRuleFiles with domain|matchBlueprintFiles with domain"`
Expected: PASS

- [ ] **Step 6: Modify `resolveAllStages()` to compute effective domains**

In `workflow-resolve.ts`, inside `resolveAllStages()` (around line 1256, the rule/blueprint resolution section), add domain computation:

```typescript
    // ── Compute effective domains for this step ──
    // Union of: task file domain + workflow stage domain
    const effectiveDomains: string[] = [];

    // Read domain from resolved task file(s)
    for (const rf of resolvedTaskFiles) {
      const taskDomain = rf.frontmatter?.domain;
      if (taskDomain) {
        const domains = Array.isArray(taskDomain) ? taskDomain : [taskDomain];
        for (const d of domains) {
          if (typeof d === 'string' && !effectiveDomains.includes(d)) {
            effectiveDomains.push(d);
          }
        }
      }
    }

    // Read domain from workflow stage definition
    if (stageDefs) {
      // Find the stage that contains this step
      for (const [, def] of Object.entries(stageDefs)) {
        if (def.steps?.includes(step)) {
          const stageDomain = (def as Record<string, unknown>).domain;
          if (stageDomain) {
            const domains = Array.isArray(stageDomain) ? stageDomain : [stageDomain];
            for (const d of domains) {
              if (typeof d === 'string' && !effectiveDomains.includes(d)) {
                effectiveDomains.push(d);
              }
            }
          }
          break;
        }
      }
    }
```

Then pass `effectiveDomains` to `matchRuleFiles` and `matchBlueprintFiles` calls. Replace the existing rule/blueprint collection loop (around line 1268):

```typescript
    const ruleFiles: string[] = [];
    for (const s of stepsToMatch) {
      for (const r of matchRuleFiles(s, config, agentsDir, undefined, effectiveDomains)) {
        if (!ruleFiles.includes(r)) ruleFiles.push(r);
      }
    }
    const blueprintFiles: string[] = [];
    for (const s of stepsToMatch) {
      for (const b of matchBlueprintFiles(s, config, agentsDir, undefined, effectiveDomains)) {
        if (!blueprintFiles.includes(b)) blueprintFiles.push(b);
      }
    }
```

- [ ] **Step 7: Update `StageDefinitionFm` type**

Add `domain` to the interface (around line 80):

```typescript
interface StageDefinitionFm {
  steps?: string[];
  workflow?: string;
  each?: string;
  params?: Record<string, { type: string; prompt: string }>;
  domain?: string[];
}
```

- [ ] **Step 8: Run full test suite**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/validators/__tests__/workflow-resolve.test.ts`
Expected: All tests pass (existing + new)

- [ ] **Step 9: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts
git commit -m "feat(resolve): wire domain into matchRuleFiles, matchBlueprintFiles, resolveAllStages"
```

---

### Task 4: Migrate Rule Files

**Files:**
- Modify: 19 rule files (see list below)

Each rule file: remove `steps:` from `when:`, add `domain:` to frontmatter. If `when:` becomes empty, remove it entirely.

- [ ] **Step 1: Migrate `designbook-drupal` component rules**

`designbook-drupal/components/rules/component-discovery.md`:
```yaml
# Before
when:
  steps: [designbook-design-shell:intake, designbook-design-screen:intake, designbook-design-component:intake]
  frameworks.component: sdc

# After
domain: components.discovery
when:
  frameworks.component: sdc
```

`designbook-drupal/components/rules/sdc-conventions.md`:
```yaml
# Before
when:
  steps: [create-component]
  frameworks.component: sdc

# After
domain: components
when:
  frameworks.component: sdc
```

`designbook-drupal/components/rules/layout-constraints.md`:
```yaml
# Before
when:
  steps: [create-component, design-shell:intake, design-screen:intake]
  backend: drupal

# After
domain: components.layout
when:
  backend: drupal
```

- [ ] **Step 2: Migrate `designbook-css-tailwind` rules**

`designbook-css-tailwind/rules/component-source.md`:
```yaml
# Before
when:
  steps: [create-component]
  frameworks.style: tailwind

# After
domain: components
when:
  frameworks.style: tailwind
```

`designbook-css-tailwind/rules/scenes-constraints.md`:
```yaml
# Before
when:
  steps: [design-shell:create-scene, design-screen:create-scene]
  frameworks.style: tailwind

# After
domain: scenes
when:
  frameworks.style: tailwind
```

- [ ] **Step 3: Migrate `designbook-drupal` scene rules**

`designbook-drupal/scenes/rules/scenes-constraints.md`:
```yaml
# Before
when:
  steps: [design-shell:create-scene, design-screen:create-scene, map-entity]
  backend: drupal

# After
domain: scenes
when:
  backend: drupal
```

- [ ] **Step 4: Migrate `designbook-drupal` data-mapping rules**

`designbook-drupal/data-mapping/rules/image-fields.md`:
```yaml
# Before
when:
  steps: [map-entity]

# After (when: removed entirely)
domain: data-mapping
```

- [ ] **Step 5: Migrate `designbook-drupal` data-model rules**

`designbook-drupal/data-model/rules/media-image-styles.md`:
```yaml
# Before
when:
  backend: drupal
  steps: [create-data-model]

# After
domain: data-model
when:
  backend: drupal
```

`designbook-drupal/data-model/rules/layout-builder.md`:
```yaml
# Before
when:
  extensions: layout_builder
  steps: [create-data-model]

# After
domain: data-model
when:
  extensions: layout_builder
```

`designbook-drupal/data-model/rules/canvas.md`:
```yaml
# Before
when:
  extensions: canvas
  steps: [create-data-model]

# After
domain: data-model
when:
  extensions: canvas
```

`designbook-drupal/data-model/rules/drupal-views.md`:
```yaml
# Before
when:
  backend: drupal
  steps: [create-data-model]

# After
domain: data-model
when:
  backend: drupal
```

- [ ] **Step 6: Migrate `designbook-drupal` sample-data rules**

`designbook-drupal/sample-data/rules/image.md`:
```yaml
domain: sample-data
when:
  backend: drupal
```

`designbook-drupal/sample-data/rules/layout-builder.md`:
```yaml
domain: sample-data
when:
  backend: drupal
  extensions: layout_builder
```

`designbook-drupal/sample-data/rules/canvas.md`:
```yaml
domain: sample-data
when:
  extensions: canvas
  backend: drupal
```

- [ ] **Step 7: Migrate `designbook-drupal` shell rules**

`designbook-drupal/shell/rules/navigation.md`:
```yaml
# Before
when:
  steps: [design-shell:intake, design-screen:intake]
  backend: drupal

# After
domain: components.layout
when:
  backend: drupal
```

- [ ] **Step 8: Migrate `designbook-stitch` rules**

`designbook-stitch/rules/stitch-tokens.md`:
```yaml
# Before
when:
  steps: [create-tokens]
  extensions: stitch

# After
domain: tokens
when:
  extensions: stitch
```

`designbook-stitch/rules/stitch-import.md`:
```yaml
# Before
when:
  steps: [import:intake]
  extensions: stitch

# After
domain: design.intake
when:
  extensions: stitch
```

`designbook-stitch/rules/provide-stitch-url.md`:
```yaml
# Before
provides: reference.url
when:
  steps: [design-verify:intake, design-screen:intake, design-shell:intake]
  extensions: stitch

# After
provides: reference.url
domain: design.intake
when:
  extensions: stitch
```

- [ ] **Step 9: Migrate `designbook` core rules**

`designbook/css-generate/fonts/google/rules/font-url-construction.md`:
```yaml
# Before
when:
  extensions: google-fonts
  steps: [prepare-fonts]

# After
domain: css
when:
  extensions: google-fonts
```

- [ ] **Step 10: Commit**

```bash
git add .agents/skills/designbook-drupal/ .agents/skills/designbook-css-tailwind/ .agents/skills/designbook-stitch/ .agents/skills/designbook/css-generate/
git commit -m "refactor(skills): migrate all rule files from when.steps to domain"
```

---

### Task 5: Migrate Blueprint Files

**Files:**
- Modify: 20 blueprint files (see list below)

Same pattern as rules: remove `steps:` from `when:`, add `domain:`. Preserve `type`, `name`, `priority`, and other frontmatter fields.

- [ ] **Step 1: Migrate `designbook-drupal` component blueprints**

`designbook-drupal/components/blueprints/header.md`:
```yaml
type: component
name: header
priority: 10
embeds:
  - container
domain: components.shell
when:
  backend: drupal   # add config condition — was implicitly scoped to drupal via skill location
```
Note: `when:` with the old steps is replaced by `domain:`. Since this is in `designbook-drupal`, add `when: backend: drupal` if not already present. Check each file — some already have config conditions, some relied on step scoping.

`designbook-drupal/components/blueprints/footer.md`: `domain: components.shell`
`designbook-drupal/components/blueprints/page.md`: `domain: components.shell`
`designbook-drupal/components/blueprints/form.md`: `domain: components`
`designbook-drupal/components/blueprints/navigation.md`: `domain: components`
`designbook-drupal/components/blueprints/container.md`: `domain: components.layout`
`designbook-drupal/components/blueprints/section.md`: `domain: components.layout`
`designbook-drupal/components/blueprints/grid.md`: `domain: components.layout`

For each file: read the current frontmatter, remove `when.steps`, add `domain:`, keep all other fields (`type`, `name`, `priority`, `embeds`, `required_tokens`, remaining `when` config conditions).

- [ ] **Step 2: Migrate `designbook-drupal` data-mapping blueprints**

`designbook-drupal/data-mapping/blueprints/views.md`: `domain: data-mapping`
`designbook-drupal/data-mapping/blueprints/layout-builder.md`: `domain: data-mapping`
`designbook-drupal/data-mapping/blueprints/field-map.md`: `domain: data-mapping`
`designbook-drupal/data-mapping/blueprints/canvas.md`: `domain: data-mapping`

Remove `when.steps`, add `domain: data-mapping`. Keep any remaining `when` config conditions.

- [ ] **Step 3: Migrate `designbook-drupal` data-model blueprints**

`designbook-drupal/data-model/blueprints/node.md`: `domain: data-model`
`designbook-drupal/data-model/blueprints/taxonomy_term.md`: `domain: data-model`
`designbook-drupal/data-model/blueprints/media.md`: `domain: data-model`
`designbook-drupal/data-model/blueprints/block_content.md`: `domain: data-model`
`designbook-drupal/data-model/blueprints/canvas_page.md`: `domain: data-model`
`designbook-drupal/data-model/blueprints/view.md`: `domain: data-model`

Each keeps its existing `when: backend: drupal` (and `extensions:` where present), only `steps:` is removed.

- [ ] **Step 4: Migrate `designbook` core and `tailwind` blueprints**

`designbook/data-model/blueprints/image_style.md`: `domain: data-model` (remove `when.steps`, keep any other conditions)
`designbook-css-tailwind/blueprints/css-mapping.md`: `domain: css` (add if no when.steps existed)

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook-drupal/ .agents/skills/designbook-css-tailwind/ .agents/skills/designbook/data-model/
git commit -m "refactor(skills): migrate all blueprint files from when.steps to domain"
```

---

### Task 6: Add `domain:` to Task Files

**Files:**
- Modify: 15 task files in `.agents/skills/designbook/`

Task files keep their `when.steps` (for task resolution). The new `domain:` field is added alongside — it tells the resolver which rules/blueprints to load.

- [ ] **Step 1: Add domain to design task files**

Add `domain:` field to each task file's frontmatter (after `when:`, before `params:`):

| Task file | Add |
|---|---|
| `design/tasks/intake--design-component.md` | `domain: [components]` |
| `design/tasks/intake--design-shell.md` | `domain: [components, components.shell]` |
| `design/tasks/intake--design-screen.md` | `domain: [components, components.layout]` |
| `design/tasks/intake--design-verify.md` | `domain: [design.verify]` |
| `design/tasks/create-scene.md` | `domain: [components, scenes]` |

For each file, add a `domain:` line in the frontmatter. Example for `create-scene.md`:

```yaml
---
when:
  steps: [create-scene]
domain: [components, scenes]
params:
  output_path: { type: string }
  ...
```

- [ ] **Step 2: Add domain to data/tokens/sample-data task files**

| Task file | Add |
|---|---|
| `data-model/tasks/create-data-model.md` | `domain: [data-model]` |
| `tokens/tasks/create-tokens.md` | `domain: [tokens]` |
| `sample-data/tasks/create-sample-data.md` | `domain: [sample-data]` |

- [ ] **Step 3: Add domain to css task files**

| Task file | Add |
|---|---|
| `css-generate/tasks/intake--css-generate.md` | `domain: [css]` |
| `css-generate/tasks/generate-css.md` | `domain: [css]` |
| `css-generate/tasks/generate-jsonata.md` | `domain: [css]` |
| `css-generate/tasks/generate-index.md` | `domain: [css]` |
| `css-generate/fonts/google/tasks/prepare-fonts.md` | `domain: [css]` |

- [ ] **Step 4: Add domain to import task files**

| Task file | Add |
|---|---|
| `import/tasks/intake--import.md` | `domain: [design.intake]` |

- [ ] **Step 5: Add domain to drupal data-mapping tasks (if they exist)**

Check if `designbook-drupal` has task files for `map-entity`. If so, add `domain: [data-mapping, scenes]`.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/ .agents/skills/designbook-drupal/
git commit -m "feat(skills): add domain declarations to all core task files"
```

---

### Task 7: Add `domain:` to Workflow Stage Definitions

**Files:**
- Modify: `design/workflows/design-shell.md`
- Modify: `design/workflows/design-screen.md`
- Modify: `design/workflows/design-verify.md`
- Modify: `design/workflows/design-component.md`

- [ ] **Step 1: Add stage-level domain to design-shell.md**

```yaml
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
    domain: [data-model]
  component:
    steps: [create-component]
  scene:
    steps: [create-scene]
    domain: [data-model]
```

- [ ] **Step 2: Add stage-level domain to design-screen.md**

```yaml
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
    domain: [data-model]
  component:
    steps: [create-component]
  scene:
    steps: [create-scene]
    domain: [data-model]
```

- [ ] **Step 3: Add stage-level domain to design-verify.md**

```yaml
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
    domain: [design.intake]
  ...
```

The intake step needs `design.intake` to pull in `provide-stitch-url.md` and `stitch-import.md` rules.

- [ ] **Step 4: Add stage-level domain to design-component.md**

```yaml
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  component:
    steps: [create-component]
```

No extra stage-level domains needed here — the task's own `domain: [components]` is sufficient.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/workflows/
git commit -m "feat(workflows): add stage-level domain declarations"
```

---

### Task 8: Update Architecture Documentation

**Files:**
- Modify: `.agents/skills/designbook/resources/architecture.md`

- [ ] **Step 1: Add Domain Matching section**

After the "Rule File Format" section (around line 190), add:

```markdown
## Domain-Based Matching (Rules & Blueprints)

Rules and blueprints use `domain:` instead of `when.steps:` for step matching. Tasks and workflow stages declare which knowledge domains they need; rules declare which domain they belong to.

### Declaration

**On rules/blueprints (supply side):**
\`\`\`yaml
domain: scenes
when:
  backend: drupal    # config conditions still apply
\`\`\`

**On tasks (demand side):**
\`\`\`yaml
domain: [components, scenes]
\`\`\`

**On workflow stages (additive):**
\`\`\`yaml
stages:
  scene:
    steps: [create-scene]
    domain: [data-model]
\`\`\`

### Subcontexts

Domains use dot-notation for hierarchy: `components.layout`, `scenes.shell`.

Matching: a match occurs when one is a dot-delimited prefix of the other, or they are equal.
- `components` in task → loads rules with `components` and `components.*`
- `components.layout` in task → loads rules with `components` (parent) and `components.layout` (exact)

### Domain Taxonomy

| Domain | Subcontexts | Description |
|---|---|---|
| `components` | `.layout`, `.discovery`, `.shell` | Component structure and conventions |
| `scenes` | `.shell`, `.screen` | Scene file authoring constraints |
| `data-model` | — | Entity types, field conventions |
| `data-mapping` | — | Entity-to-component mapping |
| `tokens` | — | Design token structure |
| `sample-data` | — | Sample data generation |
| `css` | — | CSS generation, fonts |
| `design` | `.intake`, `.verify` | Design workflow rules |

### Legacy

`when.steps` in rules/blueprints is still supported during migration but deprecated. New rules must use `domain:`. `when.steps` in **task files** is unaffected and stays permanently for task resolution.
```

- [ ] **Step 2: Update Rule File Format section**

In the existing Rule File Format section (around line 169), update the example:

```markdown
## Rule File Format (skills)

Rule files live at `.agents/skills/<skill-name>/rules/<name>.md`. They define constraints scoped to knowledge domains:

\`\`\`markdown
---
domain: components
when:
  frameworks.component: sdc    # optional config condition
---
# Rule constraints go here (prose — never execution steps)
\`\`\`

- `domain:` matches against the effective domains of the current step (union of task + stage domains)
- Without `domain:` and without `when.steps:`: rule never matches
- Config conditions in `when:` (`backend`, `frameworks.*`, `extensions`) are checked as before
```

- [ ] **Step 3: Update Blueprint File Format section**

Same update: show `domain:` instead of `when.steps` in the blueprint example.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/resources/architecture.md
git commit -m "docs: update architecture.md with domain-based matching documentation"
```

---

### Task 9: Run Full Check and Fix

**Files:**
- All modified files

- [ ] **Step 1: Run typecheck**

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run lint**

Run: `pnpm --filter storybook-addon-designbook lint`
Expected: No errors (or fix with `lint:fix`)

- [ ] **Step 3: Run full test suite**

Run: `cd packages/storybook-addon-designbook && npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Fix any issues found**

If typecheck/lint/tests fail, fix the issues.

- [ ] **Step 5: Run `pnpm check`**

Run: `pnpm check`
Expected: All green (typecheck → lint → test)

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve typecheck/lint/test issues from domain migration"
```
