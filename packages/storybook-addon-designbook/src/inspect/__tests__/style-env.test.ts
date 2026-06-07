import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { captureStyleEnv } from '../style-env.js';

const PROBE = pathToFileURL(join(__dirname, '../../../../../tests/fixtures/element-walker/style-env-probe.html')).href;

describe('captureStyleEnv (real chromium)', () => {
  it('reads :root custom properties and their resolved values', async () => {
    const env = await captureStyleEnv(PROBE, { fonts: [] });
    expect(env.root_vars['--color-primary']).toBe('#00336a');
    expect(env.root_vars['--color-surface-variant']).toBe('#ececec');
    expect(env.root_vars['--not-defined']).toBeUndefined();
  }, 60_000);

  it('reports requested fonts as loaded / not loaded', async () => {
    const env = await captureStyleEnv(PROBE, { fonts: ['ProbeMono', 'NoSuchFace'] });
    const probe = env.fonts.find((f) => f.family === 'ProbeMono');
    const missing = env.fonts.find((f) => f.family === 'NoSuchFace');
    expect(probe?.loaded).toBe(true); // declared @font-face, loaded
    expect(missing?.loaded).toBe(false); // declared @font-face, broken source
  }, 60_000);

  it('reports an UNDECLARED family as not loaded (no @font-face entry)', async () => {
    // Guards against document.fonts.check() false-positives: a family with no
    // @font-face rule must report loaded:false, not true (system fallback).
    const env = await captureStyleEnv(PROBE, { fonts: ['TotallyUndeclaredFamily'] });
    expect(env.fonts.find((f) => f.family === 'TotallyUndeclaredFamily')?.loaded).toBe(false);
  }, 60_000);
});
