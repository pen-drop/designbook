import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../../config.js';

let dir: string;

function load(skillsYaml: string) {
  writeFileSync(join(dir, 'designbook.config.yml'), `technology: html\n${skillsYaml}\n`);
  return loadConfig(dir);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'db-skills-cfg-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('config skills', () => {
  it('resolves path entries and keeps package names as written', () => {
    const config = load(`skills: [./local, ~/x, '@org/pkg', pkg]`);
    expect(config.skills).toEqual([join(dir, 'local'), join(homedir(), 'x'), '@org/pkg', 'pkg']);
  });

  it('rejects a single string naming the list form', () => {
    expect(() => load('skills: ./x')).toThrow(/skills must be a list/);
  });

  it('rejects a non-string item', () => {
    expect(() => load('skills: [1]')).toThrow(/skills/);
  });

  it('leaves skills unset when absent', () => {
    expect(load('').skills).toBeUndefined();
  });
});
