import { describe, it, expect } from 'vitest';
import { globSync } from 'glob';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(__dirname, '../../../../..');
const FILES = [
  ...globSync('.agents/skills/designbook/**/*.{md,yml}', { cwd: REPO }),
  ...globSync('packages/storybook-addon-designbook/src/**/*.ts', { cwd: REPO, ignore: ['**/__tests__/**'] }),
];
// Reasoned exceptions only; each entry states why it is not a backend leak.
const EXCEPTIONS: Record<string, string> = {};

describe('core stays backend-neutral', () => {
  it.each([/wordpress|\bacf\b|timber|\bwp /i, /drush|cim_ok|config_sync_dir/])('no %s in core', (re) => {
    const hits = FILES.filter((f) => !EXCEPTIONS[f] && re.test(readFileSync(resolve(REPO, f), 'utf-8')));
    expect(hits).toEqual([]);
  });
});
