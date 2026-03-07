const fs = require('fs');
const path = require('path');

let yaml;
try {
    yaml = require('js-yaml');
} catch (_e) {
    yaml = require('yaml');
}

const dist = process.env.DESIGNBOOK_DIST || 'designbook';
const TARGET_FILE = path.resolve(process.cwd(), dist, 'design-system', 'design-tokens.yml');

// Basic W3C Validation
function validateW3C(tokens) {
    if (typeof tokens !== 'object' || tokens === null) return false;
    // Must have at least one top-level group (color, typography, spacing, etc.)
    const keys = Object.keys(tokens);
    return keys.length > 0;
}

// Parse content as YAML or JSON based on file extension or content
function parseContent(content, filePath) {
    if (filePath && (filePath.endsWith('.yml') || filePath.endsWith('.yaml'))) {
        return yaml.load ? yaml.load(content) : yaml.parse(content);
    }
    // Try JSON first, then YAML
    try {
        return JSON.parse(content);
    } catch (_e) {
        return yaml.load ? yaml.load(content) : yaml.parse(content);
    }
}

try {
    let content;
    let filePath;
    const arg1 = process.argv[2];
    const arg2 = process.argv[3];

    if (arg1 && arg1.startsWith('{')) {
        content = arg1; // Direct JSON string
    } else if (arg2 && fs.existsSync(arg2)) {
        filePath = arg2;
        content = fs.readFileSync(arg2, 'utf8');
    } else if (arg1 && fs.existsSync(arg1)) {
        filePath = arg1;
        content = fs.readFileSync(arg1, 'utf8');
    } else {
        console.error("Error: No valid input provided. Pass a YAML/JSON file path or inline JSON string.");
        process.exit(1);
    }

    const tokens = parseContent(content, filePath);

    if (!validateW3C(tokens)) {
        console.error("Error: Invalid W3C Token Format.");
        process.exit(1);
    }

    // Ensure directory exists
    const dir = path.dirname(TARGET_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write as YAML
    const yamlContent = yaml.dump ? yaml.dump(tokens, { indent: 2, lineWidth: -1 }) : yaml.stringify(tokens);
    fs.writeFileSync(TARGET_FILE, yamlContent);
    console.log(`✅ Successfully saved tokens to ${TARGET_FILE}`);

} catch (err) {
    console.error("Error processing tokens:", err.message);
    process.exit(1);
}
