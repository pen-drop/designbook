/**
 * `instructions --file` and `validate file`: a plan-free edit gets the step's rules,
 * blueprints and output schema, and the same result checks `plan done` runs.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { Command, CommanderError } from 'commander';
import { register } from '../file.js';
import { loadConfig } from '../../shared/config.js';

const workspaceRoot = resolve(process.cwd(), '../../');
const fixture = join(workspaceRoot, 'fixtures/drupal-petshop/designbook.config.yml');

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const program = new Command();
  program.exitOverride();
  register(program);
  let stdout = '';
  let stderr = '';
  const originalOut = process.stdout.write.bind(process.stdout);
  const originalConsoleError = console.error;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  }) as typeof process.stdout.write;
  console.error = ((...parts: unknown[]) => {
    stderr += `${parts.map(String).join(' ')}\n`;
  }) as typeof console.error;
  process.exitCode = undefined;
  try {
    await program.parseAsync(['node', 'cli', ...args]);
  } catch (err: unknown) {
    if (!(err instanceof CommanderError)) throw err;
    stderr += `${err.message}\n`;
    process.exitCode = err.exitCode || 1;
  } finally {
    process.stdout.write = originalOut;
    console.error = originalConsoleError;
  }
  const exitCode = typeof process.exitCode === 'number' ? process.exitCode : 0;
  process.exitCode = undefined;
  return { stdout, stderr, exitCode };
}

let home: string;
let configJson: string;
const write = (rel: string, body: string) => {
  mkdirSync(dirname(join(home, rel)), { recursive: true });
  writeFileSync(join(home, rel), body);
  return join(home, rel);
};

beforeAll(() => {
  home = realpathSync(mkdtempSync(join(tmpdir(), 'cli-file-')));
  copyFileSync(fixture, join(home, 'designbook.config.yml'));
  configJson = join(home, 'config.json');
  writeFileSync(configJson, JSON.stringify(loadConfig(home)));
});
afterAll(() => rmSync(home, { recursive: true, force: true }));
afterEach(() => {
  process.exitCode = undefined;
});

const ws = () => ['--config-dir', workspaceRoot, '--config', configJson, '--workflow', 'design-component'];

describe('instructions --file', () => {
  it('prints rules, blueprints and schema', async () => {
    const file = join(home, 'components/card/card.component.yml');
    const { stdout, exitCode } = await runCli(['instructions', '--file', file, ...ws()]);
    expect(exitCode).toBe(0);
    const out = JSON.parse(stdout);
    expect(out).toMatchObject({ file, task: 'write-component', output: 'component-yml' });
    expect(out.schema).toHaveProperty('$ref');
    expect(Object.keys(out.definitions).length).toBeGreaterThan(0);
    expect(out.context.some((c: { source: string }) => c.source.endsWith('sdc-components.md'))).toBe(true);
    expect(out.context.every((c: { content: string }) => c.content.length > 0)).toBe(true);
  });

  it('fails on a file no task declares', async () => {
    const { stderr, exitCode } = await runCli(['instructions', '--file', join(home, 'README.md'), ...ws()]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('no task output declares');
  });
});

describe('validate file', () => {
  const valid = [
    '$schema: https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json',
    'name: Card',
    'status: stable',
    'group: Atoms',
    'props:',
    '  type: object',
    '  properties: {}',
    '',
  ].join('\n');

  it('passes a valid component.yml', async () => {
    const file = write('components/card/card.component.yml', valid);
    const { stdout, stderr, exitCode } = await runCli(['validate', 'file', file, ...ws()]);
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ file, valid: true, errors: [] });
  });

  it('fails an invalid one', async () => {
    const file = write('components/bad/bad.component.yml', 'status: 42\n');
    const { stdout, exitCode } = await runCli(['validate', 'file', file, ...ws()]);
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.valid).toBe(false);
    expect(out.errors.join('\n')).toContain('output "component-yml"');
  });

  it('reports unparseable YAML without a stack trace', async () => {
    const file = write('components/broken/broken.component.yml', 'name: [unclosed\n');
    const { stdout, stderr, exitCode } = await runCli(['validate', 'file', file, ...ws()]);
    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout).errors[0]).toMatch(/parse/i);
    expect(stderr).not.toMatch(/\bat .*\.ts:\d+/);
  });

  it('fails on a cmd: validator', async () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'cli-file-cmd-')));
    try {
      const put = (rel: string, body: string) => {
        mkdirSync(dirname(join(dir, rel)), { recursive: true });
        writeFileSync(join(dir, rel), body);
      };
      put('.agents/skills/w/workflows/demo.md', '---\nstages:\n  s:\n    steps: [one]\n---\n');
      put(
        '.agents/skills/w/tasks/one.md',
        "---\ntrigger:\n  steps: [one]\nresult:\n  type: object\n  properties:\n    out:\n      path: ${DESIGNBOOK_HOME}/x/{{ n }}.txt\n      type: string\n      validators: ['cmd:false {{ file }}']\n---\n",
      );
      const cfg = join(dir, 'config.json');
      writeFileSync(cfg, JSON.stringify({ data: `${dir}/designbook`, 'designbook.home': dir, extensions: [] }));
      put('x/a.txt', 'hello');
      const args = ['validate', 'file', join(dir, 'x/a.txt'), '--config-dir', dir, '--config', cfg];
      const { stdout, exitCode } = await runCli(args);
      expect(exitCode).toBe(1);
      expect(JSON.parse(stdout).errors.join('\n')).toContain('output "out" failed validation');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
