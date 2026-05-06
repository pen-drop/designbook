import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { injectFlowRate } from '../workflow.js';

describe('injectFlowRate', () => {
  it('computes flow_rate from success_rate + dbo.log errors', () => {
    const root = resolve(tmpdir(), `inject-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    writeFileSync(
      resolve(root, 'dbo.log'),
      [
        JSON.stringify({ ts: '2026-05-06T00:00:00Z', cmd: 'workflow create', tagged: true, error: 'oops' }),
        JSON.stringify({ ts: '2026-05-06T00:00:01Z', cmd: 'workflow done', tagged: true, error: 'oops2' }),
      ].join('\n') + '\n',
    );
    const scope: Record<string, unknown> = { workflow_output: { success_rate: 0.9 } };
    injectFlowRate(root, scope);
    const wo = scope.workflow_output as Record<string, unknown>;
    // friction = 2*5 = 10; flow_rate = 90 - 10 = 80
    expect(wo.flow_rate).toBeCloseTo(80);
    expect((wo.metrics as Record<string, number>).errors).toBe(2);
    expect((wo.metrics as Record<string, number>).retries).toBe(0);
    rmSync(root, { recursive: true });
  });

  it('sets flow_rate to 0 when no dbo.log and no success_rate', () => {
    const root = resolve(tmpdir(), `inject-empty-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    // no dbo.log
    const scope: Record<string, unknown> = { workflow_output: {} };
    injectFlowRate(root, scope);
    const wo = scope.workflow_output as Record<string, unknown>;
    expect(wo.flow_rate).toBe(0);
    expect(wo.success_rate).toBeUndefined();
    rmSync(root, { recursive: true });
  });

  it('creates workflow_output if missing from scope', () => {
    const root = resolve(tmpdir(), `inject-missing-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    const scope: Record<string, unknown> = {};
    injectFlowRate(root, scope);
    expect(scope.workflow_output).toBeDefined();
    expect((scope.workflow_output as Record<string, unknown>).flow_rate).toBe(0);
    rmSync(root, { recursive: true });
  });
});
