import { describe, it, expect } from 'vitest';
import { renderPlan, type RenderContext } from '../render.js';

const CTX: RenderContext = {
  workflowId: 'design-shell',
  workflowFrontmatter: {
    title: 'Design Shell',
    description: 'Design the application shell -- header/content/footer slots',
    params: {
      scene_id: { type: 'string', default: 'design-system:shell' },
      reference_url: { type: 'string' },
    },
    stages: {
      reference: { steps: ['extract-reference'] },
      intake: { steps: ['intake'] },
      polish: { steps: ['polish'] },
    },
  },
  taskBodies: new Map([
    ['/x/extract-reference.md', '# Extract reference\n\nFetch the reference site.'],
    ['/x/intake--design-shell.md', '## Steps\n\n1. Determine layout'],
    ['/x/polish.md', '# Polish\n\nFix one issue.'],
  ]),
  ruleBodies: new Map([['/x/rules/markup-derivation.md', '# Markup Derivation\n\nDerive markup from reference.']]),
  blueprintBodies: new Map([['/x/blueprints/static-assets.md', '# Blueprint: Static Assets\n\nUse public/.']]),
  taskFrontmatter: new Map([
    ['/x/extract-reference.md', { result: { properties: { extract: { type: 'object' } } } }],
    [
      '/x/intake--design-shell.md',
      {
        result: { properties: { components: { type: 'array' } } },
      },
    ],
    ['/x/polish.md', { each: { issue: { expr: 'issues' } } }], // no result:
  ]),
  stepResolved: {
    'extract-reference': {
      task_file: '/x/extract-reference.md',
      rules: [],
      blueprints: [],
      config_rules: [],
      config_instructions: [],
    },
    intake: {
      task_file: '/x/intake--design-shell.md',
      rules: ['/x/rules/markup-derivation.md'],
      blueprints: ['/x/blueprints/static-assets.md'],
      config_rules: [],
      config_instructions: [],
    },
    polish: { task_file: '/x/polish.md', rules: [], blueprints: [], config_rules: [], config_instructions: [] },
  },
  inputs: new Map([
    ['extract-reference', [{ kind: 'workflow', name: 'reference_url' }]],
    [
      'intake',
      [
        { kind: 'file', name: 'vision', path: '$DESIGNBOOK_DATA/vision.yml' },
        { kind: 'produced', name: 'extract', stage: 'reference', task: 'extract-reference' },
        { kind: 'workflow', name: 'scene_id' },
      ],
    ],
    [
      'polish',
      [
        { kind: 'iteration', name: 'issue', expr: 'issues' },
        { kind: 'file', name: 'design_tokens', path: '$DESIGNBOOK_DATA/design-system/design-tokens.yml' },
      ],
    ],
  ]),
  outputSchemas: new Map([
    ['extract-reference', { type: 'object', properties: { extract: { type: 'object' } } }],
    ['intake', { type: 'object', properties: { components: { type: 'array' } } }],
  ]),
  outputExamples: new Map([
    ['extract-reference', 'extract:\n  title: Sample'],
    ['intake', 'components:\n  - name: page'],
  ]),
  ruleIndex: { 'markup-derivation': [{ stage: 'intake', task: 'intake' }] },
  blueprintIndex: { 'static-assets': [{ stage: 'intake', task: 'intake' }] },
  ruleTriggerSteps: new Map([['/x/rules/markup-derivation.md', ['create-component', 'create-scene']]]),
  blueprintTriggerSteps: new Map([['/x/blueprints/static-assets.md', ['create-scene', 'design-shell:intake']]]),
  schemaDefinitions: {
    Component: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
    DesignHint: { type: 'object', properties: { variant: { type: 'string' } } },
  },
  schemaIndex: {
    Component: [{ stage: 'intake', task: 'intake' }],
    DesignHint: [{ stage: 'intake', task: 'intake' }],
  },
};

describe('renderPlan', () => {
  const out = renderPlan(CTX);

  it('starts with the workflow heading and description blockquote', () => {
    expect(out.split('\n').slice(0, 3)).toEqual([
      '# Plan: Design Shell',
      '',
      '> Design the application shell -- header/content/footer slots',
    ]);
  });

  it('lists every workflow param with type and default', () => {
    expect(out).toMatch(
      /## Workflow Parameters\n- `scene_id` \(string\) — default: `design-system:shell`\n- `reference_url` \(string\)/,
    );
  });

  it('renders the stages table', () => {
    expect(out).toMatch(
      /## Stages\n\| # \| Stage \| Tasks \|\n\|---\|-------\|-------\|\n\| 1 \| reference \| extract-reference \|\n\| 2 \| intake \| intake \|\n\| 3 \| polish \| polish \|/,
    );
  });

  it('renders each stage as `## Stage N — <name>`', () => {
    expect(out).toMatch(/## Stage 1 — reference/);
    expect(out).toMatch(/## Stage 3 — polish/);
  });

  it('annotates an each-stage with iteration source', () => {
    expect(out).toMatch(/## Stage 3 — polish\n\*Iteration\*: 1 task per item in `issues`/);
  });

  it('renders task `**References**:` line with anchor links', () => {
    expect(out).toMatch(
      /\*\*References\*\*: rule \[markup-derivation\]\(#rule-markup-derivation\), blueprint \[static-assets\]\(#blueprint-static-assets\)/,
    );
  });

  it('renders all four input source kinds in spec format', () => {
    expect(out).toMatch(/- `vision` ← `\$DESIGNBOOK_DATA\/vision.yml` \*\(file\)\*/);
    expect(out).toMatch(/- `extract` ← \(produced by stage 1: extract-reference\)/);
    expect(out).toMatch(/- `scene_id` ← \(workflow params\)/);
    expect(out).toMatch(/- `issue` ← \(per-item from `each: issues`\)/);
  });

  it('inlines the task body markdown verbatim', () => {
    expect(out).toContain('## Steps\n\n1. Determine layout');
  });

  it('renders the output schema and example for tasks WITH result:', () => {
    expect(out).toMatch(/\*\*Output schema\*\*\n```yaml\ntype: object\nproperties:\n {2}components:/);
    expect(out).toMatch(/\*\*Output example\*\*\n```yaml\ncomponents:\n {2}- name: page\n```/);
  });

  it('omits output schema and example for tasks WITHOUT result:', () => {
    // polish has no result: in fixture — must NOT have these blocks
    const polishSection = out.slice(out.indexOf('## Stage 3 — polish'));
    expect(polishSection).not.toMatch(/\*\*Output schema\*\*/);
    expect(polishSection).not.toMatch(/\*\*Output example\*\*/);
  });

  it('emits a `# Schemas` appendix before `# Rules`', () => {
    expect(out.indexOf('# Schemas')).toBeGreaterThan(-1);
    expect(out.indexOf('# Schemas')).toBeLessThan(out.indexOf('# Rules'));
  });

  it('renders each schema definition with `*Used in tasks*` and a YAML body', () => {
    expect(out).toMatch(
      /## Schema: Component\n\*Used in tasks\*: intake\.intake\n\n```yaml\ntype: object\nrequired:\n {2}- name\nproperties:\n {2}name:\n {4}type: string\n```/,
    );
  });

  it('renders schemas in alphabetical order', () => {
    const cIdx = out.indexOf('## Schema: Component');
    const dIdx = out.indexOf('## Schema: DesignHint');
    expect(cIdx).toBeGreaterThan(-1);
    expect(dIdx).toBeGreaterThan(cIdx);
  });

  it('renders rules appendix with trigger steps and applied-in-tasks', () => {
    expect(out).toMatch(
      /# Rules\n\n## Rule: markup-derivation\n\*Triggered on\*: `create-component`, `create-scene`\n\*Applied in tasks\*: intake\.intake/,
    );
  });

  it('renders blueprints appendix with each blueprint inlined', () => {
    expect(out).toMatch(/# Blueprints\n\n## Blueprint: static-assets/);
    expect(out).toContain('Use public/.');
  });
});
