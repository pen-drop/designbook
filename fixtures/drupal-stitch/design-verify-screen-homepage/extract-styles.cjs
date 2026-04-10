#!/usr/bin/env node
/**
 * Style extraction script for design-verify compare-markup phase.
 * Uses Playwright to extract computed CSS styles from reference HTML and Storybook.
 * Supports separate selectors per source since DOM structures differ.
 *
 * Usage: node extract-styles.cjs <breakpoint> <width>
 *   e.g. node extract-styles.cjs sm 640
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REFERENCE_URL = 'file:///tmp/reference-designbook-homepage-scenes--landing.html';
const STORYBOOK_URL = 'http://localhost:37075/iframe.html?id=designbook-homepage-scenes--landing&viewMode=story';
const STORY_DIR = 'designbook/stories/designbook-homepage-scenes--landing';
const EXTRACTIONS_DIR = path.join(STORY_DIR, 'extractions');

/**
 * Extract computed styles for all selectors from a page.
 * @param {import('playwright').Page} page
 * @param {Object} selectors - spec selectors object
 * @param {'reference_selector'|'storybook_selector'} selectorKey - which selector field to use
 */
async function extractStyles(page, selectors, selectorKey) {
  const results = {};

  for (const [key, config] of Object.entries(selectors)) {
    const selectorValue = config[selectorKey];
    if (!selectorValue || selectorValue === 'none') {
      results[key] = {
        label: config.label,
        category: config.category,
        file_hint: config.file_hint,
        selector: selectorValue || 'none',
        styles: null,
      };
      continue;
    }

    const selectorParts = selectorValue.split(',').map(s => s.trim());

    let extracted = null;
    for (const sel of selectorParts) {
      try {
        const el = await page.$(sel);
        if (el) {
          extracted = await page.evaluate(
            ({ element, props }) => {
              const cs = window.getComputedStyle(element);
              const result = {};
              for (const prop of props) {
                result[prop] = cs.getPropertyValue(
                  prop.replace(/([A-Z])/g, '-$1').toLowerCase()
                );
              }
              return result;
            },
            { element: el, props: config.properties }
          );
          break;
        }
      } catch {
        // selector parse error, try next
      }
    }

    results[key] = {
      label: config.label,
      category: config.category,
      file_hint: config.file_hint,
      selector: selectorValue,
      styles: extracted,
    };
  }

  return results;
}

async function main() {
  const bp = process.argv[2];
  const width = parseInt(process.argv[3], 10);

  if (!bp || !width) {
    console.error('Usage: node extract-styles.cjs <breakpoint> <width>');
    process.exit(1);
  }

  console.log(`\n=== Extracting styles for breakpoint: ${bp} (${width}px) ===\n`);

  // Load spec
  const specPath = path.join(EXTRACTIONS_DIR, `${bp}--spec.yml`);
  const spec = yaml.load(fs.readFileSync(specPath, 'utf8'));
  const selectors = spec.selectors;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height: 900 },
  });
  const page = await context.newPage();

  // --- Reference extraction ---
  console.log('Loading reference HTML...');
  await page.goto(REFERENCE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  // Wait for Tailwind CDN to process styles
  await page.waitForTimeout(3000);
  console.log('Extracting reference styles...');
  const referenceData = await extractStyles(page, selectors, 'reference_selector');

  const refPath = path.join(EXTRACTIONS_DIR, `${bp}--reference.json`);
  fs.writeFileSync(refPath, JSON.stringify(referenceData, null, 2));
  console.log(`  Written: ${refPath}`);

  // Log null selectors
  for (const [key, data] of Object.entries(referenceData)) {
    if (!data.styles) console.log(`  WARNING: No match for reference "${key}" (${data.selector})`);
  }

  // --- Storybook extraction ---
  console.log('Loading Storybook...');
  await page.goto(STORYBOOK_URL, { waitUntil: 'networkidle', timeout: 30000 });
  // Extra wait for Storybook rendering/hydration
  await page.waitForTimeout(5000);
  console.log('Extracting Storybook styles...');
  const storybookData = await extractStyles(page, selectors, 'storybook_selector');

  const sbPath = path.join(EXTRACTIONS_DIR, `${bp}--storybook.json`);
  fs.writeFileSync(sbPath, JSON.stringify(storybookData, null, 2));
  console.log(`  Written: ${sbPath}`);

  // Log null selectors
  for (const [key, data] of Object.entries(storybookData)) {
    if (!data.styles) console.log(`  WARNING: No match for storybook "${key}" (${data.selector})`);
  }

  await browser.close();
  console.log(`\n=== Done: ${bp} ===\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
