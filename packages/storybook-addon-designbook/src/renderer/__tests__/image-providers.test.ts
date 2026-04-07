import { describe, it, expect } from 'vitest';
import { createProvider } from '../image-providers';

describe('createProvider', () => {
  describe('picsum (default)', () => {
    it('returns URL with correct dimensions', () => {
      const provider = createProvider();
      const url = provider(800, 600);
      expect(url).toMatch(/^https:\/\/picsum\.photos\/id\/\d+\/800\/600$/);
    });

    it('returns different IDs on successive calls', () => {
      const provider = createProvider();
      const url1 = provider(800, 600);
      const url2 = provider(800, 600);
      // Extract IDs
      const id1 = url1.match(/\/id\/(\d+)\//)?.[1];
      const id2 = url2.match(/\/id\/(\d+)\//)?.[1];
      expect(id1).not.toBe(id2);
    });

    it('uses picsum when explicitly configured', () => {
      const provider = createProvider({ image_provider: { type: 'picsum' } });
      const url = provider(1200, 675);
      expect(url).toMatch(/^https:\/\/picsum\.photos\/id\/\d+\/1200\/675$/);
    });
  });

  it('falls back to picsum for unknown provider type', () => {
    const provider = createProvider({ image_provider: { type: 'unknown' } });
    const url = provider(400, 400);
    expect(url).toMatch(/^https:\/\/picsum\.photos\/id\/\d+\/400\/400$/);
  });

  it('defaults to picsum when no config provided', () => {
    const provider = createProvider(undefined);
    const url = provider(640, 480);
    expect(url).toMatch(/^https:\/\/picsum\.photos\/id\/\d+\/640\/480$/);
  });
});
