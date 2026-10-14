import { describe, it, expect } from 'vitest';
import { renderValidators } from '../plan-build.js';

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
