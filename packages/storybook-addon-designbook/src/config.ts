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
import { parse as parseYaml } from 'yaml';

const CONFIG_FILENAMES = ['designbook.config.yml', 'designbook.config.yaml'];

export interface DesignbookConfig {
    /** Path to the dist/output directory (resolved to absolute path relative to config location). */
    dist: string;
    /** Technology used (e.g. 'html', 'drupal'). */
    technology: string;
    /** Temporary directory. */
    tmp: string;
    /** Any additional keys from the config file. */
    [key: string]: unknown;
}

const DEFAULTS: DesignbookConfig = {
    dist: 'designbook',
    technology: 'html',
    tmp: 'tmp',
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
 * applies defaults for missing keys, and resolves the `dist` path
 * relative to the config file's location (not relative to cwd).
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Parsed config with defaults applied
 */
export function loadConfig(startDir?: string): DesignbookConfig {
    const configPath = findConfig(startDir);

    if (!configPath) {
        return { ...DEFAULTS, dist: resolve(process.cwd(), DEFAULTS.dist) };
    }

    try {
        const content = readFileSync(configPath, 'utf-8');
        const parsed = parseYaml(content) || {};
        const configDir = dirname(configPath);

        // Flatten nested keys (e.g. css.framework → css.framework) for compatibility
        // with the existing environment variable pattern
        const flat: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(parsed)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
                    flat[`${key}.${subKey}`] = subValue;
                }
            } else {
                flat[key] = value;
            }
        }

        const config = { ...DEFAULTS, ...flat } as DesignbookConfig;

        // Resolve dist path relative to config file location, not cwd
        config.dist = resolve(configDir, config.dist);

        return config;
    } catch {
        return { ...DEFAULTS, dist: resolve(process.cwd(), DEFAULTS.dist) };
    }
}
