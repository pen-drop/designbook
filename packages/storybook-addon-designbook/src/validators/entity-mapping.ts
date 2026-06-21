import { existsSync, readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import jsonata from 'jsonata';
import type { ValidationResult } from './types.js';
import type { DesignbookConfig } from '../config.js';
import { readBundleFiles } from '../renderer/data-pool.js';

interface ComponentNode {
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, unknown>;
}

interface EntityRefNode {
  type: 'entity';
  entity_type: string;
  bundle: string;
  view_mode: string;
  record: number;
}

function isComponentNode(val: unknown): val is ComponentNode {
  return typeof val === 'object' && val !== null && typeof (val as ComponentNode).component === 'string';
}

function isEntityRefNode(val: unknown): val is EntityRefNode {
  return typeof val === 'object' && val !== null && (val as EntityRefNode).type === 'entity';
}

function isValidOutputNode(val: unknown): boolean {
  return isComponentNode(val) || isEntityRefNode(val);
}

/**
 * Validate a .jsonata entity mapping file by executing it against sample data
 * and verifying the output is a valid ComponentNode[].
 */
export async function validateEntityMapping(file: string, config: DesignbookConfig): Promise<ValidationResult> {
  if (!existsSync(file)) {
    return { valid: false, errors: [`File not found: ${file}`], warnings: [] };
  }

  let expression: string;
  try {
    expression = readFileSync(file, 'utf-8');
  } catch (err) {
    return { valid: false, errors: [`Cannot read file: ${(err as Error).message}`], warnings: [] };
  }

  let compiled: ReturnType<typeof jsonata>;
  try {
    compiled = jsonata(expression);
  } catch (err) {
    return { valid: false, errors: [`JSONata parse error: ${(err as Error).message}`], warnings: [] };
  }

  // Parse entity_type.bundle.view_mode from filename
  const fileName = basename(file, '.jsonata');
  const parts = fileName.split('.');
  const targetEntityType = parts.length >= 3 ? parts[0] : undefined;
  const targetBundle = parts.length >= 3 ? parts[1] : undefined;

  // Load sample data from the merged data/ directory
  const dataDir = resolve(config.data, 'data');
  const mergedMap: Record<string, Record<string, unknown[]>> = {};
  for (const { entityType, bundle, records } of readBundleFiles(dataDir)) {
    (mergedMap[entityType] ??= {})[bundle] = records;
  }
  if (Object.keys(mergedMap).length === 0) {
    return { valid: false, errors: [`No sample data found in ${dataDir}`], warnings: [] };
  }

  const errors: string[] = [];
  let recordsTested = 0;

  for (const [entityType, bundles] of Object.entries(mergedMap)) {
    if (typeof bundles !== 'object' || bundles === null) continue;
    // Only test against the entity type/bundle that matches the filename
    if (targetEntityType && entityType !== targetEntityType) continue;
    for (const [bundle, records] of Object.entries(bundles)) {
      if (!Array.isArray(records)) continue;
      if (targetBundle && bundle !== targetBundle) continue;
      for (const record of records) {
        recordsTested++;
        let output: unknown;
        try {
          output = await compiled.evaluate(record as Record<string, unknown>);
        } catch (err) {
          errors.push(`${entityType}.${bundle}: JSONata error: ${(err as Error).message}`);
          continue;
        }

        const items = Array.isArray(output) ? output : [output];
        for (let i = 0; i < items.length; i++) {
          if (items[i] == null) continue; // conditional nodes that evaluate to null/undefined
          if (!isValidOutputNode(items[i])) {
            errors.push(
              `${entityType}.${bundle}: Output[${i}] must have 'component' or 'type: entity' (got ${JSON.stringify(items[i])})`,
            );
          }
        }
      }
    }
  }

  if (recordsTested === 0) {
    return { valid: false, errors: ['No sample records found to test against'], warnings: [] };
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}
