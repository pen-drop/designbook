import { describe, it, expect } from 'vitest';
import { DEFAULT_STORY_PATTERNS, resolveStoryPattern } from '../story-patterns.js';

describe('DEFAULT_STORY_PATTERNS', () => {
  it('exposes an SDC entry with a regex and component name capture group', () => {
    const sdc = DEFAULT_STORY_PATTERNS.sdc;
    expect(sdc).toBeDefined();
    expect(sdc!.import_path_pattern).toBeInstanceOf(RegExp);
    expect(sdc!.component_name_group).toBe(1);
  });

  it('matches a canonical SDC import path and captures the component name', () => {
    const sdc = DEFAULT_STORY_PATTERNS.sdc!;
    const m = './components/button/button.component.yml'.match(sdc.import_path_pattern);
    expect(m?.[1]).toBe('button');
  });

  it('does not match non-SDC import paths', () => {
    const sdc = DEFAULT_STORY_PATTERNS.sdc!;
    expect('./components/button/button.stories.tsx'.match(sdc.import_path_pattern)).toBeNull();
    expect('./src/button/button.yml'.match(sdc.import_path_pattern)).toBeNull();
  });
});

describe('resolveStoryPattern', () => {
  it('returns the user override verbatim when present', () => {
    const override = { import_path_pattern: /^foo$/, component_name_group: 2 };
    expect(resolveStoryPattern('sdc', override)).toBe(override);
  });

  it('falls back to the default registry keyed by framework', () => {
    const resolved = resolveStoryPattern('sdc');
    expect(resolved).toBe(DEFAULT_STORY_PATTERNS.sdc);
  });

  it('throws a descriptive error when framework has no default and no override', () => {
    expect(() => resolveStoryPattern('unknown-framework')).toThrow(
      /No story filter for frameworks\.component=unknown-framework/,
    );
  });
});
