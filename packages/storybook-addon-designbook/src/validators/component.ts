import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv-draft-04';
import type { ValidationResult } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function validateComponent(componentYmlPath: string): ValidationResult {
  if (!existsSync(componentYmlPath)) {
    return {
      valid: false,
      errors: [`Component file not found: ${componentYmlPath}`],
      warnings: [],
    };
  }

  const schemaPath = resolve(__dirname, 'schemas', 'metadata.schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  const data = parseYaml(readFileSync(componentYmlPath, 'utf-8'));

  const ajv = new Ajv({ allErrors: true, strict: false, logger: false });
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid && validate.errors) {
    const errors = validate.errors.map(
      (e) => `${e.instancePath || '/'} ${e.message}`,
    );
    return { valid: false, errors, warnings: [] };
  }

  return { valid: true, errors: [], warnings: [] };
}
