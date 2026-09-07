import { summarizeWorkflow } from '../workflow-summary.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Command } from 'commander';
import { load } from 'js-yaml';
import { findConfig, loadConfig, resolveSkillsRoot, type DesignbookConfig } from '../config.js';
import { resolveSkillSources } from '../skill-resolver.js';
import { resolveAllStages, buildEnvMap } from '../workflow-resolve.js';
import { resolveWorkflowFile, listWorkflowDefinitions, loadWorkflowDefinition } from './workflow-discovery.js';
import { workflowDefinitionSchema, validateDefinition, type WorkflowDefinition } from '../workflow-document.js';
import { saveDefinition, readDocument, taskContext, startTask, completeTask, blockTask } from '../workflow-store.js';
import { definitionContracts } from '../planning-contracts.js';

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
  workflow.command('schema').action(() => print(workflowDefinitionSchema));
  workflow.command('validate <definition>').action((path: string) => {
    validateDefinition(load(readFileSync(path, 'utf8')));
    print({ valid: true });
  });
  workflow
    .command('create <definition>')
    .requiredOption('--output <path>', 'New workflow document path')
    .action(async (path: string, opts: { output: string }) => {
      const definition = load(readFileSync(path, 'utf8')) as WorkflowDefinition;
      const output = resolve(opts.output);
      await saveDefinition(output, definition);
      print({ path: output });
    });
  workflow.command('read <path>').action(async (path: string) => print(await readDocument(path)));
  workflow
    .command('instructions <path>')
    .requiredOption('--task <id>', 'Existing task ID')
    .action(async (path: string, opts: { task: string }) => print(await taskContext(path, opts.task)));
  workflow
    .command('start <path>')
    .requiredOption('--task <id>', 'Existing task ID')
    .option('--correction <action>', 'Action enabling a retry')
    .action(async (path: string, opts: { task: string; correction?: string }) =>
      print(await startTask(path, opts.task, opts.correction)),
    );
  workflow
    .command('done <path>')
    .requiredOption('--task <id>', 'Existing task ID')
    .requiredOption('--data-file <path>', 'JSON result object')
    .option('--summary <text>')
    .action(async (path: string, opts: { task: string; dataFile: string; summary?: string }) =>
      print(await completeTask(path, opts.task, JSON.parse(readFileSync(opts.dataFile, 'utf8')), opts.summary)),
    );
  workflow
    .command('block <path>')
    .requiredOption('--task <id>')
    .requiredOption('--reason <text>')
    .requiredOption('--correction <action>')
    .action(async (path: string, opts: { task: string; reason: string; correction: string }) =>
      print(await blockTask(path, opts.task, opts.reason, opts.correction)),
    );
  workflow.command('summary <path>').action(async (path: string) => print(summarizeWorkflow(await readDocument(path))));
}
