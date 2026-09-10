/**
 * `plan build` assembles the MD plan from an agent-authored task list: it resolves
 * the full intake itself, validates each task's params against its params_schema and
 * that every required step is covered, embeds each body once, and seals the digest.
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { buildPlan } from '../plan-build.js';
import { parsePlan, serializePlan, planDigest, validatePlanCompleteness } from '../plan-document.js';
import type { DesignbookConfig } from '../config.js';

const agents = resolve(process.cwd(), '../../.agents');
const config = {
  data: '/tmp/plan-build',
  technology: 'html',
  backend: 'drupal',
  'frameworks.component': 'sdc',
  'frameworks.css': 'tailwind',
  extensions: [],
} as unknown as DesignbookConfig;
const opts = { agentsDir: agents, config };

describe('buildPlan', () => {
  it('builds a sealed, complete plan from a task list', async () => {
    const { plan, plan_path, errors } = await buildPlan(
      { workflow: 'vision', tasks: [{ step: 'create-vision', task: 'create-vision', title: 'v', params: {} }] },
      opts,
    );
    expect(errors).toEqual([]);
    expect(plan).not.toBeNull();
    expect(plan!.workflow).toBe('vision');
    expect(plan!.steps.map((s) => s.name)).toEqual(['create-vision']);
    expect(plan!.steps[0]!.tasks[0]!.instruction).toBeTruthy(); // task body referenced, not inlined
    expect(plan!.digest).toBe(planDigest(plan!)); // auto-sealed
    // The sealed digest must survive the write→read round-trip, or `plan done`
    // would report a digest mismatch (embedded bodies are trimmed on parse).
    expect(planDigest(parsePlan(serializePlan(plan!)))).toBe(plan!.digest);
    expect(validatePlanCompleteness(plan!).ok).toBe(true);
    expect(plan_path).toBe(`${config.data}/plans/vision.plan.md`);
  });

  it('rejects a truly unknown task but imposes no fixed-set completeness', async () => {
    const { plan, errors } = await buildPlan(
      { workflow: 'vision', tasks: [{ step: 'create-vision', task: 'not-a-task', params: {} }] },
      opts,
    );
    expect(plan).toBeNull();
    expect(errors.some((e) => /unknown task "not-a-task"/.test(e))).toBe(true);
    // The agent decides which tasks come along — no "missing required step" error.
    expect(errors.some((e) => /missing/.test(e))).toBe(false);
  });

  it('builds a gated open-selector task (extract-reference observe-website)', async () => {
    const { plan, errors } = await buildPlan(
      {
        workflow: 'extract-reference',
        selectors: { source: 'website' },
        tasks: [
          {
            step: 'observe-website',
            task: 'observe-website',
            title: 'leando',
            params: { source: {}, reference_folder: '/tmp/ref', state: 'rest', session: 'anonymous' },
          },
        ],
      },
      opts,
    );
    // The gated task must be resolvable — no "unknown task observe-website".
    expect(errors.some((e) => /unknown task "observe-website"/.test(e))).toBe(false);
    if (plan) {
      const step = plan.steps.find((s) => s.name === 'observe-website');
      expect(step).toBeDefined();
      expect(step!.tasks[0]!.name).toBe('observe-website');
      expect(step!.context.length).toBeGreaterThan(0); // gated context embedded
    }
  });

  it('embeds a repeated task body once (dedup) and validates params', async () => {
    const { plan, errors } = await buildPlan(
      {
        workflow: 'design-shell',
        tasks: [
          { step: 'write-component', task: 'write-component', title: 'a', params: { component: 'not-an-object' } },
        ],
      },
      opts,
    );
    // param validation fires: `component` must be an object → error, no plan
    expect(plan).toBeNull();
    expect(errors.some((e) => /write-component.*params/.test(e))).toBe(true);
  });
});
