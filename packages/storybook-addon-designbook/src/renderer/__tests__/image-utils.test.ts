import { describe, it, expect } from 'vitest';
import { parseAspectRatio, calcHeight } from '../image-utils';

describe('parseAspectRatio', () => {
  it('parses 16:9', () => {
    expect(parseAspectRatio('16:9')).toEqual({ w: 16, h: 9 });
  });

  it('parses 1:1', () => {
    expect(parseAspectRatio('1:1')).toEqual({ w: 1, h: 1 });
  });

  it('parses 21:9', () => {
    expect(parseAspectRatio('21:9')).toEqual({ w: 21, h: 9 });
  });

  it('rejects non W:H format', () => {
    expect(() => parseAspectRatio('wide')).toThrow('Invalid aspect ratio format');
  });

  it('rejects empty string', () => {
    expect(() => parseAspectRatio('')).toThrow('Invalid aspect ratio format');
  });

  it('rejects decimal values', () => {
    expect(() => parseAspectRatio('1.5:1')).toThrow('Invalid aspect ratio format');
  });

  it('rejects negative values', () => {
    expect(() => parseAspectRatio('-16:9')).toThrow('Invalid aspect ratio format');
  });
});

describe('calcHeight', () => {
  it('calculates height for 16:9 at 1200px', () => {
    expect(calcHeight(1200, { w: 16, h: 9 })).toBe(675);
  });

  it('calculates height for 1:1 at 400px', () => {
    expect(calcHeight(400, { w: 1, h: 1 })).toBe(400);
  });

  it('calculates height for 21:9 at 1260px', () => {
    expect(calcHeight(1260, { w: 21, h: 9 })).toBe(540);
  });
});
