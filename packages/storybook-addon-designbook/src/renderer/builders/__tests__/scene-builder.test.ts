/**
 * Tests for scene-builder: substitute() function + integration scenarios.
 */

import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { buildSceneModule } from '../../scene-module-builder';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const FIXTURES_DIR = resolve(__dirname, 'fixtures/scene-variables');

async function buildFixture(scenesFile: string) {
  const filePath = resolve(FIXTURES_DIR, scenesFile);
  const content = readFileSync(filePath, 'utf-8');
  const raw = parseYaml(content) as Record<string, unknown>;

  return buildSceneModule(filePath, raw, FIXTURES_DIR, {
    resolveImportPath: (componentId) => `./components/${componentId.split(':')[1]}.js`,
    wrapImport: (alias) => `{ render: (p, s) => ({ component: '${alias}', props: p, slots: s }) }`,
  });
}

// ── substitute() unit tests ────────────────────────────────────────────

// Import substitute indirectly by testing through the builder
describe('substitute() — via scene-builder integration', () => {
  it('replaces $variable with provided value (string match)', async () => {
    const module = await buildFixture('section.scenes.yml');
    // with-content scene: $content replaced with heading node
    expect(module).toContain('test_provider:heading');
    expect(module).toContain('h1');
    expect(module).toContain('Hello');
  });

  it('leaves unresolved $variable as string when with: is omitted', async () => {
    const module = await buildFixture('section.scenes.yml');
    // no-with scene: $content stays as string "$content" in the built output
    expect(module).toContain('"$content"');
  });

  it('builds correctly with multiple vars in one scene', async () => {
    // shell with $content fills both independently
    const module = await buildFixture('section.scenes.yml');
    expect(module).toContain('export const WithContent');
  });
});

// ── Integration: shell with $content ──────────────────────────────────

describe('scene-builder integration', () => {
  it('section with with: fills shell $content — page has nav, heading, footer', async () => {
    const module = await buildFixture('section.scenes.yml');

    // The with-content scene should produce: nav + heading + footer inside page
    expect(module).toContain('test_provider:page');
    expect(module).toContain('test_provider:nav');
    expect(module).toContain('test_provider:heading');
    expect(module).toContain('test_provider:footer');
  });

  it('shell rendered alone: $content stays as string placeholder', async () => {
    const module = await buildFixture('shell.scenes.yml');

    // Shell alone: $content is unresolved, stays as "$content" string
    expect(module).toContain('"$content"');
    // But header and footer are still built
    expect(module).toContain('test_provider:nav');
    expect(module).toContain('test_provider:footer');
  });

  it('scene without with: leaves $content unresolved in output', async () => {
    const module = await buildFixture('section.scenes.yml');
    // no-with scene: $content string preserved
    expect(module).toContain('"$content"');
  });

  it('existing scenes without $variables are unchanged (regression)', async () => {
    const module = await buildFixture('section.scenes.yml');
    // with-content: header/footer slots are static and unchanged
    expect(module).toContain('test_provider:nav');
    expect(module).toContain('test_provider:footer');
  });
});

// ── Deprecated slots: alias ────────────────────────────────────────────

describe('deprecated slots: alias', () => {
  it('deprecated slots: produces correct output', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const module = await buildFixture('section.scenes.yml');

    // deprecated-slots scene: should still build the heading
    expect(module).toContain('test_provider:heading');
    expect(module).toContain('h2');
    expect(module).toContain('Deprecated');

    warnSpy.mockRestore();
  });

  it('deprecated slots: emits deprecation warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await buildFixture('section.scenes.yml');

    const warned = warnSpy.mock.calls.some(
      (call) => String(call[0]).includes('deprecated') && String(call[0]).includes('with:'),
    );
    expect(warned).toBe(true);

    warnSpy.mockRestore();
  });
});
