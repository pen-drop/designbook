import { describe, it, expect } from 'vitest';
import { buildArtifactIndex } from '../reverse-index.js';
import type { ResolvedStep } from '../../workflow-resolve.js';

describe('buildArtifactIndex', () => {
  const stepResolved: Record<string, ResolvedStep | ResolvedStep[]> = {
    'extract-reference': {
      task_file: '/x/extract-reference.md',
      rules: ['/x/rules/screen-compare.md'],
      blueprints: [],
      config_rules: [],
      config_instructions: [],
    },
    intake: {
      task_file: '/x/intake--design-shell.md',
      rules: ['/x/rules/screen-compare.md', '/x/rules/markup-derivation.md'],
      blueprints: ['/x/blueprints/static-assets.md'],
      config_rules: [],
      config_instructions: [],
    },
  };
  const stages = {
    reference: { steps: ['extract-reference'] },
    intake: { steps: ['intake'] },
  };

  it('returns one entry per unique rule slug', () => {
    const idx = buildArtifactIndex(stepResolved, stages, 'rule');
    expect(Object.keys(idx).sort()).toEqual(['markup-derivation', 'screen-compare']);
  });

  it('lists every (stage, task) reference for a slug, in stage order', () => {
    const idx = buildArtifactIndex(stepResolved, stages, 'rule');
    expect(idx['screen-compare']).toEqual([
      { stage: 'reference', task: 'extract-reference' },
      { stage: 'intake', task: 'intake' },
    ]);
  });

  it('builds blueprint index independently from rule index', () => {
    expect(buildArtifactIndex(stepResolved, stages, 'blueprint')).toEqual({
      'static-assets': [{ stage: 'intake', task: 'intake' }],
    });
  });

  it('returns empty when no task references the artifact kind', () => {
    expect(buildArtifactIndex({}, {}, 'rule')).toEqual({});
  });

  it('handles an array-form ResolvedStep (multiple tasks per step)', () => {
    const multi: Record<string, ResolvedStep | ResolvedStep[]> = {
      multi: [
        { task_file: '/a.md', rules: ['/x/rules/a.md'], blueprints: [], config_rules: [], config_instructions: [] },
        { task_file: '/b.md', rules: ['/x/rules/a.md'], blueprints: [], config_rules: [], config_instructions: [] },
      ],
    };
    const idx = buildArtifactIndex(multi, { only: { steps: ['multi'] } }, 'rule');
    expect(idx.a).toEqual([
      { stage: 'only', task: 'multi' },
      { stage: 'only', task: 'multi' },
    ]);
  });
});
