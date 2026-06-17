import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { resolveWorkflowFile, listWorkflowDefinitions } from '../workflow-discovery.js';
import {
  deriveSkillSourcesFromEntry,
  resolveEnvSkillSources,
  resolveSkillSources,
  type SkillSource,
} from '../../skill-sources.js';
import { resolveSchemaRef, deriveArtifactName, resolveFiles, buildRuntimeContext } from '../../workflow-resolve.js';

// The designbook content root inside the plugin-cache fixture (DESIGNBOOK_SKILLS entry).
const DESIGNBOOK_ROOT = resolve(__dirname, 'fixtures', 'plugin-cache', 'designbook', 'designbook', 'abcdef');
const TAILWIND_ROOT = resolve(__dirname, 'fixtures', 'plugin-cache', 'designbook', 'designbook-css-tailwind', 'abcdef');

function envSources(): SkillSource[] {
  return resolveEnvSkillSources(DESIGNBOOK_ROOT);
}

describe('plugin skills discovery (DESIGNBOOK_SKILLS)', () => {
  it('sibling derivation finds all skills present (same hash, different skill-name dir)', () => {
    const sources = deriveSkillSourcesFromEntry(DESIGNBOOK_ROOT);
    const byName = Object.fromEntries(sources.map((s) => [s.name, s.root]));
    expect(byName['designbook']).toBe(DESIGNBOOK_ROOT);
    expect(byName['designbook-css-tailwind']).toBe(TAILWIND_ROOT);
    expect(sources.every((s) => s.origin === 'env')).toBe(true);
  });

  it('falls back to a single source for a non-plugin layout (no matching siblings)', () => {
    // Nest two levels deep so `mpDir` is a freshly-created unique dir with no
    // same-hash siblings (avoids picking up other tmp test dirs).
    const tmp = mkdtempSync(resolve(tmpdir(), 'debo-skill-'));
    const lone = resolve(tmp, 'lonely', 'myskill');
    mkdirSync(resolve(lone, 'workflows'), { recursive: true });
    const sources = deriveSkillSourcesFromEntry(lone);
    expect(sources).toEqual([{ name: 'myskill', root: lone, origin: 'env' }]);
  });

  it('resolveWorkflowFile finds the plugin workflow file via env sources (empty project dir)', () => {
    const emptyProjectDir = mkdtempSync(resolve(tmpdir(), 'debo-empty-'));
    const file = resolveWorkflowFile('css-generate', emptyProjectDir, envSources());
    expect(file).toBe(resolve(DESIGNBOOK_ROOT, 'css-generate', 'workflows', 'css-generate.md'));
  });

  it('listWorkflowDefinitions includes plugin workflows from env sources', () => {
    const emptyProjectDir = mkdtempSync(resolve(tmpdir(), 'debo-empty-'));
    const ids = listWorkflowDefinitions(emptyProjectDir, envSources());
    expect(ids).toContain('css-generate');
  });

  it('a skill-qualified $ref from skill A resolves into sibling skill B content root', () => {
    const taskFile = resolve(DESIGNBOOK_ROOT, 'css-generate', 'tasks', 'emit-tokens.md');
    const { typeName, schema, schemaFilePath } = resolveSchemaRef(
      'designbook-css-tailwind/css-tokens/schemas.yml#/TokenSet',
      taskFile,
      // skillsRoot is irrelevant here — the env source must win
      '/nonexistent/skills',
      envSources(),
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
      // legacy skillsRoot must NOT be used — env source must win
      '/nonexistent/skills',
      envSources(),
    );
    expect(typeName).toBe('CompiledCss');
    // Correct: the hashed designbook content root, NOT the hash-less sibling.
    expect(schemaFilePath).toBe(resolve(DESIGNBOOK_ROOT, 'css-generate', 'schemas.yml'));
    expect(schemaFilePath).toContain(`${'designbook'}/abcdef/css-generate`);
    // Guard against the historical mis-resolution into the css-tailwind sibling.
    expect(schemaFilePath).not.toContain('designbook-css-tailwind/designbook');
    expect((schema as { type: string }).type).toBe('string');
  });

  it('deriveArtifactName produces name:concern:artifact for an env-source file', () => {
    const taskFile = resolve(DESIGNBOOK_ROOT, 'css-generate', 'tasks', 'emit-tokens.md');
    const designbookSource = envSources().find((s) => s.name === 'designbook')!;
    const name = deriveArtifactName(taskFile, '/unused/agents', null, designbookSource);
    expect(name).toBe('designbook:css-generate:emit-tokens');
  });

  it('resolveFiles discovers env-source rules from a sibling skill', () => {
    const context = buildRuntimeContext('css-generate:emit-tokens');
    const matches = resolveFiles(
      'skills/**/rules/*.md',
      context,
      {},
      '/empty/agents',
      true,
      resolveSkillSources('/empty/project', DESIGNBOOK_ROOT),
    );
    const names = matches.map((m) => m.name);
    expect(names).toContain('designbook-css-tailwind:css-tokens:tailwind-theme');
  });
});
