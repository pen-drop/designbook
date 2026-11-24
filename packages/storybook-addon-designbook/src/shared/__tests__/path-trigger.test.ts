/**
 * `trigger.paths`: a rule/blueprint attaches to a file type by glob, OR-connected with
 * `steps`/`domain`, while `filter` keeps its AND semantics.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { matchRuleFiles } from '../planning-sources.js';
import type { DesignbookConfig } from '../config.js';

let agentsDir: string;
const home = '/work/theme';

function config(component: string): DesignbookConfig {
  return {
    data: `${home}/designbook`,
    'designbook.home': home,
    'designbook.data': `${home}/designbook`,
    'frameworks.component': component,
    extensions: [],
  } as unknown as DesignbookConfig;
}

beforeAll(() => {
  agentsDir = realpathSync(mkdtempSync(join(tmpdir(), 'path-trigger-')));
  const rules = join(agentsDir, 'skills/x/rules');
  mkdirSync(rules, { recursive: true });
  writeFileSync(
    join(rules, 'vue.md'),
    "---\ntrigger:\n  paths: ['$DESIGNBOOK_HOME/components/**/*.vue']\nfilter:\n  frameworks.component: vue\n---\n# vue\n",
  );
  writeFileSync(
    join(rules, 'stories.md'),
    "---\ntrigger:\n  steps: [write-component]\n  paths: ['components/**/*.story.yml']\n---\n# stories\n",
  );
});

afterAll(() => rmSync(agentsDir, { recursive: true, force: true }));

const names = (files: string[]) => files.map((f) => f.split('/').pop());

describe('trigger.paths', () => {
  it('matches a file under the glob', () => {
    const files = matchRuleFiles('edit', config('vue'), agentsDir, undefined, undefined, undefined, [
      `${home}/components/card/card.vue`,
    ]);
    expect(names(files)).toContain('vue.md');
  });

  it('skips a non-matching path', () => {
    const files = matchRuleFiles('edit', config('vue'), agentsDir, undefined, undefined, undefined, [
      `${home}/components/card/card.twig`,
    ]);
    expect(names(files)).not.toContain('vue.md');
  });

  it('filter still applies', () => {
    const files = matchRuleFiles('edit', config('sdc'), agentsDir, undefined, undefined, undefined, [
      `${home}/components/card/card.vue`,
    ]);
    expect(names(files)).not.toContain('vue.md');
  });

  it('resolves a relative glob against designbook.home', () => {
    const files = matchRuleFiles('edit', config('vue'), agentsDir, undefined, undefined, undefined, [
      `${home}/components/card/card.default.story.yml`,
    ]);
    expect(names(files)).toContain('stories.md');
  });

  it('paths undefined defers, steps still match', () => {
    const files = matchRuleFiles('write-component', config('vue'), agentsDir);
    expect(names(files)).toContain('stories.md');
    expect(names(files)).not.toContain('vue.md');
  });
});
