import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { resolveSkillEntry, resolveSkillSources } from '../workflow/skill-resolver.js';
import type { DesignbookConfig } from '../shared/config.js';

function cfg(skills?: string[]): DesignbookConfig {
  return { data: '', technology: 'html', ...(skills ? { skills } : {}) } as DesignbookConfig;
}

function tmp(prefix: string): string {
  return mkdtempSync(resolve(tmpdir(), prefix));
}

/** A skill package at `root`: `package.json` + `skills/<skill>/workflows/`. */
function mkPackage(root: string, skills: string[], pkgJson: Record<string, unknown> = {}): string {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'x', ...pkgJson }));
  for (const s of skills) mkdirSync(join(root, 'skills', s, 'workflows'), { recursive: true });
  return root;
}

/** A project dir with `node_modules/<name>` installed. */
function mkInstalled(project: string, name: string, skills: string[], pkgJson?: Record<string, unknown>): string {
  return mkPackage(join(project, 'node_modules', ...name.split('/')), skills, pkgJson);
}

function rootOf(sources: { name: string; root: string }[], name: string): string | undefined {
  return sources.find((s) => s.name === name)?.root;
}

describe('resolveSkillEntry', () => {
  it('resolves a package name from the config dir node_modules', () => {
    const project = tmp('db-res-');
    const pkg = mkInstalled(project, 'my-skills', ['a']);
    expect(resolveSkillEntry('my-skills', project)).toBe(pkg);
  });

  it('resolves a scoped package name', () => {
    const project = tmp('db-res-');
    const pkg = mkInstalled(project, '@org/skills', ['a']);
    expect(resolveSkillEntry('@org/skills', project)).toBe(pkg);
  });

  it('resolves a package whose exports map hides package.json', () => {
    const project = tmp('db-res-');
    const pkg = mkInstalled(project, 'hidden', ['a'], { exports: { '.': './index.js' } });
    expect(resolveSkillEntry('hidden', project)).toBe(pkg);
  });

  it('resolves from a parent dir node_modules (theme subdir config)', () => {
    const workspace = tmp('db-res-');
    const pkg = mkInstalled(workspace, 'my-skills', ['a']);
    const theme = join(workspace, 'web', 'themes', 'custom', 't');
    mkdirSync(theme, { recursive: true });
    expect(resolveSkillEntry('my-skills', theme)).toBe(pkg);
  });

  it('resolves an absolute path entry', () => {
    const pkg = mkPackage(join(tmp('db-res-'), 'local'), ['a']);
    expect(resolveSkillEntry(pkg, '/unused')).toBe(pkg);
  });

  it('throws naming an unknown package', () => {
    expect(() => resolveSkillEntry('nope-skills', tmp('db-res-'))).toThrow(/'nope-skills'/);
  });

  it('throws naming a path without skills/', () => {
    const dir = tmp('db-res-');
    expect(() => resolveSkillEntry(dir, '/unused')).toThrow(dir);
  });
});

describe('resolveSkillSources precedence', () => {
  /** project-local `.agents/skills/a`, entry1 `a`, entry2 `a`, bundled `a` — layers removable. */
  function setup(layers: { project?: boolean; e1?: boolean; e2?: boolean; bundled?: boolean }) {
    const project = tmp('db-prec-');
    writeFileSync(join(project, 'designbook.config.yml'), 'technology: html\n');
    if (layers.project) mkdirSync(join(project, '.agents', 'skills', 'a', 'workflows'), { recursive: true });
    const e1 = mkInstalled(project, 'e1', layers.e1 ? ['a'] : ['other1']);
    const e2 = mkInstalled(project, 'e2', layers.e2 ? ['a'] : ['other2']);
    const bundled = mkPackage(join(project, 'bundled'), layers.bundled ? ['a'] : []);
    const sources = resolveSkillSources(project, { config: cfg(['e1', 'e2']), bundledRoot: bundled });
    return { project, e1, e2, bundled, sources };
  }

  it('project-local beats every entry and bundled', () => {
    const r = setup({ project: true, e1: true, e2: true, bundled: true });
    expect(rootOf(r.sources, 'a')).toBe(join(r.project, '.agents', 'skills', 'a'));
  });

  it('first listed entry beats later entries and bundled', () => {
    const r = setup({ e1: true, e2: true, bundled: true });
    expect(rootOf(r.sources, 'a')).toBe(join(r.e1, 'skills', 'a'));
  });

  it('later entry beats bundled', () => {
    const r = setup({ e2: true, bundled: true });
    expect(rootOf(r.sources, 'a')).toBe(join(r.e2, 'skills', 'a'));
  });

  it('bundled is used when nothing else provides the skill', () => {
    const r = setup({ bundled: true });
    expect(rootOf(r.sources, 'a')).toBe(join(r.bundled, 'skills', 'a'));
    expect(r.sources.find((s) => s.name === 'a')?.origin).toBe('plugin');
  });

  it('loads bundled skills only when skills is absent', () => {
    const project = tmp('db-prec-');
    const bundled = mkPackage(join(project, 'bundled'), ['designbook']);
    const sources = resolveSkillSources(project, { config: cfg(), bundledRoot: bundled });
    expect(sources).toEqual([{ name: 'designbook', root: join(bundled, 'skills', 'designbook'), origin: 'plugin' }]);
  });

  it('fails naming an unresolvable entry', () => {
    const project = tmp('db-prec-');
    expect(() => resolveSkillSources(project, { config: cfg(['missing-pkg']), bundledRoot: null })).toThrow(
      /'missing-pkg'/,
    );
  });
});

describe('skill-resolver source', () => {
  it('has no per-harness detector', () => {
    const src = readFileSync(resolve(__dirname, '../workflow/skill-resolver.ts'), 'utf-8');
    expect(src).not.toMatch(/CLAUDECODE|CODEX_HOME|\.gemini|DISABLE_AUTODETECT|\.agents['"], ['"]skills/);
  });
});
