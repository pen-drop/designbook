import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  console.log('Navigating to page...');
  await page.goto('http://localhost:6012/?path=/docs/designbook-sections-startseite--docs', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Wait for content
  await page.waitForTimeout(2000);

  console.log('Taking screenshot 1 (top)...');
  await page.screenshot({ path: 'screenshot-1-top.png' });

  console.log('Scrolling and taking more screenshots...');
  await page.evaluate(() => window.scrollBy(0, 1000));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot-2-middle.png' });

  await page.evaluate(() => window.scrollBy(0, 1000));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot-3-lower.png' });

  await page.evaluate(() => window.scrollBy(0, 1000));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot-4-bottom.png' });

  console.log('Taking full page screenshot...');
  await page.screenshot({ path: 'screenshot-full-page.png', fullPage: true });

  await browser.close();
  console.log('Done! Screenshots saved.');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
