import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateComponent } from '../component.js';

const fixtures = resolve(import.meta.dirname, 'fixtures', 'component');

describe('validateComponent', () => {
  it('accepts valid component', () => {
    const result = validateComponent(resolve(fixtures, 'valid.component.yml'));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports error for invalid structure', () => {
    const result = validateComponent(resolve(fixtures, 'invalid-extra-prop.yml'));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('reports error for missing file', () => {
    const result = validateComponent('/nonexistent/component.yml');
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.stringContaining('not found'),
    ]);
  });
});
