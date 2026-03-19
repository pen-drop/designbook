import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import jsonata from 'jsonata';
import type { ValidationResult } from './types.js';
import type { DesignbookConfig } from '../config.js';

interface ComponentNode {
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, unknown>;
}

function isComponentNode(val: unknown): val is ComponentNode {
  return typeof val === 'object' && val !== null && typeof (val as ComponentNode).component === 'string';
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

  // Load sample data: dist/data-model sections or dist/data.yml
  const dataPath = resolve(config.dist, 'data.yml');
  if (!existsSync(dataPath)) {
    return { valid: false, errors: [`Sample data not found: ${dataPath}`], warnings: [] };
  }

  const rawData = parseYaml(readFileSync(dataPath, 'utf-8')) as Record<string, unknown>;

  // Support both namespaced format (content.node.docs_page) and flat (node.docs_page)
  const entityMap: Record<string, Record<string, unknown[]>> = rawData['content'] &&
  typeof rawData['content'] === 'object'
    ? (rawData['content'] as Record<string, Record<string, unknown[]>>)
    : (rawData as Record<string, Record<string, unknown[]>>);

  const errors: string[] = [];
  let recordsTested = 0;

  for (const [entityType, bundles] of Object.entries(entityMap)) {
    if (typeof bundles !== 'object' || bundles === null) continue;
    for (const [bundle, records] of Object.entries(bundles)) {
      if (!Array.isArray(records)) continue;
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
          if (!isComponentNode(items[i])) {
            errors.push(
              `${entityType}.${bundle}: Output[${i}].component is required (got ${JSON.stringify(items[i])})`,
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
