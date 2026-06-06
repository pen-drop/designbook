import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadWorkflowDefinition } from '../workflow-discovery.js';

function setup(name: string, frontmatter: string) {
  const root = resolve(tmpdir(), `discovery-${name}-${Date.now()}`);
  const wfDir = resolve(root, 'skills', 'designbook', 'design', 'workflows');
  mkdirSync(wfDir, { recursive: true });
  writeFileSync(resolve(wfDir, 'test-wf.md'), `---\n${frontmatter}\n---\n`);
  return root;
}

describe('loadWorkflowDefinition after:', () => {
  it('parses after declarations with param mappings', () => {
    const root = setup(
      'after',
      [
        'title: Test',
        'stages:',
        '  intake: { steps: [intake] }',
        'after:',
        '  - workflow: design-verify',
        '    params:',
        '      story_id: story_id',
      ].join('\n'),
    );
    const def = loadWorkflowDefinition('test-wf', root);
    expect(def.after).toEqual([{ workflow: 'design-verify', params: { story_id: 'story_id' } }]);
    rmSync(root, { recursive: true });
  });

  it('returns empty array when after is absent', () => {
    const root = setup('no-after', 'title: Test\nstages:\n  intake: { steps: [intake] }');
    const def = loadWorkflowDefinition('test-wf', root);
    expect(def.after).toEqual([]);
    rmSync(root, { recursive: true });
  });

  it('parses after declarations with a when: condition', () => {
    const root = setup(
      'when',
      [
        'title: Test',
        'stages:',
        '  intake: { steps: [intake] }',
        'after:',
        '  - workflow: design-verify',
        '    when: "$count(components) <= 1"',
        '    params:',
        '      story_id: story_id',
      ].join('\n'),
    );
    const def = loadWorkflowDefinition('test-wf', root);
    expect(def.after).toEqual([
      { workflow: 'design-verify', when: '$count(components) <= 1', params: { story_id: 'story_id' } },
    ]);
    rmSync(root, { recursive: true });
  });

  it('parses after declarations with when: but no params', () => {
    const root = setup(
      'when-no-params',
      [
        'title: Test',
        'stages:',
        '  intake: { steps: [intake] }',
        'after:',
        '  - workflow: design-verify',
        '    when: "$count(components) <= 1"',
      ].join('\n'),
    );
    const def = loadWorkflowDefinition('test-wf', root);
    expect(def.after).toEqual([{ workflow: 'design-verify', when: '$count(components) <= 1' }]);
    rmSync(root, { recursive: true });
  });
});
