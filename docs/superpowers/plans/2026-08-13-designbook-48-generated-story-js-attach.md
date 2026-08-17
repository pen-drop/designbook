# Generated Stories Load & Attach Component JS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every designbook-generated story (scene + entity view-mode/form-mode) load each rendered component's `<name>.js` and run `Drupal.attachBehaviors` exactly once over the mounted story root, so blueprint behaviors are live in scenes.

**Architecture:** `renderer/csf-prep.ts` (the single choke point both generators pass through) emits, per distinct component, a side-effect `import '<abs>/<name>.js'` (loading — designbook-owned, mechanism-neutral) and a per-story `play` that calls a new exported `attachDrupalBehaviors(canvasElement)` helper (attach — Drupal-specific). Only the Drupal/`once` globals are reused, from `storybook-addon-sdc`'s `previewHead`.

**Tech Stack:** TypeScript, Vitest, Storybook 10 `@storybook/html-vite`, `storybook-addon-sdc@0.22.x`, `@drupal/once`, playwright-cli.

**Spec:** `docs/superpowers/specs/2026-08-13-designbook-48-generated-story-js-attach-design.md`

## Global Constraints

- No backwards-compatibility / migration code; existing generated output is disposable (project rule).
- `pnpm check` (typecheck → lint → test, fail-fast) must pass from the repo root.
- Do **not** modify any component's `<name>.js`, the `js-behavior` blueprint, or `storybook-addon-sdc`.
- Fixture component YAML: **always double quotes** (single quotes break the SDC parser); every component ships `<name>.default.story.yml` and `thirdPartySettings.sdcStorybook.disableBasicStory: true`; component refs carry the provider prefix `<namespace>:<name>`.
- The attach helper must **no-op** (never throw) when `globalThis.Drupal` is absent (non-Drupal projects).
- `renderer.ts` / `renderer-browser.ts` stay browser-safe (no Storybook preview-api / Node imports).

---

### Task 1: `attachDrupalBehaviors` runtime helper

**Files:**
- Modify: `packages/storybook-addon-designbook/src/renderer/renderer.ts` (append export)
- Modify: `packages/storybook-addon-designbook/src/renderer/renderer-browser.ts` (re-export)
- Test: `packages/storybook-addon-designbook/src/renderer/__tests__/attach-drupal-behaviors.test.ts` (create)

**Interfaces:**
- Produces: `attachDrupalBehaviors(root: HTMLElement | undefined): void`, exported from both `./renderer/renderer` and the package entry `storybook-addon-designbook/renderer` (`renderer-browser.ts`).

- [ ] **Step 1: Write the failing test**

```ts
// attach-drupal-behaviors.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { attachDrupalBehaviors } from '../renderer';

type G = { Drupal?: { attachBehaviors?: (r: Element, s?: unknown) => void }; drupalSettings?: unknown };

afterEach(() => {
  delete (globalThis as unknown as G).Drupal;
  delete (globalThis as unknown as G).drupalSettings;
});

describe('attachDrupalBehaviors', () => {
  it('calls Drupal.attachBehaviors once with the root and drupalSettings', () => {
    const attach = vi.fn();
    (globalThis as unknown as G).Drupal = { attachBehaviors: attach };
    (globalThis as unknown as G).drupalSettings = { foo: 1 };
    const root = {} as HTMLElement;
    attachDrupalBehaviors(root);
    expect(attach).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenCalledWith(root, { foo: 1 });
  });

  it('no-ops when Drupal is absent', () => {
    expect(() => attachDrupalBehaviors({} as HTMLElement)).not.toThrow();
  });

  it('no-ops when root is undefined', () => {
    const attach = vi.fn();
    (globalThis as unknown as G).Drupal = { attachBehaviors: attach };
    attachDrupalBehaviors(undefined);
    expect(attach).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- attach-drupal-behaviors`
Expected: FAIL — `attachDrupalBehaviors` is not exported.

- [ ] **Step 3: Implement the helper**

Append to `renderer.ts`:

```ts
/**
 * Run Drupal.attachBehaviors over a rendered story root. Guarded so projects
 * without the Drupal runtime (no storybook-addon-sdc previewHead) no-op instead
 * of throwing. `once()` inside each behavior guards re-render double-binding.
 */
export function attachDrupalBehaviors(root: HTMLElement | undefined): void {
  const g = globalThis as unknown as {
    Drupal?: { attachBehaviors?: (r: Element, s?: unknown) => void };
    drupalSettings?: unknown;
  };
  if (root && g.Drupal?.attachBehaviors) {
    g.Drupal.attachBehaviors(root, g.drupalSettings);
  }
}
```

Change `renderer-browser.ts` to:

```ts
export { renderComponent, attachDrupalBehaviors } from './renderer/renderer';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- attach-drupal-behaviors`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/renderer.ts \
        packages/storybook-addon-designbook/src/renderer/renderer-browser.ts \
        packages/storybook-addon-designbook/src/renderer/__tests__/attach-drupal-behaviors.test.ts
git commit -m "DESIGNBOOK-48: attachDrupalBehaviors runtime helper"
```

---

### Task 2: `defaultSdcScriptResolver` + `resolveScriptPath` option

**Files:**
- Modify: `packages/storybook-addon-designbook/src/renderer/scene-module-builder.ts` (add resolver + option; default it in `buildSceneModule`)
- Modify: `packages/storybook-addon-designbook/src/renderer/entity-module-builder.ts` (accept + default the option)
- Test: `packages/storybook-addon-designbook/src/renderer/__tests__/sdc-script-resolver.test.ts` (create)
- Test fixture: `packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/js-behavior/designbook/.gitkeep` (create), `.../fixtures/js-behavior/components/toggle/toggle.component.yml` (create), `.../fixtures/js-behavior/components/toggle/toggle.js` (create)

**Interfaces:**
- Produces: `defaultSdcScriptResolver(componentId: string, designbookDir: string): string | null` (exported from `scene-module-builder.ts`).
- Produces: `SceneModuleOptions.resolveScriptPath?: (componentId: string) => string | null` and the same key on `buildEntityModule`'s options object.
- Consumes: mirrors the existing `defaultSdcResolver(componentId, designbookDir)` layout (`<designbookDir>/../components/<dir>/<name>.js`).

- [ ] **Step 1: Create the fixture component**

`.../fixtures/js-behavior/components/toggle/toggle.component.yml`:

```yaml
"$schema": "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: "Toggle"
status: "experimental"
props:
  type: "object"
  properties:
    label:
      type: "string"
```

`.../fixtures/js-behavior/components/toggle/toggle.js`:

```js
(function (Drupal, once) {
  Drupal.behaviors.toggle = {
    attach(context) {
      once('toggle', '[data-behavior="toggle"]', context);
    },
  };
})(Drupal, once);
```

Create an empty `.../fixtures/js-behavior/designbook/.gitkeep` so the designbook dir resolves.

- [ ] **Step 2: Write the failing test**

```ts
// sdc-script-resolver.test.ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { defaultSdcScriptResolver } from '../scene-module-builder';

const DESIGNBOOK_DIR = resolve(__dirname, 'fixtures/js-behavior/designbook');

describe('defaultSdcScriptResolver', () => {
  it('returns the sibling <name>.js path when it exists', () => {
    const p = defaultSdcScriptResolver('test:toggle', DESIGNBOOK_DIR);
    expect(p).not.toBeNull();
    expect(p).toMatch(/fixtures\/js-behavior\/components\/toggle\/toggle\.js$/);
  });

  it('returns null when the component has no sibling JS', () => {
    expect(defaultSdcScriptResolver('test:missing', DESIGNBOOK_DIR)).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- sdc-script-resolver`
Expected: FAIL — `defaultSdcScriptResolver` is not exported.

- [ ] **Step 4: Implement the resolver + option**

In `scene-module-builder.ts`, add after `defaultSdcResolver`:

```ts
/**
 * Default sibling-JS resolver for SDC components: the co-located `<name>.js`
 * next to the resolved `.component.yml`. Returns null when absent.
 */
export function defaultSdcScriptResolver(componentId: string, designbookDir: string): string | null {
  const componentYml = defaultSdcResolver(componentId, designbookDir);
  if (!componentYml) return null;
  const js = componentYml.replace(/\.component\.yml$/, '.js');
  return existsSync(js) ? js : null;
}
```

Add `resolveScriptPath?: (componentId: string) => string | null;` to `SceneModuleOptions`, and in `buildSceneModule` default it and pass it to `buildCsfModule` (the `buildCsfModule` param is added in Task 3):

```ts
const resolveScriptPath =
  options.resolveScriptPath ?? ((componentId) => defaultSdcScriptResolver(componentId, designbookDir));
```

Then include `resolveScriptPath` in the `buildCsfModule({...})` call.

In `entity-module-builder.ts`, add `resolveScriptPath?: (componentId: string) => string | null;` to the `options` object type, default it the same way (import `defaultSdcScriptResolver` from `./scene-module-builder`), and pass `resolveScriptPath` into `buildEntityCsfModule({...})` (the param is added in Task 4).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- sdc-script-resolver`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/scene-module-builder.ts \
        packages/storybook-addon-designbook/src/renderer/entity-module-builder.ts \
        packages/storybook-addon-designbook/src/renderer/__tests__/sdc-script-resolver.test.ts \
        packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/js-behavior
git commit -m "DESIGNBOOK-48: defaultSdcScriptResolver + resolveScriptPath option"
```

---

### Task 3: Emit script import + `play` for scene stories (`buildCsfModule`)

**Files:**
- Modify: `packages/storybook-addon-designbook/src/renderer/csf-prep.ts` (`CsfPrepOptions`, shared emit helper, `buildCsfModule`)
- Test: `packages/storybook-addon-designbook/src/renderer/__tests__/csf-prep.test.ts` (create)

**Interfaces:**
- Consumes: `attachDrupalBehaviors` (Task 1), `resolveScriptPath` option plumbing (Task 2).
- Produces: `CsfPrepOptions.resolveScriptPath?: (componentId: string) => string | null`; a private `emitComponentImports(...)` reused by Task 4; scene story exports that carry `play: (ctx) => attachDrupalBehaviors(ctx.canvasElement),`.

- [ ] **Step 1: Write the failing test**

```ts
// csf-prep.test.ts
import { describe, it, expect } from 'vitest';
import { buildCsfModule } from '../csf-prep';
import type { ComponentNode } from '../types';

const scene = (name: string, exportName: string, nodes: ComponentNode[]) => ({ name, exportName, nodes });

const baseOpts = {
  group: 'Sections/Demo',
  source: 'demo.section.scenes.yml',
  resolveImportPath: (id: string) => (id.startsWith('designbook:') ? null : `/abs/${id.split(':')[1]}.component.yml`),
  wrapImport: (alias: string) => `{ render: (p, s) => ${alias}.default.component({...p, ...s}) }`,
};

describe('buildCsfModule — JS load + attach', () => {
  it('emits a side-effect script import for a component with a sibling <name>.js', () => {
    const code = buildCsfModule({
      ...baseOpts,
      resolveScriptPath: (id: string) => (id === 'test:toggle' ? '/abs/toggle.js' : null),
      scenes: [scene('Default', 'Default', [{ component: 'test:toggle', props: {}, path: '0' }])],
    });
    expect(code).toContain("import '/abs/toggle.js';");
  });

  it('imports attachDrupalBehaviors and emits a single play per story', () => {
    const code = buildCsfModule({
      ...baseOpts,
      resolveScriptPath: () => null,
      scenes: [scene('Default', 'Default', [{ component: 'test:card', props: {}, path: '0' }])],
    });
    expect(code).toContain("import { renderComponent, attachDrupalBehaviors } from 'storybook-addon-designbook/renderer';");
    expect(code).toContain('play: (ctx) => attachDrupalBehaviors(ctx.canvasElement),');
    expect(code.match(/play:/g)?.length).toBe(1);
  });

  it('does not emit a script import when the component has no sibling JS', () => {
    const code = buildCsfModule({
      ...baseOpts,
      resolveScriptPath: () => null,
      scenes: [scene('Default', 'Default', [{ component: 'test:card', props: {}, path: '0' }])],
    });
    expect(code).not.toMatch(/^import '.*\.js';$/m);
  });

  it('emits one script import per distinct component even across instances', () => {
    const code = buildCsfModule({
      ...baseOpts,
      resolveScriptPath: (id: string) => (id === 'test:toggle' ? '/abs/toggle.js' : null),
      scenes: [
        scene('Default', 'Default', [
          { component: 'test:toggle', props: {}, path: '0' },
          { component: 'test:toggle', props: {}, path: '1' },
        ]),
      ],
    });
    expect(code.match(/import '\/abs\/toggle\.js';/g)?.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- csf-prep.test`
Expected: FAIL — no script import / no `play` / wrong import line.

- [ ] **Step 3: Implement the emit helper + wire it into `buildCsfModule`**

Add `resolveScriptPath?: (componentId: string) => string | null;` to `CsfPrepOptions`. Add this helper above `buildCsfModule`:

```ts
/** Shared import + __imports emission for both generated story kinds. */
function emitComponentImports(
  allIds: Iterable<string>,
  resolveImportPath: (componentId: string) => string | null,
  resolveScriptPath: ((componentId: string) => string | null) | undefined,
  wrapImport: ((alias: string) => string) | undefined,
): { importLines: string[]; importsMapEntries: string[] } {
  const importLines: string[] = [];
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
      const scriptPath = resolveScriptPath?.(componentId);
      if (scriptPath) importLines.push(`import '${scriptPath}';`);
      importsMapEntries.push(`  '${componentId}': ${wrapImport ? wrapImport(alias) : alias},`);
    } else {
      console.warn(`[Designbook] Cannot resolve import path for component: ${componentId}`);
      importsMapEntries.push(
        `  '${componentId}': { render: (_props, _slots) => { console.warn('[Designbook] Missing component: ${componentId}'); return ''; } },`,
      );
    }
  }
  return { importLines, importsMapEntries };
}
```

In `buildCsfModule`, destructure `resolveScriptPath`, replace the inline import loop with:

```ts
const { importLines: componentImportLines, importsMapEntries } = emitComponentImports(
  allIds,
  resolveImportPath,
  resolveScriptPath,
  wrapImport,
);
const importLines: string[] = [
  "import { renderComponent, attachDrupalBehaviors } from 'storybook-addon-designbook/renderer';",
  ...componentImportLines,
];
```

Add the `play` line to the scene story export (right after the `render:` line):

```ts
'  render: (args) => renderComponent(args.__scene, __imports),',
'  play: (ctx) => attachDrupalBehaviors(ctx.canvasElement),',
'};',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- csf-prep.test`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the scene integration suite (no regression)**

Run: `pnpm --filter storybook-addon-designbook test -- scene-module-builder`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/csf-prep.ts \
        packages/storybook-addon-designbook/src/renderer/__tests__/csf-prep.test.ts
git commit -m "DESIGNBOOK-48: scene CSF emits <name>.js import + attach play"
```

---

### Task 4: Emit script import + `play` for entity stories (`buildEntityCsfModule`)

**Files:**
- Modify: `packages/storybook-addon-designbook/src/renderer/csf-prep.ts` (`EntityCsfOptions`, `buildEntityCsfModule`, `emitEntityStory`)
- Test: `packages/storybook-addon-designbook/src/renderer/__tests__/entity-csf-prep.test.ts` (extend)

**Interfaces:**
- Consumes: `emitComponentImports` (Task 3), `attachDrupalBehaviors` (Task 1).
- Produces: `EntityCsfOptions.resolveScriptPath?: (componentId: string) => string | null`; entity view-mode and form-mode story exports carrying the same `play`.

- [ ] **Step 1: Write the failing tests (append to `entity-csf-prep.test.ts`)**

```ts
  it('emits a side-effect script import for a component with a sibling <name>.js', () => {
    const code = buildEntityCsfModule({
      ...opts,
      resolveImportPath: (id: string) => (id === 'ui:card' ? '/abs/card.component.yml' : null),
      resolveScriptPath: (id: string) => (id === 'ui:card' ? '/abs/card.js' : null),
    });
    expect(code).toContain("import '/abs/card.js';");
  });

  it('imports attachDrupalBehaviors and emits a play per entity story', () => {
    const code = buildEntityCsfModule(opts);
    expect(code).toContain("import { renderComponent, attachDrupalBehaviors } from 'storybook-addon-designbook/renderer';");
    expect(code).toContain('play: (ctx) => attachDrupalBehaviors(ctx.canvasElement),');
  });
```

(The existing `opts` has no `resolveScriptPath`; the second test confirms it is optional — no script import, but `play` + helper import still present.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- entity-csf-prep`
Expected: FAIL — no script import / no `play` / wrong import line.

- [ ] **Step 3: Implement**

Add `resolveScriptPath?: (componentId: string) => string | null;` to `EntityCsfOptions`. In `buildEntityCsfModule`, replace the inline import loop with `emitComponentImports(allIds, resolveImportPath, opts.resolveScriptPath, wrapImport)`, and build `importLines` as:

```ts
const importLines: string[] = [
  "import { renderComponent, attachDrupalBehaviors } from 'storybook-addon-designbook/renderer';",
  ...componentImportLines,
];
```

In `emitEntityStory`, add the `play` line after the `render:` line:

```ts
`  render: (args) => renderComponent(args.__records[args.record], __imports),`,
'  play: (ctx) => attachDrupalBehaviors(ctx.canvasElement),',
'};',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- entity-csf-prep`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Run the entity + form suites (no regression)**

Run: `pnpm --filter storybook-addon-designbook test -- entity-module-builder form-modes`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/csf-prep.ts \
        packages/storybook-addon-designbook/src/renderer/__tests__/entity-csf-prep.test.ts
git commit -m "DESIGNBOOK-48: entity CSF emits <name>.js import + attach play"
```

---

### Task 5: Browser scenario fixture + playwright-cli path (AC-7)

**Files:**
- Create: `packages/integrations/test-integration-drupal/components/disclosure/disclosure.component.yml`
- Create: `packages/integrations/test-integration-drupal/components/disclosure/disclosure.twig`
- Create: `packages/integrations/test-integration-drupal/components/disclosure/disclosure.js`
- Create: `packages/integrations/test-integration-drupal/components/disclosure/disclosure.default.story.yml`
- Create: a scene placing `disclosure` — `packages/integrations/test-integration-drupal/designbook/demo.section.scenes.yml`
- Modify (if scenes are not yet globbed here): `packages/integrations/test-integration-drupal/.storybook/main.js` — ensure designbook scene discovery is active so the scene produces a story.
- Create: a playwright-cli spec asserting the toggle (exact location + host confirmed in the test-plan gate — see note).

> **Host note:** `test-integration-drupal` is currently minimal (empty `designbook/`, no scenes, `.storybook/main.js` globs only `components/**/*.component.yml` + `stories/**`). The browser host for AC-7 — extend this integration with designbook scene discovery, or run the scenario in a `debo-test` fixture workspace — is confirmed with the human at the test-plan gate before this task starts.

**Interfaces:**
- Consumes: the runtime from Tasks 1–4 (a scene story with a behavior component now attaches behaviors).

- [ ] **Step 1: Author the disclosure component (markup + behavior)**

`disclosure.twig` (trigger + target per the `js-behavior` blueprint markup contract):

```twig
<div class="disclosure">
  <button type="button" data-behavior="disclosure" aria-controls="disclosure-panel" aria-expanded="false">
    {{ label|default('Toggle') }}
  </button>
  <div id="disclosure-panel" hidden>{{ content|default('Panel content') }}</div>
</div>
```

`disclosure.js` (the blueprint pattern verbatim in shape; **not** a change to the blueprint — a fixture that uses it):

```js
(function (Drupal, once) {
  Drupal.behaviors.disclosure = {
    attach(context) {
      once('disclosure', '[data-behavior="disclosure"]', context).forEach((trigger) => {
        const target = document.querySelector(trigger.getAttribute('aria-controls'));
        trigger.addEventListener('click', () => {
          const open = trigger.getAttribute('aria-expanded') === 'true';
          trigger.setAttribute('aria-expanded', String(!open));
          if (target) target.hidden = open;
        });
      });
    },
  };
})(Drupal, once);
```

`disclosure.component.yml` (double quotes; `disableBasicStory: true`):

```yaml
"$schema": "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: "Disclosure"
status: "experimental"
props:
  type: "object"
  properties:
    label:
      type: "string"
    content:
      type: "string"
thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
```

`disclosure.default.story.yml`:

```yaml
"$schema": "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/misc/schemas/storybook.schema.json"
name: "Default"
args:
  label: "Toggle"
  content: "Panel content"
```

- [ ] **Step 2: Author a scene placing the component**

`designbook/demo.section.scenes.yml`:

```yaml
scenes:
  - name: "Disclosure demo"
    items:
      - component: "test_integration_drupal:disclosure"
        props:
          label: "Toggle"
          content: "Panel content"
```

- [ ] **Step 3: Bring up Storybook and confirm the scene story renders the behavior**

Run: `npx addon start --force` (from the integration workspace), open the `Sections/Demo` scene story. Confirm the disclosure markup is present.

- [ ] **Step 4: Write the playwright-cli scenario**

The path (asserted by the confirmed browser check): on the scene story, the `[data-behavior="disclosure"]` trigger starts `aria-expanded="false"` and its `#disclosure-panel` target is `hidden`; **click** → `aria-expanded="true"` and the panel is visible; **click again** → back to `aria-expanded="false"` and hidden (single toggle per click ⇒ no double-bind, AC-4).

- [ ] **Step 5: Run the scenario**

Run the confirmed playwright-cli path against the running Storybook scene story.
Expected: both toggles observed; no double-fire.

- [ ] **Step 6: Commit**

```bash
git add packages/integrations/test-integration-drupal/components/disclosure \
        packages/integrations/test-integration-drupal/designbook/demo.section.scenes.yml \
        packages/integrations/test-integration-drupal/.storybook/main.js
git commit -m "DESIGNBOOK-48: disclosure behavior fixture + scene for AC-7 scenario"
```

---

### Task 6: Full gate

- [ ] **Step 1: Run `pnpm check` from the repo root**

Run: `pnpm check`
Expected: typecheck → lint → test all PASS (AC-8).

- [ ] **Step 2: Commit any lint:fix formatting**

```bash
pnpm --filter storybook-addon-designbook lint:fix
git add -A && git commit -m "DESIGNBOOK-48: lint:fix formatting" || true
```

---

## Self-Review

**Spec coverage:**
- AC-1/AC-2 (load each distinct component's JS) → Task 2 resolver + Task 3/4 script-import emission (dedup via the unique-id `Set`). ✓
- AC-3 (attach exactly once per render pass) → Task 3/4 single `play` per story. ✓
- AC-4 (re-render no double-bind, `once()` available) → helper + blueprint `once()`; global `once()` from SDC `previewHead`; Task 5 second-click assertion. ✓
- AC-5 (entity view-mode stories) → Task 4. ✓
- AC-6 (component stories unregressed) → SDC path untouched; `play` only on generated CSF; Task 6 full suite. ✓
- AC-7 (browser-observable interaction) → Task 5. ✓
- AC-8 (`pnpm check` + generator-level guarantee) → Tasks 3/4 generator tests + Task 6. ✓

**Placeholder scan:** No TBD/TODO; the only deferred detail (AC-7 browser host) is an explicit human-confirmed test-plan decision, flagged in Task 5's host note, not a code placeholder.

**Type consistency:** `attachDrupalBehaviors(root)`, `defaultSdcScriptResolver(componentId, designbookDir)`, `resolveScriptPath?`, and `emitComponentImports(allIds, resolveImportPath, resolveScriptPath, wrapImport)` are used identically across Tasks 1–4.
