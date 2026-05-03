import { describe, it, expect } from 'vitest';
import { slugifyArtifactName } from '../anchors.js';

describe('slugifyArtifactName', () => {
  it('strips path and extension', () => {
    expect(slugifyArtifactName('/abs/path/skills/design/rules/markup-derivation.md')).toBe('markup-derivation');
  });

  it('lowercases and preserves dashes', () => {
    expect(slugifyArtifactName('rules/Screen-Compare.md')).toBe('screen-compare');
  });

  it('replaces underscores and spaces with hyphens', () => {
    expect(slugifyArtifactName('rules/playwright_capture rule.md')).toBe('playwright-capture-rule');
  });

  it('collapses runs of separators and trims them at the edges', () => {
    expect(slugifyArtifactName('rules/--foo__bar  baz--.md')).toBe('foo-bar-baz');
  });

  it('strips characters outside [a-z0-9-]', () => {
    expect(slugifyArtifactName('rules/!hello?world.md')).toBe('helloworld');
  });
});
