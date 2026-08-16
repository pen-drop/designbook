import { resolve } from 'node:path';
import type { DesignbookConfig } from '../config.js';
import type { ParamResolver, ResolverResult, ResolverContext } from './types.js';

export interface ConfigSyncDirInput {
  docroot: string;
  syncRelative: string | null;
}

/**
 * Resolve the Drupal config-sync directory.
 *
 * When `syncRelative` is provided it is treated as a path relative to `docroot`
 * (matching `$settings['config_sync_directory']` in settings.php).
 *
 * When `syncRelative` is `null`, falls back to the designbook Drupal fixture
 * default: `<docroot>/sites/default/files/sync` (see settings.ddev.php).
 */
export function resolveConfigSyncDir({ docroot, syncRelative }: ConfigSyncDirInput): string {
  if (syncRelative !== null && syncRelative !== '') {
    return resolve(docroot, syncRelative);
  }
  return resolve(docroot, 'sites', 'default', 'files', 'sync');
}

/**
 * Derive the Drupal docroot from DesignbookConfig without requiring an explicit
 * `docroot:` param on the workflow declaration.
 *
 * Order:
 * 1. `workspace` + `/web` when that directory exists (or when no better signal)
 * 2. prefix of `designbook.home` that ends at `…/web` (theme lives under web/themes/…)
 */
export function deriveDocrootFromConfig(config: DesignbookConfig | Record<string, unknown>): string | undefined {
  const workspace = (config.workspace ?? config['workspace']) as string | undefined;
  if (typeof workspace === 'string' && workspace.length > 0) {
    // Drupal-layout workspaces always use <workspace>/web as docroot.
    return resolve(workspace, 'web');
  }

  const home = config['designbook.home'] as string | undefined;
  if (typeof home === 'string' && home.length > 0) {
    const match = home.replace(/\\/g, '/').match(/^(.*\/web)(?:\/|$)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * ParamResolver for `resolve: config_sync_dir`.
 *
 * Producer resolver (`requiresInput: false`): derives an absolute host path to the
 * Drupal config-sync directory from designbook.config.yml so sync-to transform
 * does not need a manual `--params config_sync_dir` or `docroot` declaration.
 *
 * Optional declaration keys (on the param schema, not project config):
 *   docroot: absolute path override
 *   syncRelative: path relative to docroot (default sites/default/files/sync)
 */
export const configSyncDirResolver: ParamResolver = {
  name: 'config_sync_dir',
  requiresInput: false,

  resolve(input: string, config: Record<string, unknown>, context?: ResolverContext): ResolverResult {
    // Idempotency: absolute input is an explicit override or a prior resolve result.
    if (input.startsWith('/')) {
      return { resolved: true, value: input, input };
    }

    const fromParams = context?.params?.config_sync_dir;
    if (typeof fromParams === 'string' && fromParams.startsWith('/')) {
      return { resolved: true, value: fromParams, input: fromParams };
    }

    const declDocroot = typeof config.docroot === 'string' && config.docroot !== '' ? config.docroot : undefined;
    const cfg = (context?.config ?? {}) as DesignbookConfig;
    const derived = deriveDocrootFromConfig(cfg);
    const docroot =
      declDocroot ??
      (typeof input === 'string' && input !== '' && !input.startsWith('/') ? input : undefined) ??
      derived;

    if (!docroot) {
      return {
        resolved: false,
        input: '',
        error:
          'config_sync_dir: could not derive Drupal docroot (set workspace in designbook.config.yml or pass an absolute config_sync_dir)',
      };
    }

    const syncRelative =
      typeof config.syncRelative === 'string' && config.syncRelative !== '' ? config.syncRelative : null;

    const value = resolveConfigSyncDir({ docroot, syncRelative });
    return { resolved: true, value, input: docroot };
  },
};
