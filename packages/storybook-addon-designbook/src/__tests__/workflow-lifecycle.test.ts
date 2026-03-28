import { describe, it, expect } from 'vitest';
import {
  getNextStage,
  getNextStep,
  checkStageParams,
  interpolatePrompt,
  DECLARED_STAGES,
} from '../workflow-lifecycle.js';

describe('getNextStage', () => {
  it('full lifecycle with all stages present', () => {
    const stages = {
      execute: { steps: ['intake', 'create-component'] },
      test: { steps: ['visual-diff'] },
      preview: { steps: ['storybook-preview'] },
    };

    expect(getNextStage('execute', stages)).toBe('committed');
    expect(getNextStage('committed', stages)).toBe('test');
    expect(getNextStage('test', stages)).toBe('preview');
    expect(getNextStage('preview', stages)).toBe('finalizing');
    expect(getNextStage('finalizing', stages)).toBe('done');
    expect(getNextStage('done', stages)).toBeNull();
  });

  it('skips empty stages (no test, no preview)', () => {
    const stages = {
      execute: { steps: ['intake', 'create-tokens'] },
    };

    expect(getNextStage('execute', stages)).toBe('committed');
    expect(getNextStage('committed', stages)).toBe('finalizing');
    expect(getNextStage('finalizing', stages)).toBe('done');
  });

  it('skips test but keeps preview', () => {
    const stages = {
      execute: { steps: ['create-component'] },
      preview: { steps: ['storybook-preview'] },
    };

    expect(getNextStage('committed', stages)).toBe('preview');
  });

  it('returns null for unknown stage', () => {
    expect(getNextStage('unknown', {})).toBeNull();
  });

  it('returns null when already at done', () => {
    expect(getNextStage('done', { execute: { steps: ['a'] } })).toBeNull();
  });

  it('exports DECLARED_STAGES', () => {
    expect(DECLARED_STAGES).toEqual(['execute', 'test', 'preview']);
  });
});

describe('getNextStep', () => {
  const makeTasks = (items: Array<{ step: string; stage: string; status: string }>) => items;

  it('returns next pending step in stage', () => {
    const tasks = makeTasks([
      { step: 'intake', stage: 'execute', status: 'done' },
      { step: 'create-component', stage: 'execute', status: 'pending' },
      { step: 'create-scene', stage: 'execute', status: 'pending' },
    ]);

    expect(getNextStep('execute', 'intake', tasks)).toBe('create-component');
  });

  it('returns null when all steps in stage done', () => {
    const tasks = makeTasks([
      { step: 'intake', stage: 'execute', status: 'done' },
      { step: 'create-component', stage: 'execute', status: 'done' },
    ]);

    expect(getNextStep('execute', 'create-component', tasks)).toBeNull();
  });

  it('ignores tasks from other stages', () => {
    const tasks = makeTasks([
      { step: 'intake', stage: 'execute', status: 'done' },
      { step: 'visual-diff', stage: 'test', status: 'pending' },
    ]);

    expect(getNextStep('execute', 'intake', tasks)).toBeNull();
  });
});

describe('checkStageParams', () => {
  it('returns unfulfilled params', () => {
    const stages = {
      preview: {
        steps: ['storybook-preview'],
        params: {
          user_approved: { type: 'boolean', prompt: 'Passt alles?' },
        },
      },
    };

    const result = checkStageParams('preview', stages, {});
    expect(result).toEqual({
      user_approved: { type: 'boolean', prompt: 'Passt alles?' },
    });
  });

  it('returns null when all provided', () => {
    const stages = {
      preview: {
        steps: ['storybook-preview'],
        params: {
          user_approved: { type: 'boolean', prompt: 'Passt alles?' },
        },
      },
    };

    const result = checkStageParams('preview', stages, { user_approved: true });
    expect(result).toBeNull();
  });

  it('returns null for stage without params', () => {
    const stages = {
      execute: { steps: ['intake'] },
    };

    expect(checkStageParams('execute', stages, {})).toBeNull();
  });

  it('returns null for unknown stage', () => {
    expect(checkStageParams('nonexistent', {}, {})).toBeNull();
  });
});

describe('interpolatePrompt', () => {
  it('replaces known variables', () => {
    const result = interpolatePrompt('Preview unter {preview_url} — passt alles?', {
      preview_url: 'http://localhost:6006',
    });
    expect(result).toBe('Preview unter http://localhost:6006 — passt alles?');
  });

  it('keeps unknown variables as-is', () => {
    const result = interpolatePrompt('Branch {branch} mergen?', {});
    expect(result).toBe('Branch {branch} mergen?');
  });

  it('handles multiple variables', () => {
    const result = interpolatePrompt('{a} and {b}', { a: 'foo', b: 'bar' });
    expect(result).toBe('foo and bar');
  });
});
