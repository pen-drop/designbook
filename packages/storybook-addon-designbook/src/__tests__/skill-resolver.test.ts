import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { resolvePluginSkillSources, resolveSkillSources } from '../skill-resolver.js';
import type { DesignbookConfig } from '../config.js';

/** Minimal config object for resolver context. */
function cfg(skills?: string): DesignbookConfig {
  return { data: '', technology: 'html', ...(skills ? { skills } : {}) } as DesignbookConfig;
}

/** Create a flat skill content root at `<dir>/<skill>/workflows`. */
function mkFlatSkill(dir: string, skill = 'designbook'): string {
  mkdirSync(join(dir, skill, 'workflows'), { recursive: true });
  return dir;
}

/** Create a hashed marketplace under `<dir>/<skill>/<hash>/workflows`. Returns the marketplace base. */
function mkHashedSkill(dir: string, hash = 'abc123', skill = 'designbook'): string {
  mkdirSync(join(dir, skill, hash, 'workflows'), { recursive: true });
  return dir;
}

/**
 * Create a Claude-Code plugin cache (`<root>/plugins/cache/designbook/designbook/<hash>/`)
 * so the path matches the PATH-scan regex. Returns the marketplace base + the `bin` PATH entry.
 */
function mkClaudeCache(root: string, hash = 'abc123'): { mp: string; binEntry: string } {
  const mp = join(root, 'plugins', 'cache', 'designbook');
  mkHashedSkill(mp, hash);
  return { mp, binEntry: join(mp, 'designbook', hash, 'bin') };
}

function tmp(prefix: string): string {
  return mkdtempSync(resolve(tmpdir(), prefix));
}

describe('skill-resolver: runtime resolution', () => {
  it('config resolver wins when config.skills points at content', () => {
    const base = mkFlatSkill(tmp('debo-cfg-'));
    const result = resolvePluginSkillSources({ env: {}, home: tmp('debo-home-'), config: cfg(base) });
    expect(result?.runtime).toBe('config');
    expect(result?.sources.map((s) => s.name)).toContain('designbook');
  });

  it('claude-code resolver derives the marketplace base from a PATH bin entry', () => {
    const { mp, binEntry } = mkClaudeCache(tmp('debo-cc-'), 'eb50900ad36c');
    const env = { CLAUDECODE: '1', PATH: `/usr/bin:${binEntry}` };
    const result = resolvePluginSkillSources({ env, home: tmp('debo-home-'), config: cfg() });
    expect(result?.runtime).toBe('claude-code');
    expect(result?.sources[0]?.root).toBe(join(mp, 'designbook', 'eb50900ad36c'));
  });

  it('claude-code resolver falls back to ~/.claude/plugins/cache/designbook when PATH has no entry', () => {
    const home = tmp('debo-home-');
    mkHashedSkill(join(home, '.claude', 'plugins', 'cache', 'designbook'), 'deadbeef');
    const result = resolvePluginSkillSources({ env: { CLAUDECODE: '1', PATH: '/usr/bin' }, home, config: cfg() });
    expect(result?.runtime).toBe('claude-code');
    expect(result?.sources[0]?.root).toBe(
      join(home, '.claude', 'plugins', 'cache', 'designbook', 'designbook', 'deadbeef'),
    );
  });

  it('claude-code resolver is inert when CLAUDECODE/AI_AGENT do not indicate Claude Code', () => {
    const home = tmp('debo-home-');
    mkHashedSkill(join(home, '.claude', 'plugins', 'cache', 'designbook'));
    // No CLAUDECODE and no other runtime content → nothing resolves.
    const result = resolvePluginSkillSources({ env: {}, home, config: cfg() });
    expect(result).toBeNull();
  });

  it('codex resolver resolves $CODEX_HOME/skills (flat)', () => {
    const codexHome = tmp('debo-codex-');
    mkFlatSkill(join(codexHome, 'skills'));
    const result = resolvePluginSkillSources({
      env: { CODEX_HOME: codexHome },
      home: tmp('debo-home-'),
      config: cfg(),
    });
    expect(result?.runtime).toBe('codex');
    expect(result?.sources[0]?.root).toBe(join(codexHome, 'skills', 'designbook'));
  });

  it('gemini resolver resolves ~/.gemini/skills (no env signal)', () => {
    const home = tmp('debo-home-');
    mkFlatSkill(join(home, '.gemini', 'skills'));
    const result = resolvePluginSkillSources({ env: {}, home, config: cfg() });
    expect(result?.runtime).toBe('gemini');
    expect(result?.sources[0]?.root).toBe(join(home, '.gemini', 'skills', 'designbook'));
  });

  it('agents resolver resolves the cross-runtime ~/.agents/skills', () => {
    const home = tmp('debo-home-');
    mkFlatSkill(join(home, '.agents', 'skills'));
    const result = resolvePluginSkillSources({ env: {}, home, config: cfg() });
    expect(result?.runtime).toBe('agents');
    expect(result?.sources[0]?.root).toBe(join(home, '.agents', 'skills', 'designbook'));
  });

  it('stale config.skills (no content) falls through to the next resolver', () => {
    const emptyBase = tmp('debo-empty-'); // exists but holds no skill content
    const { binEntry } = mkClaudeCache(tmp('debo-cc-'));
    const env = { CLAUDECODE: '1', PATH: binEntry };
    const result = resolvePluginSkillSources({ env, home: tmp('debo-home-'), config: cfg(emptyBase) });
    expect(result?.runtime).toBe('claude-code');
  });

  it('config beats a valid runtime resolver (precedence order)', () => {
    const cfgBase = mkFlatSkill(tmp('debo-cfg-'));
    const { binEntry } = mkClaudeCache(tmp('debo-cc-'));
    const env = { CLAUDECODE: '1', PATH: binEntry };
    const result = resolvePluginSkillSources({ env, home: tmp('debo-home-'), config: cfg(cfgBase) });
    expect(result?.runtime).toBe('config');
  });

  it('returns null when no resolver finds content', () => {
    const result = resolvePluginSkillSources({ env: {}, home: tmp('debo-home-'), config: cfg() });
    expect(result).toBeNull();
  });
});

describe('skill-resolver: resolveSkillSources merge', () => {
  it('project-local skills override plugin skills of the same name', () => {
    const projectDir = tmp('debo-proj-');
    // Project-local override for `designbook`.
    mkdirSync(join(projectDir, '.claude', 'skills', 'designbook', 'workflows'), { recursive: true });
    // Plugin base (gemini) provides designbook + a sibling.
    const home = tmp('debo-home-');
    mkFlatSkill(join(home, '.gemini', 'skills'), 'designbook');
    mkFlatSkill(join(home, '.gemini', 'skills'), 'designbook-css-tailwind');

    const byName = Object.fromEntries(resolveSkillSources(projectDir, { env: {}, home }).map((s) => [s.name, s]));
    expect(byName['designbook']!.origin).toBe('project');
    expect(byName['designbook-css-tailwind']!.origin).toBe('plugin');
  });

  it('returns only project sources when no runtime base is found', () => {
    const projectDir = tmp('debo-proj-');
    mkdirSync(join(projectDir, '.agents', 'skills', 'designbook', 'workflows'), { recursive: true });
    const sources = resolveSkillSources(projectDir, { env: {}, home: tmp('debo-home-') });
    expect(sources.map((s) => s.name)).toEqual(['designbook']);
    expect(sources[0]!.origin).toBe('project');
  });

  it('config.skills via designbook.config.yml drives plugin sources', () => {
    const base = mkFlatSkill(tmp('debo-base-'));
    const projectDir = tmp('debo-proj-');
    writeFileSync(join(projectDir, 'designbook.config.yml'), `skills: ${base}\n`);
    const byName = Object.fromEntries(
      resolveSkillSources(projectDir, { env: {}, home: tmp('debo-home-') }).map((s) => [s.name, s]),
    );
    expect(byName['designbook']!.origin).toBe('plugin');
    expect(byName['designbook']!.root).toBe(join(base, 'designbook'));
  });
});
