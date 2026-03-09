#!/usr/bin/env node

/**
 * validate-sample-data.cjs — Validates data.yml against data-model.yml.
 *
 * Usage:
 *   node validate-sample-data.cjs <designbook-dir> <section-id>
 *
 * Checks:
 *   ⛔ Hard errors (exit 1):
 *     - entity_type not in data-model.yml
 *     - bundle not in data-model.yml
 *   ⚠️ Warnings (exit 0):
 *     - field not defined in data-model.yml
 *     - required field missing from record
 *     - broken reference (target id not found)
 */

const fs = require('fs');
const path = require('path');
let yaml;

try {
    yaml = require('yaml');
} catch {
    // Fallback: try js-yaml
    try {
        const jsYaml = require('js-yaml');
        yaml = { parse: (str) => jsYaml.load(str) };
    } catch {
        console.error('❌ No YAML parser found. Install "yaml" or "js-yaml".');
        process.exit(2);
    }
}

const [designbookDir, sectionId] = process.argv.slice(2);

if (!designbookDir || !sectionId) {
    console.error('Usage: node validate-sample-data.cjs <designbook-dir> <section-id>');
    process.exit(2);
}

const dataModelPath = path.join(designbookDir, 'data-model.yml');
const dataPath = path.join(designbookDir, 'sections', sectionId, 'data.yml');

if (!fs.existsSync(dataModelPath)) {
    console.error(`❌ data-model.yml not found: ${dataModelPath}`);
    process.exit(1);
}
if (!fs.existsSync(dataPath)) {
    console.error(`❌ data.yml not found: ${dataPath}`);
    process.exit(1);
}

const dataModel = yaml.parse(fs.readFileSync(dataModelPath, 'utf-8'));
const sampleData = yaml.parse(fs.readFileSync(dataPath, 'utf-8'));
const content = dataModel.content || {};

const errors = [];
const warnings = [];

for (const [entityType, bundles] of Object.entries(sampleData)) {
    if (typeof bundles !== 'object' || bundles === null) continue;

    // Check entity type exists in data model
    if (!(entityType in content)) {
        errors.push(`❌ Entity type "${entityType}" not in data-model.yml`);
        continue;
    }

    for (const [bundle, records] of Object.entries(bundles)) {
        if (!Array.isArray(records)) continue;

        // Check bundle exists
        if (!(bundle in content[entityType])) {
            errors.push(`❌ Bundle "${entityType}.${bundle}" not in data-model.yml`);
            continue;
        }

        const dmFields = content[entityType][bundle].fields || {};

        for (const rec of records) {
            const rid = rec.id || '?';

            for (const field of Object.keys(rec)) {
                if (field === 'id') continue;

                // Check field exists in data model
                if (!(field in dmFields)) {
                    warnings.push(`⚠️  Field "${field}" on ${entityType}.${bundle} id=${rid} not in data-model`);
                    continue;
                }

                // Check broken references
                const fieldDef = dmFields[field];
                if (fieldDef && fieldDef.type === 'reference' && fieldDef.settings) {
                    const targetType = fieldDef.settings.target_type;
                    const targetBundle = fieldDef.settings.target_bundle;
                    const refValue = rec[field];

                    if (targetType && targetBundle && refValue && sampleData[targetType]?.[targetBundle]) {
                        const targetRecords = sampleData[targetType][targetBundle];
                        const found = targetRecords.some((r) => r.id === String(refValue));
                        if (!found) {
                            warnings.push(
                                `⚠️  Broken ref: ${entityType}.${bundle} id=${rid} field "${field}" → ${targetType}.${targetBundle} id=${refValue} not found`
                            );
                        }
                    }
                }
            }

            // Check required fields
            for (const [fieldName, fieldDef] of Object.entries(dmFields)) {
                if (fieldDef && fieldDef.required && !(fieldName in rec)) {
                    warnings.push(`⚠️  Required field "${fieldName}" missing on ${entityType}.${bundle} id=${rid}`);
                }
            }
        }
    }
}

// Output results
if (errors.length > 0) {
    errors.forEach((e) => console.error(e));
}
if (warnings.length > 0) {
    warnings.forEach((w) => console.warn(w));
}

if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All entities, bundles, and fields valid');
}

console.log(`\nSummary: ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length > 0 ? 1 : 0);
