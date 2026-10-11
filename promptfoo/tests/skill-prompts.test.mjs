import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import yaml from 'js-yaml';

for (const name of ['01-reference', '02-vision', '03-data-model', '04-tokens', '05-shell', '06-screen']) {
  test(`recipe ${name} delegates to installed skills and preserves the workspace`, (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'recipe-skill-prompt-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const file = execFileSync('node', ['promptfoo/scripts/run-single.mjs', name,
      '--suite', 'drupal-recipe', '--workspace', join(dir, 'workspace'),
      '--prepared-workspace', '--config-only', '--output', join(dir, 'result.json')],
      { encoding: 'utf8' }).trim();
    const config = yaml.load(readFileSync(file, 'utf8'));
    assert.deepEqual(config.tests[0].vars, { workspace: join(dir, 'workspace') });
    assert.match(config.prompts[0], /Read .*SKILL\.md/);
    assert.doesNotMatch(config.prompts[0], /MD-plan engine|_debo intake|_debo plan build|plan done|author.*tasks\.json/i);
    if (name === '05-shell' || name === '06-screen') {
      assert.ok(config.tags.verify_config, 'Numbered design case must retain automatic verification');
      const intake = yaml.load(readFileSync(config.tags.intake_config, 'utf8'));
      assert.match(intake.prompts[0], /extract-reference\/SKILL\.md/);
      assert.doesNotMatch(intake.prompts[0], /selector to .?website|_debo plan build/);
      const verify = yaml.load(readFileSync(config.tags.verify_config, 'utf8'));
      assert.match(verify.prompts[0], /design-verify\/SKILL\.md/);
      assert.doesNotMatch(verify.prompts[0], /_debo intake|_debo plan build/);
    }
  });
}
