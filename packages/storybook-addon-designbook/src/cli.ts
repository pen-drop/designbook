import { basename, resolve } from 'node:path';
import { Command } from 'commander';
import { loadConfig } from './config.js';
import { validateData } from './validators/data.js';
import { validateTokens } from './validators/tokens.js';
import { validateComponent } from './validators/component.js';
import { validateDataModel } from './validators/data-model.js';
import { validateViewMode } from './validators/view-mode.js';
import {
  workflowCreate,
  workflowUpdate,
  workflowValidate,
  workflowList,
  workflowAddFile,
  workflowDone,
} from './workflow.js';
import { readFileSync } from 'node:fs';
import { defaultRegistry, applyConfigExtensions, validateViaStorybookHttp } from './validation-registry.js';

function printJson(label: string, valid: boolean, errors?: string[], warnings?: string[]): void {
  const out: Record<string, unknown> = { valid, label };
  if (errors?.length) out.errors = errors;
  if (warnings?.length) out.warnings = warnings;
  console.log(JSON.stringify(out));
  process.exitCode = valid ? 0 : 1;
}

const program = new Command();

program.name('storybook-addon-designbook').description('Designbook CLI utilities');

program
  .command('config')
  .description('Output shell export statements for designbook.config.yml values')
  .action(() => {
    const config = loadConfig();

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) continue;

      if (Array.isArray(value)) {
        const envName = 'DESIGNBOOK_' + key.toUpperCase();
        const escaped = value.join(',').replace(/'/g, "'\\''");
        console.log(`export ${envName}='${escaped}'`);
        continue;
      }

      const parts = key.split('.');
      const envParts = parts.map((p) => (p === 'frameworks' ? 'FRAMEWORK' : p.toUpperCase()));
      const envName = 'DESIGNBOOK_' + envParts.join('_');
      const escaped = String(value).replace(/'/g, "'\\''");
      console.log(`export ${envName}='${escaped}'`);
    }

    // Derive SDC provider from drupal.theme
    const drupalTheme = config['drupal.theme'];
    if (typeof drupalTheme === 'string') {
      const provider = basename(drupalTheme).replace(/-/g, '_');
      console.log(`export DESIGNBOOK_SDC_PROVIDER='${provider}'`);
    }
  });

const validate = program.command('validate').description('Validate Designbook artifacts against schemas');

validate
  .command('data <section-id>')
  .description('Validate section data.yml against data-model.yml')
  .action((sectionId: string) => {
    const config = loadConfig();
    const dist = config.dist;
    const dataModelPath = resolve(dist, 'data-model.yml');
    const dataPath = resolve(dist, 'sections', sectionId, 'data.yml');
    const result = validateData(dataModelPath, dataPath);
    printJson(sectionId, result.valid, result.errors, result.warnings);
  });

validate
  .command('tokens')
  .description('Validate design tokens against W3C schema')
  .action(() => {
    const config = loadConfig();
    const tokensPath = resolve(config.dist, 'design-system', 'design-tokens.yml');
    const result = validateTokens(tokensPath);
    printJson('design-tokens', result.valid, result.errors, result.warnings);
  });

validate
  .command('component <name>')
  .description('Validate component YAML against Drupal SDC schema')
  .action((name: string) => {
    const config = loadConfig();
    const themePath = config['drupal.theme'] as string;
    if (!themePath) {
      console.error('Error: drupal.theme not configured in designbook.config.yml');
      process.exitCode = 1;
      return;
    }
    const componentPath = resolve(themePath, 'components', name, `${name}.component.yml`);
    const result = validateComponent(componentPath);
    printJson(name, result.valid, result.errors, result.warnings);
  });

validate
  .command('data-model')
  .description('Validate data-model.yml against schema')
  .action(() => {
    const config = loadConfig();
    const dataModelPath = resolve(config.dist, 'data-model.yml');
    const result = validateDataModel(dataModelPath);
    printJson('data-model', result.valid, result.errors, result.warnings);
  });

validate
  .command('story <file>')
  .description('Validate a story or scenes file via the running Storybook /index.json')
  .action(async (file: string) => {
    const config = loadConfig();
    const result = await validateViaStorybookHttp(resolve(file), config);
    if (result.skipped) {
      console.log(JSON.stringify({ valid: null, skipped: true, reason: 'Storybook not running' }));
      process.exitCode = 0;
    } else {
      console.log(JSON.stringify({ valid: result.valid, label: file, error: result.error, html: result.html }));
      process.exitCode = result.valid ? 0 : 1;
    }
  });

validate
  .command('view-mode <name>')
  .description('Validate a .jsonata view-mode mapping file against sample data')
  .action(async (name: string) => {
    const config = loadConfig();
    const file = resolve(config.dist, 'view-modes', `${name}.jsonata`);
    const result = await validateViewMode(file, config);
    printJson(name, result.valid, result.errors, result.warnings);
  });

const workflow = program.command('workflow').description('Manage workflow tracking');

workflow
  .command('list')
  .description('List unarchived workflows for a given workflow id')
  .requiredOption('--workflow <id>', 'Workflow identifier (e.g., debo-design-shell)')
  .action((opts: { workflow: string }) => {
    const config = loadConfig();
    const names = workflowList(config.dist, opts.workflow);
    for (const n of names) console.log(n);
  });

workflow
  .command('create')
  .description('Create a new workflow tracking file with a full task plan')
  .requiredOption('--workflow <id>', 'Workflow identifier (e.g., debo-vision)')
  .requiredOption('--title <title>', 'Human-readable workflow title')
  .option('--tasks <json>', 'JSON array of tasks with id, title, type, stage?, files[]')
  .option('--tasks-file <path>', 'Path to JSON file containing tasks array')
  .option('--stages <json>', 'JSON array of ordered stage names (e.g. ["dialog","create-component"])')
  .action((opts: { workflow: string; title: string; tasks?: string; tasksFile?: string; stages?: string }) => {
    const config = loadConfig();

    let tasks: Array<{ id: string; title: string; type: string; stage?: string; files?: string[] }> = [];

    if (opts.tasksFile) {
      try {
        tasks = JSON.parse(readFileSync(opts.tasksFile, 'utf-8'));
      } catch (err) {
        console.error(`Error reading tasks file: ${(err as Error).message}`);
        process.exitCode = 1;
        return;
      }
    } else if (opts.tasks) {
      try {
        tasks = JSON.parse(opts.tasks);
      } catch (err) {
        console.error(`Error parsing --tasks JSON: ${(err as Error).message}`);
        process.exitCode = 1;
        return;
      }
    }

    if (!Array.isArray(tasks)) {
      console.error('Error: tasks must be a JSON array');
      process.exitCode = 1;
      return;
    }

    let stages: string[] | undefined;
    if (opts.stages) {
      try {
        stages = JSON.parse(opts.stages);
        if (!Array.isArray(stages)) throw new Error('stages must be an array');
      } catch (err) {
        console.error(`Error parsing --stages JSON: ${(err as Error).message}`);
        process.exitCode = 1;
        return;
      }
    }

    const name = workflowCreate(config.dist, opts.workflow, opts.title, tasks, stages);
    console.log(name);
  });

workflow
  .command('add-file')
  .description('Add a file to an existing task (escape hatch for files not known at plan time)')
  .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
  .requiredOption('--task <id>', 'Task id')
  .requiredOption('--file <path>', 'File path to register with the task')
  .action((opts: { workflow: string; task: string; file: string }) => {
    const config = loadConfig();
    try {
      workflowAddFile(config.dist, opts.workflow, opts.task, opts.file);
      console.log(`Added file to task ${opts.task}: ${opts.file}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

workflow
  .command('done')
  .description('Mark a task as done. Auto-archives workflow when all tasks are done.')
  .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
  .requiredOption('--task <id>', 'Task id to mark done')
  .action((opts: { workflow: string; task: string }) => {
    const config = loadConfig();
    try {
      const result = workflowDone(config.dist, opts.workflow, opts.task);
      const { data } = result;

      if (result.archived) {
        console.log(`Workflow ${opts.workflow} archived (all tasks done)`);
        console.log(`  Completed: ${data.completed_at}`);
        console.log(`  Summary:   ${data.summary}`);
      } else {
        const done = data.tasks.filter((t) => t.status === 'done').length;
        console.log(`Task ${opts.task} → done (${done}/${data.tasks.length} tasks complete)`);
        for (const t of data.tasks) {
          const icon = t.status === 'done' ? '✓' : t.status === 'in-progress' ? '○' : '·';
          console.log(`  ${icon} ${t.title} — ${t.status}`);
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

workflow
  .command('update <name> <task-id>')
  .description('Update a task status in a workflow')
  .requiredOption('--status <status>', 'New status: in-progress or done')
  .option('--files <paths...>', 'Files produced by this task (absolute or relative to designbook dir)')
  .action((name: string, taskId: string, opts: { status: string; files?: string[] }) => {
    if (opts.status !== 'in-progress' && opts.status !== 'done') {
      console.error(`Error: Invalid status "${opts.status}". Must be "in-progress" or "done"`);
      process.exitCode = 1;
      return;
    }

    const config = loadConfig();
    try {
      const result = workflowUpdate(config.dist, name, taskId, opts.status, opts.files);
      const { data } = result;

      if (result.archived) {
        console.log(`Workflow ${name} archived (all tasks done)`);
        console.log(`  Completed: ${data.completed_at}`);
        console.log(`  Summary:   ${data.summary}`);
      } else {
        console.log(`Task ${taskId} → ${opts.status}`);
        console.log(
          `  Updated: ${data.tasks.find((t) => t.id === taskId)?.started_at || data.tasks.find((t) => t.id === taskId)?.completed_at}`,
        );
        if (opts.files?.length) {
          console.log(`  Files (requires validation):`);
          for (const f of opts.files) {
            console.log(`    · ${f}`);
          }
        }
        const done = data.tasks.filter((t) => t.status === 'done').length;
        const inProgress = data.tasks.filter((t) => t.status === 'in-progress').length;
        const pending = data.tasks.filter((t) => t.status === 'pending').length;
        console.log(
          `  Progress: ${done}/${data.tasks.length} done${inProgress ? `, ${inProgress} in-progress` : ''}${pending ? `, ${pending} pending` : ''}`,
        );
        for (const t of data.tasks) {
          const icon = t.status === 'done' ? '\u2713' : t.status === 'in-progress' ? '\u25CB' : '\u00B7';
          console.log(`    ${icon} ${t.title} (${t.type}) — ${t.status}`);
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

workflow
  .command('validate')
  .description('Validate files in a workflow. Use --task to scope to a single task.')
  .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
  .option('--task <id>', 'Scope validation to a specific task id')
  .action(async (opts: { workflow: string; task?: string }) => {
    const name = opts.workflow;
    const config = loadConfig();
    applyConfigExtensions(config, defaultRegistry);

    try {
      const results = await workflowValidate(
        config.dist,
        name,
        (file) => defaultRegistry.validate(file, config),
        opts.task,
      );

      let hasFailure = false;
      for (const r of results) {
        const line: Record<string, unknown> = {
          task: r.task,
          file: r.file,
          type: r.type,
          valid: r.valid,
        };
        if (r.error) line.error = r.error;
        if (r.html) line.html = r.html;
        if (r.skipped) line.skipped = r.skipped;
        console.log(JSON.stringify(line));
        if (r.valid === false) hasFailure = true;
      }

      process.exitCode = hasFailure ? 1 : 0;
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program.parse();
