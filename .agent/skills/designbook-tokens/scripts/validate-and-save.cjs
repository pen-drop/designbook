const fs = require('fs');
const path = require('path');

const dist = process.env.DESIGNBOOK_DIST || 'designbook';
const TARGET_FILE = path.resolve(process.cwd(), dist, 'design-tokens.json');

// Basic W3C Validation (Extend later with schema)
function validateW3C(tokens) {
    if (typeof tokens !== 'object' || tokens === null) return false;
    // Deep check could be implemented here. For now, we check it's valid JSON.
    // We can check for standard top-level keys if needed, but W3C is flexible.
    return true;
}

try {
    let content;
    const arg1 = process.argv[2];
    const arg2 = process.argv[3];

    if (arg1 && arg1.startsWith('{')) {
        content = arg1; // Direct JSON string
    } else if (arg2 && fs.existsSync(arg2)) {
        content = fs.readFileSync(arg2, 'utf8');
    } else if (arg1 && fs.existsSync(arg1)) {
        content = fs.readFileSync(arg1, 'utf8');
    } else {
        console.error("Error: No valid JSON input provided via --tokens-json or file path.");
        process.exit(1);
    }

    const json = JSON.parse(content);

    if (!validateW3C(json)) {
        console.error("Error: Invalid W3C Token Format.");
        process.exit(1);
    }

    // Ensure directory exists
    const dir = path.dirname(TARGET_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(TARGET_FILE, JSON.stringify(json, null, 2));
    console.log(`Successfully saved tokens to ${TARGET_FILE}`);

} catch (err) {
    console.error("Error processing tokens:", err.message);
    process.exit(1);
}
