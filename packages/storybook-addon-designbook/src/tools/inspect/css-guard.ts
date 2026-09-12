import type { StyleEnv } from './style-env.js';

export interface ExpectedStyle {
  vars: string[]; // expected --custom-property names
  fonts: string[]; // expected font families
}

export interface MissingReport {
  ok: boolean;
  vars: string[]; // expected vars absent or empty in :root
  fonts: string[]; // expected fonts not loaded
}

/** Compare expected token vars / fonts against the captured style env. */
export function collectMissing(expected: ExpectedStyle, env: StyleEnv): MissingReport {
  const missingVars = expected.vars.filter((name) => {
    const v = env.root_vars[name];
    return v === undefined || v === '';
  });
  const loaded = new Set(env.fonts.filter((f) => f.loaded).map((f) => f.family));
  const missingFonts = expected.fonts.filter((family) => !loaded.has(family));
  return {
    ok: missingVars.length === 0 && missingFonts.length === 0,
    vars: missingVars,
    fonts: missingFonts,
  };
}
