import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('Navigating to page...');
  await page.goto('http://localhost:6012/?path=/docs/designbook-sections-startseite--docs', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Wait a bit for any dynamic content
  await page.waitForTimeout(2000);

  // Take initial screenshot
  console.log('Taking screenshot 1 (top of page)...');
  await page.screenshot({ path: 'screenshot-1-top.png', fullPage: false });

  // Get page height
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`Page height: ${bodyHeight}px`);

  // Scroll and take screenshots
  const viewportHeight = 1080;
  let scrollPosition = 0;
  let screenshotNum = 2;

  while (scrollPosition < bodyHeight) {
    scrollPosition += viewportHeight;
    await page.evaluate((y) => window.scrollTo(0, y), scrollPosition);
    await page.waitForTimeout(500);
    
    console.log(`Taking screenshot ${screenshotNum} (scroll position: ${scrollPosition}px)...`);
    await page.screenshot({ path: `screenshot-${screenshotNum}-scroll.png`, fullPage: false });
    screenshotNum++;

    if (scrollPosition >= bodyHeight) break;
  }

  // Take full page screenshot
  console.log('Taking full page screenshot...');
  await page.screenshot({ path: 'screenshot-full-page.png', fullPage: true });

  await browser.close();
  console.log('Done! Screenshots saved.');
})();
