import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/\/+$/, '');
}

function hashUrl(url: string): string {
  const normalized = normalizeUrl(url);
  return createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

export const referenceFolderResolver: ParamResolver = {
  name: 'reference_folder',

  resolve(
    _input: string,
    config: Record<string, unknown>,
    context: ResolverContext,
  ): ResolverResult {
    const fromParam = config.from as string | undefined;
    if (!fromParam) {
      return {
        resolved: false,
        input: '',
        error: 'Missing "from" field in resolver config',
      };
    }

    const url = context.params[fromParam];
    if (typeof url !== 'string' || url === '') {
      return {
        resolved: false,
        input: '',
        error: `Parameter "${fromParam}" is missing or empty`,
      };
    }

    const hash = hashUrl(url);
    const folder = resolve(context.config.data, 'references', hash);
    mkdirSync(folder, { recursive: true });

    return {
      resolved: true,
      value: folder,
      input: url,
    };
  },
};
