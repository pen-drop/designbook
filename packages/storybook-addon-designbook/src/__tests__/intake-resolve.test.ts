/**
 * Intake context resolution.
 *
 * The engine must resolve the existing `<wf>:intake` / `design.intake` metadata —
 * ignored by the old catalogue path — into a shared, deduplicated context registry
 * whose entries are referenced per step, plus a frozen task-palette contract.
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { resolveIntakeContext } from '../workflow/intake-resolve.js';
import type { DesignbookConfig } from '../shared/config.js';

const agents = resolve(process.cwd(), '../../.agents');

/** A project that turns on every integration, so no step is filtered out unseen. */
const config = {
  data: '/tmp/intake-resolve',
  technology: 'html',
  backend: 'drupal',
  'frameworks.component': 'sdc',
  'frameworks.css': 'tailwind',
  extensions: [],
} as unknown as DesignbookConfig;

describe('resolveIntakeContext', () => {
  it('resolves rules tagged <wf>:intake into the shared registry, referenced per step', async () => {
    const ctx = await resolveIntakeContext('design-shell', { agentsDir: agents, config });
    const entry = Object.values(ctx.context).find((c) => c.source.endsWith('rules/entity-reference-rendering.md'));
    expect(entry).toBeDefined();
    expect(entry!.content.length).toBeGreaterThan(0); // canonical content embedded
    // at least one step references the entry by key (not by copy)
    expect(ctx.steps.some((s) => s.context.includes(entry!.key))).toBe(true);
    // a rule that applies to multiple steps has exactly ONE registry entry
    const dupes = Object.values(ctx.context).filter((c) => c.source === entry!.source);
    expect(dupes.length).toBe(1);
  });

  it('does NOT resolve a rule whose intake token names a different workflow', async () => {
    const ctx = await resolveIntakeContext('tokens', { agentsDir: agents, config });
    // entity-reference-rendering only names design-*:intake, not tokens:intake
    const sources = Object.values(ctx.context).map((c) => c.source);
    expect(sources.some((s) => s.endsWith('entity-reference-rendering.md'))).toBe(false);
  });

  it('emits the canonical plan_path under DESIGNBOOK_DATA/plans', async () => {
    const ctx = await resolveIntakeContext('design-shell', { agentsDir: agents, config });
    expect(ctx.plan_path).toBe(`${config.data}/plans/design-shell.plan.md`);
  });

  it('marks source open and gates source-specific rules for extract-reference', async () => {
    const ctx = await resolveIntakeContext('extract-reference', { agentsDir: agents, config });
    expect(ctx.open_selectors.map((s) => s.name)).toContain('source');
    // website-capture-observations is NOT in the flat shared registry...
    const flatSources = Object.values(ctx.context).map((c) => c.source);
    expect(flatSources.some((s) => s.endsWith('website-capture-observations.md'))).toBe(false);
    // ...it is gated under source=website
    const website = ctx.gated.find((g) => g.selector === 'source' && g.variant === 'website')!;
    expect(website).toBeDefined();
    expect(website.context.some((c) => c.source.endsWith('website-capture-observations.md'))).toBe(true);
    const storybook = ctx.gated.find((g) => g.selector === 'source' && g.variant === 'storybook')!;
    expect(storybook).toBeDefined();
    expect(storybook.context.some((c) => c.source.endsWith('storybook-capture-observations.md'))).toBe(true);
    // the gated steps must not leak into the flat step set as a misleadingly complete rule set
    expect(ctx.steps.some((s) => s.name === 'observe-website')).toBe(false);
  });

  it('freezes the task-palette output contracts with their definitions', async () => {
    const ctx = await resolveIntakeContext('design-shell', { agentsDir: agents, config });
    const validate = ctx.steps.find((s) => s.name === 'validate');
    expect(validate).toBeDefined();
    const task = validate!.tasks[0];
    expect(task).toBeDefined();
    expect(Object.keys(task!.outputs).length).toBeGreaterThan(0); // frozen output contract
    expect(Object.keys(ctx.definitions).length).toBeGreaterThan(0); // definitions pulled from schemas.yml
  });
});
