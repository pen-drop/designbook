import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

function toKebab(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const scenePathResolver: ParamResolver = {
  name: 'scene_path',

  resolve(
    input: string,
    _config: Record<string, unknown>,
    _context: ResolverContext,
  ): ResolverResult {
    if (!input || !input.trim()) {
      return { resolved: false, input, error: 'scene id is required' };
    }
    if (input === 'shell') {
      return { resolved: true, value: 'design-system/design-system.scenes.yml', input };
    }
    const id = toKebab(input);
    return {
      resolved: true,
      value: `sections/${id}/${id}.section.scenes.yml`,
      input,
    };
  },
};
