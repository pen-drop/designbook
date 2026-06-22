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
