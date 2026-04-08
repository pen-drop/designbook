import { resolve } from 'node:path';
import { Command } from 'commander';
import { loadConfig, normalizeExtensions, getExtensionIds, getExtensionSkillIds } from './config.js';
import { validateData } from './validators/data.js';
import { validateTokens } from './validators/tokens.js';
import { validateComponent } from './validators/component.js';
import { validateDataModel } from './validators/data-model.js';
import { validateEntityMapping } from './validators/entity-mapping.js';
import { register as registerWorkflow } from './cli/workflow.js';
import { register as registerStory } from './cli/story.js';
import { register as registerStorybook } from './cli/storybook.js';

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

      // Skip internal properties and designbook.* nested keys (handled explicitly below)
      if (key === 'data' || key === 'workspace') continue;
      if (key.startsWith('designbook.')) continue;

      if (Array.isArray(value)) {
        if (key === 'extensions') {
          // extensions: normalize to objects, then emit ids and skills separately
          const entries = normalizeExtensions(value);
          const ids = getExtensionIds(entries).replace(/'/g, "'\\''");
          const skills = getExtensionSkillIds(entries).replace(/'/g, "'\\''");
          console.log(`export DESIGNBOOK_EXTENSIONS='${ids}'`);
          console.log(`export DESIGNBOOK_EXTENSION_SKILLS='${skills}'`);
          continue;
        }
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

    // Explicit: DESIGNBOOK_HOME, DESIGNBOOK_DATA, DESIGNBOOK_URL
    const home = config['designbook.home'] as string | undefined;
    const data = config['designbook.data'] as string | undefined;
    const url = config['designbook.url'] as string | undefined;
    if (home) console.log(`export DESIGNBOOK_HOME='${home.replace(/'/g, "'\\''")}'`);
    if (data) console.log(`export DESIGNBOOK_DATA='${data.replace(/'/g, "'\\''")}'`);
    if (url) console.log(`export DESIGNBOOK_URL='${url.replace(/'/g, "'\\''")}'`);

    // DESIGNBOOK_CMD: shell function that runs from DESIGNBOOK_HOME
    const cmd = config['designbook.cmd'] as string | undefined;
    if (cmd) {
      const runDir = (home ?? process.cwd()).replace(/'/g, "'\\''");
      console.log(`designbook() { (cd '${runDir}' && ${cmd} "$@"); }`);
      console.log(`export DESIGNBOOK_CMD='designbook'`);
    }

    // Derive SDC provider from drupal.theme
  });

const validate = program.command('validate').description('Validate Designbook artifacts against schemas');

validate
  .command('data <section-id>')
  .description('Validate section data.yml against data-model.yml')
  .action((sectionId: string) => {
    const config = loadConfig();
    const dataModelPath = resolve(config.data, 'data-model.yml');
    const dataPath = resolve(config.data, 'sections', sectionId, 'data.yml');
    const result = validateData(dataModelPath, dataPath);
    printJson(sectionId, result.valid, result.errors, result.warnings);
  });

validate
  .command('tokens')
  .description('Validate design tokens against W3C schema')
  .action(() => {
    const config = loadConfig();
    const tokensPath = resolve(config.data, 'design-system', 'design-tokens.yml');
    const result = validateTokens(tokensPath);
    printJson('design-tokens', result.valid, result.errors, result.warnings);
  });

validate
  .command('component <name>')
  .description('Validate component YAML against Drupal SDC schema')
  .action((name: string) => {
    const config = loadConfig();
    const themePath = config['designbook.home'] as string | undefined;
    if (!themePath) {
      console.error('Error: designbook.home not configured in designbook.config.yml');
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
    const dataModelPath = resolve(config.data, 'data-model.yml');
    const result = validateDataModel(dataModelPath);
    printJson('data-model', result.valid, result.errors, result.warnings);
  });

validate
  .command('entity-mapping <name>')
  .description('Validate a .jsonata entity mapping file against sample data')
  .action(async (name: string) => {
    const config = loadConfig();
    const file = resolve(config.data, 'entity-mapping', `${name}.jsonata`);
    const result = await validateEntityMapping(file, config);
    printJson(name, result.valid, result.errors, result.warnings);
  });

// Register submodules
registerWorkflow(program);
registerStory(program);
registerStorybook(program);

program.parse();
