import { describe, expect, it } from 'vitest';
import { computeFlowRate } from '../composite.js';

describe('computeFlowRate', () => {
  it('berechnet flow_rate aus success_rate und friction', () => {
    const r = computeFlowRate({ successRate: 0.85, errors: 0, retries: 2, unresolved: 0 });
    // friction = 0*5 + 2*2 + 0*3 = 4
    // flow_rate = 0.85 * 100 - 4 = 81
    expect(r.flowRate).toBeCloseTo(81);
    expect(r.successRate).toBe(0.85);
    expect(r.metrics).toEqual({ errors: 0, retries: 2, unresolved: 0 });
  });

  it('gibt negatives flow_rate zurück wenn kein success_rate', () => {
    const r = computeFlowRate({ errors: 3, retries: 1, unresolved: 1 });
    // friction = 3*5 + 1*2 + 1*3 = 20
    // flow_rate = 0 - 20 = -20
    expect(r.flowRate).toBe(-20);
    expect(r.successRate).toBeUndefined();
  });

  it('flow_rate ist 100 bei perfektem Run', () => {
    const r = computeFlowRate({ successRate: 1, errors: 0, retries: 0, unresolved: 0 });
    expect(r.flowRate).toBe(100);
  });
});
