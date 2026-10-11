import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../../../../packages/integrations/test-integration-drupal/package.json', import.meta.url));
const { chromium } = require('playwright');
const root = new URL('./', import.meta.url);
const repo = new URL('../../../../', import.meta.url);
const base = process.env.STORYBOOK_URL || 'http://localhost:34211';
await mkdir(new URL('screenshots/', root), {recursive:true});
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  for (const [name,id] of [
    ['shell','designbook-design-system-scenes--shell'],
    ['screen','designbook-sections-recipes-scenes--recipe-detail'],
  ]) {
    await page.goto(`${base}/?path=/story/${id}`);
    const frame = page.frameLocator('#storybook-preview-iframe');
    await frame.locator('#storybook-root').waitFor();
    await page.waitForTimeout(1500);
    const hide = page.getByRole('button',{name:'Hide addon panel',exact:true});
    if (await hide.count()) await hide.last().click();
    const dismiss = page.getByRole('button',{name:'Dismiss notification',exact:true});
    if (await dismiss.count()) await dismiss.first().click();
    await frame.locator('img').first().waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({path:new URL(`screenshots/${name}.png`,root).pathname});
  }
  for (const [name,id] of [
    ['vision','designbook-foundation--foundation'],
    ['model','designbook-foundation--foundation'],
    ['tokens','designbook-design-system--design-system'],
  ]) {
    await page.goto(`${base}/?path=/story/${id}`);
    await page.waitForTimeout(1500);
    const hide = page.getByRole('button',{name:'Hide addon panel',exact:true});
    if (await hide.count()) await hide.last().click();
    const frame = page.frameLocator('#storybook-preview-iframe');
    if (name === 'model') {
      await frame.getByText('Data Model',{exact:true}).first().click();
      await frame.getByRole('button',{name:'Graph',exact:true}).click();
    }
    await page.waitForTimeout(700);
    await page.screenshot({path:new URL(`screenshots/${name}.png`,root).pathname});
  }
  await copyFile(new URL('fixtures/drupal-recipe/reference/designbook/references/60fbf0acb79bd59d/266781d6753e3a35/desktop--recipe--rest.png',repo), new URL('screenshots/reference.png',root));
  const excerpts = [];
  for (const [name,report] of [
    ['vision','02-vision-main-InIsMF'],
    ['model','03-data-model-main-1QKU0Y'],
    ['tokens','04-tokens-main-msMQqS'],
  ]) {
    const source = `promptfoo/reports/${report}/MODEL-OUTPUT.md`;
    const text = (await readFile(new URL(source,repo),'utf8')).split('\n\n')[0];
    assert.ok(text.length > 50);
    excerpts.push({name,source,text});
  }
  await writeFile(new URL('excerpts.json',root), JSON.stringify(excerpts,null,2)+'\n');
} finally { await browser.close(); }
