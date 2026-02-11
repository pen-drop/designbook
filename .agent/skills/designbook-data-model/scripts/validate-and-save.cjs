const fs = require('fs');
const path = require('path');

const SCHEMA_FILE = path.resolve(process.cwd(), 'schema/data-model.json');
const dist = process.env.DESIGNBOOK_DIST || 'designbook';
const TARGET_FILE = path.resolve(process.cwd(), dist, 'data-model.json');

// Helper to load schema
function loadSchema() {
    if (!fs.existsSync(SCHEMA_FILE)) {
        console.error(`Error: Schema file not found at ${SCHEMA_FILE}`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
}

// Basic Validation against Schema
// If available, we could use 'ajv', but for now we do manual checks to avoid deps
function validateDataModel(data, schema) {
    if (typeof data !== 'object' || data === null) {
        console.error("Error: Data model must be a JSON object.");
        return false;
    }

    // Check required fields from schema
    if (schema.required) {
        for (const req of schema.required) {
            if (!(req in data)) {
                console.error(`Error: Missing required field '${req}'.`);
                return false;
            }
        }
    }

    // specific content validation
    if (data.content && typeof data.content !== 'object') {
        console.error("Error: 'content' must be an object.");
        return false;
    }

    // Shallow check of content structure (entity_type -> bundle -> field)
    // We won't go too deep without a proper library, but we can sanity check
    for (const [entityType, entityDef] of Object.entries(data.content || {})) {
        if (typeof entityDef !== 'object') {
            console.error(`Error: Entity type '${entityType}' is not an object.`);
            return false;
        }
        for (const [bundle, bundleDef] of Object.entries(entityDef)) {
            if (typeof bundleDef !== 'object') {
                console.error(`Error: Bundle '${bundle}' in '${entityType}' is not an object.`);
                return false;
            }
            if (bundleDef.fields && typeof bundleDef.fields !== 'object') {
                console.error(`Error: Fields for '${entityType}.${bundle}' must be an object.`);
                return false;
            }
        }
    }

    return true;
}

try {
    const input = process.argv[2];
    if (!input) {
        console.error("Error: No input provided.");
        process.exit(1);
    }

    let content = input;
    // Check if input is a file path
    if (fs.existsSync(input)) {
        content = fs.readFileSync(input, 'utf8');
    }

    let json;
    try {
        json = JSON.parse(content);
    } catch (e) {
        // If it starts with { it might be malformed JSON string, otherwise implies file not found/invalid path
        if (input.trim().startsWith('{')) {
            console.error("Error: Invalid JSON string.");
        } else {
            console.error("Error: Input file not found or invalid JSON.");
        }
        process.exit(1);
    }

    const schema = loadSchema();

    if (!validateDataModel(json, schema)) {
        console.error("Validation failed.");
        process.exit(1);
    }

    // Ensure directory exists
    const dir = path.dirname(TARGET_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(TARGET_FILE, JSON.stringify(json, null, 2));
    console.log(`Successfully saved data model to ${TARGET_FILE}`);

} catch (err) {
    console.error("Error processing data model:", err.message);
    process.exit(1);
}
