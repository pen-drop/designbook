import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import Ajv from 'ajv';

const repoRoot = resolve(import.meta.dirname, '../../../../../');
const readYaml = (path: string) => parseYaml(readFileSync(resolve(repoRoot, path), 'utf8')) as Record<string, unknown>;

const addonSchema = readYaml('packages/storybook-addon-designbook/src/validation/schemas/data-model.schema.yml');
const skillSchema = readYaml('.agents/skills/designbook/skills/data-model/schemas.yml').DataModel as object;

const ajv = () => new Ajv({ allErrors: true, strict: false });
const validators = {
  addon: ajv().compile(addonSchema),
  skill: ajv().compile(skillSchema),
};

const model = (mode: object, field: object = { type: 'string' }, half = 'view_modes') => ({
  content: { node: { article: { [half]: { default: mode }, fields: { title: field } } } },
});

describe.each(Object.entries(validators))('%s data-model schema', (_name, validate) => {
  it('accepts a view mode with builder', () => {
    expect(validate(model({ builder: 'entity-binding' }))).toBe(true);
  });

  it('accepts a builder value it does not know (free string)', () => {
    expect(validate(model({ builder: 'gutenberg' }))).toBe(true);
  });

  it('rejects a view mode with template', () => {
    expect(validate(model({ template: 'field-map' }))).toBe(false);
  });

  it('rejects a view mode with both builder and template', () => {
    expect(validate(model({ builder: 'entity-binding', template: 'field-map' }))).toBe(false);
  });

  it('accepts a field with a hint', () => {
    expect(validate(model({ builder: 'entity-binding' }, { type: 'image', hint: 'a dog' }))).toBe(true);
  });
});

describe('skill data-model schema', () => {
  it('rejects a form mode with template', () => {
    expect(validators.skill(model({ template: 'theme' }, undefined, 'form_modes'))).toBe(false);
  });

  it('accepts a form mode with builder', () => {
    expect(validators.skill(model({ builder: 'theme' }, undefined, 'form_modes'))).toBe(true);
  });
});

describe.each([
  ['addon', (addonSchema.definitions as Record<string, { properties: object }>).field.properties],
  ['skill', JSON.parse(JSON.stringify(skillSchema)).properties.content.additionalProperties.additionalProperties.properties.fields.additionalProperties.properties],
])('%s field properties', (_name, properties) => {
  it('no longer define sample_template', () => {
    expect(properties).not.toHaveProperty('sample_template');
  });
});
