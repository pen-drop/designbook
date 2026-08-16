import { describe, expect, it } from 'vitest';
import { backendCmdResolver, unflattenPrefix } from '../backend-cmd.js';
import type { DesignbookConfig } from '../../config.js';
import type { ResolverContext, ResolverResult } from '../types.js';

function ctx(
  config: Record<string, unknown>,
  params: Record<string, unknown> = {},
): ResolverContext {
  return {
    config: config as DesignbookConfig,
    params,
  };
}

function resolve(
  input: string,
  config: Record<string, unknown>,
  context: ResolverContext,
): ResolverResult {
  return backendCmdResolver.resolve(input, config, context) as ResolverResult;
}

describe('unflattenPrefix', () => {
  it('rebuilds backend_cmd from flattened config keys', () => {
    const flat = {
      'backend_cmd.cmd': 'ddev drush',
      'backend_cmd.schema_cmd': 'ddev drush designbook:config-schema',
      'backend_cmd.exists_cmd': 'ddev drush config:get',
      other: 1,
    };
    expect(unflattenPrefix(flat, 'backend_cmd')).toEqual({
      cmd: 'ddev drush',
      schema_cmd: 'ddev drush designbook:config-schema',
      exists_cmd: 'ddev drush config:get',
    });
  });

  it('accepts a nested object at the exact prefix key', () => {
    expect(
      unflattenPrefix({ backend_cmd: { cmd: 'x', import: 'y' } }, 'backend_cmd'),
    ).toEqual({ cmd: 'x', import: 'y' });
  });
});

describe('backendCmdResolver', () => {
  it('resolves from flattened designbook config', () => {
    const result = resolve(
      '',
      {},
      ctx({
        'backend_cmd.cmd': 'ddev drush',
        'backend_cmd.schema_cmd': 'ddev drush designbook:config-schema',
        'backend_cmd.validate_cmd': 'ddev drush designbook:config-validate',
        'backend_cmd.import': 'ddev drush config:import -y',
        'backend_cmd.exists_cmd': 'ddev drush config:get',
      }),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toMatchObject({
      cmd: 'ddev drush',
      schema_cmd: 'ddev drush designbook:config-schema',
      exists_cmd: 'ddev drush config:get',
    });
  });

  it('prefers an explicit params.backend_cmd object', () => {
    const result = resolve(
      '',
      {},
      ctx(
        { 'backend_cmd.cmd': 'from-config' },
        { backend_cmd: { cmd: 'from-params', exists_cmd: 'x' } },
      ),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toEqual({ cmd: 'from-params', exists_cmd: 'x' });
  });

  it('fails when config has no backend_cmd keys', () => {
    const result = resolve('', {}, ctx({ backend: 'drupal' }));
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/no backend_cmd block/);
  });
});
