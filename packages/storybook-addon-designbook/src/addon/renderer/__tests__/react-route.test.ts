import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildSceneModule,
  defaultReactResolver,
  defaultReactWrapImport,
  defaultReactExtraImportLines,
  defaultReactRenderExpression,
} from '../../../scene-model/scene-module-builder';
import { buildEntityCsfModule } from '../../../scene-model/csf-prep';
import { reactBuiltInComponents } from '../../../scene-model/built-in-components';
import type { ComponentNode, SceneTreeNode } from '../../../scene-model/types';

function makeReactFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'designbook-react-route-'));
  const designbookDir = join(root, 'designbook');
  mkdirSync(designbookDir, { recursive: true });
  const cardDir = join(root, 'components', 'card');
  mkdirSync(cardDir, { recursive: true });
  writeFileSync(join(cardDir, 'card.tsx'), 'export default function Card() { return null; }');
  return designbookDir;
}

const reactOptions = (designbookDir: string) => ({
  resolveImportPath: (id: string) => defaultReactResolver(id, designbookDir),
  wrapImport: defaultReactWrapImport,
  extraImportLines: defaultReactExtraImportLines,
  builtInComponents: reactBuiltInComponents,
  renderExpression: defaultReactRenderExpression,
});

describe('defaultReactResolver', () => {
  it('resolves provider:name to components/<name>/<name>.tsx', () => {
    const designbookDir = makeReactFixture();
    expect(defaultReactResolver('test:card', designbookDir)).toBe(
      join(designbookDir, '..', 'components', 'card', 'card.tsx'),
    );
  });

  it('returns null for a missing component', () => {
    expect(defaultReactResolver('test:missing', makeReactFixture())).toBeNull();
  });

  it('rejects a malformed identifier', () => {
    expect(defaultReactResolver('card', makeReactFixture())).toBeNull();
  });
});

describe('defaultReactWrapImport', () => {
  it('creates an element of the default export with props then slots', () => {
    const calls: unknown[][] = [];
    const __dbReact = { createElement: (...a: unknown[]) => (calls.push(a), 'el') };
    const card = { default: function Card() {} };
    const mod = new Function('__dbReact', 'card', `return ${defaultReactWrapImport('card')};`)(__dbReact, card) as {
      render: (p: unknown, s: unknown) => unknown;
    };
    expect(mod.render({ title: 'A', children: 'prop' }, { children: 'slot' })).toBe('el');
    expect(calls[0]).toEqual([card.default, { title: 'A', children: 'slot' }]);
  });
});

describe('React CSF route', () => {
  it('scene module imports the TSX module and renders through the React helpers', async () => {
    const designbookDir = makeReactFixture();
    const code = await buildSceneModule(
      join(designbookDir, 'design-system', 'x.scenes.yml'),
      {
        group: 'Designbook/Design System',
        scenes: [
          {
            name: 'Card',
            items: [{ component: 'test:card', slots: { children: [{ type: 'element', value: '<b>x</b>' }] } }],
          },
        ],
      },
      designbookDir,
      reactOptions(designbookDir),
    );
    expect(code).toContain(
      `import * as testcard from '${join(designbookDir, '..', 'components', 'card', 'card.tsx')}';`,
    );
    expect(code).toContain(defaultReactExtraImportLines[0]);
    expect(code).toContain('render: (args) => __dbReact.story(renderComponent(args.__scene, __imports, __dbReact))');
    expect(code).toContain("'designbook:element': { render:");
    expect(code).toContain('__dbReact.builtIns');
    expect(code).not.toContain("from 'vue'");
  });

  it('entity view and form stories render through the React helpers', () => {
    const node: ComponentNode = { component: 'test:card', props: {}, path: '0' };
    const tree: SceneTreeNode = { kind: 'entity', component: 'test:card', props: {}, path: '0' };
    const mode = {
      exportName: 'Full',
      recordsNodes: [[node]],
      recordsTrees: [[tree]],
      source: '',
      fieldMappings: [],
    };
    const code = buildEntityCsfModule({
      group: 'Entities/node/Article',
      source: 'node.article.yml',
      mappingBasename: (vm) => `${vm}.jsonata`,
      viewModes: [{ ...mode, view_mode: 'full' }],
      formModes: [{ ...mode, exportName: 'FormDefault', form_mode: 'default' }],
      resolveImportPath: () => './card.tsx',
      wrapImport: defaultReactWrapImport,
      extraImportLines: defaultReactExtraImportLines,
      builtInComponents: reactBuiltInComponents,
      renderExpression: defaultReactRenderExpression,
    });
    const renders = code.match(/render: \(args\) => .*$/gm) ?? [];
    expect(renders).toHaveLength(2);
    for (const line of renders) {
      expect(line).toBe(
        'render: (args) => __dbReact.story(renderComponent(args.__records[args.record], __imports, __dbReact)),',
      );
    }
  });

  it('SDC default output is unchanged (no React helpers)', async () => {
    const designbookDir = makeReactFixture();
    const code = await buildSceneModule(
      join(designbookDir, 'x.scenes.yml'),
      { group: 'G', scenes: [{ name: 'A', items: [{ component: 'test:card' }] }] },
      designbookDir,
      { resolveImportPath: () => './card.component.yml' },
    );
    expect(code).toContain('render: (args) => renderComponent(args.__scene, __imports)');
    expect(code).not.toContain('__dbReact');
  });
});
