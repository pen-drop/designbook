import { resolve } from 'node:path';
import type { ParamResolver, ResolverResult } from './types.js';

export interface ConfigSyncDirInput {
  docroot: string;
  syncRelative: string | null;
}

/**
 * Resolve the Drupal config-sync directory.
 *
 * When `syncRelative` is provided it is treated as a path relative to `docroot`
 * (matching the value from `$config_directories['sync']` in settings.php).
 *
 * When `syncRelative` is `null` (unset / not configured), the function falls
 * back to Drupal's default: `<docroot>/sites/default/files/config_<hash>/sync`.
 * The hash placeholder `default` is used here so callers can rely on the path
 * containing `/sites/default/` and ending with `/sync`.
 */
export function resolveConfigSyncDir({ docroot, syncRelative }: ConfigSyncDirInput): string {
  if (syncRelative !== null) {
    return resolve(docroot, syncRelative);
  }
  // Drupal default: sites/default/files/config_<hash>/sync
  return resolve(docroot, 'sites', 'default', 'files', 'config_default', 'sync');
}

/**
 * ParamResolver wrapper for use in workflow param declarations via
 * `resolve: config_sync_dir`.
 *
 * Expected config shape:
 *   docroot: <param-name-containing-docroot-path>   (required)
 *   syncRelative: <param-name-or-null>              (optional; null triggers fallback)
 */
export const configSyncDirResolver: ParamResolver = {
  name: 'config_sync_dir',

  resolve(input: string, config: Record<string, unknown>): ResolverResult {
    // Idempotency contract: the engine re-runs param resolvers on every stage
    // transition, seeding `input` from the param's current value — which, on
    // reruns, is this resolver's own previous output. An already-absolute
    // `input` is therefore either an explicit `--params` value to respect, or
    // this resolver's prior result; both must pass through unchanged so the
    // sync-dir suffix is never appended more than once.
    if (input.startsWith('/')) {
      return { resolved: true, value: input, input };
    }

    const docroot = typeof config.docroot === 'string' ? config.docroot : input;
    if (!docroot) {
      return { resolved: false, input: '', error: 'config_sync_dir: docroot is required' };
    }

    const syncRelative =
      typeof config.syncRelative === 'string' && config.syncRelative !== '' ? config.syncRelative : null;

    const value = resolveConfigSyncDir({ docroot, syncRelative });
    return { resolved: true, value, input: docroot };
  },
};
