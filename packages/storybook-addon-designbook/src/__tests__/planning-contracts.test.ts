import { describe, expect, it } from 'vitest';
import { definitionContracts } from '../planning-contracts.js';
import { schemaValidator } from '../workflow-document.js';
import type { SchemaBlock } from '../schema-block.js';

describe('definition-ready planning contracts', () => {
  it('preserves requiredness, schemas and submission while separating file observations', () => {
    const block: SchemaBlock = {
      definitions: { Tokens: { type: 'object', required: ['color'] } },
      params: {
        tokens: { path: '/tokens.yml', exists: true, content: { color: 'red' }, $ref: '#/definitions/Tokens' },
      },
      result: {
        'source-file': {
          path: '/{{ name }}.twig',
          exists: false,
          content: null,
          type: 'string',
          minLength: 1,
          validators: ['cmd:check-template'],
        },
        image: { path: '/{{ name }}.png', exists: false, content: null, submission: 'direct', validators: ['image'] },
        script: { path: '/script.js', type: 'string' },
      },
    };
    const before = structuredClone(block);
    const contracts = definitionContracts(
      block,
      '---\nparams:\n  type: object\n  required: [tokens]\n  additionalProperties: false\nresult:\n  type: object\n  required: [source-file, image]\n---\nWrite artifacts.',
    );
    expect(contracts.outputs['source-file']).toEqual({
      required: true,
      path: '/{{ name }}.twig',
      schema: { type: 'string', minLength: 1 },
      submission: 'data',
      validators: ['cmd:check-template'],
    });
    expect(contracts.outputs.image).toEqual({
      required: true,
      path: '/{{ name }}.png',
      schema: {},
      submission: 'direct',
      validators: ['image'],
    });
    expect(contracts.outputs.script!.required).toBe(false);
    expect(contracts.param_bindings.tokens).toEqual({ path: '/tokens.yml', exists: true, content: { color: 'red' } });
    const validate = schemaValidator(contracts.schemas).compile(contracts.params_schema);
    expect(validate({})).toBe(false);
    expect(validate({ tokens: {} })).toBe(false);
    expect(validate({ tokens: { color: 'red' } })).toBe(true);
    expect(validate({ tokens: { color: 'red' }, extra: true })).toBe(false);
    expect(block).toEqual(before);
  });

  it('retains preparation and parameter resolution as planning context, outside JSON schemas', () => {
    const contracts = definitionContracts(
      {
        definitions: {},
        params: { story_url: { type: 'string', resolve: 'story_url', from: 'scene_id' } },
        result: { css: { path: '/tokens.css', type: 'string', generator: { jsonata: '/tokens.jsonata' } } },
      },
      '---\nresult:\n  required: [css]\n---\nGenerate CSS.',
    );
    expect(contracts.param_bindings.story_url).toEqual({ resolve: 'story_url', from: 'scene_id' });
    expect(contracts.params_schema.properties.story_url).toEqual({ type: 'string' });
    expect(contracts.output_preparation.css).toEqual({ generator: { jsonata: '/tokens.jsonata' } });
    expect(contracts.outputs.css!.schema).toEqual({ type: 'string' });
  });
});
