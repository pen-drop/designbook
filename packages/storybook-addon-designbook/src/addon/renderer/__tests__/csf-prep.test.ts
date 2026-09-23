import { describe, it, expect } from 'vitest';
import { buildCsfModule, buildEntityCsfModule } from '../../../scene-model/csf-prep';
import type { ComponentNode } from '../../../scene-model/types';

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
    expect(code).toContain(
      "import { renderComponent, attachDrupalBehaviors } from 'storybook-addon-designbook/renderer';",
    );
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

describe('buildCsfModule — extraImportLines', () => {
  it('emits extraImportLines directly after the renderer import', () => {
    const code = buildCsfModule({
      ...baseOpts,
      extraImportLines: ["import { h } from 'vue';"],
      scenes: [scene('Default', 'Default', [{ component: 'test:card', props: {}, path: '0' }])],
    });
    const lines = code.split('\n');
    const rendererIdx = lines.findIndex((l) => l.includes('storybook-addon-designbook/renderer'));
    expect(rendererIdx).toBeGreaterThanOrEqual(0);
    expect(lines[rendererIdx + 1]).toBe("import { h } from 'vue';");
  });

  it('emits no extra lines when extraImportLines is omitted', () => {
    const code = buildCsfModule({
      ...baseOpts,
      scenes: [scene('Default', 'Default', [{ component: 'test:card', props: {}, path: '0' }])],
    });
    expect(code).not.toContain("import { h } from 'vue';");
  });
});

describe('buildEntityCsfModule — extraImportLines', () => {
  it('emits extraImportLines directly after the renderer import', () => {
    const code = buildEntityCsfModule({
      group: 'Content/Article',
      source: 'article.entity.yml',
      mappingBasename: (vm) => `article.${vm}.jsonata`,
      resolveImportPath: (id) => `/abs/${id.split(':')[1]}.component.yml`,
      wrapImport: (alias) => `{ render: (p, s) => ${alias}.default.component({...p, ...s}) }`,
      extraImportLines: ["import { h } from 'vue';"],
      viewModes: [
        {
          view_mode: 'teaser',
          exportName: 'Teaser',
          recordsNodes: [[{ component: 'test:card', props: {}, path: '0' }]],
          recordsTrees: [[]],
          source: 'article.teaser.jsonata',
          fieldMappings: [],
        },
      ],
    });
    const lines = code.split('\n');
    const rendererIdx = lines.findIndex((l) => l.includes('storybook-addon-designbook/renderer'));
    expect(rendererIdx).toBeGreaterThanOrEqual(0);
    expect(lines[rendererIdx + 1]).toBe("import { h } from 'vue';");
  });
});
