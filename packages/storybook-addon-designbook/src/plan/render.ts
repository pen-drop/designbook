import { dump as dumpYaml } from 'js-yaml';
import type { ResolvedStep } from '../workflow-resolve.js';
import type { InputSource } from './sources.js';
import type { ArtifactIndex } from './reverse-index.js';
import { slugifyArtifactName } from './anchors.js';

export interface RenderContext {
  workflowId: string;
  workflowFrontmatter: {
    title?: string;
    description?: string;
    params?: Record<string, { type?: string; default?: unknown }>;
    stages?: Record<string, { steps?: string[]; each?: string }>;
  };
  taskBodies: Map<string, string>;
  ruleBodies: Map<string, string>;
  blueprintBodies: Map<string, string>;
  taskFrontmatter: Map<
    string,
    { result?: { properties?: Record<string, unknown> }; each?: Record<string, { expr?: string }> }
  >;
  stepResolved: Record<string, ResolvedStep | ResolvedStep[]>;
  inputs: Map<string, InputSource[]>; // keyed by step name
  outputSchemas: Map<string, object>; // keyed by step name; absent when no result:
  outputExamples: Map<string, string>; // keyed by step name; absent when no result:
  ruleIndex: ArtifactIndex;
  blueprintIndex: ArtifactIndex;
  ruleTriggerSteps: Map<string, string[]>; // keyed by rule file path
  blueprintTriggerSteps: Map<string, string[]>;
  schemaDefinitions: Record<string, object>; // aggregated across all tasks
  schemaIndex: ArtifactIndex; // keyed by definition name
}

export function renderPlan(ctx: RenderContext): string {
  return [
    ...renderHeader(ctx),
    ...renderParams(ctx),
    ...renderStagesTable(ctx),
    ...renderStagesDetail(ctx),
    ...renderSchemasAppendix(ctx),
    ...renderRulesAppendix(ctx),
    ...renderBlueprintsAppendix(ctx),
  ].join('\n');
}

function renderHeader(ctx: RenderContext): string[] {
  return [
    `# Plan: ${ctx.workflowFrontmatter.title ?? ctx.workflowId}`,
    '',
    `> ${ctx.workflowFrontmatter.description ?? ''}`,
    '',
  ];
}

function renderParams(ctx: RenderContext): string[] {
  const out = ['## Workflow Parameters'];
  const params = ctx.workflowFrontmatter.params ?? {};
  if (Object.keys(params).length === 0) {
    out.push('_(none)_');
  } else {
    for (const [name, decl] of Object.entries(params)) {
      const type = decl.type ?? 'string';
      const def = 'default' in decl ? ` — default: \`${formatScalar(decl.default)}\`` : '';
      out.push(`- \`${name}\` (${type})${def}`);
    }
  }
  out.push('');
  return out;
}

function renderStagesTable(ctx: RenderContext): string[] {
  const out = ['## Stages', '| # | Stage | Tasks |', '|---|-------|-------|'];
  const stages = Object.entries(ctx.workflowFrontmatter.stages ?? {});
  stages.forEach(([name, def], i) => {
    const tasks = (def.steps ?? []).join(', ');
    out.push(`| ${i + 1} | ${name} | ${tasks} |`);
  });
  out.push('', '---', '');
  return out;
}

function renderStagesDetail(ctx: RenderContext): string[] {
  const out: string[] = [];
  const stages = Object.entries(ctx.workflowFrontmatter.stages ?? {});
  stages.forEach(([stageName, stageDef], i) => {
    out.push(`## Stage ${i + 1} — ${stageName}`);

    // Iteration annotation: emit when ANY task in this stage has each: in frontmatter
    const iterationExprs = collectIterationExprs(stageDef.steps ?? [], ctx);
    if (iterationExprs.length > 0) {
      out.push(`*Iteration*: 1 task per item in ${iterationExprs.map((e) => `\`${e}\``).join(', ')}`);
    }
    out.push('');

    for (const step of stageDef.steps ?? []) {
      out.push(...renderTask(step, stages, ctx));
    }
    out.push('---', '');
  });
  return out;
}

function collectIterationExprs(steps: string[], ctx: RenderContext): string[] {
  const exprs: string[] = [];
  for (const step of steps) {
    const raw = ctx.stepResolved[step];
    if (!raw) continue;
    const list = Array.isArray(raw) ? raw : [raw];
    for (const rs of list) {
      const each = ctx.taskFrontmatter.get(rs.task_file)?.each ?? {};
      for (const k of Object.keys(each)) {
        const expr = each[k]?.expr ?? k;
        if (!exprs.includes(expr)) exprs.push(expr);
      }
    }
  }
  return exprs;
}

function renderTask(step: string, stages: Array<[string, { steps?: string[] }]>, ctx: RenderContext): string[] {
  const out = [`### Task: ${step}`];

  const raw = ctx.stepResolved[step];
  if (!raw) return [...out, ''];
  const rs = Array.isArray(raw) ? raw[0]! : raw;

  const ruleSlugs = rs.rules.map(slugifyArtifactName);
  const blueprintSlugs = rs.blueprints.map(slugifyArtifactName);
  const refs: string[] = [];
  for (const s of ruleSlugs) refs.push(`rule [${s}](#rule-${s})`);
  for (const s of blueprintSlugs) refs.push(`blueprint [${s}](#blueprint-${s})`);
  if (refs.length > 0) out.push(`**References**: ${refs.join(', ')}`);
  out.push('');

  out.push('**Inputs**');
  const inputs = ctx.inputs.get(step) ?? [];
  if (inputs.length === 0) {
    out.push('- _(none)_');
  } else {
    for (const input of inputs) out.push(formatInput(input, stages));
  }
  out.push('');

  const body = ctx.taskBodies.get(rs.task_file) ?? '';
  out.push(body, '');

  if (ctx.outputSchemas.has(step)) {
    out.push('**Output schema**', '```yaml', dumpYaml(ctx.outputSchemas.get(step)!).trimEnd(), '```', '');
  }
  if (ctx.outputExamples.has(step)) {
    out.push('**Output example**', '```yaml', ctx.outputExamples.get(step)!, '```', '');
  }
  return out;
}

function formatInput(input: InputSource, stages: Array<[string, { steps?: string[] }]>): string {
  if (input.kind === 'file') return `- \`${input.name}\` ← \`${input.path}\` *(file)*`;
  if (input.kind === 'iteration') return `- \`${input.name}\` ← (per-item from \`each: ${input.expr}\`)`;
  if (input.kind === 'produced') {
    const stageIdx = stages.findIndex(([n]) => n === input.stage) + 1;
    return `- \`${input.name}\` ← (produced by stage ${stageIdx}: ${input.task})`;
  }
  return `- \`${input.name}\` ← (workflow params)`;
}

function renderSchemasAppendix(ctx: RenderContext): string[] {
  const names = Object.keys(ctx.schemaDefinitions).sort();
  if (names.length === 0) return [];

  const out = ['# Schemas', ''];
  for (const name of names) {
    const refs = ctx.schemaIndex[name] ?? [];
    out.push(
      `## Schema: ${name}`,
      `*Used in tasks*: ${refs.map((r) => `${r.stage}.${r.task}`).join(', ') || '_(none)_'}`,
      '',
      '```yaml',
      dumpYaml(ctx.schemaDefinitions[name]!).trimEnd(),
      '```',
      '',
    );
  }
  return out;
}

function renderRulesAppendix(ctx: RenderContext): string[] {
  const out = ['# Rules', ''];
  const seen = new Set<string>();
  for (const slug of Object.keys(ctx.ruleIndex)) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const filePath = findFilePathBySlug(ctx.ruleBodies, slug);
    if (!filePath) continue;
    const triggers = ctx.ruleTriggerSteps.get(filePath) ?? [];
    const refs = ctx.ruleIndex[slug] ?? [];
    out.push(
      `## Rule: ${slug}`,
      `*Triggered on*: ${triggers.map((s) => `\`${s}\``).join(', ') || '_(none)_'}`,
      `*Applied in tasks*: ${refs.map((r) => `${r.stage}.${r.task}`).join(', ') || '_(none)_'}`,
      '',
      ctx.ruleBodies.get(filePath) ?? '',
      '',
    );
  }
  return out;
}

function renderBlueprintsAppendix(ctx: RenderContext): string[] {
  const out = ['# Blueprints', ''];
  const seen = new Set<string>();
  for (const slug of Object.keys(ctx.blueprintIndex)) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const filePath = findFilePathBySlug(ctx.blueprintBodies, slug);
    if (!filePath) continue;
    const triggers = ctx.blueprintTriggerSteps.get(filePath) ?? [];
    const refs = ctx.blueprintIndex[slug] ?? [];
    out.push(
      `## Blueprint: ${slug}`,
      `*Triggered on*: ${triggers.map((s) => `\`${s}\``).join(', ') || '_(none)_'}`,
      `*Applied in tasks*: ${refs.map((r) => `${r.stage}.${r.task}`).join(', ') || '_(none)_'}`,
      '',
      ctx.blueprintBodies.get(filePath) ?? '',
      '',
    );
  }
  return out;
}

function findFilePathBySlug(bodies: Map<string, string>, slug: string): string | undefined {
  for (const path of bodies.keys()) {
    if (slugifyArtifactName(path) === slug) return path;
  }
  return undefined;
}

function formatScalar(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
