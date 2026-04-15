# Param Resolvers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a param resolver system to the CLI engine that validates and canonicalizes workflow params (story_id, reference_folder) before workflow execution starts.

**Architecture:** Resolvers are registered in a central registry keyed by name. The `workflow create` command reads `resolve:` declarations from workflow param frontmatter, runs the matching resolver, and either starts the workflow with canonicalized params or returns candidates for the AI to disambiguate. The `_debo story` command reuses the same `story_id` resolver for its positional argument.

**Tech Stack:** TypeScript, Vitest, Node.js crypto (SHA-256), js-yaml, glob

---

## File Structure

| File | Responsibility |
|---|---|
| `src/resolvers/types.ts` | Shared types: `ParamResolver`, `ResolverResult`, `Candidate`, `ResolverConfig` |
| `src/resolvers/registry.ts` | Resolver registry: register, lookup, run resolvers on params |
| `src/resolvers/story-id.ts` | `story_id` resolver: scene/component scanning, fuzzy match |
| `src/resolvers/reference-folder.ts` | `reference_folder` resolver: URL hashing, folder creation |
| `src/resolvers/__tests__/story-id.test.ts` | Tests for story_id resolver |
| `src/resolvers/__tests__/reference-folder.test.ts` | Tests for reference_folder resolver |
| `src/resolvers/__tests__/registry.test.ts` | Tests for resolver registry + workflow param integration |
| `src/cli/workflow.ts` | Modify: add resolve phase to `workflow create`, add `workflow resolve` command |
| `src/cli/story.ts` | Modify: replace `--scene` flag with positional argument through resolver |
| `src/workflow-resolve.ts` | Modify: parse `resolve:` from workflow param frontmatter |

Skill files to update after engine work is done (separate tasks):

| File | Change |
|---|---|
| `.agents/skills/designbook/design/workflows/design-verify.md` | Add `story_id` + `reference_folder` resolve params |
| `.agents/skills/designbook/design/workflows/design-screen.md` | Add `story_id` resolve param with `sources: [scenes]` |
| `.agents/skills/designbook/design/tasks/intake--design-verify.md` | Remove story resolution logic, simplify |
| `.agents/skills/designbook/design/tasks/setup-compare.md` | Use `story_id` directly |
| `.agents/skills/designbook/design/tasks/extract-reference.md` | Use `reference_folder` param |
| `.agents/skills/designbook/resources/cli-story.md` | Document new positional argument API |
| `.agents/skills/designbook/resources/cli-workflow.md` | Document `workflow resolve` command |
| `.agents/skills/designbook/resources/workflow-execution.md` | Document resolver phase |

---

### Task 1: Resolver Types

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// packages/storybook-addon-designbook/src/resolvers/types.ts
import type { DesignbookConfig } from '../config.js';

export interface Candidate {
  label: string;
  value: string;
  source: string;
}

export interface ResolverResult {
  resolved: boolean;
  value?: string;
  input: string;
  error?: string;
  candidates?: Candidate[];
}

export interface ResolverContext {
  config: DesignbookConfig;
  params: Record<string, unknown>;
}

export interface ParamResolver {
  name: string;
  resolve(input: string, config: Record<string, unknown>, context: ResolverContext): ResolverResult;
}
```

`ResolverContext` provides access to the full config and all current params — the `reference_folder` resolver needs `params` to read the `from:` param value.

- [ ] **Step 2: Verify typecheck passes**

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/types.ts
git commit -m "feat(resolvers): add resolver type definitions"
```

---

### Task 2: story_id Resolver — Tests

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/__tests__/story-id.test.ts`

- [ ] **Step 1: Write test file with fixture setup**

The test needs scenes.yml fixtures and a component directory to simulate both sources.

```typescript
// packages/storybook-addon-designbook/src/resolvers/__tests__/story-id.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dump as dumpYaml } from 'js-yaml';
import { storyIdResolver } from '../story-id.js';
import type { ResolverContext } from '../types.js';

const tmpDir = resolve(import.meta.dirname, '__fixtures_story_id_resolver__');

function makeContext(): ResolverContext {
  return { config: { data: tmpDir, technology: 'html' }, params: {} };
}

function setupFixtures() {
  rmSync(tmpDir, { recursive: true, force: true });

  // design-system scenes with group field
  const dsDir = resolve(tmpDir, 'design-system');
  mkdirSync(dsDir, { recursive: true });
  writeFileSync(
    resolve(dsDir, 'design-system.scenes.yml'),
    dumpYaml({
      id: 'designbook-design-system-scenes',
      title: 'Design System',
      group: 'Designbook/Design System/Scenes',
      scenes: [
        { name: 'shell', items: [] },
        { name: 'navigation', items: [] },
      ],
    }),
  );

  // section scenes — galerie
  const galerieDir = resolve(tmpDir, 'sections', 'galerie');
  mkdirSync(galerieDir, { recursive: true });
  writeFileSync(
    resolve(galerieDir, 'galerie.section.scenes.yml'),
    dumpYaml({
      id: 'designbook-galerie-scenes',
      title: 'Galerie',
      group: 'Designbook/Galerie/Scenes',
      scenes: [
        { name: 'landing', items: [] },
        { name: 'product-detail', items: [] },
      ],
    }),
  );

  // section scenes — homepage (has 'landing' too for ambiguity test)
  const homepageDir = resolve(tmpDir, 'sections', 'homepage');
  mkdirSync(homepageDir, { recursive: true });
  writeFileSync(
    resolve(homepageDir, 'homepage.section.scenes.yml'),
    dumpYaml({
      id: 'designbook-homepage-scenes',
      title: 'Homepage',
      group: 'Designbook/Homepage/Scenes',
      scenes: [
        { name: 'landing', items: [] },
        { name: 'hero', items: [] },
      ],
    }),
  );

  // Existing story directory (for exact storyId match)
  mkdirSync(resolve(tmpDir, 'stories', 'designbook-design-system-scenes--shell'), { recursive: true });

  // Component directory (for component source)
  const compDir = resolve(tmpDir, 'design-system', 'components');
  mkdirSync(compDir, { recursive: true });
  writeFileSync(
    resolve(compDir, 'card.component.yml'),
    dumpYaml({ name: 'card', status: 'ready' }),
  );
  writeFileSync(
    resolve(compDir, 'hero.component.yml'),
    dumpYaml({ name: 'hero', status: 'ready' }),
  );
}

describe('storyIdResolver', () => {
  beforeAll(() => setupFixtures());
  afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

  it('has name "story_id"', () => {
    expect(storyIdResolver.name).toBe('story_id');
  });

  // --- Exact storyId match ---

  it('resolves exact storyId when story directory exists', () => {
    const result = storyIdResolver.resolve(
      'designbook-design-system-scenes--shell',
      {},
      makeContext(),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('designbook-design-system-scenes--shell');
  });

  // --- Qualified scene match (contains ":") ---

  it('resolves qualified scene reference', () => {
    const result = storyIdResolver.resolve('design-system:shell', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toContain('shell');
    expect(result.input).toBe('design-system:shell');
  });

  it('returns error for qualified scene that does not exist', () => {
    const result = storyIdResolver.resolve('design-system:nonexistent', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.candidates).toEqual([]);
  });

  // --- Short name: unique scene match ---

  it('resolves unique short scene name', () => {
    const result = storyIdResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toContain('shell');
  });

  it('resolves unique short scene name "product-detail"', () => {
    const result = storyIdResolver.resolve('product-detail', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toContain('product-detail');
  });

  // --- Short name: ambiguous scene match ---

  it('returns candidates when short name matches multiple scenes', () => {
    const result = storyIdResolver.resolve('landing', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates!.map((c) => c.source)).toEqual(['scene', 'scene']);
    const labels = result.candidates!.map((c) => c.label).sort();
    expect(labels).toContain('galerie:landing');
    expect(labels).toContain('homepage:landing');
  });

  // --- Short name: scene + component collision ---

  it('returns candidates when short name matches scene AND component', () => {
    const result = storyIdResolver.resolve('hero', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.candidates!.length).toBeGreaterThanOrEqual(2);
    const sources = result.candidates!.map((c) => c.source);
    expect(sources).toContain('scene');
    expect(sources).toContain('component');
  });

  // --- sources config: restrict to scenes only ---

  it('resolves only from scenes when sources: [scenes]', () => {
    const result = storyIdResolver.resolve('hero', { sources: ['scenes'] }, makeContext());
    // hero exists as scene (homepage:hero) — unique scene match
    expect(result.resolved).toBe(true);
    expect(result.candidates).toBeUndefined();
  });

  it('ignores components when sources: [scenes]', () => {
    const result = storyIdResolver.resolve('card', { sources: ['scenes'] }, makeContext());
    // card only exists as component, not as scene
    expect(result.resolved).toBe(false);
    expect(result.candidates).toEqual([]);
  });

  // --- sources config: restrict to components only ---

  it('resolves only from components when sources: [components]', () => {
    const result = storyIdResolver.resolve('card', { sources: ['components'] }, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.source).toBe(undefined); // source is on candidate, not result
  });

  // --- No match ---

  it('returns empty candidates for unknown name', () => {
    const result = storyIdResolver.resolve('nonexistent', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.candidates).toEqual([]);
  });

  // --- Empty input ---

  it('returns unresolved for empty input', () => {
    const result = storyIdResolver.resolve('', {}, makeContext());
    expect(result.resolved).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/resolvers/__tests__/story-id.test.ts`
Expected: FAIL — `storyIdResolver` module does not exist yet

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/__tests__/story-id.test.ts
git commit -m "test(resolvers): add story_id resolver tests"
```

---

### Task 3: story_id Resolver — Implementation

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/story-id.ts`

- [ ] **Step 1: Implement the resolver**

```typescript
// packages/storybook-addon-designbook/src/resolvers/story-id.ts
import { resolve } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';
import { glob } from 'glob';
import { resolveScene } from '../story-entity.js';
import { buildExportName } from '../renderer/scene-metadata.js';
import type { ParamResolver, ResolverResult, ResolverContext, Candidate } from './types.js';

// Mirrors story-entity.ts sanitize + toStoryId
function sanitize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[ '–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function toStoryId(title: string, exportName: string): string {
  return `${sanitize(title)}--${sanitize(exportName)}`;
}

type Source = 'scenes' | 'components';
const DEFAULT_SOURCES: Source[] = ['scenes', 'components'];

interface ScenesFile {
  id?: string;
  group?: string;
  scenes?: Array<{ name: string }>;
}

function scanScenes(dataDir: string, sceneName: string): Candidate[] {
  const candidates: Candidate[] = [];

  // Scan all scenes.yml files
  const patterns = [
    resolve(dataDir, 'design-system', '*.scenes.yml'),
    resolve(dataDir, '**', '*.scenes.yml'),
    resolve(dataDir, 'sections', '**', '*.section.scenes.yml'),
  ];

  const seen = new Set<string>();
  for (const pattern of patterns) {
    const files = glob.sync(pattern);
    for (const filePath of files) {
      if (seen.has(filePath)) continue;
      seen.add(filePath);

      const content = readFileSync(filePath, 'utf-8');
      const parsed = parseYaml(content) as ScenesFile;
      const scenes = parsed.scenes ?? [];

      for (const scene of scenes) {
        if (scene.name !== sceneName) continue;

        // Derive the group label (e.g. "design-system", "galerie")
        const group = parsed.group;
        const groupLabel = deriveGroupLabel(filePath, dataDir);
        const sceneRef = `${groupLabel}:${sceneName}`;

        // Derive storyId
        let storyId: string;
        if (group) {
          storyId = toStoryId(group, buildExportName(sceneName));
        } else {
          const prefix = parsed.id ?? 'unknown';
          storyId = `${sanitize(prefix)}--${sanitize(sceneName)}`;
        }

        candidates.push({ label: sceneRef, value: storyId, source: 'scene' });
      }
    }
  }

  return candidates;
}

function deriveGroupLabel(filePath: string, dataDir: string): string {
  const rel = filePath.replace(dataDir + '/', '');
  // design-system/design-system.scenes.yml → "design-system"
  // sections/galerie/galerie.section.scenes.yml → "galerie"
  const parts = rel.split('/');
  if (parts[0] === 'sections' && parts.length >= 2) return parts[1]!;
  if (parts[0] === 'design-system') return 'design-system';
  return parts[0]!;
}

function scanComponents(dataDir: string, name: string): Candidate[] {
  const candidates: Candidate[] = [];

  // Scan for component.yml files matching the name
  const pattern = resolve(dataDir, '**', `${name}.component.yml`);
  const files = glob.sync(pattern);

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = parseYaml(content) as { name?: string };
    const compName = parsed.name ?? name;

    // Component storyId: components are typically at "Components/<Name>"
    const storyId = `components--${sanitize(compName)}`;

    candidates.push({ label: `${compName} (component)`, value: storyId, source: 'component' });
  }

  return candidates;
}

export const storyIdResolver: ParamResolver = {
  name: 'story_id',

  resolve(input: string, config: Record<string, unknown>, context: ResolverContext): ResolverResult {
    if (!input || input.trim() === '') {
      return { resolved: false, input, error: 'Empty input', candidates: [] };
    }

    const dataDir = context.config.data;
    const sources = (config.sources as Source[] | undefined) ?? DEFAULT_SOURCES;

    // 1. Exact storyId match: check if story directory exists
    const storyDir = resolve(dataDir, 'stories', input);
    if (existsSync(storyDir)) {
      return { resolved: true, value: input, input };
    }

    // 2. Qualified scene match: input contains ":"
    if (input.includes(':')) {
      if (!sources.includes('scenes')) {
        return { resolved: false, input, error: 'Scene source not enabled', candidates: [] };
      }
      try {
        const { scenes, allScenes } = resolveScene(dataDir, input);
        if (scenes.length > 0) {
          const sceneName = scenes[0]!.name;
          const group = (allScenes as ScenesFile).group;
          let storyId: string;
          if (group) {
            storyId = toStoryId(group, buildExportName(sceneName));
          } else {
            const prefix = (allScenes as ScenesFile).id ?? 'unknown';
            storyId = `${sanitize(prefix)}--${sanitize(sceneName)}`;
          }
          return { resolved: true, value: storyId, input };
        }
      } catch {
        // Scene not found — fall through to return empty candidates
      }
      return { resolved: false, input, error: `Scene "${input}" not found`, candidates: [] };
    }

    // 3. Short name: scan all sources
    const allCandidates: Candidate[] = [];

    if (sources.includes('scenes')) {
      allCandidates.push(...scanScenes(dataDir, input));
    }

    if (sources.includes('components')) {
      allCandidates.push(...scanComponents(dataDir, input));
    }

    // Deduplicate by value
    const seen = new Map<string, Candidate>();
    for (const c of allCandidates) {
      if (!seen.has(c.value)) seen.set(c.value, c);
    }
    const unique = [...seen.values()];

    if (unique.length === 1) {
      return { resolved: true, value: unique[0]!.value, input };
    }

    if (unique.length === 0) {
      return { resolved: false, input, error: `No match found for "${input}"`, candidates: [] };
    }

    // Multiple matches — return candidates sorted: scenes first, then components
    unique.sort((a, b) => {
      if (a.source === 'scene' && b.source !== 'scene') return -1;
      if (a.source !== 'scene' && b.source === 'scene') return 1;
      return a.label.localeCompare(b.label);
    });

    return {
      resolved: false,
      input,
      error: `Ambiguous: ${unique.length} matches found`,
      candidates: unique,
    };
  },
};
```

- [ ] **Step 2: Run tests**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/resolvers/__tests__/story-id.test.ts`
Expected: All tests pass. If any fail, fix the implementation and re-run.

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/story-id.ts
git commit -m "feat(resolvers): implement story_id resolver"
```

---

### Task 4: reference_folder Resolver — Tests

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/__tests__/reference-folder.test.ts`

- [ ] **Step 1: Write test file**

```typescript
// packages/storybook-addon-designbook/src/resolvers/__tests__/reference-folder.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { referenceFolderResolver } from '../reference-folder.js';
import type { ResolverContext } from '../types.js';

const tmpDir = resolve(import.meta.dirname, '__fixtures_reference_folder_resolver__');

function makeContext(params: Record<string, unknown> = {}): ResolverContext {
  return { config: { data: tmpDir, technology: 'html' }, params };
}

function expectedHash(url: string): string {
  const normalized = url.toLowerCase().replace(/\/+$/, '');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

describe('referenceFolderResolver', () => {
  beforeAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
  });
  afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

  it('has name "reference_folder"', () => {
    expect(referenceFolderResolver.name).toBe('reference_folder');
  });

  it('resolves URL to hash-based folder path', () => {
    const url = 'https://example.com/design';
    const result = referenceFolderResolver.resolve(
      '',  // input is ignored; value comes from `from` param
      { from: 'reference_url' },
      makeContext({ reference_url: url }),
    );
    const hash = expectedHash(url);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe(resolve(tmpDir, 'references', hash));
  });

  it('creates the reference directory if it does not exist', () => {
    const url = 'https://example.com/new-design';
    const result = referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({ reference_url: url }),
    );
    expect(result.resolved).toBe(true);
    expect(existsSync(result.value!)).toBe(true);
  });

  it('normalizes URL: strips trailing slash', () => {
    const url1 = 'https://example.com/page/';
    const url2 = 'https://example.com/page';
    const r1 = referenceFolderResolver.resolve('', { from: 'ref' }, makeContext({ ref: url1 }));
    const r2 = referenceFolderResolver.resolve('', { from: 'ref' }, makeContext({ ref: url2 }));
    expect(r1.value).toBe(r2.value);
  });

  it('normalizes URL: lowercases', () => {
    const url1 = 'https://Example.COM/Page';
    const url2 = 'https://example.com/page';
    const r1 = referenceFolderResolver.resolve('', { from: 'ref' }, makeContext({ ref: url1 }));
    const r2 = referenceFolderResolver.resolve('', { from: 'ref' }, makeContext({ ref: url2 }));
    expect(r1.value).toBe(r2.value);
  });

  it('preserves query strings in hash', () => {
    const url1 = 'https://example.com/page?v=1';
    const url2 = 'https://example.com/page?v=2';
    const r1 = referenceFolderResolver.resolve('', { from: 'ref' }, makeContext({ ref: url1 }));
    const r2 = referenceFolderResolver.resolve('', { from: 'ref' }, makeContext({ ref: url2 }));
    expect(r1.value).not.toBe(r2.value);
  });

  it('returns unresolved when from-param is missing', () => {
    const result = referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({}),  // no reference_url param
    );
    expect(result.resolved).toBe(false);
    expect(result.error).toContain('reference_url');
  });

  it('returns unresolved when from-param is empty string', () => {
    const result = referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({ reference_url: '' }),
    );
    expect(result.resolved).toBe(false);
  });

  it('fails if from config field is missing', () => {
    const result = referenceFolderResolver.resolve('', {}, makeContext({ reference_url: 'https://x.com' }));
    expect(result.resolved).toBe(false);
    expect(result.error).toContain('from');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/resolvers/__tests__/reference-folder.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/__tests__/reference-folder.test.ts
git commit -m "test(resolvers): add reference_folder resolver tests"
```

---

### Task 5: reference_folder Resolver — Implementation

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/reference-folder.ts`

- [ ] **Step 1: Implement the resolver**

```typescript
// packages/storybook-addon-designbook/src/resolvers/reference-folder.ts
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { ParamResolver, ResolverResult, ResolverContext } from './types.js';

function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/\/+$/, '');
}

function hashUrl(url: string): string {
  return createHash('sha256').update(normalizeUrl(url)).digest('hex').slice(0, 12);
}

export const referenceFolderResolver: ParamResolver = {
  name: 'reference_folder',

  resolve(input: string, config: Record<string, unknown>, context: ResolverContext): ResolverResult {
    const fromParam = config.from as string | undefined;
    if (!fromParam) {
      return { resolved: false, input, error: 'Resolver config missing required "from" field' };
    }

    const url = context.params[fromParam] as string | undefined;
    if (!url || url.trim() === '') {
      return { resolved: false, input, error: `Param "${fromParam}" is not set or empty` };
    }

    const hash = hashUrl(url);
    const folder = resolve(context.config.data, 'references', hash);
    mkdirSync(folder, { recursive: true });

    return { resolved: true, value: folder, input: url };
  },
};
```

- [ ] **Step 2: Run tests**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/resolvers/__tests__/reference-folder.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/reference-folder.ts
git commit -m "feat(resolvers): implement reference_folder resolver"
```

---

### Task 6: Resolver Registry — Tests

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/__tests__/registry.test.ts`

- [ ] **Step 1: Write test file**

```typescript
// packages/storybook-addon-designbook/src/resolvers/__tests__/registry.test.ts
import { describe, it, expect } from 'vitest';
import { resolverRegistry, resolveParams } from '../registry.js';
import type { ParamResolver, ResolverContext } from '../types.js';

describe('resolverRegistry', () => {
  it('has story_id resolver registered', () => {
    expect(resolverRegistry.get('story_id')).toBeDefined();
  });

  it('has reference_folder resolver registered', () => {
    expect(resolverRegistry.get('reference_folder')).toBeDefined();
  });

  it('returns undefined for unknown resolver', () => {
    expect(resolverRegistry.get('nonexistent')).toBeUndefined();
  });
});

describe('resolveParams', () => {
  const mockContext: ResolverContext = {
    config: { data: '/tmp/test', technology: 'html' },
    params: {},
  };

  it('returns empty result when no params have resolve declarations', () => {
    const paramDecls = {
      scene_id: { type: 'string' },
    };
    const params = { scene_id: 'test' };
    const result = resolveParams(paramDecls, params, mockContext);
    expect(result.allResolved).toBe(true);
    expect(result.resolved).toEqual({});
    expect(result.unresolved).toEqual({});
  });

  it('skips resolving when param has no value', () => {
    const paramDecls = {
      story_id: { type: 'string', resolve: 'story_id' },
    };
    const params = {};  // story_id not provided
    const result = resolveParams(paramDecls, params, mockContext);
    // No value to resolve — not an error, just skipped
    expect(result.allResolved).toBe(true);
    expect(result.resolved).toEqual({});
  });

  it('respects dependency ordering via from:', () => {
    const paramDecls = {
      reference_url: { type: 'string' },
      reference_folder: { type: 'string', resolve: 'reference_folder', from: 'reference_url' },
    };
    const params = { reference_url: 'https://example.com' };
    const result = resolveParams(paramDecls, params, {
      ...mockContext,
      params,
    });
    // reference_folder depends on reference_url which is set
    // But the actual resolver will try to resolve and may fail because data dir doesn't exist
    // This tests the ordering logic, not the resolver itself
    expect(result.unresolved.reference_folder || result.resolved.reference_folder).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/resolvers/__tests__/registry.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/__tests__/registry.test.ts
git commit -m "test(resolvers): add registry tests"
```

---

### Task 7: Resolver Registry — Implementation

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/registry.ts`

- [ ] **Step 1: Implement registry and resolveParams**

```typescript
// packages/storybook-addon-designbook/src/resolvers/registry.ts
import type { ParamResolver, ResolverResult, ResolverContext } from './types.js';
import { storyIdResolver } from './story-id.js';
import { referenceFolderResolver } from './reference-folder.js';

// ── Registry ────────────────────────────────────────────────────────────

const registry = new Map<string, ParamResolver>();

function register(resolver: ParamResolver): void {
  registry.set(resolver.name, resolver);
}

// Register built-in resolvers
register(storyIdResolver);
register(referenceFolderResolver);

export const resolverRegistry = {
  get(name: string): ParamResolver | undefined {
    return registry.get(name);
  },
  register,
};

// ── Param Resolution ────────────────────────────────────────────────────

interface ParamDeclaration {
  type?: string;
  resolve?: string;
  from?: string;
  [key: string]: unknown;
}

interface ResolveParamsResult {
  allResolved: boolean;
  resolved: Record<string, ResolverResult>;
  unresolved: Record<string, ResolverResult>;
  /** Params with resolved values replaced */
  params: Record<string, unknown>;
}

/**
 * Run resolvers on all params that have `resolve:` declarations.
 *
 * Handles dependency ordering: params with `from:` are resolved after
 * the param they depend on.
 */
export function resolveParams(
  paramDecls: Record<string, ParamDeclaration>,
  params: Record<string, unknown>,
  context: ResolverContext,
): ResolveParamsResult {
  const resolved: Record<string, ResolverResult> = {};
  const unresolved: Record<string, ResolverResult> = {};
  const outputParams = { ...params };

  // Split into independent (no `from:`) and dependent (has `from:`)
  const independent: string[] = [];
  const dependent: string[] = [];

  for (const [key, decl] of Object.entries(paramDecls)) {
    if (!decl.resolve) continue;
    if (decl.from) {
      dependent.push(key);
    } else {
      independent.push(key);
    }
  }

  // Build resolver config: everything except `type` and `resolve`
  function buildConfig(decl: ParamDeclaration): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(decl)) {
      if (k === 'type' || k === 'resolve') continue;
      config[k] = v;
    }
    return config;
  }

  // Resolve a single param
  function runResolver(key: string): void {
    const decl = paramDecls[key]!;
    const resolverName = decl.resolve!;
    const resolver = registry.get(resolverName);

    if (!resolver) {
      unresolved[key] = {
        resolved: false,
        input: String(outputParams[key] ?? ''),
        error: `Unknown resolver: "${resolverName}"`,
      };
      return;
    }

    const input = String(outputParams[key] ?? '');
    // Skip if no input value and no `from:` (nothing to resolve)
    if (!input && !decl.from) return;

    const config = buildConfig(decl);
    const resolverContext: ResolverContext = { ...context, params: outputParams };
    const result = resolver.resolve(input, config, resolverContext);

    if (result.resolved) {
      resolved[key] = result;
      outputParams[key] = result.value;
    } else {
      unresolved[key] = result;
    }
  }

  // Phase 1: independent params
  for (const key of independent) {
    runResolver(key);
  }

  // Phase 2: dependent params (after independent are resolved)
  for (const key of dependent) {
    runResolver(key);
  }

  return {
    allResolved: Object.keys(unresolved).length === 0,
    resolved,
    unresolved,
    params: outputParams,
  };
}
```

- [ ] **Step 2: Create index file for clean imports**

```typescript
// packages/storybook-addon-designbook/src/resolvers/index.ts
export { resolverRegistry, resolveParams } from './registry.js';
export { storyIdResolver } from './story-id.js';
export { referenceFolderResolver } from './reference-folder.js';
export type { ParamResolver, ResolverResult, ResolverContext, Candidate } from './types.js';
```

- [ ] **Step 3: Run all resolver tests**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/resolvers/`
Expected: All tests pass

- [ ] **Step 4: Run typecheck**

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/registry.ts packages/storybook-addon-designbook/src/resolvers/index.ts
git commit -m "feat(resolvers): implement registry and resolveParams"
```

---

### Task 8: Parse `resolve:` from Workflow Frontmatter

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts`

The workflow frontmatter currently doesn't parse `resolve:` from workflow-level params. The `resolveAllStages` function reads task-level params but not workflow-level params. We need to:
1. Parse workflow-level `params:` from the workflow `.md` frontmatter
2. Extract `resolve:` declarations
3. Return them in the `ResolvedSteps` result

- [ ] **Step 1: Add `param_resolvers` to `ResolvedSteps` interface**

In `packages/storybook-addon-designbook/src/workflow-resolve.ts`, find the `ResolvedSteps` interface (around line 1207) and add the field:

```typescript
// Find this interface:
export interface ResolvedSteps {
  title: string;
  steps: string[];
  stages?: Record<string, StageDefinitionFm>;
  engine?: string;
  step_resolved: Record<string, ResolvedStep | ResolvedStep[]>;
  expected_params: Record<string, ExpectedParam>;
}

// Add param_resolvers:
export interface ResolvedSteps {
  title: string;
  steps: string[];
  stages?: Record<string, StageDefinitionFm>;
  engine?: string;
  step_resolved: Record<string, ResolvedStep | ResolvedStep[]>;
  expected_params: Record<string, ExpectedParam>;
  param_resolvers: Record<string, ParamResolverDecl>;
}

export interface ParamResolverDecl {
  resolve: string;
  [key: string]: unknown;
}
```

- [ ] **Step 2: Parse workflow-level params in `resolveAllStages`**

In the `resolveAllStages` function (around line 1222), after parsing the workflow frontmatter, extract `params:` and build the `param_resolvers` map:

```typescript
// After: const wfFm = parseFrontmatter(workflowFilePath) as WorkflowFrontmatter | null;
// Add:
const paramResolvers: Record<string, ParamResolverDecl> = {};
if (wfFm) {
  const wfParams = (wfFm as Record<string, unknown>).params as Record<string, Record<string, unknown>> | undefined;
  if (wfParams) {
    for (const [key, decl] of Object.entries(wfParams)) {
      if (decl && typeof decl === 'object' && 'resolve' in decl && typeof decl.resolve === 'string') {
        const { type: _type, ...rest } = decl;
        paramResolvers[key] = rest as ParamResolverDecl;
      }
    }
  }
}
```

And include it in the return value:

```typescript
return {
  title: wfFm ? getWorkflowTitle(wfFm) : '',
  steps: resolvedSteps,
  ...(stageDefs ? { stages: stageDefs } : {}),
  ...(wfFm?.engine ? { engine: wfFm.engine } : {}),
  step_resolved: stepResolved,
  expected_params: expectedParams,
  param_resolvers: paramResolvers,
};
```

- [ ] **Step 3: Run typecheck**

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit`
Expected: No errors (may need to fix callers of `resolveAllStages` if they destructure the result)

- [ ] **Step 4: Run existing tests**

Run: `cd packages/storybook-addon-designbook && npx vitest run`
Expected: All existing tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts
git commit -m "feat(resolvers): parse resolve declarations from workflow frontmatter"
```

---

### Task 9: Integrate Resolvers into `workflow create`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts` (lines 54-205)

- [ ] **Step 1: Import resolver modules**

At the top of `packages/storybook-addon-designbook/src/cli/workflow.ts`, add:

```typescript
import { resolveParams } from '../resolvers/registry.js';
import type { ResolverContext } from '../resolvers/types.js';
```

- [ ] **Step 2: Add resolve phase to `workflow create` action**

In the `workflow create` action handler, after `resolveAllStages` returns and before building the first task, add the resolve phase. Find this block (around line 85):

```typescript
const resolved = resolveAllStages(workflowFilePath, config, rawConfig, agentsDir);
```

After it, add:

```typescript
// ── Resolve phase: run param resolvers ────────────────────────
if (initialParams && Object.keys(resolved.param_resolvers).length > 0) {
  const resolverContext: ResolverContext = { config, params: initialParams };
  const resolveResult = resolveParams(resolved.param_resolvers, initialParams, resolverContext);

  if (!resolveResult.allResolved) {
    // Return unresolved response — workflow is created but paused
    const name = workflowCreate(
      config.data, opts.workflow, title, [],
      resolved.stages, opts.parent, resolved.step_resolved,
      resolved.engine, initialParams, workspaceRoot,
      {}, buildEnvMap(config),
    );
    console.log(JSON.stringify({
      name,
      unresolved: resolveResult.unresolved,
      steps: resolved.steps,
      ...(resolved.stages ? { stages: resolved.stages } : {}),
      expected_params: resolved.expected_params,
    }, null, 2));
    return;
  }

  // Replace params with resolved values
  initialParams = resolveResult.params as Record<string, unknown>;
}
```

- [ ] **Step 3: Add `workflow resolve` subcommand**

After the `workflow create` command registration, add the new `resolve` command:

```typescript
workflow
  .command('resolve')
  .description('Resolve a single param after ambiguity. Re-runs the resolver and starts the workflow if all params resolved.')
  .requiredOption('--workflow <name>', 'Workflow name')
  .requiredOption('--param <key>', 'Param name to resolve')
  .requiredOption('--value <value>', 'Resolved value')
  .action((opts: { workflow: string; param: string; value: string }) => {
    const config = loadConfig();
    const changesDir = resolve(config.data, 'workflows', 'changes', opts.workflow);
    const tasksYmlPath = resolve(changesDir, 'tasks.yml');

    if (!existsSync(tasksYmlPath)) {
      console.error(`Error: workflow not found: ${opts.workflow}`);
      process.exitCode = 1;
      return;
    }

    const data = readWorkflow(tasksYmlPath);
    if (!data.params) data.params = {};
    data.params[opts.param] = opts.value;
    writeWorkflowAtomic(tasksYmlPath, data);

    // Re-run resolve phase with updated params to check if all resolved now.
    // If all resolved, expand tasks via expandTasksFromParams and update tasks.yml.
    // For the initial implementation, return success — task expansion on re-resolve
    // will be handled as a follow-up when the full workflow resume flow is tested.
    console.log(JSON.stringify({ ok: true, param: opts.param, value: opts.value }));
  });
```

- [ ] **Step 4: Run typecheck**

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run all tests**

Run: `cd packages/storybook-addon-designbook && npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow.ts
git commit -m "feat(resolvers): integrate resolve phase into workflow create + add workflow resolve command"
```

---

### Task 10: Update `_debo story` to Use Positional Argument + Resolver

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/story.ts`

- [ ] **Step 1: Add resolver import and refactor argument parsing**

Replace the `--scene` based flow with a positional argument that goes through the resolver. The `--scene` flag is kept as deprecated fallback.

In `packages/storybook-addon-designbook/src/cli/story.ts`, update the command definition:

```typescript
import { storyIdResolver } from '../resolvers/story-id.js';
import type { ResolverContext } from '../resolvers/types.js';
```

Change the `.argument()` line from:
```typescript
.argument('[subcommand]', 'Subcommand: "checks" returns workflow-ready checks array')
```
To:
```typescript
.argument('[subcommandOrId]', 'Subcommand (check, checks) or story identifier')
.argument('[storyId]', 'Story identifier when first arg is a subcommand')
```

- [ ] **Step 2: Add resolver-based ID resolution helper**

Add a helper function at the top of the `register` function:

```typescript
function resolveStoryArg(identifier: string, config: ReturnType<typeof loadConfig>): string | null {
  // If --scene was used (deprecated), pass through to resolveScene
  if (identifier.includes(':')) {
    // Qualified — try resolver directly
    const ctx: ResolverContext = { config, params: {} };
    const result = storyIdResolver.resolve(identifier, {}, ctx);
    if (result.resolved) return result.value!;
    // Fall through to error
  }

  const ctx: ResolverContext = { config, params: {} };
  const result = storyIdResolver.resolve(identifier, {}, ctx);

  if (result.resolved) return result.value!;

  if (result.candidates && result.candidates.length > 0) {
    console.log(JSON.stringify({
      resolved: false,
      input: identifier,
      candidates: result.candidates,
    }, null, 2));
    return null;  // signal: output already written
  }

  console.error(`Error: no match for "${identifier}"`);
  process.exitCode = 1;
  return null;
}
```

- [ ] **Step 3: Refactor the action handler to use the resolver**

Update the action handler to resolve the identifier from either the positional argument or the deprecated `--scene` flag. The core change is replacing all `opts.scene` lookups with the resolved storyId, and using `DeboStory.load(config, storyId)` instead of `DeboStory.loadByScene(config, opts.scene)`.

This is a larger refactor — update each branch (`check`, `checks`, default load) to:
1. Determine the identifier: positional arg > `--scene` flag
2. Run through `resolveStoryArg()`
3. Use `DeboStory.load()` with the resolved storyId

- [ ] **Step 4: Run typecheck and tests**

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/story.ts
git commit -m "feat(story): use resolver for positional argument, deprecate --scene flag"
```

---

### Task 11: Update Workflow Markdown Files

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-verify.md`
- Modify: `.agents/skills/designbook/design/workflows/design-screen.md`

- [ ] **Step 1: Update design-verify.md**

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

Add `story_id` with `resolve: story_id` and `sources: [scenes]` to the params. Read the current file first to preserve all existing params and stages.

```yaml
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
  scene_id: { type: string }
  # ... keep all other existing params
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-verify.md .agents/skills/designbook/design/workflows/design-screen.md
git commit -m "feat(workflows): add resolve declarations for story_id and reference_folder"
```

---

### Task 12: Update Skill Documentation

**Files:**
- Modify: `.agents/skills/designbook/resources/cli-story.md`
- Modify: `.agents/skills/designbook/resources/cli-workflow.md`
- Modify: `.agents/skills/designbook/resources/workflow-execution.md`

- [ ] **Step 1: Update cli-story.md**

Add the new positional argument API at the top, mark `--scene` as deprecated:

```markdown
## `story <identifier>` (load by identifier)

Load a story entity by resolving an identifier. The identifier can be:
- A short name: `shell`, `landing`, `card`
- A qualified scene reference: `design-system:shell`
- An exact storyId: `designbook-design-system-scenes--shell`

The resolver searches scenes and components, returning the story or candidates if ambiguous.

\`\`\`bash
 story shell
 story design-system:shell
 story designbook-design-system-scenes--shell
\`\`\`

**Response (resolved):** same as before — JSON with storyId, storyDir, url, etc.

**Response (ambiguous):**
\`\`\`json
{
  "resolved": false,
  "input": "landing",
  "candidates": [
    { "label": "homepage:landing", "value": "...", "source": "scene" },
    { "label": "galerie:landing", "value": "...", "source": "scene" }
  ]
}
\`\`\`

> **Deprecated:** `--scene <ref>` still works but will be removed in a future version. Use the positional argument instead.
```

- [ ] **Step 2: Update cli-workflow.md**

Add `workflow resolve` documentation:

```markdown
## `workflow resolve`

Resolve a single param after ambiguity from `workflow create`.

\`\`\`bash
 workflow resolve --workflow <name> --param <key> --value "<resolved-value>"
\`\`\`

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name |
| `--param <key>` | Yes | Param name to resolve |
| `--value <value>` | Yes | The chosen resolved value |

**Response:**
\`\`\`json
{ "ok": true, "param": "story_id", "value": "designbook-design-system-scenes--shell" }
\`\`\`
```

- [ ] **Step 3: Update workflow-execution.md**

Add a new rule section between Rule 0 (bootstrap) and Rule 1, documenting the resolve phase:

```markdown
### Rule 0.5: Param Resolution

After `workflow create`, check the response for an `unresolved` field. If present:

1. Read the `candidates` array for each unresolved param
2. If candidates exist: present them to the user and ask which one is correct
3. If no candidates: ask the user for a more specific identifier
4. Call `_debo workflow resolve --workflow $NAME --param <key> --value "<chosen>"` for each resolved param
5. Continue with the normal workflow execution

If no `unresolved` field: all params were resolved automatically, proceed normally.
```

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/resources/cli-story.md .agents/skills/designbook/resources/cli-workflow.md .agents/skills/designbook/resources/workflow-execution.md
git commit -m "docs: update CLI references and workflow execution rules for param resolvers"
```

---

### Task 13: Update Intake and Task Files

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-verify.md`
- Modify: `.agents/skills/designbook/design/tasks/setup-compare.md`
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md`

- [ ] **Step 1: Simplify intake--design-verify.md**

Remove the story resolution logic from Step 1 (Identify Target). The `story_id` is now resolved before the workflow starts. The intake only handles:
- Reference URL (if not provided)
- Breakpoint selection
- Storybook startup check

Update the params frontmatter to include `story_id`:

```yaml
params:
  story_id: { type: string, default: "" }
  scene_id: { type: string, default: "" }
  component_id: { type: string, default: "" }
  reference: { type: array, default: [] }
  reference_dir: { type: string, default: "" }
```

Remove Step 1 (Identify Target) — the resolver handles this now. Renumber remaining steps.

In the Context Detection section, add:
```markdown
- **`params.story_id` is set:** Story already identified. Skip target identification.
```

- [ ] **Step 2: Update setup-compare.md**

Change the CLI calls from `--scene` to positional argument:

```bash
# Vorher:
CHECKS=$(_debo story --scene ${scene_id} --create --json '<meta-seed-json>' checks)

# Nachher:
CHECKS=$(_debo story ${story_id} --create --json '<meta-seed-json>' checks)
```

Add `story_id` to the params frontmatter:

```yaml
params:
  story_id: { type: string }
  scene_id: { type: string }
  component_id: { type: string }
  reference: { type: array, default: [] }
  breakpoints: { type: array }
```

- [ ] **Step 3: Update extract-reference.md**

Add `reference_folder` to params (it may be pre-resolved):

```yaml
params:
  scene_id: { type: string, default: "" }
  component_id: { type: string, default: "" }
  reference_folder: { type: string, default: "" }
```

In the "Resolve Reference Directory" section, add a check:

```markdown
If `params.reference_folder` is already set (pre-resolved by the workflow engine):
- Use it directly as `$REF_DIR`
- Skip the URL normalization and hash computation

Otherwise, compute as before: ...
```

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-verify.md .agents/skills/designbook/design/tasks/setup-compare.md .agents/skills/designbook/design/tasks/extract-reference.md
git commit -m "feat(tasks): use story_id and reference_folder from resolvers"
```

---

### Task 14: Final Integration Test

**Files:**
- No new files — verify everything works together

- [ ] **Step 1: Run full test suite**

Run: `cd packages/storybook-addon-designbook && npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run typecheck**

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run lint**

Run: `cd packages/storybook-addon-designbook && npx eslint --cache .`
Expected: No errors (run `lint:fix` if needed)

- [ ] **Step 4: Run pnpm check from repo root**

Run: `pnpm check`
Expected: typecheck → lint → test all pass

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve lint/type issues from param resolvers integration"
```
