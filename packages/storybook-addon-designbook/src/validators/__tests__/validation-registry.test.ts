import { describe, it, expect, vi } from 'vitest';
import { ValidationRegistry } from '../../validation-registry.js';
import type { DesignbookConfig } from '../../config.js';

const mockConfig: DesignbookConfig = {
  data: '/tmp/test-designbook',
  technology: 'html',
  extensions: [],
};

// ── ValidationRegistry ──────────────────────────────────────────────────────

describe('ValidationRegistry', () => {
  it('falls through to skipped when no validator matches', async () => {
    const registry = new ValidationRegistry();
    const result = await registry.validate('/some/unknown.xyz', mockConfig);
    expect(result.type).toBe('unknown');
    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it('calls matching validator', async () => {
    const registry = new ValidationRegistry();
    const validator = vi.fn().mockResolvedValue({
      file: '/a/b.component.yml',
      type: 'component',
      valid: true,
      last_validated: new Date().toISOString(),
    });
    registry.register('**/*.component.yml', validator);
    await registry.validate('/a/b.component.yml', mockConfig);
    expect(validator).toHaveBeenCalledWith('/a/b.component.yml', mockConfig);
  });

  it('last registration wins', async () => {
    const registry = new ValidationRegistry();
    const first = vi.fn().mockResolvedValue({ file: 'x', type: 't', valid: false, last_validated: '' });
    const second = vi.fn().mockResolvedValue({ file: 'x', type: 't', valid: true, last_validated: '' });
    registry.register('**/*.component.yml', first);
    registry.register('**/*.component.yml', second);
    const result = await registry.validate('/a/test.component.yml', mockConfig);
    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
    expect(result.valid).toBe(true);
  });

  it('array patterns all match', async () => {
    const registry = new ValidationRegistry();
    const validator = vi.fn().mockResolvedValue({
      file: 'x',
      type: 'story',
      valid: true,
      last_validated: '',
    });
    registry.register(['**/*.story.yml', '**/*.scenes.yml'], validator);

    await registry.validate('/a/button.story.yml', mockConfig);
    await registry.validate('/a/listing.scenes.yml', mockConfig);
    expect(validator).toHaveBeenCalledTimes(2);
  });
});
