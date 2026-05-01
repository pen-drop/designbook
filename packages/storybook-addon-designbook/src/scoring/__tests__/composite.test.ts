import { describe, expect, it } from 'vitest';
import { computeScore, evalAssertions, type ScoreInput } from '../composite.js';

describe('computeScore', () => {
  it('combines success_rate, assertions, and friction (max 130)', () => {
    const input: ScoreInput = {
      successRate: 0.7,
      assertions: { passed: 3, total: 4, failures: ['x'] },
      errors: 0,
      retries: 1,
      unresolved: 0,
    };
    const r = computeScore(input);
    // 0.7*100 + (3/4)*30 - 0 - 1*2 - 0 = 70 + 22.5 - 2 = 90.5
    expect(r.score).toBeCloseTo(90.5, 1);
    expect(r.computedFrom).toBe('composite');
  });

  it('falls back to friction-only when neither success_rate nor assertions are present', () => {
    const input: ScoreInput = { errors: 4, retries: 5, unresolved: 1 };
    const r = computeScore(input);
    // -4*5 -5*2 -1*3 = -20 -10 -3 = -33
    expect(r.score).toBe(-33);
    expect(r.computedFrom).toBe('friction');
  });

  it('uses success_rate alone when assertions are absent', () => {
    const r = computeScore({ successRate: 1.0, errors: 0, retries: 0, unresolved: 0 });
    expect(r.score).toBe(100);
    expect(r.computedFrom).toBe('composite');
  });

  it('uses assertions alone when success_rate is absent', () => {
    const r = computeScore({
      assertions: { passed: 4, total: 4, failures: [] },
      errors: 0,
      retries: 0,
      unresolved: 0,
    });
    expect(r.score).toBe(30);
    expect(r.computedFrom).toBe('composite');
  });
});

describe('evalAssertions', () => {
  it('passes assertions that return truthy', () => {
    const r = evalAssertions([{ type: 'javascript', value: 'output.x === 1' }], { x: 1 });
    expect(r.passed).toBe(1);
    expect(r.total).toBe(1);
    expect(r.failures).toEqual([]);
  });

  it('records failures with their source', () => {
    const r = evalAssertions([{ type: 'javascript', value: 'output.x === 2' }], { x: 1 });
    expect(r.passed).toBe(0);
    expect(r.failures).toEqual(['output.x === 2']);
  });

  it('isolates from outer scope (no access to process)', () => {
    const r = evalAssertions([{ type: 'javascript', value: 'typeof process === "undefined"' }], {});
    expect(r.passed).toBe(1);
  });

  it('treats throws as failures', () => {
    const r = evalAssertions([{ type: 'javascript', value: 'output.missing.deep.thing' }], {});
    expect(r.passed).toBe(0);
    expect(r.failures).toHaveLength(1);
  });

  it('skips assertions with unknown type', () => {
    const r = evalAssertions([{ type: 'regex', value: 'foo' }], {});
    expect(r.total).toBe(0);
  });
});
