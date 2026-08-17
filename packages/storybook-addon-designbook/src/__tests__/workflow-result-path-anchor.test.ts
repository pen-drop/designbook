/**
 * Tests for the result-path anchor guard.
 *
 * Every declared result `path:` must be anchored — absolute, at a `$DESIGNBOOK_*`
 * var, or at a param holding an absolute path. A bare relative template resolves
 * against the process CWD, so the artifact lands beside the workspace instead of
 * inside the designbook data dir and the workflow's own `get-file` lookup misses
 * it. That is invisible until something downstream cannot find the file, so an
 * unanchored path is rejected at resolve time instead of being guessed at.
 */

import { describe, it, expect } from 'vitest';
import { expandResultDeclarations } from '../workflow-resolve.js';

const ENV = { DESIGNBOOK_DATA: '/ws/web/themes/custom/t/designbook' };

function resultDecl(path: string, key = 'story-meta'): Record<string, unknown> {
  return { properties: { [key]: { path } } };
}

describe('result path anchoring', () => {
  it('accepts a $DESIGNBOOK_* anchored path and resolves it under the data dir', async () => {
    const out = await expandResultDeclarations(
      resultDecl('$DESIGNBOOK_DATA/stories/{{ story_id }}/meta.yml'),
      undefined,
      { story_id: 'group--story' },
      ENV,
    );
    expect(out?.['story-meta']?.path).toBe('/ws/web/themes/custom/t/designbook/stories/group--story/meta.yml');
  });

  it('accepts a param anchor that carries an absolute path', async () => {
    const out = await expandResultDeclarations(
      resultDecl('{{ reference_dir }}/meta.yml', 'reference-meta'),
      undefined,
      { reference_dir: '/ws/refs/979feb1d5860' },
      ENV,
    );
    expect(out?.['reference-meta']?.path).toBe('/ws/refs/979feb1d5860/meta.yml');
  });

  it('accepts an outright absolute path', async () => {
    const out = await expandResultDeclarations(resultDecl('/abs/stories/meta.yml'), undefined, {}, ENV);
    expect(out?.['story-meta']?.path).toBe('/abs/stories/meta.yml');
  });

  it('rejects a bare relative path that would resolve against CWD', async () => {
    await expect(
      expandResultDeclarations(
        resultDecl('designbook/stories/{{ story_id }}/meta.yml'),
        undefined,
        {
          story_id: 'group--story',
        },
        ENV,
      ),
    ).rejects.toThrow(/unanchored path/);
  });

  it('names the offending key and both the template and what it resolved to', async () => {
    await expect(
      expandResultDeclarations(resultDecl('designbook/stories/x.png', 'screenshot_file'), undefined, {}, ENV),
    ).rejects.toThrow(/"screenshot_file".*"designbook\/stories\/x\.png"/s);
  });

  it('stays quiet in lenient mode, where a param anchor is not resolved yet', async () => {
    const out = await expandResultDeclarations(
      resultDecl('{{ reference_dir }}/meta.yml', 'reference-meta'),
      undefined,
      {},
      ENV,
      undefined,
      true,
    );
    expect(out?.['reference-meta']?.path).toContain('{{');
  });
});
