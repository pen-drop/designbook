import { describe, it, expect } from 'vitest';
import { globSync } from 'glob';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { matchBlueprintFiles } from '../planning-sources';
import type { DesignbookConfig } from '../config';
import { load } from 'js-yaml';

const ROOT = resolve(__dirname, '../../../../../.agents/skills');
const EXEMPT = new Set(['designbook-drupal/install/rules/detect-drupal.md']);

function frontmatter(file: string): Record<string, unknown> {
  const m = readFileSync(file, 'utf-8').match(/^---\n([\s\S]*?)\n---/);
  return (m?.[1] ? load(m[1]) : {}) as Record<string, unknown>;
}

describe.each([
  ['designbook-drupal', ['backend', 'frameworks.component']],
  ['designbook-vue', ['frameworks.component']],
])('%s artifacts are gated', (skill, keys) => {
  const files = globSync(`${skill}/**/{tasks,rules,blueprints}/*.md`, { cwd: ROOT });
  it.each(files.filter((f) => !EXEMPT.has(f)))('%s', (rel) => {
    const filter = (frontmatter(resolve(ROOT, rel)).filter ?? {}) as Record<string, unknown>;
    expect(keys.some((k) => k in filter)).toBe(true);
  });
});

// SDC/UI-Patterns mapping blueprints must not load for a Vue + Drupal project.
const SDC_MAPPING = ['field-map', 'ui-patterns', 'views', 'layout-builder-display', 'presenter-template', 'pager'];
describe('data-mapping blueprint resolution per component framework (drupal backend)', () => {
  const AGENTS = resolve(ROOT, '..');
  const resolveFor = (component: string) =>
    matchBlueprintFiles(
      'map-entity',
      {
        backend: 'drupal',
        extensions: [{ id: 'layout_builder' }],
        frameworks: { component },
      } as unknown as DesignbookConfig,
      AGENTS,
      undefined,
      ['data-mapping'],
    ).map((p) => relative(ROOT, p));

  it('vue gets the Vue field-map and none of the SDC mapping blueprints', () => {
    const files = resolveFor('vue');
    expect(files).toContain('designbook-vue/data-mapping/blueprints/field-map.md');
    for (const name of SDC_MAPPING) expect(files).not.toContain(`designbook-drupal/data-mapping/blueprints/${name}.md`);
  });

  it('sdc still gets the SDC mapping blueprints and not the Vue field-map', () => {
    const files = resolveFor('sdc');
    for (const name of SDC_MAPPING) expect(files).toContain(`designbook-drupal/data-mapping/blueprints/${name}.md`);
    expect(files).not.toContain('designbook-vue/data-mapping/blueprints/field-map.md');
  });
});
