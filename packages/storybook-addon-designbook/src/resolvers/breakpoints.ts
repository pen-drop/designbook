import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

const TOKENS_PATH = 'design-system/design-tokens.yml';

function breakpointsFromMeta(_context: ResolverContext, _config: Record<string, unknown>): string[] | null {
  // Breakpoints are no longer stored in story meta — they come from design-tokens.yml only.
  return null;
}

export const breakpointsResolver: ParamResolver = {
  name: 'breakpoints',

  resolve(_input: string, config: Record<string, unknown>, context: ResolverContext): ResolverResult {
    const metaBreakpoints = breakpointsFromMeta(context, config);
    if (metaBreakpoints) {
      return {
        resolved: true,
        value: metaBreakpoints.join(','),
        input: '',
      };
    }

    const tokensFile = join(context.config.data, TOKENS_PATH);

    if (!existsSync(tokensFile)) {
      return {
        resolved: false,
        input: '',
        error: `design-tokens.yml not found at ${tokensFile}`,
      };
    }

    const content = readFileSync(tokensFile, 'utf-8');
    const tokens = load(content) as Record<string, unknown>;

    const semantic = tokens?.semantic as Record<string, unknown> | undefined;
    const breakpoints = semantic?.breakpoints as Record<string, unknown> | undefined;

    if (!breakpoints) {
      return {
        resolved: false,
        input: '',
        error: 'No semantic.breakpoints section found in design-tokens.yml',
      };
    }

    const names = Object.keys(breakpoints).filter((k) => !k.startsWith('$'));

    if (names.length === 0) {
      return {
        resolved: false,
        input: '',
        error: 'No breakpoints defined in semantic.breakpoints',
      };
    }

    return {
      resolved: true,
      value: names.join(','),
      input: '',
    };
  },
};
