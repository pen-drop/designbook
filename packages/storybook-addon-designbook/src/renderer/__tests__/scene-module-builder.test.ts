/**
 * Integration test for the new async build pipeline.
 *
 * Uses test.scenes.yml with all 6 scene types and verifies:
 * - The generated module string contains no markers
 * - args.__scene has the correct ComponentNode structure
 */

import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { buildSceneModule } from '../scene-module-builder';
import { renderComponent } from '../renderer';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import type { ComponentNode } from '../types';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

async function buildFixtureModule(scenesFile: string) {
  const content = readFileSync(resolve(FIXTURES_DIR, scenesFile), 'utf-8');
  const raw = parseYaml(content) as Record<string, unknown>;

  return buildSceneModule(resolve(FIXTURES_DIR, scenesFile), raw, FIXTURES_DIR, {
    // No real SDC components in fixtures — use passthrough wrapImport for testing
    resolveImportPath: (componentId) => `./components/${componentId.split(':')[1]}.js`,
    wrapImport: (alias) => `{ render: (p, s) => ({ component: '${alias}', props: p, slots: s }) }`,
  });
}

/** Extract the __scene nodes array from the generated CSF module for a named export. */
function extractSceneNodes(module: string, exportName: string): ComponentNode[] {
  const sceneMarker = module.indexOf(`export const ${exportName}`);
  if (sceneMarker === -1) return [];
  const sceneStart = module.indexOf('__scene: ', sceneMarker);
  if (sceneStart === -1) return [];
  const arrayStart = module.indexOf('[', sceneStart);
  if (arrayStart === -1) return [];

  let depth = 0;
  let i = arrayStart;
  while (i < module.length) {
    if (module[i] === '[' || module[i] === '{') depth++;
    else if (module[i] === ']' || module[i] === '}') depth--;
    if (depth === 0) break;
    i++;
  }
  return JSON.parse(module.slice(arrayStart, i + 1)) as ComponentNode[];
}

describe('buildSceneModule integration', () => {
  it('produces no marker strings', async () => {
    const module = await buildFixtureModule('test.scenes.yml');

    expect(module).not.toContain('__ENTITY_EXPR__');
    expect(module).not.toContain('__END_ENTITY_EXPR__');
    expect(module).not.toContain('__LIST_EXPR__');
    expect(module).not.toContain('__END_LIST_EXPR__');
  });

  it('exports Flat scene with figure, heading, text-block nodes', async () => {
    const module = await buildFixtureModule('test.scenes.yml');

    // Flat scene: entity node.article.teaser → figure, heading, text-block
    expect(module).toContain('export const Flat');
    expect(module).toContain('figure');
    expect(module).toContain('heading');
    expect(module).toContain('text-block');
  });

  it('exports EntityInEntity scene with heading and badge (recursive entity resolution)', async () => {
    const module = await buildFixtureModule('test.scenes.yml');

    // with-author: heading + entity(user.user) → badge
    expect(module).toContain('export const EntityInEntity');
    expect(module).toContain('badge');
  });

  it('exports EntityInComponentSlot scene with card node containing badge in author slot', async () => {
    const module = await buildFixtureModule('test.scenes.yml');

    // card jsonata: card with author slot = entity(user.user) → badge
    expect(module).toContain('export const EntityInComponentSlot');
    expect(module).toContain('test_provider:card');
    expect(module).toContain('"author"');
    expect(module).toContain('badge');
  });

  it('exports ViewEntity scene — view component with resolved article components in items slot', async () => {
    const module = await buildFixtureModule('test.scenes.yml');

    expect(module).toContain('export const ViewEntity');

    const nodes = extractSceneNodes(module, 'ViewEntity');
    expect(nodes).toHaveLength(1);

    const viewNode = nodes[0]!;
    expect(viewNode.component).toBe('view');

    // items slot must contain resolved ComponentNodes — NOT unresolved entity refs
    const items = viewNode.slots?.['items'];
    expect(Array.isArray(items)).toBe(true);
    const itemsArray = items as ComponentNode[];
    expect(itemsArray.length).toBeGreaterThan(0);

    // Each item must be a ComponentNode (has component property), not a raw entity ref
    for (const item of itemsArray) {
      expect(typeof item.component).toBe('string');
    }

    // Article teaser resolves to figure, heading, text-block
    const componentNames = itemsArray.map((n) => n.component);
    expect(componentNames).toContain('figure');
    expect(componentNames).toContain('heading');
    expect(componentNames).toContain('text-block');
  });

  it('exports ComponentDirect scene — props and slots in correct structural position', async () => {
    const module = await buildFixtureModule('test.scenes.yml');

    const nodes = extractSceneNodes(module, 'ComponentDirect');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.component).toBe('test_provider:heading');
    expect(nodes[0]!.props).toEqual({ level: 'h1' });
    expect(nodes[0]!.slots).toEqual({ text: 'Hello World' });
  });

  it('exports ComponentMultipleProps scene — all props preserved, not in slots', async () => {
    const module = await buildFixtureModule('test.scenes.yml');

    const nodes = extractSceneNodes(module, 'ComponentMultipleProps');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.component).toBe('test_provider:button');
    expect(nodes[0]!.props).toEqual({ variant: 'outline', size: 'lg', disabled: true });
    expect(nodes[0]!.slots).toEqual({ text: 'Click me' });
    // Props must not bleed into slots
    expect(nodes[0]!.slots).not.toHaveProperty('variant');
    expect(nodes[0]!.slots).not.toHaveProperty('size');
  });

  it('exports ComponentPropsOnly scene — props set, slots absent', async () => {
    const module = await buildFixtureModule('test.scenes.yml');

    const nodes = extractSceneNodes(module, 'ComponentPropsOnly');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.component).toBe('test_provider:icon');
    expect(nodes[0]!.props).toEqual({ name: 'arrow-right', color: 'blue' });
    expect(nodes[0]!.slots).toBeUndefined();
  });

  it('exports ComponentSlotsOnly scene — slots set, props absent', async () => {
    const module = await buildFixtureModule('test.scenes.yml');

    const nodes = extractSceneNodes(module, 'ComponentSlotsOnly');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.component).toBe('test_provider:card');
    expect(nodes[0]!.props).toBeUndefined();
    expect(nodes[0]!.slots).toEqual({ title: 'My Card', body: 'Some content here' });
  });

  it('round-trip: props from YAML reach mod.render as first argument', async () => {
    const module = await buildFixtureModule('test.scenes.yml');
    const nodes = extractSceneNodes(module, 'ComponentDirect');

    // Simulate the runtime: feed the built nodes directly into renderComponent
    const renderSpy = vi.fn().mockReturnValue('rendered');
    const imports = { 'test_provider:heading': { render: renderSpy } };

    renderComponent(nodes, imports);

    expect(renderSpy).toHaveBeenCalledOnce();
    const [calledProps, calledSlots] = renderSpy.mock.calls[0]!;
    expect(calledProps).toEqual({ level: 'h1' });
    expect(calledSlots).toEqual({ text: 'Hello World' });
  });

  it('has import statements and __imports map', async () => {
    const module = await buildFixtureModule('test.scenes.yml');

    expect(module).toContain('import { renderComponent }');
    expect(module).toContain('const __imports');
    expect(module).toContain('render: (args) => renderComponent(args.__scene, __imports)');
  });

  it('exports default with correct title and tags', async () => {
    const module = await buildFixtureModule('test.scenes.yml');

    expect(module).toContain("title: 'Test/Scenes'");
    expect(module).toContain("tags: ['scene']");
  });
});
