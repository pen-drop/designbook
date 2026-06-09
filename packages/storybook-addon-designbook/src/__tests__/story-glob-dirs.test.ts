import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { storyGlobDirs } from '../storybook.js';

let ws: string;

beforeEach(() => {
  // Deterministic, collision-free per-run dir without Date.now/Math.random.
  ws = resolve(tmpdir(), `dbo-storyglob-${process.pid}`);
  mkdirSync(resolve(ws, '.storybook'), { recursive: true });
});

afterEach(() => {
  rmSync(ws, { recursive: true, force: true });
});

function writeMain(stories: string): void {
  writeFileSync(resolve(ws, '.storybook', 'main.js'), `const config = { ${stories} };\nexport default config;\n`);
}

describe('storyGlobDirs', () => {
  it('derives glob roots from the stories array, resolved relative to .storybook', () => {
    writeMain(`"stories": [ "../components/**/*.component.yml", "../stories/**/*.stories.@(js|ts)" ]`);
    const dirs = storyGlobDirs(ws).sort();
    expect(dirs).toEqual([resolve(ws, 'components'), resolve(ws, 'stories')].sort());
  });

  it('skips concrete file entries with no glob metachar', () => {
    writeMain(`stories: [ "../intro.mdx", "../components/**/*.component.yml" ]`);
    expect(storyGlobDirs(ws)).toEqual([resolve(ws, 'components')]);
  });

  it('returns [] when .storybook/main.* is absent', () => {
    rmSync(resolve(ws, '.storybook'), { recursive: true, force: true });
    expect(storyGlobDirs(ws)).toEqual([]);
  });

  it('returns [] when no stories array can be parsed', () => {
    writeFileSync(resolve(ws, '.storybook', 'main.js'), `export default { addons: [] };\n`);
    expect(storyGlobDirs(ws)).toEqual([]);
  });

  it('dedupes when two globs share a root', () => {
    writeMain(`stories: [ "../components/**/*.component.yml", "../components/**/*.stories.js" ]`);
    expect(storyGlobDirs(ws)).toEqual([resolve(ws, 'components')]);
  });
});
