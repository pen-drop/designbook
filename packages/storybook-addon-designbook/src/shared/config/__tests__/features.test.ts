import { describe, it, expect, afterEach } from 'vitest';
import { isFeatureEnabled } from '../features.js';
import type { DesignbookConfig } from '../../config.js';

const ENV = 'DESIGNBOOK_FEATURE_REGION_PROPERTIES';

function cfg(features?: Record<string, boolean>): DesignbookConfig {
  return { data: '/tmp', technology: 'html', ...(features ? { features } : {}) } as DesignbookConfig;
}

afterEach(() => {
  delete process.env[ENV];
});

describe('isFeatureEnabled', () => {
  it('defaults to on when neither env nor config set it', () => {
    expect(isFeatureEnabled('region_properties', cfg())).toBe(true);
  });

  it('config false disables', () => {
    expect(isFeatureEnabled('region_properties', cfg({ region_properties: false }))).toBe(false);
  });

  it('config true enables', () => {
    expect(isFeatureEnabled('region_properties', cfg({ region_properties: true }))).toBe(true);
  });

  it('env off overrides config true', () => {
    process.env[ENV] = 'off';
    expect(isFeatureEnabled('region_properties', cfg({ region_properties: true }))).toBe(false);
  });

  it('env on overrides config false', () => {
    process.env[ENV] = 'on';
    expect(isFeatureEnabled('region_properties', cfg({ region_properties: false }))).toBe(true);
  });

  it('accepts 0/1/false/true/no/yes spellings', () => {
    for (const v of ['0', 'false', 'no']) {
      process.env[ENV] = v;
      expect(isFeatureEnabled('region_properties', cfg())).toBe(false);
    }
    for (const v of ['1', 'true', 'yes']) {
      process.env[ENV] = v;
      expect(isFeatureEnabled('region_properties', cfg())).toBe(true);
    }
  });

  it('falls through to config/default on an unrecognized env value', () => {
    process.env[ENV] = 'maybe';
    expect(isFeatureEnabled('region_properties', cfg())).toBe(true);
    expect(isFeatureEnabled('region_properties', cfg({ region_properties: false }))).toBe(false);
  });

  it('reads the flattened "features.<name>" key (loadConfig output shape)', () => {
    const off = {
      data: '/tmp',
      technology: 'html',
      'features.region_properties': false,
    } as unknown as DesignbookConfig;
    const on = { data: '/tmp', technology: 'html', 'features.region_properties': true } as unknown as DesignbookConfig;
    expect(isFeatureEnabled('region_properties', off)).toBe(false);
    expect(isFeatureEnabled('region_properties', on)).toBe(true);
  });
});
