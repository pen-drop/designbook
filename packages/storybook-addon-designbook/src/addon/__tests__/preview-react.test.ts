// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

vi.mock('virtual:designbook-themes', () => ({ themes: {}, defaultTheme: 'light' }));

import { reactStoryMount } from '../preview';
import { reactHelpers } from '../renderer/react';

const story = (text: string) =>
  reactHelpers.story(reactHelpers.wrapNode('t:x@0', reactHelpers.createElement('p', null, text)));

describe('reactStoryMount', () => {
  it('mounts into one stable container and reuses it for args updates', () => {
    const m = reactStoryMount();
    const first = m.update(story('a'));
    expect(first.textContent).toBe('a');
    const second = m.update(story('b'));
    expect(second).toBe(first);
    expect(second.querySelectorAll('p')).toHaveLength(1);
    expect(second.textContent).toBe('b');
  });

  it('dispose unmounts the root and removes markers', () => {
    const m = reactStoryMount();
    const container = m.update(story('a'));
    m.dispose();
    expect(container.childNodes).toHaveLength(0);
    expect(m.update(story('c'))).not.toBe(container);
    m.dispose();
  });

  it('mounts empty output', () => {
    const m = reactStoryMount();
    expect(m.update(reactHelpers.story(null)).childNodes).toHaveLength(0);
    m.dispose();
  });
});
