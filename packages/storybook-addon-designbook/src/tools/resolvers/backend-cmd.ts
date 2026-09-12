import type { ParamResolver, ResolverResult, ResolverContext } from './types.js';

/**
 * Rebuild a nested object from a flattened DesignbookConfig.
 * loadConfig flattens `backend_cmd: { cmd: … }` to `backend_cmd.cmd`.
 */
export function unflattenPrefix(config: Record<string, unknown>, prefix: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const dot = `${prefix}.`;
  for (const [key, value] of Object.entries(config)) {
    if (key === prefix && value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, value as Record<string, unknown>);
      continue;
    }
    if (!key.startsWith(dot)) continue;
    out[key.slice(dot.length)] = value;
  }
  return out;
}

/**
 * ParamResolver for `resolve: backend_cmd`.
 *
 * Producer resolver: loads the `backend_cmd` block from designbook.config.yml
 * (flattened keys `backend_cmd.*`) so sync-to stages receive command strings
 * without the driver re-passing them on every `workflow create`.
 */
export const backendCmdResolver: ParamResolver = {
  name: 'backend_cmd',
  requiresInput: false,

  resolve(_input: string, _config: Record<string, unknown>, context: ResolverContext): ResolverResult {
    // Honour an explicit --params backend_cmd object (or a prior resolve pass).
    // resolveParams only forwards a string `input`; object values stay on context.params.
    const fromParams = context.params.backend_cmd;
    if (fromParams && typeof fromParams === 'object' && !Array.isArray(fromParams)) {
      return { resolved: true, value: fromParams as Record<string, unknown>, input: '' };
    }

    const value = unflattenPrefix(context.config as Record<string, unknown>, 'backend_cmd');
    if (Object.keys(value).length === 0) {
      return {
        resolved: false,
        input: '',
        error:
          'backend_cmd: designbook.config.yml has no backend_cmd block (expected backend_cmd.cmd / schema_cmd / …)',
      };
    }
    return { resolved: true, value, input: '' };
  },
};
