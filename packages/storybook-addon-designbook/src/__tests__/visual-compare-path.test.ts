import { describe, expect, it } from 'vitest';
import { referenceImagePath } from '../visual-compare-path';

describe('referenceImagePath', () => {
  it('uses breakpoint, element, and state in the baseline filename', () => {
    expect(
      referenceImagePath('references/174cdaac3562', 'xl', {
        name: 'entity-paragraph-signage-full',
        state: 'rest',
      }),
    ).toBe('/__designbook/load?path=references/174cdaac3562/xl--entity-paragraph-signage-full--rest.png');
  });

  it('encodes dynamic filename segments', () => {
    expect(referenceImagePath('references/hash', '2xl', { name: 'hero cta', state: 'open/menu' })).toBe(
      '/__designbook/load?path=references/hash/2xl--hero%20cta--open%2Fmenu.png',
    );
  });
});
