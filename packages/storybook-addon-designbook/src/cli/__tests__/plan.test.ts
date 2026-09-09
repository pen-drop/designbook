/**
 * `plan done` validates a result against the frozen in-plan contract only — no skill
 * re-read, no discovery — and refuses when the stored digest no longer matches (AC-6).
 */
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
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
              outputs: {
                component: { required: true, submission: 'data', schema: { $ref: '#/definitions/ComponentResult' } },
              },
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

async function run(args: string[]): Promise<string> {
  const program = new Command();
  program.exitOverride();
  registerPlan(program);
  let out = '';
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    out += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  }) as typeof process.stdout.write;
  try {
    await program.parseAsync(['node', 'cli', ...args]);
  } finally {
    process.stdout.write = original;
  }
  return out;
}

/** A plan whose only obligation rule requires a task the plan may or may not contain. */
function planWithObligation(tasks: string[]): Plan {
  return {
    workflow: 'extract-reference',
    digest: 'x',
    definitions: {},
    context: {
      'ctx:publish-capture': {
        key: 'ctx:publish-capture',
        kind: 'rule',
        source: '/abs/rules/publish-capture.md',
        content: '---\nintake_obligation: the capture must be published\nrequires_task: publish-capture\n---\nBody.',
      },
    },
    steps: [
      {
        name: 'publication',
        context: ['ctx:publish-capture'],
        tasks: tasks.map((name) => ({
          name,
          title: '',
          done: false,
          params: {},
          contract: { outputs: {} },
          results: null,
        })),
      },
    ],
  };
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

describe('plan done data output', () => {
  it('writes a data output with a path to that file as YAML', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-data-'));
    const planPath = join(dir, 'plan.md');
    const dataPath = join(dir, 'r.json');
    const outPath = join(dir, 'vision.yml');
    const plan: Plan = {
      workflow: 'vision',
      digest: '',
      definitions: {
        Vision: { type: 'object', required: ['product_name'], properties: { product_name: { type: 'string' } } },
      },
      context: {},
      steps: [
        {
          name: 'create-vision',
          context: [],
          tasks: [
            {
              name: 'create-vision',
              title: '',
              done: false,
              params: {},
              contract: {
                outputs: {
                  vision: {
                    required: true,
                    submission: 'data',
                    schema: { $ref: '#/definitions/Vision' },
                    path: outPath,
                  },
                },
              },
              results: null,
            },
          ],
        },
      ],
    };
    plan.digest = planDigest(plan);
    writeFileSync(planPath, serializePlan(plan));
    writeFileSync(dataPath, JSON.stringify({ vision: { product_name: 'PetMatch' } }));
    try {
      process.exitCode = undefined;
      await run(['plan', 'done', planPath, '--task', 'create-vision', '--data-file', dataPath]);
      expect(process.exitCode ?? 0).toBe(0);
      expect(existsSync(outPath)).toBe(true);
      expect(readFileSync(outPath, 'utf8')).toMatch(/product_name: PetMatch/);
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('plan seal', () => {
  it('computes and writes the digest so execution accepts the plan', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-seal-'));
    const planPath = join(dir, 'plan.md');
    const plan = planWithObligation(['publish-capture']);
    plan.digest = 'PLACEHOLDER';
    writeFileSync(planPath, serializePlan(plan));
    try {
      process.exitCode = undefined;
      await run(['plan', 'seal', planPath]);
      expect(process.exitCode ?? 0).toBe(0);
      const sealed = parsePlan(readFileSync(planPath, 'utf8'));
      expect(sealed.digest).toBe(planDigest(sealed));
      expect(sealed.digest).not.toBe('PLACEHOLDER');
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('plan done --title (repeated task names)', () => {
  function twoComponents(): Plan {
    const p: Plan = {
      workflow: 'design-shell',
      digest: '',
      definitions: { R: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
      context: {},
      steps: [
        {
          name: 'write-component',
          context: [],
          tasks: ['header', 'footer'].map((title) => ({
            name: 'write-component',
            title,
            done: false,
            params: {},
            contract: {
              outputs: { component: { required: true, submission: 'data', schema: { $ref: '#/definitions/R' } } },
            },
            results: null,
          })),
        },
      ],
    };
    p.digest = planDigest(p);
    return p;
  }

  it('refuses an ambiguous name and targets the right instance with --title', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-title-'));
    const planPath = join(dir, 'plan.md');
    const dataPath = join(dir, 'r.json');
    writeFileSync(planPath, serializePlan(twoComponents()));
    writeFileSync(dataPath, JSON.stringify({ component: { id: 'footer' } }));
    try {
      process.exitCode = undefined;
      await run(['plan', 'done', planPath, '--task', 'write-component', '--data-file', dataPath]);
      expect(process.exitCode).toBe(1); // ambiguous without --title

      process.exitCode = undefined;
      await run(['plan', 'done', planPath, '--task', 'write-component', '--title', 'footer', '--data-file', dataPath]);
      expect(process.exitCode ?? 0).toBe(0);
      const after = parsePlan(readFileSync(planPath, 'utf8'));
      const footer = after.steps[0]!.tasks.find((t) => t.title === 'footer')!;
      const header = after.steps[0]!.tasks.find((t) => t.title === 'header')!;
      expect(footer.done).toBe(true); // the right instance
      expect(header.done).toBe(false); // not the first one
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not drift the digest across successive done calls (run-state excluded)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-drift-'));
    const planPath = join(dir, 'plan.md');
    const dataPath = join(dir, 'r.json');
    writeFileSync(planPath, serializePlan(twoComponents()));
    writeFileSync(dataPath, JSON.stringify({ component: { id: 'x' } }));
    try {
      process.exitCode = undefined;
      await run(['plan', 'done', planPath, '--task', 'write-component', '--title', 'header', '--data-file', dataPath]);
      expect(process.exitCode ?? 0).toBe(0);
      // second done on the already-partly-done plan must still pass the digest check
      await run(['plan', 'done', planPath, '--task', 'write-component', '--title', 'footer', '--data-file', dataPath]);
      expect(process.exitCode ?? 0).toBe(0);
      const after = parsePlan(readFileSync(planPath, 'utf8'));
      expect(after.steps[0]!.tasks.every((t) => t.done)).toBe(true);
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('plan validate', () => {
  it('reports a missing obligation with source and exits nonzero', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-validate-'));
    const planPath = join(dir, 'plan.md');
    writeFileSync(planPath, serializePlan(planWithObligation([])));
    try {
      process.exitCode = undefined;
      const out = await run(['plan', 'validate', planPath]);
      expect(process.exitCode).toBe(1);
      const report = JSON.parse(out);
      expect(report.ok).toBe(false);
      expect(report.missing[0].source).toMatch(/publish-capture/);
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes a complete plan', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-validate-'));
    const planPath = join(dir, 'plan.md');
    writeFileSync(planPath, serializePlan(planWithObligation(['publish-capture'])));
    try {
      process.exitCode = undefined;
      const out = await run(['plan', 'validate', planPath]);
      expect(process.exitCode ?? 0).toBe(0);
      expect(JSON.parse(out).ok).toBe(true);
    } finally {
      process.exitCode = undefined;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('plan steps', () => {
  it('lists steps and per-task checkbox state without discovery', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-steps-'));
    const planPath = join(dir, 'plan.md');
    const plan = planWithObligation(['publish-capture']);
    plan.steps[0]!.tasks[0]!.done = true;
    writeFileSync(planPath, serializePlan(plan));
    try {
      const out = await run(['plan', 'steps', planPath]);
      const overview = JSON.parse(out);
      expect(overview.workflow).toBe('extract-reference');
      expect(overview.steps[0].tasks[0]).toEqual({ name: 'publish-capture', title: '', done: true });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
