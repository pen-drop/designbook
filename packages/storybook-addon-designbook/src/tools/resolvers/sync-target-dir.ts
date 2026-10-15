import { resolve } from 'node:path';
import type { ParamResolver, ResolverResult, ResolverContext } from './types.js';

/**
 * ParamResolver for `resolve: sync_target_dir` — the backend's sync output root, from
 * `sync_target_dir` in designbook.config.yml resolved against `workspace` (or cwd).
 * An absolute input or param wins (explicit override or a prior resolve result).
 */
export const syncTargetDirResolver: ParamResolver = {
  name: 'sync_target_dir',
  requiresInput: false,
  resolve(input: string, _config: Record<string, unknown>, context: ResolverContext): ResolverResult {
    const explicit = context?.params?.sync_target_dir;
    if (typeof explicit === 'string' && explicit.startsWith('/'))
      return { resolved: true, value: explicit, input: explicit };
    if (input.startsWith('/')) return { resolved: true, value: input, input };
    const cfg = (context?.config ?? {}) as Record<string, unknown>;
    const dir = cfg.sync_target_dir;
    if (typeof dir !== 'string' || dir === '') {
      return { resolved: false, input: '', error: 'sync_target_dir: set sync_target_dir in designbook.config.yml' };
    }
    const base = typeof cfg.workspace === 'string' && cfg.workspace !== '' ? cfg.workspace : process.cwd();
    return { resolved: true, value: resolve(base, dir), input: dir };
  },
};
