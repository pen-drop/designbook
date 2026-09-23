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
import Ajv from 'ajv';

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
  it('loads Drupal config routing for planning and transforms only on the Drupal backend', async () => {
    for (const backend of ['drupal', 'other']) {
      const ctx = await resolveIntakeContext('sync-to', { agentsDir: agents, config: { ...config, backend } });
      const sources = (step: string) =>
        ctx.steps.find((s) => s.name === step)!.context.map((key) => ctx.context[key]!.source);
      expect(sources('sync-to:intake').some((s) => s.endsWith('/rules/config-units.md'))).toBe(backend === 'drupal');
      for (const step of ['sync-to:intake', 'transform']) {
        expect(sources(step).some((s) => s.endsWith('/rules/config-transform.md'))).toBe(backend === 'drupal');
        expect(sources(step).some((s) => s.endsWith('/blueprints/image-style-export.md'))).toBe(backend === 'drupal');
      }
    }
  });

  it('preserves nested CSS plan validation through shared schema references', async () => {
    const ctx = await resolveIntakeContext('css-generate', { agentsDir: agents, config });
    const validate = new Ajv({ strict: false }).compile({
      $ref: '#/definitions/CssGenerationPlan',
      definitions: ctx.definitions,
    });
    const plan = {
      framework: 'tailwind',
      mode: 'create',
      reasons: [],
      paths: {
        jsonata_dir: 'generators',
        tokens_dir: 'tokens',
        fonts_dir: 'fonts',
        font_css_path: 'fonts.css',
        index_css_path: 'index.css',
      },
      jsonata: { strategy: 'create', artifacts: [] },
      fonts: { strategy: 'skip', fonts_dir: 'fonts', font_css_path: 'fonts.css' },
    };
    expect(validate(plan), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...plan, paths: {} })).toBe(false);
    expect(validate({ ...plan, jsonata: { strategy: 'create', artifacts: [{}] } })).toBe(false);
    expect(validate({ ...plan, fonts: { ...plan.fonts, strategy: 'invalid' } })).toBe(false);
  });

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

  it('emits the plans_dir under DESIGNBOOK_DATA/plans', async () => {
    const ctx = await resolveIntakeContext('design-shell', { agentsDir: agents, config });
    expect(ctx.plans_dir).toBe(`${config.data}/plans`);
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
