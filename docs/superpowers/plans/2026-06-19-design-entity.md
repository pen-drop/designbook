# design-entity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/debo design-entity` workflow that builds one entity view-mode per run (JSONata mapping + co-located demo data) and renders it standalone in Storybook with a record-switch control and a mapping-docs tab.

**Architecture:** Two halves. (A) Addon: a new `entity-mapping/<type>.<bundle>.demo.yml` file becomes a story source — an indexer emits one story per sibling `.jsonata` view-mode under `Entities/<type>/<bundle>`, and a vite loader transforms the demo file into a CSF module that pre-resolves every demo record through the mapping (record exposed as a Controls `select`, mapping source + field table shown in the autodocs Docs tab). (B) Skill: a `design-entity` workflow with a trimmed intake, reused `create-component` + `map-entity`, and a new per-bundle `create-entity-demo` task.

**Tech Stack:** TypeScript, Vite plugin + Storybook experimental_indexers, jsonata, js-yaml, vitest. Skill side: designbook markdown task/rule/workflow files validated by `designbook-skill-creator` + the `_debo` workflow validator.

## Global Constraints

- **No backwards-compat / migration code.** Existing on-disk artifacts are disposable; testing is from scratch (CLAUDE.md).
- **`pnpm check` must pass** before each commit — runs typecheck → lint → test (fail-fast).
- **Skill files:** before creating/editing ANY file under `.agents/skills/designbook/**` (`design-entity.md`, `intake--design-entity.md`, `create-entity-demo.md`, `map-entity.md`, `SKILL.md` workflow content), the implementer MUST first load the `designbook-skill-creator` skill and the matching per-file-type rule (`rules/task-files.md`, `rules/workflow-files.md`, `rules/common-rules.md`). Editing `.claude/skills/` directly is forbidden — it is a symlink to `.agents/skills/`.
- **Tasks say WHAT, never HOW; rules are hard constraints; blueprints are overridable** (4-level skill model).
- **Demo data granularity:** one `entity-mapping/<type>.<bundle>.demo.yml` per bundle, shared across all view-modes. ~3 records.
- **Naming:** mapping files `entity-mapping/<type>.<bundle>.<view_mode>.jsonata`; demo files `entity-mapping/<type>.<bundle>.demo.yml`; story title `Entities/<type>/<Bundle>` (bundle title-cased, `_`/`-` → space), story name = `view_mode`.
- Addon source root: `packages/storybook-addon-designbook/src/`. Run addon tests with `pnpm --filter storybook-addon-designbook test`.

---

## Architecture decision: entity-builder is NOT changed

The spec listed a possible `entity-builder.ts` change. It is unnecessary: `entity-builder` already reads the record from `ctx.sampleData.content[type][bundle][record]`. The new `entity-module-builder` parses the co-located `demo.yml` and injects it **as `sampleData`** into the render context, so `entity-builder` resolves records from the demo file unchanged. Do not modify `entity-builder.ts`.

---

## Part A — Addon

### Task 1: Extract a reusable render context from scene-module-builder

Both the scene loader and the new entity loader need the same registry + context wiring (builders, data model, sample data). Extract it so we stay DRY.

**Files:**
- Modify: `packages/storybook-addon-designbook/src/renderer/scene-module-builder.ts`
- Test: `packages/storybook-addon-designbook/src/renderer/__tests__/scene-builder.test.ts` (existing — must stay green)

**Interfaces:**
- Produces: `export function buildRenderContext(args: { dataModel: DataModel; sampleData: SampleData; designbookDir: string; config: DesignbookConfig | undefined; builders?: SceneNodeBuilder[] }): BuildContext` — registers `componentBuilder, entityBuilder, sceneBuilder, imageStyleBuilder` (built-ins first), then any custom `builders`, and returns `registry.createContext({...})`.

- [ ] **Step 1: Run the existing scene-builder tests to confirm green baseline**

Run: `pnpm --filter storybook-addon-designbook test -- scene-builder`
Expected: PASS (baseline before refactor).

- [ ] **Step 2: Add the `buildRenderContext` export**

In `scene-module-builder.ts`, add (near the other helpers, after imports):

```ts
import type { DataModel, SampleData } from './types';
import type { DesignbookConfig } from '../config';

export function buildRenderContext(args: {
  dataModel: DataModel;
  sampleData: SampleData;
  designbookDir: string;
  config: DesignbookConfig | undefined;
  builders?: SceneNodeBuilder[];
}): BuildContext {
  const registry = new BuilderRegistry();
  registry.register(componentBuilder);
  registry.register(entityBuilder);
  registry.register(sceneBuilder);
  registry.register(imageStyleBuilder);
  for (const builder of args.builders ?? []) {
    registry.register(builder);
  }
  return registry.createContext({
    dataModel: args.dataModel,
    sampleData: args.sampleData,
    designbookDir: args.designbookDir,
    config: args.config,
  });
}
```

(Reuse whatever `BuildContext` / `BuilderRegistry` / builder imports already exist at the top of the file — do not duplicate imports.)

- [ ] **Step 3: Replace the inline registry block in `buildSceneModule` with the helper**

Replace the block currently at `scene-module-builder.ts:156-168` (the `new BuilderRegistry()` … `registry.createContext({...})` lines) with:

```ts
  const ctx = buildRenderContext({ dataModel, sampleData, designbookDir, config, builders: options.builders });
```

- [ ] **Step 4: Run the scene-builder tests to confirm no regression**

Run: `pnpm --filter storybook-addon-designbook test -- scene-builder`
Expected: PASS (identical behavior, refactor only).

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/scene-module-builder.ts
git commit -m "refactor(addon): extract buildRenderContext from scene-module-builder"
```

---

### Task 2: `buildEntityCsfModule` — entity CSF with record select + docs

Generates the CSF module string for one demo file: one story per view-mode, each carrying every record's pre-resolved nodes, a `record` Controls select, and a Docs description (JSONata source + field-mapping table).

**Files:**
- Modify: `packages/storybook-addon-designbook/src/renderer/csf-prep.ts`
- Test: `packages/storybook-addon-designbook/src/renderer/__tests__/entity-csf-prep.test.ts` (create)

**Interfaces:**
- Consumes: `collectComponentIds`, `toAlias`, `builtInComponents` (already in `csf-prep.ts`); `FieldMapping` from `./types`.
- Produces:
```ts
export interface EntityCsfViewMode {
  view_mode: string;                 // 'full'
  exportName: string;                // buildExportName('full')
  recordsNodes: ComponentNode[][];   // resolved nodes, one entry per demo record
  source: string;                    // raw .jsonata text
  fieldMappings: FieldMapping[];
}
export interface EntityCsfOptions {
  group: string;                     // 'Entities/node/Article'
  source: string;                    // 'node.article.demo.yml'
  mappingBasename: (vm: string) => string; // e.g. vm => `node.article.${vm}.jsonata`
  viewModes: EntityCsfViewMode[];
  resolveImportPath: (componentId: string) => string | null;
  wrapImport?: (alias: string) => string;
}
export function buildEntityCsfModule(opts: EntityCsfOptions): string
```

- [ ] **Step 1: Write the failing test**

Create `packages/storybook-addon-designbook/src/renderer/__tests__/entity-csf-prep.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildEntityCsfModule } from '../csf-prep';
import type { ComponentNode } from '../types';

const card = (title: string): ComponentNode => ({ component: 'ui:card', props: { title } });

describe('buildEntityCsfModule', () => {
  const opts = {
    group: 'Entities/node/Article',
    source: 'node.article.demo.yml',
    mappingBasename: (vm: string) => `node.article.${vm}.jsonata`,
    viewModes: [
      {
        view_mode: 'full',
        exportName: 'Full',
        recordsNodes: [[card('A')], [card('B')], [card('C')]],
        source: '$.{ "component": "ui:card", "props": { "title": title } }',
        fieldMappings: [{ field: 'title', component: 'ui:card', target: 'title', type: 'prop' as const }],
      },
    ],
    resolveImportPath: (id: string) => (id === 'ui:card' ? './card.js' : null),
  };

  it('emits a default export titled by group with autodocs', () => {
    const code = buildEntityCsfModule(opts);
    expect(code).toContain("title: 'Entities/node/Article'");
    expect(code).toContain("tags: ['autodocs']");
  });

  it('emits one story per view-mode with a record select over all records', () => {
    const code = buildEntityCsfModule(opts);
    expect(code).toContain('export const Full = {');
    expect(code).toContain('options: [0, 1, 2]');
    expect(code).toContain('record: 0');
    expect(code).toContain('args.__records[args.record]');
  });

  it('injects the jsonata source and field table into the docs description', () => {
    const code = buildEntityCsfModule(opts);
    expect(code).toContain('node.article.full.jsonata');
    expect(code).toContain('| title | ui:card | title | prop |');
  });

  it('imports each referenced component once', () => {
    const code = buildEntityCsfModule(opts);
    expect(code).toContain("import * as uicard from './card.js';");
  });
});
```

- [ ] **Step 2: Run it to verify failure**

Run: `pnpm --filter storybook-addon-designbook test -- entity-csf-prep`
Expected: FAIL with "buildEntityCsfModule is not a function" / not exported.

- [ ] **Step 3: Implement `buildEntityCsfModule`**

In `csf-prep.ts`: export `collectComponentIds` and `toAlias` if not already exported (change `function collectComponentIds` → `export function collectComponentIds`, same for `toAlias`). Import `FieldMapping`:

```ts
import type { ComponentNode, SceneTreeNode, FieldMapping } from './types';
```

Append:

```ts
function fieldTableMarkdown(mappings: FieldMapping[]): string {
  if (!mappings.length) return '_No field mappings extracted._';
  const head = '| field | component | target | kind | conditional |\n|---|---|---|---|---|';
  const rows = mappings.map(
    (m) => `| ${m.field} | ${m.component} | ${m.target} | ${m.type} | ${m.conditional ? 'yes' : '—'} |`,
  );
  return [head, ...rows].join('\n');
}

function docsDescription(mappingFile: string, source: string, mappings: FieldMapping[]): string {
  return [
    `#### Mapping \`${mappingFile}\``,
    '',
    '```jsonata',
    source.trimEnd(),
    '```',
    '',
    fieldTableMarkdown(mappings),
  ].join('\n');
}

export function buildEntityCsfModule(opts: EntityCsfOptions): string {
  const { group, source, mappingBasename, viewModes, resolveImportPath, wrapImport } = opts;

  // Collect component IDs across every record of every view-mode
  const allIds = new Set<string>();
  for (const vm of viewModes) {
    for (const nodes of vm.recordsNodes) collectComponentIds(nodes, allIds);
  }

  const importLines: string[] = ["import { renderComponent } from 'storybook-addon-designbook/renderer';"];
  const importsMapEntries: string[] = [];
  for (const componentId of allIds) {
    if (componentId.startsWith('designbook:') && builtInComponents[componentId]) {
      importsMapEntries.push(`  '${componentId}': { render: ${builtInComponents[componentId].render.toString()} },`);
      continue;
    }
    const alias = toAlias(componentId);
    const importPath = resolveImportPath(componentId);
    if (importPath) {
      importLines.push(`import * as ${alias} from '${importPath}';`);
      importsMapEntries.push(`  '${componentId}': ${wrapImport ? wrapImport(alias) : alias},`);
    } else {
      importsMapEntries.push(
        `  '${componentId}': { render: (_p, _s) => { console.warn('[Designbook] Missing component: ${componentId}'); return ''; } },`,
      );
    }
  }
  const importsMap = `const __imports = {\n${importsMapEntries.join('\n')}\n};`;

  const defaultExport = [
    'export default {',
    `  title: '${group.replace(/'/g, "\\'")}',`,
    "  tags: ['autodocs'],",
    "  parameters: { layout: 'fullscreen' },",
    '};',
  ].join('\n');

  const storyExports = viewModes.map((vm, index) => {
    const recordsJson = JSON.stringify(vm.recordsNodes);
    const options = vm.recordsNodes.map((_, i) => i);
    const description = JSON.stringify(docsDescription(mappingBasename(vm.view_mode), vm.source, vm.fieldMappings));
    return [
      `export const ${vm.exportName} = {`,
      `  name: '${vm.view_mode.replace(/'/g, "\\'")}',`,
      `  parameters: { designbook: { order: ${100 + index} }, docs: { description: { story: ${description} } } },`,
      `  argTypes: { record: { name: 'record', control: { type: 'select' }, options: [${options.join(', ')}] } },`,
      `  args: { record: 0, __records: ${recordsJson} },`,
      '  render: (args) => renderComponent(args.__records[args.record], __imports),',
      '};',
    ].join('\n');
  });

  return [importLines.join('\n'), '', importsMap, '', defaultExport, '', storyExports.join('\n\n'), ''].join('\n');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- entity-csf-prep`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/csf-prep.ts packages/storybook-addon-designbook/src/renderer/__tests__/entity-csf-prep.test.ts
git commit -m "feat(addon): buildEntityCsfModule — entity CSF with record select + docs"
```

---

### Task 3: `entity-module-builder` — demo.yml → CSF

Parses a `demo.yml`, discovers sibling view-mode mappings, resolves every record through each mapping using the shared render context, and emits the CSF via `buildEntityCsfModule`.

**Files:**
- Create: `packages/storybook-addon-designbook/src/renderer/entity-module-builder.ts`
- Modify: `packages/storybook-addon-designbook/src/renderer/index.ts` (export it)
- Test: `packages/storybook-addon-designbook/src/renderer/__tests__/entity-module-builder.test.ts` (create)
- Test fixtures: reuse `packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/entity-mapping/` + add a demo file (below)

**Interfaces:**
- Consumes: `buildRenderContext` (Task 1), `buildEntityCsfModule` (Task 2), `extractFieldMappings` (`./jsonata-mapping-analyzer`), `view` (the RenderTree projector used in `scene-module-builder`), `loadDataModel`/`loadDesignbookConfig` patterns from `scene-module-builder`.
- Produces: `export async function buildEntityModule(demoFilePath: string, designbookDir: string, options?: { builders?, resolveImportPath?, wrapImport? }): Promise<string>`
- Produces helper: `export function titleCaseBundle(bundle: string): string` (`'landing_page'` → `'Landing Page'`).

- [ ] **Step 1: Add the demo fixture**

Inspect the existing fixtures first:

Run: `ls packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/entity-mapping/`
Expected: includes `.jsonata` files (e.g. a `node.article.teaser.jsonata` used by entity-builder tests). If `node.article.teaser.jsonata` is absent, copy the one referenced by `entity-builder.test.ts`.

Create `packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/entity-mapping/node.article.demo.yml`:

```yaml
content:
  node:
    article:
      - id: "1"
        title: "First Article"
        field_body: "<p>One</p>"
      - id: "2"
        title: "Second Article"
        field_body: "<p>Two</p>"
```

Ensure `node.article.teaser.jsonata` exists in that fixtures dir mapping `title`/`field_body` to a component (mirror the expression used by `entity-builder.test.ts`).

- [ ] **Step 2: Write the failing test**

Create `packages/storybook-addon-designbook/src/renderer/__tests__/entity-module-builder.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { buildEntityModule, titleCaseBundle } from '../entity-module-builder';

const FIXTURES = resolve(__dirname, 'fixtures');
const DEMO = resolve(FIXTURES, 'entity-mapping', 'node.article.demo.yml');

describe('titleCaseBundle', () => {
  it('title-cases and splits separators', () => {
    expect(titleCaseBundle('article')).toBe('Article');
    expect(titleCaseBundle('landing_page')).toBe('Landing Page');
  });
});

describe('buildEntityModule', () => {
  it('emits a CSF module titled Entities/node/Article with a teaser story', async () => {
    const code = await buildEntityModule(DEMO, FIXTURES, {
      resolveImportPath: () => './stub.js',
    });
    expect(code).toContain("title: 'Entities/node/Article'");
    expect(code).toContain('export const Teaser');
  });

  it('pre-resolves every demo record (2 records → select options [0, 1])', async () => {
    const code = await buildEntityModule(DEMO, FIXTURES, { resolveImportPath: () => './stub.js' });
    expect(code).toContain('options: [0, 1]');
  });
});
```

- [ ] **Step 3: Run it to verify failure**

Run: `pnpm --filter storybook-addon-designbook test -- entity-module-builder`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement `entity-module-builder.ts`**

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { load as parseYaml } from 'js-yaml';

import { buildRenderContext } from './scene-module-builder';
import { view } from './scene-view'; // use the same projector scene-module-builder imports as `view`
import { buildEntityCsfModule, type EntityCsfViewMode } from './csf-prep';
import { extractFieldMappings } from './jsonata-mapping-analyzer';
import { buildExportName } from './scene-metadata';
import { defaultSdcResolver } from './sdc-resolver'; // same module scene-module-builder uses for default resolver
import type { ComponentNode, SampleData, DataModel, SceneNode, SceneTreeNode, SceneNodeBuilder } from './types';

export function titleCaseBundle(bundle: string): string {
  return bundle
    .split(/[_-]/)
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(' ');
}

/** Parse "<type>.<bundle>.demo.yml" → { entity_type, bundle }. */
function parseDemoName(file: string): { entity_type: string; bundle: string } {
  const parts = basename(file).split('.'); // [type, bundle, 'demo', 'yml']
  return { entity_type: parts[0] ?? '', bundle: parts[1] ?? '' };
}

export async function buildEntityModule(
  demoFilePath: string,
  designbookDir: string,
  options: {
    builders?: SceneNodeBuilder[];
    resolveImportPath?: (componentId: string) => string | null;
    wrapImport?: (alias: string) => string;
  } = {},
): Promise<string> {
  const { entity_type, bundle } = parseDemoName(demoFilePath);
  const dir = dirname(demoFilePath);

  const sampleData = (parseYaml(readFileSync(demoFilePath, 'utf-8')) as SampleData) ?? {};

  // Discover view-modes from sibling mapping files: <type>.<bundle>.<view_mode>.jsonata
  const prefix = `${entity_type}.${bundle}.`;
  const viewModeNames = readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.jsonata'))
    .map((f) => f.slice(prefix.length, -'.jsonata'.length))
    .sort();

  // Record count from the demo data (content first, then config)
  const records =
    (sampleData.content?.[entity_type]?.[bundle] as unknown[] | undefined) ??
    (sampleData.config?.[entity_type]?.[bundle] as unknown[] | undefined) ??
    [];
  const recordCount = Math.max(records.length, 1);

  // Load data model + config exactly as scene-module-builder does (reuse its loaders if exported;
  // otherwise read $designbookDir/data-model.yml and the config file directly).
  const dataModelPath = resolve(designbookDir, 'data-model.yml');
  const dataModel = (parseYaml(readFileSync(dataModelPath, 'utf-8')) as DataModel) ?? { content: {} };

  const ctx = buildRenderContext({ dataModel, sampleData, designbookDir, config: undefined, builders: options.builders });

  const viewModes: EntityCsfViewMode[] = [];
  for (const vm of viewModeNames) {
    const source = readFileSync(resolve(dir, `${prefix}${vm}.jsonata`), 'utf-8');
    let fieldMappings = [] as ReturnType<typeof extractFieldMappings>;
    try {
      fieldMappings = extractFieldMappings(source);
    } catch {
      /* non-critical */
    }
    const recordsNodes: ComponentNode[][] = [];
    for (let r = 0; r < recordCount; r++) {
      const tree: SceneTreeNode[] = [];
      const built = await ctx.buildNode({ entity: `${entity_type}.${bundle}`, view_mode: vm, record: r } as SceneNode);
      tree.push(...built);
      recordsNodes.push(view(tree));
    }
    viewModes.push({ view_mode: vm, exportName: buildExportName(vm), recordsNodes, source, fieldMappings });
  }

  const resolveImportPath =
    options.resolveImportPath ?? ((componentId) => defaultSdcResolver(componentId, designbookDir));
  const wrapImport =
    options.wrapImport ?? ((alias) => `{ render: (p, s) => ${alias}.default.component({...p, ...s}) }`);

  return buildEntityCsfModule({
    group: `Entities/${entity_type}/${titleCaseBundle(bundle)}`,
    source: basename(demoFilePath),
    mappingBasename: (vm) => `${prefix}${vm}.jsonata`,
    viewModes,
    resolveImportPath,
    wrapImport,
  });
}
```

> **Implementation note:** the exact import specifiers for `view`, `defaultSdcResolver`, and the data-model/config loaders must match what `scene-module-builder.ts` imports. Open `scene-module-builder.ts`, copy its import lines for `view`, `defaultSdcResolver`, `loadDataModel`, `loadDesignbookConfig`, and prefer reusing exported loaders over re-reading files. If `loadDataModel`/`loadDesignbookConfig` are not exported, export them from `scene-module-builder.ts` and use them here (DRY).

- [ ] **Step 5: Export from the renderer barrel**

In `packages/storybook-addon-designbook/src/renderer/index.ts`, add alongside the `buildSceneModule` export:

```ts
export { buildEntityModule, titleCaseBundle } from './entity-module-builder';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- entity-module-builder`
Expected: PASS (4 tests). If a fixture jsonata references a component the resolver stubs, that is fine — the test only checks structure.

- [ ] **Step 7: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/entity-module-builder.ts packages/storybook-addon-designbook/src/renderer/index.ts packages/storybook-addon-designbook/src/renderer/__tests__/
git commit -m "feat(addon): entity-module-builder — demo.yml + sibling jsonata → CSF"
```

---

### Task 4: Vite plugin — resolve + load `entity-mapping/*.demo.yml`

Route demo files through `buildEntityModule` + esbuild, mirroring `loadSceneModule`.

**Files:**
- Modify: `packages/storybook-addon-designbook/src/vite-plugin.ts`
- Test: `packages/storybook-addon-designbook/src/__tests__/entity-demo-routing.test.ts` (create)

**Interfaces:**
- Consumes: `buildEntityModule` (Task 3), `transformWithEsbuild` (already imported).
- Produces: `export function isEntityDemoFile(id: string): boolean` (true for paths ending `/entity-mapping/<name>.demo.yml`), used by the plugin and tested directly.

- [ ] **Step 1: Write the failing test**

Create `packages/storybook-addon-designbook/src/__tests__/entity-demo-routing.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isEntityDemoFile } from '../vite-plugin';

describe('isEntityDemoFile', () => {
  it('matches demo files under entity-mapping/', () => {
    expect(isEntityDemoFile('/x/designbook/entity-mapping/node.article.demo.yml')).toBe(true);
  });
  it('rejects scenes and non-demo yml', () => {
    expect(isEntityDemoFile('/x/designbook/sections/blog/blog.section.scenes.yml')).toBe(false);
    expect(isEntityDemoFile('/x/designbook/entity-mapping/node.article.full.jsonata')).toBe(false);
    expect(isEntityDemoFile('/x/designbook/data.yml')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify failure**

Run: `pnpm --filter storybook-addon-designbook test -- entity-demo-routing`
Expected: FAIL — `isEntityDemoFile` not exported.

- [ ] **Step 3: Implement routing in `vite-plugin.ts`**

Add the matcher near `globMatch` (top-level export):

```ts
export function isEntityDemoFile(id: string): boolean {
  return /(?:^|\/)entity-mapping\/[^/]+\.demo\.yml$/.test(id);
}
```

Add an `import { buildEntityModule } from './renderer/entity-module-builder';` near the existing `buildSceneModule` import.

In `resolveId`, alongside the `.scenes.yml` branch (after `if (cleanId.endsWith('.scenes.yml')) {...}`), add:

```ts
if (cleanId.endsWith('.demo.yml')) {
  if (importer) return resolve(dirname(importer), cleanId);
  return cleanId;
}
```

In `load(id)`, before the `matchHandler` block at the end, add:

```ts
if (isEntityDemoFile(id)) {
  return loadEntityModule(id, designbookDir, {
    builders: options.builders,
    resolveImportPath: options.resolveImportPath,
    wrapImport: options.wrapImport,
  });
}
```

Add the loader wrapper near `loadSceneModule` (bottom of file):

```ts
async function loadEntityModule(
  id: string,
  designbookDir: string,
  options: {
    builders?: SceneNodeBuilder[];
    resolveImportPath?: (componentId: string) => string | null;
    wrapImport?: (alias: string) => string;
  },
): Promise<string | null> {
  try {
    const code = await buildEntityModule(id, designbookDir, options);
    const result = await transformWithEsbuild(code, id + '.js', { loader: 'js' });
    return result.code;
  } catch (e: unknown) {
    console.error('[Designbook] Error loading entity module:', id, e);
    return buildErrorModule(id, e);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- entity-demo-routing`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/vite-plugin.ts packages/storybook-addon-designbook/src/__tests__/entity-demo-routing.test.ts
git commit -m "feat(addon): route entity-mapping/*.demo.yml through buildEntityModule"
```

---

### Task 5: Storybook indexer + story glob for demo files

Make Storybook discover demo files and emit one story per view-mode plus a Docs entry.

**Files:**
- Modify: `packages/storybook-addon-designbook/src/preset.ts`
- Test: `packages/storybook-addon-designbook/src/__tests__/entity-indexer.test.ts` (create)

**Interfaces:**
- Consumes: `buildExportName` (already imported in `preset.ts`).
- Produces: `export function indexEntityDemo(fileName: string): any[]` — pure function that, given a demo file path, returns the index entries (story per view-mode + one docs entry). The `experimental_indexers` wires it into a second indexer with `test: /entity-mapping\/[^/]+\.demo\.yml$/`.

- [ ] **Step 1: Write the failing test**

Create `packages/storybook-addon-designbook/src/__tests__/entity-indexer.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { indexEntityDemo } from '../preset';

let demoPath: string;

beforeAll(() => {
  const root = mkdtempSync(join(tmpdir(), 'debo-idx-'));
  const em = resolve(root, 'entity-mapping');
  mkdirSync(em, { recursive: true });
  writeFileSync(join(em, 'node.article.full.jsonata'), '$');
  writeFileSync(join(em, 'node.article.teaser.jsonata'), '$');
  writeFileSync(join(em, 'node.article.demo.yml'), 'content: {}');
  demoPath = join(em, 'node.article.demo.yml');
});

describe('indexEntityDemo', () => {
  it('emits one story per sibling jsonata view-mode under Entities/node/Article', () => {
    const entries = indexEntityDemo(demoPath);
    const stories = entries.filter((e) => e.type === 'story');
    expect(stories.map((s) => s.name).sort()).toEqual(['full', 'teaser']);
    expect(stories.every((s) => s.title === 'Entities/node/Article')).toBe(true);
  });

  it('emits a docs entry tagged autodocs', () => {
    const entries = indexEntityDemo(demoPath);
    const docs = entries.find((e) => e.type === 'docs');
    expect(docs).toBeTruthy();
    expect(docs.tags).toContain('autodocs');
  });
});
```

- [ ] **Step 2: Run it to verify failure**

Run: `pnpm --filter storybook-addon-designbook test -- entity-indexer`
Expected: FAIL — `indexEntityDemo` not exported.

- [ ] **Step 3: Implement `indexEntityDemo` + wire the indexer**

In `preset.ts` add imports:

```ts
import { readdirSync } from 'node:fs';
import { basename } from 'node:path';
import { titleCaseBundle } from './renderer/entity-module-builder';
```

Add the pure indexer function:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function indexEntityDemo(fileName: string): any[] {
  const parts = basename(fileName).split('.'); // [type, bundle, 'demo', 'yml']
  const entity_type = parts[0] ?? '';
  const bundle = parts[1] ?? '';
  const prefix = `${entity_type}.${bundle}.`;
  const dir = dirname(fileName);
  const relativePath = './' + relative(process.cwd(), fileName);
  const title = `Entities/${entity_type}/${titleCaseBundle(bundle)}`;

  const viewModes = readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.jsonata'))
    .map((f) => f.slice(prefix.length, -'.jsonata'.length))
    .sort();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: any[] = [];
  for (const vm of viewModes) {
    entries.push({
      type: 'story' as const,
      importPath: relativePath,
      exportName: buildExportName(vm),
      title,
      name: vm,
      tags: ['entity', 'autodocs'],
    });
  }
  if (viewModes.length > 0) {
    entries.push({
      type: 'docs' as const,
      importPath: relativePath,
      exportName: '__docs',
      title,
      name: 'Docs',
      tags: ['autodocs'],
    });
  }
  return entries;
}
```

In `experimental_indexers`, add a second indexer and return both:

```ts
  const entityIndexer = {
    test: /entity-mapping\/[^/]+\.demo\.yml$/,
    createIndex: async (fileName: string) => indexEntityDemo(fileName),
  };

  return [...existingIndexers, scenesIndexer, entityIndexer];
```

In `stories()` (the glob builder): after `mkdirSync(resolve(distDir, 'sections'), ...)` add `mkdirSync(resolve(distDir, 'entity-mapping'), { recursive: true });`, then add the demo glob and include it in the return:

```ts
  const entityGlob = resolve(distDir, 'entity-mapping/*.demo.yml');
  // ...
  return [foundationGlob, designSystemGlob, sectionsGlob, relative(configDir, scenesGlob), relative(configDir, entityGlob), ...entry];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- entity-indexer`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full addon check**

Run: `pnpm check`
Expected: typecheck + lint + all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/preset.ts packages/storybook-addon-designbook/src/__tests__/entity-indexer.test.ts
git commit -m "feat(addon): index entity-mapping/*.demo.yml as standalone entity stories"
```

---

## Part B — Skill

> Every task in Part B: **first** load `designbook-skill-creator` + the matching per-file-type rule, **then** author. Validate with `pnpm check` (the addon includes a skill/workflow validator) and, where available, the `_debo` workflow validator. Never edit `.claude/skills/` (symlink).

### Task 6: `create-entity-demo` task — per-bundle demo data

**Files:**
- Create: `.agents/skills/designbook/sample-data/tasks/create-entity-demo.md`

**Interfaces:**
- Produces result `entity-demo` at `$DESIGNBOOK_DATA/entity-mapping/{{ entity_type }}.{{ bundle }}.demo.yml`, validated by the `data` validator.
- Consumes params: `entity_type`, `bundle`, `view_mode`, `data_model` (read `$DESIGNBOOK_DATA/data-model.yml`), `components_dir`.

- [ ] **Step 1: Load the authoring skill**

Load `designbook-skill-creator`; read `rules/task-files.md` + `rules/common-rules.md`.

- [ ] **Step 2: Write the task file**

Create `.agents/skills/designbook/sample-data/tasks/create-entity-demo.md` with frontmatter (trigger `create-entity-demo`, `domain: [sample-data]`, params object, result `entity-demo`) and a body that REUSES the field-value generation rules. Model it on `create-sample-data.md` but scoped to a **single bundle**, writing to `entity-mapping/{{ entity_type }}.{{ bundle }}.demo.yml`. Content:

```markdown
---
trigger:
  steps: [create-entity-demo]
domain: [sample-data]
params:
  type: object
  required: [entity_type, bundle, view_mode, data_model, components_dir]
  properties:
    entity_type: { type: string }
    bundle: { type: string }
    view_mode: { type: string }
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      workflow: /debo-data-model
      type: object
    components_dir:
      path: $DESIGNBOOK_DIRS_COMPONENTS
      type: string
result:
  type: object
  required: [entity-demo]
  properties:
    entity-demo:
      path: $DESIGNBOOK_DATA/entity-mapping/{{ entity_type }}.{{ bundle }}.demo.yml
      type: object
      validators: [data]
---

# Create Entity Demo

Generate co-located demo records for a single entity bundle, shared by all of
its view-mode mappings. Idempotent — read the existing demo file, preserve
records, append only what is missing.

## Output

`$DESIGNBOOK_DATA/entity-mapping/{{ entity_type }}.{{ bundle }}.demo.yml`, using
the same `content:`/`config:` namespacing as section sample data, scoped to the
single `{{ entity_type }}.{{ bundle }}` bundle.

## Record count

- Target **3 records** for the bundle (enough to exercise the `record` control).
- Read the existing file first; if it already has N records, append `max(0, 3 - N)`.

## Field values

Apply the field-value generation precedence defined in
`sample-data/tasks/create-sample-data.md` (Field Value Generation):
explicit `sample_template` → `field_type` rule → realistic plain string.
Reference fields store the target record `id` as a plain string.

## Validation

Validate against the data model before writing (hard errors: missing entity
type / missing bundle; warnings: unknown field, missing required field, broken
reference) — identical to `create-sample-data`.
```

- [ ] **Step 3: Validate**

Run: `pnpm check`
Expected: skill/workflow validation + addon tests PASS. Fix any validator errors before committing.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/sample-data/tasks/create-entity-demo.md
git commit -m "feat(skill): create-entity-demo task — per-bundle co-located demo data"
```

---

### Task 7: `intake--design-entity` task

**Files:**
- Create: `.agents/skills/designbook/design/tasks/intake--design-entity.md`

**Interfaces:**
- Consumes params: `data_model` (`$DESIGNBOOK_DATA/data-model.yml`).
- Produces results: `components` (array of new Component to build — `$ref ../schemas.yml#/Component`), `entity_mappings` (one-element array, `$ref ../schemas.yml#/EntityMapping`), `entity_type`, `bundle`, `view_mode`.

- [ ] **Step 1: Load the authoring skill**

Load `designbook-skill-creator`; read `rules/task-files.md` + `rules/common-rules.md`. Open `design/tasks/intake--design-screen.md` as the structural reference (do NOT copy the section/shell logic).

- [ ] **Step 2: Write the task file**

Create `.agents/skills/designbook/design/tasks/intake--design-entity.md`:

```markdown
---
trigger:
  steps: [design-entity:intake]
domain: [components, components.layout]
params:
  type: object
  required: [data_model]
  properties:
    entity_type: { type: string, default: "" }
    bundle: { type: string, default: "" }
    view_mode: { type: string, default: "" }
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
      $ref: ../../data-model/schemas.yml#/DataModel
result:
  type: object
  required: [components, entity_mappings, entity_type, bundle, view_mode]
  properties:
    components:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    entity_mappings:
      type: array
      items:
        $ref: ../schemas.yml#/EntityMapping
    entity_type: { type: string }
    bundle: { type: string }
    view_mode: { type: string }
---

# Intake: Design Entity

Gather one entity view-mode and its component plan. No section, shell, or
reference logic — this workflow renders a single entity standalone.

## Steps

1. **Resolve the bundle + view-mode.** Use provided `entity_type`/`bundle`/`view_mode`
   if given. Otherwise read `data_model.content`, list bundles and their
   `view_modes`, and ask the user to pick one `entity_type.bundle` + one `view_mode`.
2. **Read the template.** From `data_model.content.{entity_type}.{bundle}.view_modes.{view_mode}`
   read the `template` and settings — this is what the mapping must target.
3. **Plan components.** Scan existing components; identify which components the
   chosen view-mode needs that do not yet exist. Present the plan and confirm.
4. **Summary.** Present the build plan (bundle, view-mode, template, new
   components, demo-data note) and wait for confirmation.

## Result: components

One entry per **new** component to create (empty array if all exist).

## Result: entity_mappings

A one-element array: `[{ entity_type, bundle, view_mode }]` — the mapping the
`entity-mapping` stage will produce.
```

- [ ] **Step 3: Validate**

Run: `pnpm check`
Expected: PASS. Confirm the `$ref` paths resolve (Component + EntityMapping + DataModel schemas exist at the referenced relative paths).

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-entity.md
git commit -m "feat(skill): intake--design-entity task"
```

---

### Task 8: Extend `map-entity` trigger for design-entity

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/map-entity--design-screen.md` (the `trigger.steps`)

**Interfaces:**
- Consumes: the same `mapping` + `data_model` params + `each: mapping.entity_mappings` already defined.

- [ ] **Step 1: Load the authoring skill**

Load `designbook-skill-creator`; read `rules/task-files.md`.

- [ ] **Step 2: Extend the trigger**

In `map-entity--design-screen.md`, change:

```yaml
trigger:
  steps: [design-screen:map-entity]
```

to:

```yaml
trigger:
  steps: [design-screen:map-entity, design-entity:map-entity]
```

(The task body is unchanged — it already emits one JSONata file per
`entity_type.bundle.view_mode` and reads the template from the data model.)

- [ ] **Step 3: Validate**

Run: `pnpm check`
Expected: PASS — `design-entity:map-entity` now resolves to this task.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/map-entity--design-screen.md
git commit -m "feat(skill): map-entity also triggers from design-entity:map-entity"
```

---

### Task 9: `design-entity` workflow + SKILL.md registration

**Files:**
- Create: `.agents/skills/designbook/design/workflows/design-entity.md`
- Modify: `.agents/skills/designbook/SKILL.md` (argument-hint, description, file-to-workflow mapping)

**Interfaces:**
- Consumes the tasks from Tasks 6–8 via stage step names: `intake`, `create-component`, `map-entity` (as `entity-mapping`), `create-entity-demo` (as `demo-data`).

- [ ] **Step 1: Load the authoring skill**

Load `designbook-skill-creator`; read `rules/workflow-files.md` + `rules/common-rules.md`. Open `design/workflows/design-screen.md` as the structural reference.

- [ ] **Step 2: Write the workflow file**

Create `.agents/skills/designbook/design/workflows/design-entity.md`:

```markdown
---
title: Design Entity
description: Build one entity view-mode (mapping + demo data) and preview it standalone
params:
  entity_type: { type: string, default: "" }
  bundle: { type: string, default: "" }
  view_mode: { type: string, default: "" }
stages:
  intake:
    steps: [intake]
    domain: [data-model]
  component:
    steps: [create-component]
    isolate: true
  entity-mapping:
    steps: [map-entity]
  demo-data:
    steps: [create-entity-demo]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
```

> Map the stage names to the right tasks via the step names:
> `intake → design-entity:intake` (Task 7), `create-component` (existing),
> `map-entity → design-entity:map-entity` (Task 8), `create-entity-demo`
> (Task 6). Confirm the param-resolution conventions against `design-screen.md`
> — if `entity_type`/`bundle`/`view_mode` need resolvers, add them following the
> same `resolve:`/`from:` pattern used there. No `after: design-verify` (no
> reference flow).

- [ ] **Step 3: Register the sub-command in SKILL.md**

In `.agents/skills/designbook/SKILL.md`:
- Add `design-entity` to the `argument-hint` list (line 3) after `design-screen`.
- Add `design-entity` to the `Sub-commands:` sentence in `description` (lines 9-11).
- Add a row to the File-to-Workflow Mapping table:

```markdown
| entity, design-entity | `design-entity` | `$DESIGNBOOK_DATA/entity-mapping/*.demo.yml` + `*.jsonata` |
```

- [ ] **Step 4: Validate**

Run: `pnpm check`
Expected: PASS — workflow stages resolve to existing task step names; SKILL.md still valid.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-entity.md .agents/skills/designbook/SKILL.md
git commit -m "feat(skill): design-entity workflow + sub-command registration"
```

---

### Task 10: End-to-end verification in a test workspace

**Files:** none (verification only).

- [ ] **Step 1: Build a test workspace**

Run: `./scripts/setup-workspace.sh design-entity-test`
Expected: a standalone workspace with Storybook + the in-development `.agents`/`.claude`.

- [ ] **Step 2: Run the workflow**

In the workspace, run `/debo design-entity node article full` (pick an existing bundle from the workspace fixture data model; create one via `/debo data-model` first if needed).
Expected on disk:
- `entity-mapping/node.article.full.jsonata`
- `entity-mapping/node.article.demo.yml` (≈3 records)

- [ ] **Step 3: Verify the Storybook story**

Restart Storybook: `npx addon start --force`. In the sidebar confirm:
- `Entities › node › Article › full` exists and renders the entity **alone** (no shell/section).
- The Controls panel shows a `record` select switching between demo records.
- The **Docs** tab shows the JSONata source + the field-mapping table.

- [ ] **Step 4: Final full check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 5: Confirm with the user**

Report results (sidebar screenshot/description, record switch, docs tab). Do not merge — hand back for review.

---

## Self-Review

**Spec coverage:**
- Deliverable mapping + standalone preview → Tasks 3–5, 9, 10. ✔
- Demo data co-located per bundle → Task 6 (`create-entity-demo`). ✔
- Auto-stories from demo.yml + sibling jsonata → Tasks 3, 5. ✔
- Sidebar `Entities/<type>/<bundle>` › view_mode → Task 5 (`indexEntityDemo`), Task 2/3 (title). ✔
- `record` Controls select over all demo records → Task 2 (`buildEntityCsfModule`), Task 3 (pre-resolve all records). ✔
- Creates missing components → Task 9 (`component` stage), Task 7 (component plan). ✔
- One view-mode per run → Task 7/9 (single `view_mode` param). ✔
- Mapping docs via autodocs Docs tab → Task 2 (`docs.description.story`), Task 5 (docs entry, autodocs tag). ✔
- entity-builder unchanged (demo fed as sampleData) → documented; Task 3. ✔

**Placeholder scan:** No TBD/TODO; all code blocks present. The only deferred details are explicitly bounded "match the existing import specifiers" notes in Task 3 (necessary because exact symbol names live in `scene-module-builder.ts`), with a concrete instruction to copy them.

**Type consistency:** `EntityCsfViewMode`/`EntityCsfOptions` defined in Task 2 and consumed in Task 3; `buildEntityModule`/`titleCaseBundle` defined in Task 3 and consumed in Tasks 4–5; `isEntityDemoFile` defined in Task 4; `indexEntityDemo` defined in Task 5. Story render contract (`args.__records[args.record]`) consistent between Task 2 (emit) and Task 3 (data shape). ✔
