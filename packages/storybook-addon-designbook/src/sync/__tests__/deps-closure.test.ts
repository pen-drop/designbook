import { describe, it, expect } from 'vitest';
import { closure } from '../deps-closure.js';

const A = {
  config_name: 'field.field.node.article.field_body',
  data: { dependencies: { config: ['field.storage.node.field_body', 'node.type.article'] } },
};
const STORAGE = { config_name: 'field.storage.node.field_body', data: { dependencies: { config: [] } } };
const TYPE = { config_name: 'node.type.article', data: { dependencies: { config: [] } } };

describe('closure', () => {
  it('with-deps pulls the transitive closure', () => {
    const out = closure([A], { withDeps: true, pool: [A, STORAGE, TYPE] });
    expect(out.map((e) => e.config_name).sort()).toEqual([
      'field.field.node.article.field_body',
      'field.storage.node.field_body',
      'node.type.article',
    ]);
  });

  it('no-deps returns only the target', () => {
    const out = closure([A], { withDeps: false, pool: [A, STORAGE, TYPE] });
    expect(out.map((e) => e.config_name)).toEqual(['field.field.node.article.field_body']);
  });
});
