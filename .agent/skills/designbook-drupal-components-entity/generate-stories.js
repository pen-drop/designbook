import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const fs = require('fs');
const yaml = require('js-yaml');
const glob = require('glob');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const projectRoot = process.cwd();
const configFile = path.join(projectRoot, 'designbook.config.yml');

function loadConfig() {
    try {
        const configContent = fs.readFileSync(configFile, 'utf8');
        return yaml.load(configContent);
    } catch (e) {
        console.error("Error loading config:", e);
        return {};
    }
}

const config = loadConfig();
const DIST = config.dist || 'packages/integrations/test-integration-drupal/designbook';
const sectionsDir = path.join(projectRoot, DIST, 'sections');
const componentsDir = path.join(projectRoot, DIST, 'components');

console.log(`Scanning sections in: ${sectionsDir}`);

// Helper: Get value from data object using dot notation path
function getValue(data, pathStr) {
    if (!pathStr) return null;
    const parts = pathStr.split('.');
    let current = data;
    for (const part of parts) {
        if (current === null || current === undefined) return null;
        current = current[part];
    }
    return current;
}

// Helper: Recursively traverse and replace refs with actual values
function resolveRefsInlining(node, context, data) {
    if (Array.isArray(node)) {
        return node.map(item => resolveRefsInlining(item, context, data));
    } else if (typeof node === 'object' && node !== null) {
        // Check for Ref
        if (node.type === 'ref') {
            let valuePath = '';

            if (node.path) {
                // Already explicit path: 'node.article.0.title'
                valuePath = node.path;
            } else if (node.field) {
                // Contextual field: 'title' -> 'node.article.0.title'
                valuePath = `${context.type}.${context.bundle}.${context.index}.${node.field}`;
            }

            if (valuePath) {
                const resolvedValue = getValue(data, valuePath);
                // console.log(`Resolving ${valuePath} -> ${resolvedValue}`);
                return resolvedValue;
            }
        }

        // Recursive for other objects
        const newObj = {};
        for (const [key, value] of Object.entries(node)) {
            newObj[key] = resolveRefsInlining(value, context, data);
        }
        return newObj;
    }
    return node;
}

// 1. Find all data.json files
const dataFiles = glob.sync(path.join(sectionsDir, '*', 'data.json'));

dataFiles.forEach(dataFile => {
    const sectionDir = path.dirname(dataFile);
    const sectionId = path.basename(sectionDir);

    console.log(`Processing Section: ${sectionId}`);

    let data;
    try {
        const dataContent = fs.readFileSync(dataFile, 'utf8');
        data = JSON.parse(dataContent);
    } catch (e) {
        console.error(`Invalid JSON in ${dataFile}`);
        return;
    }

    // Iterate: type -> bundle -> records
    Object.keys(data).forEach(type => {
        const bundles = data[type];
        if (typeof bundles !== 'object') return;

        Object.keys(bundles).forEach(bundle => {
            const records = bundles[bundle];
            if (!Array.isArray(records)) return;

            const componentName = `entity-${type}-${bundle}`;
            const componentPath = path.join(componentsDir, componentName);

            if (!fs.existsSync(componentPath)) {
                return;
            }

            // Find templates
            const files = fs.readdirSync(componentPath);

            files.forEach(file => {
                const prefix = `${componentName}.`;
                const suffix = `.story.yml`;

                if (!file.startsWith(prefix) || !file.endsWith(suffix)) return;
                if (file.includes('.content-')) return; // Skip generated content stories (old)
                if (file.includes('.content_')) return; // Skip generated content stories (new)
                if (file.includes('.section-')) return; // Skip generated legacy stories

                const viewmode = file.substring(prefix.length, file.length - suffix.length);
                if (!viewmode) return;

                console.log(`    Found template: ${viewmode} in ${componentName}`);

                // Load template content
                let templateContent;
                try {
                    templateContent = yaml.load(fs.readFileSync(path.join(componentPath, file), 'utf8'));
                } catch (e) {
                    console.error(`Error reading template ${file}:`, e);
                    return;
                }

                // Generate stories for each record
                records.forEach((record, index) => {
                    // Naming: entity-[type]-[bundle].content_[section]_[viewmode]_[index]
                    const storyBaseName = `content_${sectionId}_${viewmode}_${index}`;
                    const storyInternalName = storyBaseName; // Already snake_case
                    const simpleFilename = `${componentName}.${storyBaseName}.story.yml`;
                    const outputFile = path.join(componentPath, simpleFilename);

                    // 1. Clone template
                    // 2. Resolve refs (Inline)
                    const context = { type, bundle, index }; // index is number
                    const resolvedStory = resolveRefsInlining(templateContent, context, data);

                    // 3. Set Name and Remove Metadata
                    resolvedStory.name = storyInternalName;
                    if (resolvedStory.designbook && resolvedStory.designbook.entity) {
                        delete resolvedStory.designbook.entity;
                        if (Object.keys(resolvedStory.designbook).length === 0) {
                            delete resolvedStory.designbook;
                        }
                    }

                    const yamlStr = yaml.dump(resolvedStory, { noRefs: true });
                    fs.writeFileSync(outputFile, yamlStr);
                    console.log(`      Generated: ${simpleFilename}`);
                });
            });
        });
    });
});
console.log("Done generating entity stories.");
