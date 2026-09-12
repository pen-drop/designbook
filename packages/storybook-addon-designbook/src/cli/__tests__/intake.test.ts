/**
 * `intake <workflow>` CLI: emits the resolved IntakeContext as JSON on stdout.
 */
import { describe, it, expect } from 'vitest';
import { resolve, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
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
});
