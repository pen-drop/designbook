
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sectionFilePath = resolve(__dirname, 'packages/integrations/test-integration-drupal/designbook/sections/growth-projections.section.yml');
const templatePath = resolve(__dirname, 'packages/storybook-addon-designbook/dist/onboarding/section.story.tpl');

try {
    console.log('--- Reading Section File ---');
    console.log('Path:', sectionFilePath);
    const content = readFileSync(sectionFilePath, 'utf-8');
    const section = parseYaml(content);
    console.log('Parsed Section:', section);

    const sectionId = section.id;
    const title = section.title || 'Untitled';

    console.log('--- Reading Template ---');
    console.log('Path:', templatePath);
    let template = readFileSync(templatePath, 'utf-8');
    console.log('Template Content (First 100 chars):', template.substring(0, 100));

    console.log('--- Transforming ---');
    template = template.replace(/__SECTION_ID__/g, sectionId.replace(/'/g, "\\'"));
    template = template.replace(/__SECTION_TITLE__/g, title.replace(/'/g, "\\'"));

    const exportName = sectionId
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

    console.log('Calculated Export Name:', exportName);

    template = template.replace(/__EXPORT_NAME__/g, exportName);

    console.log('--- Resulting Code ---');
    console.log(template);

} catch (err) {
    console.error('Error:', err);
}
