import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { resolveWorkflowFile, listWorkflowDefinitions } from '../workflow-discovery.js';
import { deriveSkillSourcesFromBase, type SkillSource } from '../../skill-sources.js';
import { resolveSchemaRef, deriveArtifactName, resolveFiles, buildRuntimeContext } from '../../workflow-resolve.js';

// The marketplace cache base inside the plugin-cache fixture (the `skills` config root).
const MARKETPLACE_BASE = resolve(__dirname, 'fixtures', 'plugin-cache', 'designbook');
// The hashed content roots derived from the base.
const DESIGNBOOK_ROOT = resolve(MARKETPLACE_BASE, 'designbook', 'abcdef');
const TAILWIND_ROOT = resolve(MARKETPLACE_BASE, 'designbook-css-tailwind', 'abcdef');

function pluginSources(): SkillSource[] {
  return deriveSkillSourcesFromBase(MARKETPLACE_BASE);
}

describe('plugin skills discovery (config `skills` lookup root)', () => {
  it('derives one source per skill from the marketplace base (scan <base>/<skill>/<hash>)', () => {
    const sources = pluginSources();
    const byName = Object.fromEntries(sources.map((s) => [s.name, s.root]));
    expect(byName['designbook']).toBe(DESIGNBOOK_ROOT);
    expect(byName['designbook-css-tailwind']).toBe(TAILWIND_ROOT);
    expect(sources.every((s) => s.origin === 'plugin')).toBe(true);
  });

  it('picks the newest-mtime hash when several coexist under a skill', () => {
    const base = mkdtempSync(resolve(tmpdir(), 'debo-mp-'));
    mkdirSync(resolve(base, 'myskill', 'old', 'workflows'), { recursive: true });
    mkdirSync(resolve(base, 'myskill', 'new', 'workflows'), { recursive: true });
    utimesSync(resolve(base, 'myskill', 'old'), 1000, 1000);
    utimesSync(resolve(base, 'myskill', 'new'), 1000, 2000);
    const sources = deriveSkillSourcesFromBase(base);
    expect(sources).toEqual([{ name: 'myskill', root: resolve(base, 'myskill', 'new'), origin: 'plugin' }]);
  });

  it('falls back to a single source when the base itself is a content root (flat layout)', () => {
    const lone = resolve(mkdtempSync(resolve(tmpdir(), 'debo-skill-')), 'myskill');
    mkdirSync(resolve(lone, 'workflows'), { recursive: true });
    const sources = deriveSkillSourcesFromBase(lone);
    expect(sources).toEqual([{ name: 'myskill', root: lone, origin: 'plugin' }]);
  });

  it('resolveWorkflowFile finds the plugin workflow file via plugin sources (empty project dir)', () => {
    const emptyProjectDir = mkdtempSync(resolve(tmpdir(), 'debo-empty-'));
    const file = resolveWorkflowFile('css-generate', emptyProjectDir, pluginSources());
    expect(file).toBe(resolve(DESIGNBOOK_ROOT, 'css-generate', 'workflows', 'css-generate.md'));
  });

  it('listWorkflowDefinitions includes plugin workflows from plugin sources', () => {
    const emptyProjectDir = mkdtempSync(resolve(tmpdir(), 'debo-empty-'));
    const ids = listWorkflowDefinitions(emptyProjectDir, pluginSources());
    expect(ids).toContain('css-generate');
  });

  it('a skill-qualified $ref from skill A resolves into sibling skill B content root', () => {
    const taskFile = resolve(DESIGNBOOK_ROOT, 'css-generate', 'tasks', 'emit-tokens.md');
    const { typeName, schema, schemaFilePath } = resolveSchemaRef(
      'designbook-css-tailwind/css-tokens/schemas.yml#/TokenSet',
      taskFile,
      // skillsRoot is irrelevant here — the plugin source must win
      '/nonexistent/skills',
      pluginSources(),
    );
    expect(typeName).toBe('TokenSet');
    expect(schemaFilePath).toBe(resolve(TAILWIND_ROOT, 'css-tokens', 'schemas.yml'));
    expect((schema as { type: string }).type).toBe('object');
  });

  it('a RELATIVE cross-skill $ref re-anchors to the sibling skill HASHED content root (plugin layout)', () => {
    // compile-css.md lives in skill `designbook-css-tailwind` under the `<hash>`
    // segment and references `../../designbook/css-generate/schemas.yml` — a
    // relative ref authored for the project `skills/` layout. Under the plugin
    // layout the extra `<hash>` segment makes `../../` land one level short, at
    // the hash-less sibling `<mp>/designbook-css-tailwind/designbook/.../schemas.yml`
    // (a path that does not exist). The resolver must re-anchor it onto the
    // `designbook` SkillSource's HASHED content root.
    const taskFile = resolve(TAILWIND_ROOT, 'tasks', 'compile-css.md');
    const { typeName, schema, schemaFilePath } = resolveSchemaRef(
      '../../designbook/css-generate/schemas.yml#/CompiledCss',
      taskFile,
      // legacy skillsRoot must NOT be used — plugin source must win
      '/nonexistent/skills',
      pluginSources(),
    );
    expect(typeName).toBe('CompiledCss');
    // Correct: the hashed designbook content root, NOT the hash-less sibling.
    expect(schemaFilePath).toBe(resolve(DESIGNBOOK_ROOT, 'css-generate', 'schemas.yml'));
    expect(schemaFilePath).toContain(`${'designbook'}/abcdef/css-generate`);
    // Guard against the historical mis-resolution into the css-tailwind sibling.
    expect(schemaFilePath).not.toContain('designbook-css-tailwind/designbook');
    expect((schema as { type: string }).type).toBe('string');
  });

  it('deriveArtifactName produces name:concern:artifact for a plugin-source file', () => {
    const taskFile = resolve(DESIGNBOOK_ROOT, 'css-generate', 'tasks', 'emit-tokens.md');
    const designbookSource = pluginSources().find((s) => s.name === 'designbook')!;
    const name = deriveArtifactName(taskFile, '/unused/agents', null, designbookSource);
    expect(name).toBe('designbook:css-generate:emit-tokens');
  });

  it('resolveFiles discovers plugin-source rules from a sibling skill', () => {
    const context = buildRuntimeContext('css-generate:emit-tokens');
    const matches = resolveFiles('skills/**/rules/*.md', context, {}, '/empty/agents', true, pluginSources());
    const names = matches.map((m) => m.name);
    expect(names).toContain('designbook-css-tailwind:css-tokens:tailwind-theme');
  });
});
