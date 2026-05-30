import type { DesignbookConfig } from '../config.js';

/**
 * Feature flags.
 *
 * A feature is ON unless explicitly disabled. Resolution precedence:
 *
 *   1. env  `DESIGNBOOK_FEATURE_<NAME>`  (off/0/false/no → off; on/1/true/yes → on)
 *   2. config `features.<name>`           (false → off)
 *   3. default                            (on)
 *
 * The env override exists for per-run A/B toggling without editing the config
 * file; the config entry is the durable per-project switch.
 */

function envKey(name: string): string {
  return `DESIGNBOOK_FEATURE_${name.toUpperCase()}`;
}

function parseBool(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === 'off' || v === '0' || v === 'false' || v === 'no') return false;
  if (v === 'on' || v === '1' || v === 'true' || v === 'yes') return true;
  return undefined; // unrecognized value → ignore, fall through
}

export function isFeatureEnabled(name: string, config: DesignbookConfig): boolean {
  const fromEnv = parseBool(process.env[envKey(name)]);
  if (fromEnv !== undefined) return fromEnv;

  // `loadConfig` flattens nested YAML to dot-path keys, so a config file with
  //   features:
  //     region_properties: false
  // arrives as the flat key `features.<name>`, not a nested `features` object.
  const flat = (config as Record<string, unknown>)[`features.${name}`];
  if (typeof flat === 'boolean') return flat;

  // Nested form — produced by callers that build the config object directly
  // (e.g. tests) rather than going through loadConfig's flattener.
  const features = config.features;
  if (features && typeof features === 'object' && name in features) {
    return features[name] !== false;
  }

  return true;
}
