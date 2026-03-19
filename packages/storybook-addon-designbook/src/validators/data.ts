import { existsSync, readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import type { ValidationResult } from './types.js';

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

interface DataModel {
  content?: Record<string, Record<string, BundleDef>>;
  config?: Record<string, Record<string, BundleDef>>;
}

interface SampleData {
  content?: Record<string, Record<string, Record<string, unknown>[]>>;
  config?: Record<string, Record<string, Record<string, unknown>[]>>;
}

export function validateData(dataModelPath: string, dataPath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!existsSync(dataModelPath)) {
    return { valid: false, errors: [`data-model.yml not found: ${dataModelPath}`], warnings: [] };
  }
  if (!existsSync(dataPath)) {
    return { valid: false, errors: [`data.yml not found: ${dataPath}`], warnings: [] };
  }

  const dataModel: DataModel = parseYaml(readFileSync(dataModelPath, 'utf-8'));
  const sampleData: SampleData = parseYaml(readFileSync(dataPath, 'utf-8'));

  const contentModel = dataModel.content ?? {};
  const configModel = dataModel.config ?? {};
  const contentData = sampleData.content ?? {};
  const configData = sampleData.config ?? {};

  // ── Validate content entities ──────────────────────────────────────
  for (const [entityType, bundles] of Object.entries(contentData)) {
    if (typeof bundles !== 'object' || bundles === null) continue;

    if (!(entityType in contentModel)) {
      errors.push(`Entity type "${entityType}" not in data-model`);
      continue;
    }

    for (const [bundle, records] of Object.entries(bundles)) {
      if (!Array.isArray(records)) continue;

      if (!(bundle in contentModel[entityType])) {
        errors.push(`Bundle "${entityType}.${bundle}" not in data-model`);
        continue;
      }

      const dmFields = contentModel[entityType][bundle].fields ?? {};

      for (const rec of records) {
        const rid = (rec as Record<string, unknown>).id ?? '?';

        for (const field of Object.keys(rec as Record<string, unknown>)) {
          if (field === 'id') continue;

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
          if (fieldDef?.required && !(fieldName in (rec as Record<string, unknown>))) {
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
      if (!(bundle in configModel[entityType])) {
        errors.push(`Config bundle "${entityType}.${bundle}" not in data-model config`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
