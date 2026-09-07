import { stepOverview, stepContext } from '../workflow-steps.js';
import { summarizeWorkflow } from '../workflow-summary.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Option, type Command } from 'commander';
import { workflowMarkdown, stepMarkdown } from '../workflow-markdown.js';
import { load } from 'js-yaml';
import { findConfig, loadConfig, resolveSkillsRoot, type DesignbookConfig } from '../config.js';
import { resolveSkillSources } from '../skill-resolver.js';
import { resolveAllStages, buildEnvMap } from '../workflow-resolve.js';
import { resolveWorkflowFile, listWorkflowDefinitions, loadWorkflowDefinition } from './workflow-discovery.js';
import {
  workflowDefinitionSchema,
  validateDefinition,
  validateCatalogueDefinition,
  type PlanningCatalogue,
  type WorkflowDefinition,
} from '../workflow-document.js';
import {
  saveDefinition,
  readDocument,
  taskContext,
  startTask,
  completeTask,
  blockTask,
  startStep,
  completeStep,
  blockStep,
} from '../workflow-store.js';
import { captureLocation } from '../reference-capture.js';
import { definitionContracts } from '../planning-contracts.js';

function selectedTask(opts: { task?: string; step?: string }): string {
  if (!opts.task || opts.step) throw new Error('Select exactly one of --step or --task');
  return opts.task;
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

/** Planning catalogue: embeds selected building blocks, but never creates concrete tasks. */
export async function discoverWorkflow(id: string, configFile?: string) {
  const draft = configFile ? (JSON.parse(readFileSync(configFile, 'utf8')) as DesignbookConfig) : undefined;
  const config = draft ?? loadConfig();
  const configPath = findConfig();
  const configDir = configPath ? dirname(configPath) : process.cwd();
  const agentsDir = resolveSkillsRoot(configDir);
  const sources = resolveSkillSources(configDir, { config });
  const file = resolveWorkflowFile(id, agentsDir, sources);
  const rawConfig = draft ?? (configPath ? (load(readFileSync(configPath, 'utf8')) as Record<string, unknown>) : {});
  const resolved = await resolveAllStages(file, config, rawConfig, agentsDir, sources);
  const embed = (source: string) => ({ source, content: readFileSync(source, 'utf8') });
  return {
    template: embed(file),
    config,
    environment: buildEnvMap(config),
    blocks: Object.fromEntries(
      Object.entries(resolved.step_resolved).map(([name, entry]) => [
        name,
        (Array.isArray(entry) ? entry : [entry]).map((block) => {
          const instructions = embed(block.task_file);
          return {
            instructions,
            rules: block.rules.map(embed),
            blueprints: block.blueprints.map(embed),
            config_rules: block.config_rules.map((content, index) => ({
              source: `${configFile ?? configPath ?? 'configuration'}#workflow.rules.${name}[${index}]`,
              content,
            })),
            config_instructions: block.config_instructions.map((content, index) => ({
              source: `${configFile ?? configPath ?? 'configuration'}#workflow.tasks.${name}[${index}]`,
              content,
            })),
            ...definitionContracts(block.schema ?? { definitions: {}, params: {}, result: {} }, instructions.content),
          };
        }),
      ]),
    ),
    definition_schema: workflowDefinitionSchema,
  };
}

export function register(program: Command): void {
  const workflow = program.command('workflow').description('Plan and execute explicit workflow documents');
  workflow.command('definitions [id]').action((id?: string) => {
    const configPath = findConfig();
    const dir = configPath ? dirname(configPath) : process.cwd();
    try {
      if (id) print(loadWorkflowDefinition(id, resolveSkillsRoot(dir), resolveSkillSources(dir)));
      else
        for (const name of listWorkflowDefinitions(resolveSkillsRoot(dir), resolveSkillSources(dir))) console.log(name);
    } catch (error) {
      console.error((error as Error).message);
      process.exitCode = 1;
    }
  });
  workflow
    .command('config')
    .requiredOption('--var <name>')
    .action((opts: { var: string }) => {
      const value = buildEnvMap(loadConfig())[opts.var];
      if (value === undefined) {
        console.error(`Unknown variable ${opts.var}`);
        process.exitCode = 1;
      } else console.log(value);
    });
  workflow
    .command('discover <template>')
    .description('Read effective planning blocks; produces no tasks')
    .option('--config <path>', 'Effective draft configuration JSON for installation planning')
    .action(async (template: string, opts: { config?: string }) =>
      print(await discoverWorkflow(template, opts.config)),
    );
  workflow
    .command('capture-location')
    .requiredOption('--source-kind <kind>', 'Source identity namespace supplied by its skill')
    .requiredOption('--source-identity <identity>', 'Stable identity of the selected design target')
    .requiredOption('--workflow-id <id>', 'Unique fixed capture workflow ID; refresh uses a new ID')
    .action((opts: { sourceKind: string; sourceIdentity: string; workflowId: string }) =>
      print(
        captureLocation(loadConfig().data, { kind: opts.sourceKind, identity: opts.sourceIdentity }, opts.workflowId),
      ),
    );
  workflow.command('schema').action(() => print(workflowDefinitionSchema));
  workflow
    .command('validate <definition>')
    .requiredOption('--catalogue <path>', 'Saved effective planning catalogue JSON')
    .action((path: string, opts: { catalogue: string }) => {
      const definition = load(readFileSync(path, 'utf8'));
      validateDefinition(definition);
      validateCatalogueDefinition(definition, JSON.parse(readFileSync(opts.catalogue, 'utf8')) as PlanningCatalogue);
      print({ valid: true });
    });
  workflow
    .command('create <definition>')
    .requiredOption('--output <path>', 'New workflow document path')
    .requiredOption('--catalogue <path>', 'Saved effective planning catalogue JSON')
    .action(async (path: string, opts: { output: string; catalogue: string }) => {
      const definition = load(readFileSync(path, 'utf8')) as WorkflowDefinition;
      validateCatalogueDefinition(definition, JSON.parse(readFileSync(opts.catalogue, 'utf8')) as PlanningCatalogue);
      const output = resolve(opts.output);
      await saveDefinition(output, definition);
      print({ path: output });
    });
  workflow
    .command('read <path>')
    .addOption(new Option('--format <format>', 'Output format').choices(['json', 'md']).default('json'))
    .action(async (path: string, opts: { format: 'json' | 'md' }) => {
      const document = await readDocument(path);
      if (opts.format === 'md') process.stdout.write(workflowMarkdown(document));
      else print(document);
    });
  workflow.command('steps <path>').action(async (path: string) => print(stepOverview(await readDocument(path))));
  workflow
    .command('instructions <path>')
    .option('--task <id>', 'Single task context')
    .option('--step <id>', 'All tasks of one step')
    .addOption(new Option('--format <format>', 'Output format').choices(['json', 'md']).default('json'))
    .action(async (path: string, opts: { task?: string; step?: string; format: 'json' | 'md' }) => {
      if (Boolean(opts.task) === Boolean(opts.step)) throw new Error('Select exactly one of --step or --task');
      if (opts.format === 'md') {
        if (!opts.step) throw new Error('Markdown instructions require --step');
        process.stdout.write(stepMarkdown(stepContext(await readDocument(path), opts.step)));
      } else print(opts.step ? stepContext(await readDocument(path), opts.step) : await taskContext(path, opts.task!));
    });
  workflow
    .command('start <path>')
    .addOption(new Option('--task <id>', 'Existing task ID').conflicts('step'))
    .addOption(new Option('--step <id>', 'All tasks of the step').conflicts('task'))
    .option('--correction <action>', 'Action enabling a retry')
    .action(async (path: string, opts: { task?: string; step?: string; correction?: string }) =>
      print(
        stepOverview(
          await (opts.step
            ? startStep(path, opts.step, opts.correction)
            : startTask(path, selectedTask(opts), opts.correction)),
        ),
      ),
    );
  workflow
    .command('done <path>')
    .addOption(new Option('--task <id>', 'Existing task ID').conflicts('step'))
    .addOption(new Option('--step <id>', 'All tasks of the step').conflicts('task'))
    .requiredOption('--data-file <path>', 'JSON result object')
    .option('--summary <text>')
    .action(async (path: string, opts: { task?: string; step?: string; dataFile: string; summary?: string }) =>
      print(
        stepOverview(
          await (opts.step
            ? completeStep(path, opts.step, JSON.parse(readFileSync(opts.dataFile, 'utf8')), opts.summary)
            : completeTask(path, selectedTask(opts), JSON.parse(readFileSync(opts.dataFile, 'utf8')), opts.summary)),
        ),
      ),
    );
  workflow
    .command('block <path>')
    .addOption(new Option('--task <id>').conflicts('step'))
    .addOption(new Option('--step <id>').conflicts('task'))
    .requiredOption('--reason <text>')
    .requiredOption('--correction <action>')
    .action(async (path: string, opts: { task?: string; step?: string; reason: string; correction: string }) =>
      print(
        stepOverview(
          await (opts.step
            ? blockStep(path, opts.step, opts.reason, opts.correction)
            : blockTask(path, selectedTask(opts), opts.reason, opts.correction)),
        ),
      ),
    );
  workflow.command('summary <path>').action(async (path: string) => print(summarizeWorkflow(await readDocument(path))));
}
