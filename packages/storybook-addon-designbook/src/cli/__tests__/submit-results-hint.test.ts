import { describe, it, expect } from 'vitest';
import { renderSubmitResultsHint } from '../submit-results-hint.js';

describe('renderSubmitResultsHint', () => {
  it('returns null when no data-submission results exist', () => {
    const schema = {
      result: { properties: { shot: { path: '/x.png', submission: 'direct' as const } } },
    };
    expect(renderSubmitResultsHint('task-1', schema)).toBeNull();
  });

  it('renders a single-data-result hint with path and $ref type', () => {
    const schema = {
      result: {
        properties: {
          'component-yml': {
            path: 'components/button/button.component.yml',
            $ref: '../schemas.yml#/SdcComponentYaml',
            submission: 'data' as const,
          },
        },
      },
    };
    const hint = renderSubmitResultsHint('task-1', schema)!;
    expect(hint).toContain('workflow done --task task-1 --data');
    expect(hint).toContain('"component-yml": <SdcComponentYaml>');
    expect(hint).toContain('→ components/button/button.component.yml');
  });

  it('annotates flush: immediate results inline', () => {
    const schema = {
      result: {
        properties: {
          story: {
            path: 'button/button.default.story.yml',
            $ref: '../schemas.yml#/SdcStory',
            submission: 'data' as const,
            flush: 'immediate' as const,
          },
        },
      },
    };
    const hint = renderSubmitResultsHint('task-1', schema)!;
    expect(hint).toContain('(flush: immediate)');
  });

  it('lists direct-submission results in a separate block', () => {
    const schema = {
      result: {
        properties: {
          yml: {
            path: 'a.yml',
            $ref: '../schemas.yml#/SdcComponentYaml',
            submission: 'data' as const,
          },
          shot: { path: 'shot.png', submission: 'direct' as const },
        },
      },
    };
    const hint = renderSubmitResultsHint('task-1', schema)!;
    expect(hint).toContain('Direct-submission results');
    expect(hint).toContain('→ shot.png');
  });

  it('falls back to inline type when $ref is absent', () => {
    const schema = {
      result: {
        properties: {
          tokens: { path: 'tokens.yml', type: 'object', submission: 'data' as const },
        },
      },
    };
    const hint = renderSubmitResultsHint('task-1', schema)!;
    expect(hint).toContain('"tokens": <object>');
  });
});
