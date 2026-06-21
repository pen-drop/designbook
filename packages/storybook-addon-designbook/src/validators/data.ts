import { existsSync, readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';
import type { ValidationResult } from './types.js';
import { readBundleFiles } from '../renderer/data-pool.js';
import type { DataModel } from '../renderer/types.js';

interface FieldDef {
  type?: string;
  required?: boolean;
  settings?: {
    target_type?: string;
    target_bundle?: string;
  };
}

interface BundleDef {
  fields?: Record<string, FieldDef>;
}

export function validateData(dataModelPath: string, dataDir: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!existsSync(dataModelPath)) {
    return { valid: false, errors: [`data-model.yml not found: ${dataModelPath}`], warnings: [] };
  }
  if (!existsSync(dataDir)) {
    return { valid: false, errors: [`data/ directory not found: ${dataDir}`], warnings: [] };
  }

  const dataModel = parseYaml(readFileSync(dataModelPath, 'utf-8')) as DataModel;

  // Build content/config pools from the merged data/ directory.
  // Route by entity type presence: if the entity type exists in content → contentData,
  // if in config → configData, otherwise report unknown (bundle errors are caught later).
  const contentData: Record<string, Record<string, Record<string, unknown>[]>> = {};
  const configData: Record<string, Record<string, Record<string, unknown>[]>> = {};

  for (const { entityType, bundle, records } of readBundleFiles(dataDir)) {
    if (dataModel.content?.[entityType]) {
      (contentData[entityType] ??= {})[bundle] = records;
    } else if (dataModel.config?.[entityType]) {
      (configData[entityType] ??= {})[bundle] = records;
    } else {
      errors.push(`Entity type "${entityType}" not in data-model`);
    }
  }

  const contentModel = dataModel.content ?? {};
  const configModel = (dataModel.config ?? {}) as Record<string, Record<string, BundleDef>>;

  // ── Validate content entities ──────────────────────────────────────
  for (const [entityType, bundles] of Object.entries(contentData)) {
    if (typeof bundles !== 'object' || bundles === null) continue;

    for (const [bundle, records] of Object.entries(bundles)) {
      if (!Array.isArray(records)) continue;

      if (!(bundle in contentModel[entityType]!)) {
        errors.push(`Bundle "${entityType}.${bundle}" not in data-model`);
        continue;
      }

      const dmFields = (contentModel[entityType]![bundle] as BundleDef).fields ?? {};

      for (const rec of records) {
        const rid = (rec as Record<string, unknown>).id ?? '?';

        for (const field of Object.keys(rec as Record<string, unknown>)) {
          if (field === 'id') continue;
          if (field === '__designbook') {
            const meta = (rec as Record<string, unknown>).__designbook as { section?: unknown };
            const sec = meta?.section;
            const okSection =
              typeof sec === 'string' || (Array.isArray(sec) && sec.every((s) => typeof s === 'string'));
            if (sec !== undefined && !okSection) {
              errors.push(
                `Invalid __designbook.section on ${entityType}.${bundle} id=${rid} — must be string or string[]`,
              );
            }
            continue;
          }

          if (!(field in dmFields)) {
            warnings.push(`Field "${field}" on ${entityType}.${bundle} id=${rid} not in data-model`);
            continue;
          }

          const fieldDef = dmFields[field];
          if (fieldDef?.type === 'reference' && fieldDef.settings) {
            const { target_type: targetType, target_bundle: targetBundle } = fieldDef.settings;
            const refValue = (rec as Record<string, unknown>)[field];

            if (targetType && targetBundle && refValue && contentData[targetType]?.[targetBundle]) {
              const targetRecords = contentData[targetType][targetBundle];
              const refValues = Array.isArray(refValue) ? refValue : [refValue];
              for (const rv of refValues) {
                const found = targetRecords.some((r) => (r as Record<string, unknown>).id === String(rv));
                if (!found) {
                  warnings.push(
                    `Broken ref: ${entityType}.${bundle} id=${rid} field "${field}" → ${targetType}.${targetBundle} id=${rv} not found`,
                  );
                }
              }
            }
          }
        }

        for (const [fieldName, fieldDef] of Object.entries(dmFields)) {
          if ((fieldDef as FieldDef)?.required && !(fieldName in (rec as Record<string, unknown>))) {
            warnings.push(`Required field "${fieldName}" missing on ${entityType}.${bundle} id=${rid}`);
          }
        }
      }
    }
  }

  // ── Validate config entities (existence only, no field validation) ──
  for (const [entityType, bundles] of Object.entries(configData)) {
    if (typeof bundles !== 'object' || bundles === null) continue;

    if (!(entityType in configModel)) {
      errors.push(`Config entity type "${entityType}" not in data-model config`);
      continue;
    }

    for (const [bundle] of Object.entries(bundles)) {
      if (!(bundle in configModel[entityType]!)) {
        errors.push(`Config bundle "${entityType}.${bundle}" not in data-model config`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
