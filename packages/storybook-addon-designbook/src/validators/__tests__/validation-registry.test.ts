import { describe, it, expect } from 'vitest';
import { getValidator, getValidatorKeys, validateByKeys } from '../../validation-registry.js';
import type { DesignbookConfig } from '../../config.js';

const mockConfig: DesignbookConfig = {
  data: '/tmp/test-designbook',
  technology: 'html',
  extensions: [],
};

// ── Key-based Validator Registry ───────────────────────────────────────────────

describe('getValidator', () => {
  it('returns a function for a known key', () => {
    const fn = getValidator('component');
    expect(fn).toBeTypeOf('function');
  });

  it('returns undefined for an unknown key', () => {
    const fn = getValidator('nonexistent-validator');
    expect(fn).toBeUndefined();
  });
});

describe('getValidatorKeys', () => {
  it('returns an array of registered keys', () => {
    const keys = getValidatorKeys();
    expect(keys).toContain('component');
    expect(keys).toContain('data-model');
    expect(keys).toContain('tokens');
    expect(keys).toContain('data');
  });
});

describe('validateByKeys', () => {
  it('returns auto-pass (skipped) when keys array is empty', async () => {
    const result = await validateByKeys([], '/some/unknown.xyz', mockConfig);
    expect(result.type).toBe('unknown');
    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it('returns error for unknown validator key', async () => {
    const result = await validateByKeys(['nonexistent'], '/some/file.yml', mockConfig);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unknown validator key: 'nonexistent'");
    expect(result.error).toContain('Available:');
  });
});
