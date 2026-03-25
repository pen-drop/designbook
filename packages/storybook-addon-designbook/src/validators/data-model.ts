import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';
import Ajv from 'ajv';
import type { ValidationResult } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function validateDataModel(dataModelPath: string): ValidationResult {
  if (!existsSync(dataModelPath)) {
    return {
      valid: false,
      errors: [`data-model.yml not found: ${dataModelPath}`],
      warnings: [],
    };
  }

  const schemaPath = resolve(__dirname, 'schemas', 'data-model.schema.yml');
  const schema = parseYaml(readFileSync(schemaPath, 'utf-8')) as object;
  const data = parseYaml(readFileSync(dataModelPath, 'utf-8'));

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid && validate.errors) {
    const errors = validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}`);
    return { valid: false, errors, warnings: [] };
  }

  return { valid: true, errors: [], warnings: [] };
}
