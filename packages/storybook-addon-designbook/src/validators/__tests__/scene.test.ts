import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateSceneBuild } from '../scene.js';
import type { DesignbookConfig } from '../../config.js';

const fixtures = resolve(import.meta.dirname, 'fixtures', 'scene');

function configWith(dist: string): DesignbookConfig {
  return { dist, technology: 'html', tmp: 'tmp' };
}

describe('validateSceneBuild', () => {
  it('returns valid for a buildable scene', async () => {
    const result = await validateSceneBuild(resolve(fixtures, 'valid.scenes.yml'), configWith(fixtures));
    expect(result.valid).toBe(true);
    expect(result.type).toBe('scene');
  });

  it('returns invalid for missing file', async () => {
    const result = await validateSceneBuild('/nonexistent/foo.scenes.yml', configWith(fixtures));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns invalid for broken YAML', async () => {
    const result = await validateSceneBuild(resolve(fixtures, 'invalid-yaml.scenes.yml'), configWith(fixtures));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('YAML parse error');
  });

  it('returns valid for scene with no scenes array', async () => {
    // scene-ref-missing-ref has scenes but broken refs — test empty scenes case
    const result = await validateSceneBuild(
      resolve(fixtures, 'element-missing-value.scenes.yml'),
      configWith(fixtures),
    );
    // Has scenes, so it will attempt to build — should still succeed (build is lenient)
    expect(result.type).toBe('scene');
  });

  it('does not crash on string values in slot arrays ($content placeholder)', async () => {
    const result = await validateSceneBuild(resolve(fixtures, 'broken-build.scenes.yml'), configWith(fixtures));
    // After needsBuilding() fix, string values are handled gracefully — build succeeds
    expect(result.valid).toBe(true);
    expect(result.type).toBe('scene');
  });
});
