import { resolve } from 'node:path';
import { Reference } from '../reference-entity.js';
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

export const referenceFolderResolver: ParamResolver = {
  name: 'reference_folder',
  resolve(_input: string, config: Record<string, unknown>, context: ResolverContext): ResolverResult {
    const from = config.from as string | undefined;
    if (!from) return { resolved: false, input: '', error: 'Missing "from" field in resolver config' };
    const binding = context.params[from];
    if (typeof binding !== 'string' || !binding)
      return { resolved: false, input: '', error: `Parameter "${from}" is missing or empty` };
    try {
      const reference = Reference.load(context.config, binding);
      if (!reference)
        return {
          resolved: false,
          input: binding,
          error: `Parameter "${from}" must bind a published reference id/revision`,
        };
      return { resolved: true, value: resolve(context.config.data, reference.dir), input: binding };
    } catch (error) {
      return { resolved: false, input: binding, error: error instanceof Error ? error.message : String(error) };
    }
  },
};
