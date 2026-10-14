import { describe, it, expect } from 'vitest';
import { renderValidators, resolveParams } from '../plan-build.js';

describe('renderValidators', () => {
  const params = { unit: { name: 'view.recipe.full' }, backend_cmd: { validate_cmd: 'npx tool check' } };

  it('renders params into cmd validators and keeps {{ file }} for validation time', async () => {
    expect(
      await renderValidators(['cmd:{{ backend_cmd.validate_cmd }} {{ unit.name }} {{ file }}', 'data'], params),
    ).toEqual(['cmd:npx tool check view.recipe.full {{ file }}', 'data']);
  });

  it('drops a cmd validator whose backend command is not configured', async () => {
    expect(
      await renderValidators(['cmd:{{ backend_cmd.validate_cmd }} {{ unit.name }} {{ file }}'], {
        unit: { name: 'node.type.page' },
        backend_cmd: { import: 'drush cim' },
      }),
    ).toEqual([]);
  });
});

describe('resolveParams', () => {
  const config = { 'backend_cmd.import': 'imp', 'backend_cmd.validate_cmd': 'val', sync_target_dir: '/t' };

  it('fills absent resolve params from the flattened config', () => {
    expect(resolveParams({}, { backend_cmd: 'backend_cmd', dir: 'sync_target_dir' }, config)).toEqual({
      backend_cmd: { import: 'imp', validate_cmd: 'val' },
      dir: '/t',
    });
  });

  it('keeps configured keys under a partial override', () => {
    expect(resolveParams({ backend_cmd: { import: 'mine' } }, { backend_cmd: 'backend_cmd' }, config)).toEqual({
      backend_cmd: { import: 'mine', validate_cmd: 'val' },
    });
  });
});
