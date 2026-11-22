import { readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';
import type { Command } from 'commander';
import type { DesignbookConfig } from '../shared/config.js';
import { FileResolveError, resolveFileContext, type FileContext } from '../workflow/file-resolve.js';
import { validateTaskResult } from '../workflow/plan-document.js';
import { renderValidators } from '../workflow/plan-build.js';
import { validateByKeys } from '../validation/validation-registry.js';

interface FileOpts {
  workflow?: string;
  configDir?: string;
  config?: string;
}

function lookup(file: string, opts: FileOpts): Promise<FileContext> {
  const config = opts.config ? (JSON.parse(readFileSync(opts.config, 'utf8')) as DesignbookConfig) : undefined;
  return resolveFileContext(file, { workflow: opts.workflow, configDir: opts.configDir, config });
}

/** Read a file the way `plan done` writes data outputs: YAML/JSON as data, anything else as text. */
function readValue(file: string): unknown {
  const raw = readFileSync(file, 'utf8');
  if (/\.ya?ml$/.test(file)) return parseYaml(raw);
  if (/\.json$/.test(file)) return JSON.parse(raw);
  return raw;
}

/** Same checks as `plan done`: the output schema, then the output's `cmd:` validators. */
async function validateFile(ctx: FileContext): Promise<string[]> {
  let value: unknown;
  try {
    value = readValue(ctx.file);
  } catch (err) {
    return [`cannot read or parse ${ctx.file}: ${err instanceof Error ? err.message : String(err)}`];
  }
  const task = {
    name: ctx.task,
    title: '',
    done: false,
    params: {},
    contract: { outputs: { [ctx.output]: { ...ctx.contract, required: true } } },
    results: null,
  };
  const schema = validateTaskResult(task, { [ctx.output]: value }, ctx.definitions);
  if (!schema.ok) return schema.errors;
  // Without task params only parameter-free `cmd:` validators render; the rest stay plan-only.
  const cmds = (await renderValidators(ctx.contract.validators, {})).filter((v) => v.startsWith('cmd:'));
  const check = await validateByKeys(cmds, ctx.file, {} as DesignbookConfig);
  return check.valid ? [] : [`output "${ctx.output}" failed validation: ${check.error}`];
}

/** A file no task declares, or several declare, is a clean exit 1, not a stack trace. */
async function guarded(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (err) {
    if (!(err instanceof FileResolveError)) throw err;
    console.error(err.message);
    process.exitCode = 1;
  }
}

const lookupOptions = (cmd: Command): Command =>
  cmd
    .option('--workflow <name>', 'Only consider this workflow')
    .option('--config-dir <path>', 'Workspace dir to resolve skills root and sources from')
    .option('--config <path>', 'Configuration JSON (skips designbook.config.yml lookup)');

export function register(program: Command): void {
  lookupOptions(
    program
      .command('instructions')
      .description('Print the rules, blueprints and output schema that apply to an existing file')
      .requiredOption('--file <path>', 'File to edit'),
  ).action((opts: FileOpts & { file: string }) =>
    guarded(async () => {
      const ctx = await lookup(opts.file, opts);
      process.stdout.write(
        JSON.stringify(
          {
            file: ctx.file,
            workflow: ctx.workflow,
            step: ctx.step,
            task: ctx.task,
            output: ctx.output,
            schema: ctx.contract.schema,
            definitions: ctx.definitions,
            context: ctx.context.map(({ kind, source, content }) => ({ kind, source, content })),
          },
          null,
          2,
        ),
      );
    }),
  );

  const validate =
    program.commands.find((c) => c.name() === 'validate') ??
    program.command('validate').description('Validate Designbook artifacts against schemas');
  lookupOptions(
    validate.command('file <path>').description('Validate an existing file like `plan done` validates its output'),
  ).action((path: string, opts: FileOpts) =>
    guarded(async () => {
      const ctx = await lookup(path, opts);
      const errors = await validateFile(ctx);
      process.stdout.write(JSON.stringify({ file: ctx.file, valid: errors.length === 0, errors }, null, 2));
      if (errors.length) process.exitCode = 1;
    }),
  );
}
