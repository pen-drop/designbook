const fs = require('fs');
const path = require('path');

function findConfig() {
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
        const configPath = path.join(currentDir, 'designbook.config.yml');
        if (fs.existsSync(configPath)) {
            return configPath;
        }
        const configPathYaml = path.join(currentDir, 'designbook.config.yaml');
        if (fs.existsSync(configPathYaml)) {
            return configPathYaml;
        }
        currentDir = path.dirname(currentDir);
    }
    return null;
}

function parseYaml(content) {
    // Simple YAML parser for flat key-value pairs
    // This avoids dependency on js-yaml for this bootstrap script
    const config = {};
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > -1) {
            const key = trimmed.slice(0, colonIndex).trim();
            let value = trimmed.slice(colonIndex + 1).trim();

            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            config[key] = value;
        }
    }
    return config;
}

function loadConfig() {
    const configPath = findConfig();
    const defaults = {
        dist: 'designbook',
        tmp: 'tmp',
        technology: 'html'
    };

    if (!configPath) {
        console.error('No designbook.config.yml found. Using defaults.');
        return defaults;
    }

    try {
        const content = fs.readFileSync(configPath, 'utf8');
        const parsed = parseYaml(content);
        return { ...defaults, ...parsed };
    } catch (error) {
        console.error('Error parsing designbook.config.yml:', error);
        return defaults;
    }
}

if (require.main === module) {
    const config = loadConfig();
    console.log(JSON.stringify(config));
}

module.exports = { loadConfig };
