import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { defaultSdcScriptResolver } from '../scene-module-builder';

const DESIGNBOOK_DIR = resolve(__dirname, 'fixtures/js-behavior/designbook');

describe('defaultSdcScriptResolver', () => {
  it('returns the sibling <name>.js path when it exists', () => {
    const p = defaultSdcScriptResolver('test:toggle', DESIGNBOOK_DIR);
    expect(p).not.toBeNull();
    expect(p).toMatch(/fixtures\/js-behavior\/components\/toggle\/toggle\.js$/);
  });

  it('returns null when the component has no sibling JS', () => {
    expect(defaultSdcScriptResolver('test:missing', DESIGNBOOK_DIR)).toBeNull();
  });
});
