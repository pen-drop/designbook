import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { buildEntityModule } from '../entity-module-builder';
import { buildEntityCsfModule, type EntityCsfViewMode, type EntityCsfFormMode } from '../csf-prep';
import { formExportName } from '../scene-metadata';
import type { ComponentNode, SceneTreeNode } from '../types';
import { indexForm } from '../../preset';

const FIXTURES = resolve(__dirname, 'fixtures');
// Anchored on a view-mode mapping; the builder discovers the bundle's
// entity-mapping/ view siblings AND its form-mapping/ form siblings.
const VIEW_MAPPING = resolve(FIXTURES, 'entity-mapping', 'node.article.default.jsonata');
// A bundle with view mappings but no form-mapping/ sibling (AC-9).
const NO_FORM_MAPPING = resolve(FIXTURES, 'entity-mapping', 'user.user.compact.jsonata');

/** Extract the source of a single named story export from a CSF module string. */
function storyBlock(code: string, exportName: string): string {
  const marker = `export const ${exportName} = {`;
  const start = code.indexOf(marker);
  if (start === -1) return '';
  const end = code.indexOf('\n};', start);
  return code.slice(start, end === -1 ? undefined : end + 3);
}

describe('form_modes discovery in the entity module (DESIGNBOOK-34)', () => {
  it('appends one form story per form_mode with a Form-prefixed export, name and tag (AC-1/AC-3/AC-5)', async () => {
    const code = await buildEntityModule(VIEW_MAPPING, FIXTURES, { resolveImportPath: () => './stub.js' });
    expect(code).toContain('export const FormDefault = {');
    const block = storyBlock(code, 'FormDefault');
    expect(block).toContain("name: 'default (form)'");
    expect(block).toContain("tags: ['form']");
  });

  it('is collision-free: view default and form default yield two distinct stories (AC-2)', async () => {
    const code = await buildEntityModule(VIEW_MAPPING, FIXTURES, { resolveImportPath: () => './stub.js' });
    // Two distinct exports in the one module.
    expect(code).toContain('export const Default = {');
    expect(code).toContain('export const FormDefault = {');
    // The view story keeps its bare mode name; the form story is tagged + suffixed.
    expect(storyBlock(code, 'Default')).toContain("name: 'default'");
    expect(storyBlock(code, 'Default')).not.toContain("tags: ['form']");
    // Collision impossible by directory namespace — two different files on disk.
    expect(existsSync(resolve(FIXTURES, 'entity-mapping', 'node.article.default.jsonata'))).toBe(true);
    expect(existsSync(resolve(FIXTURES, 'form-mapping', 'node.article.default.jsonata'))).toBe(true);
  });

  it('emits the Structure sceneTrees param on the form story (AC-8)', async () => {
    const code = await buildEntityModule(VIEW_MAPPING, FIXTURES, { resolveImportPath: () => './stub.js' });
    expect(storyBlock(code, 'FormDefault')).toContain('sceneTrees:');
  });

  it('a bundle without a form-mapping/ sibling yields zero form stories (AC-9)', async () => {
    const code = await buildEntityModule(NO_FORM_MAPPING, FIXTURES, { resolveImportPath: () => './stub.js' });
    expect(code).not.toContain('(form)');
    expect(code).not.toContain("tags: ['form']");
  });
});

describe('view-mode output is unchanged by the presence of form modes (AC-7)', () => {
  const card = (title: string): ComponentNode => ({ component: 'ui:card', props: { title }, path: '0' });
  const cardTree = (title: string): SceneTreeNode => ({
    kind: 'entity',
    component: 'ui:card',
    props: { title },
    path: '0',
  });
  const viewModes: EntityCsfViewMode[] = [
    {
      view_mode: 'full',
      exportName: 'Full',
      recordsNodes: [[card('A')], [card('B')]],
      recordsTrees: [[cardTree('A')], [cardTree('B')]],
      source: '$.{ "component": "ui:card", "props": { "title": title } }',
      fieldMappings: [{ field: 'title', component: 'ui:card', target: 'title', type: 'prop' as const }],
    },
  ];
  const formModes: EntityCsfFormMode[] = [
    {
      form_mode: 'default',
      exportName: formExportName('default'),
      recordsNodes: [[card('F')], [card('G')]],
      recordsTrees: [[cardTree('F')], [cardTree('G')]],
      source: '$.{ "component": "ui:card", "props": { "title": title } }',
      fieldMappings: [{ field: 'title', component: 'ui:card', target: 'title', type: 'prop' as const }],
    },
  ];
  const base = {
    group: 'Entities/node/Article',
    source: 'node.article.full.jsonata',
    mappingBasename: (vm: string) => `node.article.${vm}.jsonata`,
    formMappingBasename: (fm: string) => `node.article.${fm}.jsonata`,
    resolveImportPath: (id: string) => (id === 'ui:card' ? './card.js' : null),
  };

  /** The module up to (but excluding) the first form story export. */
  const viewPortion = (code: string): string => {
    const idx = code.indexOf('export const FormDefault');
    return idx === -1 ? code : code.slice(0, idx);
  };

  it('emits a byte-identical view story whether or not form modes are present', () => {
    const withoutForm = buildEntityCsfModule({ ...base, viewModes });
    const withForm = buildEntityCsfModule({ ...base, viewModes, formModes });
    // The view portion of the with-form module equals the whole without-form module
    // minus its trailing blank line separator before the appended form story.
    expect(withoutForm).toContain('export const Full = {');
    expect(withForm.startsWith(viewPortion(withForm))).toBe(true);
    // The Full view export is byte-identical in both.
    const fullOf = (c: string) =>
      c.slice(c.indexOf('export const Full = {'), c.indexOf('\n};', c.indexOf('export const Full = {')) + 3);
    expect(fullOf(withForm)).toBe(fullOf(withoutForm));
  });
});

describe('form indexer ↔ module export-name parity (R1)', () => {
  const FORM_FILE = resolve(FIXTURES, 'form-mapping', 'node.article.default.jsonata');

  it('indexForm export name equals formExportName and the module export', async () => {
    const entries = indexForm(FORM_FILE);
    expect(entries).toHaveLength(1);
    expect(entries[0].exportName).toBe(formExportName('default'));
    expect(entries[0].exportName).toBe('FormDefault');
    expect(entries[0].name).toBe('default (form)');
    expect(entries[0].tags).toEqual(['entity', 'form']);
    expect(entries[0].title).toBe('Entities/node/Article');

    const code = await buildEntityModule(VIEW_MAPPING, FIXTURES, { resolveImportPath: () => './stub.js' });
    expect(code).toContain(`export const ${entries[0].exportName} = {`);
  });

  it('redirects the form entry importPath to the canonical entity-mapping module', () => {
    const entries = indexForm(FORM_FILE);
    // Canonical = first sorted entity-mapping for the bundle (node.article.card.jsonata).
    expect(entries[0].importPath).toContain('entity-mapping/node.article.card.jsonata');
    expect(entries[0].importPath).not.toContain('form-mapping');
  });
});
