import { describe, it, expect } from 'vitest';
import { renderSubmitResultsHint } from '../submit-results-hint.js';

describe('renderSubmitResultsHint', () => {
  it('returns null when no data-submission results exist', () => {
    const results = {
      shot: { path: '/x.png', submission: 'direct' as const },
    };
    expect(renderSubmitResultsHint('task-1', results)).toBeNull();
  });

  it('renders a single-data-result hint with path and $ref type', () => {
    const results = {
      'component-yml': {
        path: 'components/button/button.component.yml',
        $ref: '#/definitions/SdcComponentYaml',
        submission: 'data' as const,
      },
    };
    const hint = renderSubmitResultsHint('task-1', results)!;
    expect(hint).toContain('workflow done --task task-1 --data');
    expect(hint).toContain('"component-yml": <SdcComponentYaml>');
    expect(hint).toContain('→ components/button/button.component.yml');
  });

  it('annotates flush: immediate results inline', () => {
    const results = {
      story: {
        path: 'button/button.default.story.yml',
        $ref: '#/definitions/SdcStory',
        submission: 'data' as const,
        flush: 'immediate' as const,
      },
    };
    const hint = renderSubmitResultsHint('task-1', results)!;
    expect(hint).toContain('(flush: immediate)');
  });

  it('lists direct-submission results in a separate block', () => {
    const results = {
      yml: { path: 'a.yml', $ref: '#/definitions/SdcComponentYaml', submission: 'data' as const },
      shot: { path: 'shot.png', submission: 'direct' as const },
    };
    const hint = renderSubmitResultsHint('task-1', results)!;
    expect(hint).toContain('Direct-submission results');
    expect(hint).toContain('→ shot.png');
  });

  it('falls back to inline type when $ref is absent', () => {
    const results = {
      tokens: { path: 'tokens.yml', type: 'object', submission: 'data' as const },
    };
    const hint = renderSubmitResultsHint('task-1', results)!;
    expect(hint).toContain('"tokens": <object>');
  });
});
