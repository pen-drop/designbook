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
    const fn = getValidator('data');
    expect(fn).toBeTypeOf('function');
  });

  it('returns undefined for an unknown key', () => {
    const fn = getValidator('nonexistent-validator');
    expect(fn).toBeUndefined();
  });

  it('returns undefined for removed JSON-Schema-only validators', () => {
    expect(getValidator('component')).toBeUndefined();
    expect(getValidator('data-model')).toBeUndefined();
    expect(getValidator('tokens')).toBeUndefined();
  });
});

describe('getValidatorKeys', () => {
  it('returns an array of registered keys', () => {
    const keys = getValidatorKeys();
    expect(keys).toContain('data');
    expect(keys).toContain('entity-mapping');
    expect(keys).toContain('scene');
    expect(keys).toContain('image');
    // JSON-Schema-only validators removed
    expect(keys).not.toContain('component');
    expect(keys).not.toContain('data-model');
    expect(keys).not.toContain('tokens');
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

  it('cmd: validator passes on exit code 0', async () => {
    const result = await validateByKeys(['cmd:true'], '/some/file.yml', mockConfig);
    expect(result.valid).toBe(true);
    expect(result.type).toBe('cmd');
  });

  it('cmd: validator fails on non-zero exit code', async () => {
    const result = await validateByKeys(['cmd:false'], '/some/file.yml', mockConfig);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('cmd');
    expect(result.error).toContain('Command failed with exit code 1');
  });

  it('cmd: validator captures stderr as error message', async () => {
    const result = await validateByKeys(
      ['cmd:sh -c "echo validation error >&2; exit 1"'],
      '/some/file.yml',
      mockConfig,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('validation error');
  });

  it('cmd: validator replaces {{ file }} with file path', async () => {
    const result = await validateByKeys(['cmd:test -f {{ file }}'], '/some/nonexistent/file.xyz', mockConfig);
    expect(result.valid).toBe(false);
  });

  it('cmd: validator coexists with built-in validators', async () => {
    const result = await validateByKeys(['cmd:true', 'nonexistent'], '/some/file.yml', mockConfig);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unknown validator key: 'nonexistent'");
  });
});
