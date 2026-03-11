import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateData } from '../data.js';

const fixtures = resolve(import.meta.dirname, 'fixtures', 'data');
const validDataModel = resolve(fixtures, 'valid', 'data-model.yml');

describe('validateData', () => {
  it('accepts valid sample data', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'valid', 'data.yml'));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('reports error for unknown entity type', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'invalid-entity', 'data.yml'));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('unknown_type')]);
  });

  it('reports error for unknown bundle', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'invalid-bundle', 'data.yml'));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('nonexistent')]);
  });

  it('reports warning for unknown field', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'warning-field', 'data.yml'));
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([expect.stringContaining('field_extra')]);
  });

  it('reports warning for missing required field', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'warning-required', 'data.yml'));
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([expect.stringContaining('title')]);
  });

  it('reports warning for broken reference', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'warning-broken-ref', 'data.yml'));
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([expect.stringContaining('Broken ref')]);
  });

  it('reports error for missing data file', () => {
    const result = validateData(validDataModel, '/nonexistent/data.yml');
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('not found')]);
  });

  it('reports error for missing data-model file', () => {
    const result = validateData('/nonexistent/data-model.yml', resolve(fixtures, 'valid', 'data.yml'));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('not found')]);
  });
});
