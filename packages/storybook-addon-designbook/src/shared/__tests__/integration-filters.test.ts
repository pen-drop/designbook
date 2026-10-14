import { describe, it, expect } from 'vitest';
import { globSync } from 'glob';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';

const ROOT = resolve(__dirname, '../../../../../.agents/skills');
const EXEMPT = new Set(['designbook-drupal/install/rules/detect-drupal.md']);

function frontmatter(file: string): Record<string, unknown> {
  const m = readFileSync(file, 'utf-8').match(/^---\n([\s\S]*?)\n---/);
  return (m?.[1] ? load(m[1]) : {}) as Record<string, unknown>;
}

describe.each([['designbook-drupal', ['backend', 'frameworks.component']]])('%s artifacts are gated', (skill, keys) => {
  const files = globSync(`${skill}/**/{tasks,rules,blueprints}/*.md`, { cwd: ROOT });
  it.each(files.filter((f) => !EXEMPT.has(f)))('%s', (rel) => {
    const filter = (frontmatter(resolve(ROOT, rel)).filter ?? {}) as Record<string, unknown>;
    expect(keys.some((k) => k in filter)).toBe(true);
  });
});
