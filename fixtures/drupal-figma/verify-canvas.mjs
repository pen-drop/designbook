import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../packages/storybook-addon-designbook/package.json', import.meta.url));
const { parse } = require('yaml');
const jsonata = require('jsonata');
const theme = resolve(process.argv[2] || 'fixtures/drupal-figma/saas-canvas');
const read = (path) => readFileSync(join(theme, path), 'utf8');
for (const name of ['card', 'disclosure', 'plain']) {
  assert.ok(!existsSync(join(theme, 'components', name)), 'Unexpected template component: ' + name);
}
for (const entry of readdirSync(join(theme, 'components'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const name = entry.name;
  assert.ok(existsSync(join(theme, 'components', name, name + '.component.yml')), name);
  assert.ok(existsSync(join(theme, 'components', name, name + '.twig')), name);
  assert.ok(existsSync(join(theme, 'components', name, name + '.default.story.yml')), name);
}
const model = parse(read('designbook/data-model.yml'));
const canvas = model.content.canvas_page.landing_page;
assert.equal(canvas.purpose, 'layout-builder');
assert.equal(canvas.view_modes.full.template, 'canvas');
assert.equal(canvas.fields.components.type, 'component_tree');
assert.equal(model.content.node.landing, undefined);
assert.deepEqual(readdirSync(join(theme, 'designbook/sections')), ['saas-demo']);
const scene = parse(read('designbook/sections/saas-demo/saas-demo.section.scenes.yml'));
assert.equal(scene.scenes[0].items[0].with.content[0].entity, 'canvas_page.landing_page');
const [record] = parse(read('designbook/data/canvas_page.landing_page.yml'));
assert.equal(record.components.length, 3);
function check(value) {
  if (Array.isArray(value)) return value.forEach(check);
  if (!value || typeof value !== 'object') return;
  assert.equal(value.entity, undefined, 'Canvas must contain inline components');
  if (value.component) {
    const name = value.component.split(':')[1];
    assert.ok(existsSync(join(theme, 'components', name, name + '.component.yml')), name);
  }
  for (const item of Object.values(value)) {
    if (typeof item === 'string' && item.startsWith('/saas-kit/')) {
      assert.ok(existsSync(join(theme, 'public', item)), item);
    }
    check(item);
  }
}
check(record.components);
const mapping = read('designbook/entity-mapping/canvas_page.landing_page.full.jsonata');
assert.deepEqual(await jsonata(mapping).evaluate(record), record.components);
for (const name of ['node.feature', 'node.pricing_plan']) {
  const records = parse(read('designbook/data/' + name + '.yml'));
  const expression = jsonata(read('designbook/entity-mapping/' + name + '.card.jsonata'));
  for (const item of records) assert.ok(await expression.evaluate(item));
}
console.log('Canvas model, scene, inline tree, local assets and entity mappings: OK');
