/**
 * Shared config resolution module for Designbook.
 *
 * Implements "walk up" directory traversal to find `designbook.config.yml`,
 * starting from a given directory and walking up parent directories until
 * the filesystem root.
 *
 * Used by both the Storybook addon (preset.ts) and agent tooling (load-config.cjs).
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, parse as parsePath } from 'node:path';
import { load as parseYaml } from 'js-yaml';

const CONFIG_FILENAMES = ['designbook.config.yml', 'designbook.config.yaml'];

export interface ExtensionEntry {
  id: string;
  url?: string;
  skill?: string;
}

export interface DesignbookConfig {
  /** Resolved absolute path to the workflow data directory (= DESIGNBOOK_DATA). */
  data: string;
  /** Technology used (e.g. 'html', 'drupal'). */
  technology: string;
  /** Absolute path to the git workspace root (= DESIGNBOOK_WORKSPACE). */
  workspace?: string;
  /** Any additional keys from the config file. */
  [key: string]: unknown;
}

/**
 * Normalize the `extensions` array from config.
 * Accepts both plain strings and objects with `id`, optional `url` and `skill`.
 */
export function normalizeExtensions(raw: unknown): ExtensionEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return { id: entry };
      if (typeof entry === 'object' && entry !== null && typeof (entry as Record<string, unknown>).id === 'string') {
        const e = entry as Record<string, unknown>;
        return {
          id: e.id as string,
          ...(typeof e.url === 'string' ? { url: e.url } : {}),
          ...(typeof e.skill === 'string' ? { skill: e.skill } : {}),
        };
      }
      return null;
    })
    .filter((e): e is ExtensionEntry => e !== null);
}

/** Return comma-separated extension IDs, or empty string. */
export function getExtensionIds(entries: ExtensionEntry[]): string {
  return entries.map((e) => e.id).join(',');
}

/** Return comma-separated skill IDs from extensions that declare a skill. Unknown/missing skills are included as-is (caller validates). */
export function getExtensionSkillIds(entries: ExtensionEntry[]): string {
  return entries
    .map((e) => e.skill)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join(',');
}

const DEFAULTS: DesignbookConfig = {
  data: 'designbook', // will be overwritten during loadConfig
  technology: 'html',
};

/**
 * Find a designbook config file by walking up the directory tree.
 *
 * Starts at `startDir` (defaults to `process.cwd()`) and checks each
 * directory for `designbook.config.yml` or `designbook.config.yaml`,
 * walking up to the filesystem root.
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Absolute path to the config file, or `null` if not found
 */
export function findConfig(startDir: string = process.cwd()): string | null {
  let currentDir = resolve(startDir);
  const root = parsePath(currentDir).root;

  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const configPath = resolve(currentDir, filename);
      if (existsSync(configPath)) {
        return configPath;
      }
    }

    if (currentDir === root) {
      break;
    }

    currentDir = dirname(currentDir);
  }

  return null;
}

/**
 * Load and parse a designbook config file.
 *
 * Finds the config file via `findConfig()`, parses it as YAML,
 * applies defaults for missing keys, and resolves paths:
 * - `workspace` → absolute, relative to config dir; defaults to config dir (DESIGNBOOK_WORKSPACE)
 * - `designbook.home` → absolute, relative to workspace; defaults to workspace (DESIGNBOOK_HOME)
 * - `designbook.data` → absolute, as `home/<name>`; defaults to `home/designbook` (DESIGNBOOK_DATA)
 * - `dirs.*` → absolute, relative to workspace (DESIGNBOOK_DIRS_*)
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Parsed config with defaults applied
 */
export function loadConfig(startDir?: string): DesignbookConfig {
  const configPath = findConfig(startDir);

  if (!configPath) {
    const cwd = process.cwd();
    const dataDir = resolve(cwd, 'designbook');
    return {
      ...DEFAULTS,
      data: dataDir,
      workspace: cwd,
      'designbook.home': cwd,
      'designbook.data': dataDir,
    };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = parseYaml(content) || {};
    const configDir = dirname(configPath);

    // Flatten nested keys (e.g. css.framework → css.framework) for compatibility
    // with the existing environment variable pattern.
    // Arrays (like extensions) are preserved as-is at their original key.
    const flat: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        flat[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
          flat[`${key}.${subKey}`] = subValue;
        }
      } else {
        flat[key] = value;
      }
    }

    const config = { ...DEFAULTS, ...flat } as DesignbookConfig;

    // Resolve css.app to absolute path
    if (typeof config['css.app'] === 'string') {
      config['css.app'] = resolve(configDir, config['css.app'] as string);
    }

    // 1. Resolve workspace (git project root)
    const rawWorkspace = config['workspace'] as string | undefined;
    const workspaceDir = rawWorkspace !== undefined ? resolve(configDir, rawWorkspace) : configDir;
    config['workspace'] = workspaceDir;
    config.workspace = workspaceDir;

    // 2. Resolve designbook.home (Storybook/theme app dir)
    const rawHome = config['designbook.home'] as string | undefined;
    const home = rawHome !== undefined ? resolve(configDir, rawHome) : workspaceDir;
    config['designbook.home'] = home;

    // 3. Resolve designbook.data (workflow data dir, name relative to home)
    const rawData = config['designbook.data'] as string | undefined ?? 'designbook';
    const dataDir = resolve(home, rawData);
    config['designbook.data'] = dataDir;
    config.data = dataDir;

    // 4. designbook.url and designbook.cmd are plain strings — no resolution needed

    // 5. Resolve dirs.* relative to configDir
    for (const key of Object.keys(config)) {
      if (key.startsWith('dirs.') && typeof config[key] === 'string') {
        config[key] = resolve(configDir, config[key] as string);
      }
    }

    return config;
  } catch (err) {
    throw new Error(`Failed to parse designbook.config.yml: ${(err as Error).message}`);
  }
}
