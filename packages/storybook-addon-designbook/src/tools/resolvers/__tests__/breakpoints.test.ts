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

  it('falls back to design-tokens when story exists (breakpoints no longer stored in meta)', async () => {
    const storiesDir = join(tmpDir, 'stories', 'foo--bar');
    mkdirSync(storiesDir, { recursive: true });
    writeFileSync(join(storiesDir, 'meta.yml'), `reference: abc123\nelements:\n  - id: full\n    selector: body\n`);

    const ctx = makeContext({ story_id: 'foo--bar' });
    const result = await breakpointsResolver.resolve('', { from: 'story_id' }, ctx);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sm,xl');
  });

  it('falls back to design-tokens when story_id not in meta', async () => {
    const ctx = makeContext({ story_id: 'missing--story' });
    const result = await breakpointsResolver.resolve('', { from: 'story_id' }, ctx);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sm,xl');
  });

  it('falls back to design-tokens when meta has no reference', async () => {
    const storiesDir = join(tmpDir, 'stories', 'empty--meta');
    mkdirSync(storiesDir, { recursive: true });
    writeFileSync(join(storiesDir, 'meta.yml'), `elements: []\n`);

    const ctx = makeContext({ story_id: 'empty--meta' });
    const result = await breakpointsResolver.resolve('', { from: 'story_id' }, ctx);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sm,xl');
  });

  it('falls back to design-tokens when from config is absent', async () => {
    const result = await breakpointsResolver.resolve('', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sm,xl');
  });

  it('falls back to design-tokens when story_id param is not a string', async () => {
    const ctx = makeContext({ story_id: 42 });
    const result = await breakpointsResolver.resolve('', { from: 'story_id' }, ctx);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sm,xl');
  });
});
