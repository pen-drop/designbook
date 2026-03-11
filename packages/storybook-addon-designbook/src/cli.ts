import { basename, dirname, resolve } from 'node:path';
import { Command } from 'commander';
import { findConfig, loadConfig } from './config.js';
import { validateData } from './validators/data.js';
import { validateTokens } from './validators/tokens.js';
import { validateComponent } from './validators/component.js';
import { validateDataModel } from './validators/data-model.js';
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

program
  .name('storybook-addon-designbook')
  .description('Designbook CLI utilities');

program
  .command('config')
  .description('Output shell export statements for designbook.config.yml values')
  .action(() => {
    const config = loadConfig();

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null) continue;

      const parts = key.split('.');
      const envParts = parts.map((p) =>
        p === 'frameworks' ? 'FRAMEWORK' : p.toUpperCase(),
      );
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

const validate = program
  .command('validate')
  .description('Validate Designbook artifacts against schemas');

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

program.parse();
