/**
 * File lookup for plan-free edits.
 *
 * Reverses the plan's own intake resolution: a file matches the output globs the
 * intake freezes per task, and the lookup returns that step's frozen context. Plan and
 * file lookup therefore load the same rules/blueprints by construction.
 */

import { existsSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { minimatch } from 'minimatch';
import { findConfig, loadConfig, resolveSkillsRoot } from '../shared/config.js';
import { listWorkflowDefinitions } from '../cli/workflow-discovery.js';
import { resolveSkillSources } from './skill-resolver.js';
import {
  resolveIntakeContext,
  type ContextEntry,
  type IntakeContext,
  type OutputContract,
  type ResolveIntakeOptions,
} from './intake-resolve.js';

export interface FileContext {
  file: string;
  workflow: string;
  step: string;
  task: string;
  output: string;
  contract: OutputContract;
  definitions: Record<string, unknown>;
  context: ContextEntry[];
}

export class FileResolveError extends Error {
  constructor(
    message: string,
    readonly candidates: string[] = [],
  ) {
    super(message);
    this.name = 'FileResolveError';
  }
}

/** The context entries a plan embeds for a step: its intake context, or its gated groups' context. */
function stepContext(intake: IntakeContext, step: string): ContextEntry[] {
  const flat = intake.steps.find((s) => s.name === step);
  const entries = flat
    ? flat.context.flatMap((key) => (intake.context[key] ? [intake.context[key]!] : []))
    : intake.gated.filter((g) => g.tasks.some((t) => t.step === step)).flatMap((g) => g.context);
  const bySource = new Map(entries.map((e) => [e.source, e]));
  return [...bySource.values()];
}

/** Sorted context sources of a step, as the plan embeds them. */
export function stepContextSources(intake: IntakeContext, step: string): string[] {
  return stepContext(intake, step)
    .map((e) => e.source)
    .sort();
}

/** Match an absolute file against the task outputs of already-resolved intake contexts. */
export function matchFileContext(file: string, intakes: IntakeContext[]): FileContext {
  const variants = existsSync(file) ? [file, realpathSync(file)] : [file];
  const groups = new Map<string, { found: FileContext; ids: string[] }>();
  for (const intake of intakes) {
    const tasks = [...intake.steps.flatMap((s) => s.tasks), ...intake.gated.flatMap((g) => g.tasks)];
    for (const task of tasks) {
      for (const [output, contract] of Object.entries(task.outputs)) {
        if (!contract.glob || !variants.some((v) => minimatch(v, contract.glob!))) continue;
        const context = stepContext(intake, task.step);
        const key = [task.source, output, ...context.map((c) => c.source).sort()].join('\n');
        const id = `${intake.workflow}/${task.step}/${task.name}:${output}`;
        const group = groups.get(key);
        if (group) {
          group.ids.push(id);
          continue;
        }
        groups.set(key, {
          ids: [id],
          found: {
            file,
            workflow: intake.workflow,
            step: task.step,
            task: task.name,
            output,
            contract,
            definitions: intake.definitions,
            context,
          },
        });
      }
    }
  }
  const all = [...groups.values()];
  if (all.length === 1) return all[0]!.found;
  if (all.length === 0) throw new FileResolveError(`no task output declares ${file}`);
  const candidates = all.map((g) => g.ids[0]!);
  throw new FileResolveError(
    `${file} matches several task outputs — pass --workflow to narrow:\n  ${candidates.join('\n  ')}`,
    candidates,
  );
}

/**
 * Resolve the task output and step context for a file. Scans every workflow, or only
 * `workflow`. Intake steps (`<wf>:intake`) declare no outputs, so they never match.
 */
export async function resolveFileContext(
  file: string,
  opts: ResolveIntakeOptions & { workflow?: string } = {},
): Promise<FileContext> {
  const configPath = findConfig();
  const configDir = opts.configDir ?? (configPath ? dirname(configPath) : process.cwd());
  const config = opts.config ?? loadConfig(configDir);
  const agentsDir = opts.agentsDir ?? resolveSkillsRoot(configDir);
  const sources = opts.sources ?? resolveSkillSources(configDir, { config });
  const workflows = opts.workflow ? [opts.workflow] : listWorkflowDefinitions(agentsDir, sources);
  const intakes: IntakeContext[] = [];
  for (const workflow of workflows) {
    intakes.push(await resolveIntakeContext(workflow, { configDir, config, agentsDir, sources }));
  }
  return matchFileContext(resolve(file), intakes);
}
