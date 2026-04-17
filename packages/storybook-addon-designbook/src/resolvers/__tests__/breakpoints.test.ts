import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { ResolverContext } from '../types.js';
import { breakpointsResolver } from '../breakpoints.js';

const tmpDir = join(import.meta.dirname, '__fixtures_breakpoints_resolver__');

function makeContext(params: Record<string, unknown> = {}): ResolverContext {
  return { config: { data: tmpDir, technology: 'html' }, params };
}

const TOKENS_YAML = `
semantic:
  breakpoints:
    $extensions:
      designbook:
        renderer: screen
    sm: { $value: "640px", $type: dimension }
    xl: { $value: "1280px", $type: dimension }
`;

describe('breakpointsResolver', () => {
  beforeAll(() => {
    mkdirSync(join(tmpDir, 'design-system'), { recursive: true });
    writeFileSync(join(tmpDir, 'design-system', 'design-tokens.yml'), TOKENS_YAML);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('has name "breakpoints"', () => {
    expect(breakpointsResolver.name).toBe('breakpoints');
  });

  it('resolves breakpoint names from design-tokens.yml', async () => {
    const result = await breakpointsResolver.resolve('', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sm,xl');
  });

  it('returns unresolved when design-tokens.yml is missing', async () => {
    const ctx = makeContext();
    ctx.config.data = join(tmpDir, 'nonexistent');
    const result = await breakpointsResolver.resolve('', {}, ctx);
    expect(result.resolved).toBe(false);
    expect(result.error).toContain('design-tokens.yml');
  });

  it('returns unresolved when no breakpoints section exists', async () => {
    const noBreakpointsDir = join(tmpDir, 'no-bp');
    mkdirSync(join(noBreakpointsDir, 'design-system'), { recursive: true });
    writeFileSync(join(noBreakpointsDir, 'design-system', 'design-tokens.yml'), 'semantic:\n  colors: {}');
    const ctx = makeContext();
    ctx.config.data = noBreakpointsDir;
    const result = await breakpointsResolver.resolve('', {}, ctx);
    expect(result.resolved).toBe(false);
    expect(result.error).toContain('breakpoints');
  });

  it('ignores $ keys (like $extensions)', async () => {
    const result = await breakpointsResolver.resolve('', {}, makeContext());
    expect(result.value).not.toContain('$extensions');
  });
});
