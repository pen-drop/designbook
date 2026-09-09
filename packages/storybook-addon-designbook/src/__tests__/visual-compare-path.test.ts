import { describe, expect, it } from 'vitest';
import { referenceImagePath } from '../visual-compare-path';

describe('referenceImagePath', () => {
  it('uses the actual capture association including revision and native view filename', () => {
    expect(referenceImagePath('references/id/revision', 'frame-42-header-open.png')).toBe(
      '/__designbook/load?path=references%2Fid%2Frevision%2Fframe-42-header-open.png',
    );
  });
  it('encodes the full stored path as one query value', () => {
    expect(referenceImagePath('references/id/revision', 'header & search.png')).toBe(
      '/__designbook/load?path=references%2Fid%2Frevision%2Fheader%20%26%20search.png',
    );
  });
});
