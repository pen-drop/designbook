import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { buildThemesModule } from '../vite-plugin';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

function parseExports(moduleStr: string): { themes: Record<string, string>; themeNames: string[]; defaultTheme: string } {
  const themesMatch = moduleStr.match(/export const themes = ({[^;]+});/);
  const namesMatch = moduleStr.match(/export const themeNames = (\[[^\]]+\]);/);
  const defaultMatch = moduleStr.match(/export const defaultTheme = '([^']+)';/);
  return {
    themes: themesMatch ? JSON.parse(themesMatch[1]!) : {},
    themeNames: namesMatch ? JSON.parse(namesMatch[1]!) : [],
    defaultTheme: defaultMatch ? defaultMatch[1]! : '',
  };
}

describe('buildThemesModule', () => {
  it('tokens with one theme exports light + dark', () => {
    const module = buildThemesModule(resolve(FIXTURES_DIR, 'themes-one'));
    const { themes, themeNames, defaultTheme } = parseExports(module);

    expect(themeNames).toEqual(['light', 'dark']);
    expect(themes).toEqual({ light: 'light', dark: 'dark' });
    expect(defaultTheme).toBe('light');
  });

  it('tokens with multiple themes exports all', () => {
    const module = buildThemesModule(resolve(FIXTURES_DIR, 'themes-multi'));
    const { themes, themeNames, defaultTheme } = parseExports(module);

    expect(themeNames).toEqual(['light', 'dark', 'brand-x']);
    expect(themes).toEqual({ light: 'light', dark: 'dark', 'brand-x': 'brand-x' });
    expect(defaultTheme).toBe('light');
  });

  it('tokens without themes section exports only light', () => {
    const module = buildThemesModule(resolve(FIXTURES_DIR, 'themes-none'));
    const { themes, themeNames, defaultTheme } = parseExports(module);

    expect(themeNames).toEqual(['light']);
    expect(themes).toEqual({ light: 'light' });
    expect(defaultTheme).toBe('light');
  });

  it('nonexistent designbook dir exports only light', () => {
    const module = buildThemesModule(resolve(FIXTURES_DIR, 'does-not-exist'));
    const { themeNames } = parseExports(module);

    expect(themeNames).toEqual(['light']);
  });
});
