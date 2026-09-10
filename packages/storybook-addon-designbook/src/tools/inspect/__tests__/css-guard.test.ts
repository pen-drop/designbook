import { describe, it, expect } from 'vitest';
import { collectMissing } from '../css-guard.js';
import type { StyleEnv } from '../style-env.js';

const env: StyleEnv = {
  root_vars: { '--color-primary': '#00336a', '--color-empty': '' },
  fonts: [
    { family: 'Inter', loaded: true },
    { family: 'Material Symbols Outlined', loaded: false },
  ],
};

describe('collectMissing', () => {
  it('flags vars that are absent or empty, and fonts not loaded', () => {
    const r = collectMissing(
      {
        vars: ['--color-primary', '--color-empty', '--color-surface-variant'],
        fonts: ['Inter', 'Material Symbols Outlined'],
      },
      env,
    );
    expect(r.vars).toEqual(['--color-empty', '--color-surface-variant']); // empty + absent
    expect(r.fonts).toEqual(['Material Symbols Outlined']);
    expect(r.ok).toBe(false);
  });

  it('ok=true when everything present', () => {
    const r = collectMissing({ vars: ['--color-primary'], fonts: ['Inter'] }, env);
    expect(r.ok).toBe(true);
    expect(r.vars).toEqual([]);
    expect(r.fonts).toEqual([]);
  });
});
