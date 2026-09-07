import { load } from 'js-yaml';
import type { SchemaBlock, SchemaEntry } from './schema-block.js';
import type { OutputDefinition } from './workflow-document.js';

/** Present planning building blocks in the saved-definition shape, without authoring tasks. */
export function definitionContracts(block: SchemaBlock, instructions: string) {
  const match = instructions.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('Planning task requires frontmatter');
  const fm = load(match[1]!) as {
    params?: Record<string, unknown>;
    result?: { required?: string[] };
  };
  const schemaOf = (entry: SchemaEntry) => {
    const {
      path: _path,
      exists: _exists,
      content: _content,
      validators: _validators,
      submission: _submission,
      workflow: _workflow,
      resolve: _resolve,
      from: _from,
      prepare: _prepare,
      generator: _generator,
      ...schema
    } = entry;
    return schema;
  };
  const params_schema = {
    type: 'object',
    ...fm.params,
    properties: Object.fromEntries(Object.entries(block.params).map(([key, entry]) => [key, schemaOf(entry)])),
  };
  const param_bindings = Object.fromEntries(
    Object.entries(block.params)
      .map(
        ([key, entry]) =>
          [
            key,
            Object.fromEntries(
              Object.entries(entry).filter(([name]) => ['path', 'exists', 'content', 'resolve', 'from'].includes(name)),
            ),
          ] as const,
      )
      .filter(([, binding]) => Object.keys(binding).length),
  );
  const outputs = Object.fromEntries(
    Object.entries(block.result).map(([key, entry]) => {
      const output: OutputDefinition = {
        required: fm.result?.required?.includes(key) ?? false,
        schema: schemaOf(entry),
        submission: (entry.submission as OutputDefinition['submission'] | undefined) ?? 'data',
        validators: (entry.validators as string[] | undefined) ?? [],
        ...(entry.path ? { path: entry.path } : {}),
      };
      return [key, output];
    }),
  );
  const output_preparation = Object.fromEntries(
    Object.entries(block.result)
      .map(
        ([key, entry]) =>
          [
            key,
            Object.fromEntries(Object.entries(entry).filter(([name]) => ['prepare', 'generator'].includes(name))),
          ] as const,
      )
      .filter(([, preparation]) => Object.keys(preparation).length),
  );
  return { params_schema, param_bindings, outputs, output_preparation, schemas: block.definitions };
}
