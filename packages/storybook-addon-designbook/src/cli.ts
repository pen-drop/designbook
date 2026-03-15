import { basename, dirname, resolve } from 'node:path';
import { Command } from 'commander';
import { findConfig, loadConfig } from './config.js';
import { validateData } from './validators/data.js';
import { validateTokens } from './validators/tokens.js';
import { validateComponent } from './validators/component.js';
import { validateDataModel } from './validators/data-model.js';
import { workflowCreate, workflowUpdate } from './workflow.js';
import type { ValidationResult } from './validators/types.js';

function printResult(label: string, result: ValidationResult): void {
  for (const e of result.errors) {
    console.error(`Error: ${e}`);
  }
  for (const w of result.warnings) {
    console.warn(`Warning: ${w}`);
  }

  if (result.valid && result.warnings.length === 0) {
    console.log(`${label} valid`);
  }

  console.log(`\n${result.errors.length} errors, ${result.warnings.length} warnings`);
  process.exitCode = result.valid ? 0 : 1;
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
    printResult('All entities, bundles, and fields', validateData(dataModelPath, dataPath));
  });

validate
  .command('tokens')
  .description('Validate design tokens against W3C schema')
  .action(() => {
    const config = loadConfig();
    const tokensPath = resolve(config.dist, 'design-system', 'design-tokens.yml');
    printResult('Design tokens', validateTokens(tokensPath));
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
    printResult(`Component ${name}`, validateComponent(componentPath));
  });

validate
  .command('data-model')
  .description('Validate data-model.yml against schema')
  .action(() => {
    const config = loadConfig();
    const dataModelPath = resolve(config.dist, 'data-model.yml');
    printResult('Data model', validateDataModel(dataModelPath));
  });

validate
  .command('story [name]')
  .description('Validate stories by rendering them headlessly via Vitest + Storybook')
  .action(async (name?: string) => {
    // Check vitest is available
    const config = loadConfig();
    const themePath = config['drupal.theme'] as string;

    if (!themePath) {
      console.error('Error: drupal.theme not configured in designbook.config.yml');
      process.exitCode = 1;
      return;
    }

    // Resolve drupal.theme relative to config file location
    const configFile = findConfig();
    const configDir = configFile ? dirname(configFile) : process.cwd();
    const root = resolve(configDir, themePath);

    // Build vitest CLI args — name is used as a file path filter
    const args = ['vitest', 'run', '--project=storybook'];
    if (name) {
      args.push(name);
    }

    const { spawn } = await import('node:child_process');
    const child = spawn('npx', args, {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      process.exitCode = code ?? 1;
    });

    child.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error(
          'Error: vitest is not installed.\n' +
            'Install it with: pnpm add -D vitest @storybook/addon-vitest @vitest/browser-playwright',
        );
      } else {
        console.error(`Error: ${err.message}`);
      }
      process.exitCode = 1;
    });
  });

const workflow = program.command('workflow').description('Manage workflow tracking');

workflow
  .command('create')
  .description('Create a new workflow tracking file')
  .requiredOption('--workflow <id>', 'Workflow identifier (e.g., debo-vision)')
  .requiredOption('--title <title>', 'Human-readable workflow title')
  .option('--task <items...>', 'Tasks in "id:title:type" format (repeatable)')
  .action((opts: { workflow: string; title: string; task?: string[] }) => {
    const config = loadConfig();
    const tasks = (opts.task || []).map((t) => {
      const [id, title, type] = t.split(':');
      if (!id || !title || !type) {
        console.error(`Error: Invalid task format "${t}". Expected "id:title:type"`);
        process.exitCode = 1;
        return null;
      }
      return { id, title, type };
    });

    if (tasks.some((t) => t === null)) return;

    const name = workflowCreate(
      config.dist,
      opts.workflow,
      opts.title,
      tasks as Array<{ id: string; title: string; type: string }>,
    );
    console.log(name);
  });

workflow
  .command('update <name> <task-id>')
  .description('Update a task status in a workflow')
  .requiredOption('--status <status>', 'New status: in-progress or done')
  .action((name: string, taskId: string, opts: { status: string }) => {
    if (opts.status !== 'in-progress' && opts.status !== 'done') {
      console.error(`Error: Invalid status "${opts.status}". Must be "in-progress" or "done"`);
      process.exitCode = 1;
      return;
    }

    const config = loadConfig();
    try {
      const result = workflowUpdate(config.dist, name, taskId, opts.status);
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

program.parse();
