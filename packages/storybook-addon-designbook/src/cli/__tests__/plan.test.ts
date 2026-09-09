/**
 * `plan done` validates a result against the frozen in-plan contract only — no skill
 * re-read, no discovery — and refuses when the stored digest no longer matches (AC-6).
 */
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import { register as registerPlan } from '../plan.js';
import { serializePlan, parsePlan, planDigest, type Plan } from '../../plan-document.js';

function freshPlan(): Plan {
  const plan: Plan = {
    workflow: 'design-component',
    digest: '',
    definitions: { ComponentResult: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
    context: {},
    steps: [
      {
        name: 'component',
        context: [],
        tasks: [
          {
            name: 'create-component',
            title: 'pet-card',
            done: false,
            params: {},
            contract: {
              outputs: { component: { required: true, submission: 'data', schema: { $ref: '#/definitions/ComponentResult' } } },
            },
            results: null,
          },
        ],
      },
    ],
  };
  plan.digest = planDigest(plan);
  return plan;
}

async function run(args: string[]): Promise<void> {
  const program = new Command();
  program.exitOverride();
  registerPlan(program);
  await program.parseAsync(['node', 'cli', ...args]);
}

describe('plan done', () => {
  it('ticks the checkbox and records results on valid input', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-done-'));
    const planPath = join(dir, 'plan.md');
    const dataPath = join(dir, 'r.json');
    writeFileSync(planPath, serializePlan(freshPlan()));
    writeFileSync(dataPath, JSON.stringify({ component: { id: 'pet-card' } }));
    try {
      process.exitCode = undefined;
      await run(['plan', 'done', planPath, '--task', 'create-component', '--data-file', dataPath]);
      expect(process.exitCode ?? 0).toBe(0);
      const after = parsePlan(readFileSync(planPath, 'utf8'));
      expect(after.steps[0]!.tasks[0]!.done).toBe(true);
      expect(after.steps[0]!.tasks[0]!.results).toEqual({ component: { id: 'pet-card' } });
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects invalid results against the frozen contract', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-done-'));
    const planPath = join(dir, 'plan.md');
    const dataPath = join(dir, 'r.json');
    writeFileSync(planPath, serializePlan(freshPlan()));
    writeFileSync(dataPath, JSON.stringify({ component: {} })); // missing required id
    try {
      process.exitCode = undefined;
      await run(['plan', 'done', planPath, '--task', 'create-component', '--data-file', dataPath]);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('aborts on digest mismatch when the frozen contract is tampered with', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-done-'));
    const planPath = join(dir, 'plan.md');
    const dataPath = join(dir, 'r.json');
    // Tamper: change a definition after the digest was sealed.
    const plan = freshPlan();
    plan.definitions.ComponentResult = { type: 'object', required: ['name'], properties: { name: { type: 'string' } } };
    writeFileSync(planPath, serializePlan(plan)); // digest still the pre-tamper value
    writeFileSync(dataPath, JSON.stringify({ component: { name: 'x' } }));
    try {
      process.exitCode = undefined;
      await run(['plan', 'done', planPath, '--task', 'create-component', '--data-file', dataPath]);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
