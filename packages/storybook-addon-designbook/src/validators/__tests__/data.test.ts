import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateData } from '../data.js';

const fixtures = resolve(import.meta.dirname, 'fixtures', 'data');
const validDataModel = resolve(fixtures, 'valid', 'data-model.yml');

describe('validateData', () => {
  it('accepts valid sample data', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'valid', 'data'));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('reports error for unknown entity type', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'invalid-entity', 'data'));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('unknown_type')]);
  });

  it('reports error for unknown bundle', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'invalid-bundle', 'data'));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('nonexistent')]);
  });

  it('reports warning for unknown field', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'warning-field', 'data'));
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([expect.stringContaining('field_extra')]);
  });

  it('reports warning for missing required field', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'warning-required', 'data'));
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([expect.stringContaining('title')]);
  });

  it('reports warning for broken reference', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'warning-broken-ref', 'data'));
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([expect.stringContaining('Broken ref')]);
  });

  it('accepts valid config entities in data/', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'valid', 'data'));
    expect(result.valid).toBe(true);
  });

  it('reports error for unknown config entity type', () => {
    const result = validateData(validDataModel, resolve(fixtures, 'invalid-config', 'data'));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('unknown_config_type')]);
  });

  it('reports error for missing data directory', () => {
    const result = validateData(validDataModel, '/nonexistent/data');
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('not found')]);
  });

  it('reports error for missing data-model file', () => {
    const result = validateData('/nonexistent/data-model.yml', resolve(fixtures, 'valid', 'data'));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('not found')]);
  });

  it('does not flag __designbook and rejects a non-string/array section', () => {
    const ok = validateData(validDataModel, resolve(fixtures, 'valid', 'data'));
    expect(ok.warnings.find((w) => w.includes('__designbook'))).toBeUndefined();

    const bad = validateData(validDataModel, resolve(fixtures, 'invalid-section', 'data'));
    expect(bad.errors.some((e) => e.includes('__designbook.section'))).toBe(true);
  });
});
