/**
 * `intake <workflow>` CLI: emits the resolved IntakeContext as JSON on stdout.
 */
import { describe, it, expect } from 'vitest';
import { resolve, join } from 'node:path';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import { register as registerIntake } from '../intake.js';

/** Worktree root — resolves the real `.agents`/`.claude` skills tree. */
const workspaceRoot = resolve(process.cwd(), '../../');

const config = {
  data: '/tmp/intake-cli',
  technology: 'html',
  backend: 'drupal',
  'frameworks.component': 'sdc',
  'frameworks.css': 'tailwind',
  extensions: [],
};

async function runIntake(args: string[]): Promise<string> {
  const program = new Command();
  program.exitOverride();
  registerIntake(program);
  let out = '';
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    out += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  }) as typeof process.stdout.write;
  try {
    await program.parseAsync(['node', 'cli', ...args]);
  } finally {
    process.stdout.write = original;
  }
  return out;
}

describe('intake <workflow>', () => {
  it('emits IntakeContext JSON', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'intake-cli-'));
    const configPath = join(dir, 'config.json');
    writeFileSync(configPath, JSON.stringify(config));
    try {
      const out = await runIntake(['intake', 'design-shell', '--config-dir', workspaceRoot, '--config', configPath]);
      const ctx = JSON.parse(out);
      expect(ctx.workflow).toBe('design-shell');
      expect(Array.isArray(ctx.steps)).toBe(true);
      const intake = ctx.steps.find((s: { name: string }) => s.name === 'design-shell:intake');
      expect(intake).toBeDefined();
      expect(Array.isArray(intake.read_order)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each([false, true])(
    'includes workflow instructions and one shared reference gate (palette=%s)',
    async (palette) => {
      const dir = mkdtempSync(join(tmpdir(), 'intake-instructions-'));
      const configPath = join(dir, 'config.json');
      writeFileSync(configPath, JSON.stringify(config));
      try {
        const writers = ['design-component', 'design-entity', 'design-screen', 'design-shell'];
        for (const workflow of [...writers, 'tokens', 'vision', 'design-verify', 'extract-reference']) {
          const out = await runIntake([
            'intake',
            workflow,
            ...(palette ? ['--palette'] : []),
            '--config-dir',
            workspaceRoot,
            '--config',
            configPath,
          ]);
          const resolved = JSON.parse(out);
          const entries: Array<{ source: string; content: string }> = palette
            ? resolved.intake_context
            : resolved.steps
                .find((step: { name: string }) => step.name === `${workflow}:intake`)
                .read_order.map((key: string) => resolved.context[key]);
          const instructions = entries.filter((entry) => entry.source.endsWith(`/rules/${workflow}-intake.md`));
          expect(instructions).toHaveLength(1);
          expect(instructions[0]!.content).toBe(readFileSync(instructions[0]!.source, 'utf8'));
          expect(entries.filter((entry) => entry.source.endsWith('/rules/reference-prerequisite.md'))).toHaveLength(1);
          expect(entries.filter((entry) => entry.source.endsWith('/rules/design-write-planning.md'))).toHaveLength(
            writers.includes(workflow) ? 1 : 0,
          );
          expect(entries.some((entry) => entry.source.endsWith('/rules/vision-intake.md'))).toBe(workflow === 'vision');
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );

  it('exposes CompositionInputs on the writing-design palette', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'intake-palette-'));
    const configPath = join(dir, 'config.json');
    writeFileSync(configPath, JSON.stringify(config));
    try {
      const out = await runIntake([
        'intake',
        'design-entity',
        '--palette',
        '--config-dir',
        workspaceRoot,
        '--config',
        configPath,
      ]);
      const palette = JSON.parse(out) as {
        composition?: { $ref?: string };
        definitions?: { CompositionInputs?: { required?: string[] } };
      };
      expect(palette.composition).toEqual({ $ref: '#/definitions/CompositionInputs' });
      expect(palette.definitions?.CompositionInputs?.required).toEqual(
        expect.arrayContaining(['components', 'mappings', 'samples', 'scenes', 'data_model']),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
