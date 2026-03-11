import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateTokens } from '../tokens.js';

const fixtures = resolve(import.meta.dirname, 'fixtures', 'tokens');

describe('validateTokens', () => {
  it('accepts valid tokens', () => {
    const result = validateTokens(resolve(fixtures, 'valid.yml'));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports error for missing $value', () => {
    const result = validateTokens(resolve(fixtures, 'invalid-missing-value.yml'));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('reports error for missing $type', () => {
    const result = validateTokens(resolve(fixtures, 'invalid-missing-type.yml'));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('reports error for unknown $type', () => {
    const result = validateTokens(resolve(fixtures, 'invalid-unknown-type.yml'));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('reports error for missing file', () => {
    const result = validateTokens('/nonexistent/tokens.yml');
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('not found')]);
  });
});
