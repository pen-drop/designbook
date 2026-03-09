import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: '/Users/michael/.cache/puppeteer/chrome/mac-145.0.7632.77/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('Navigating to page...');
  await page.goto('http://localhost:6012/?path=/docs/designbook-sections-startseite--docs', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Wait for content to load
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

  while (scrollPosition < bodyHeight - viewportHeight) {
    scrollPosition += viewportHeight;
    await page.evaluate((y) => window.scrollTo(0, y), scrollPosition);
    await page.waitForTimeout(500);
    
    console.log(`Taking screenshot ${screenshotNum} (scroll position: ${scrollPosition}px)...`);
    await page.screenshot({ path: `screenshot-${screenshotNum}-scroll.png`, fullPage: false });
    screenshotNum++;
  }

  // Take full page screenshot
  console.log('Taking full page screenshot...');
  await page.screenshot({ path: 'screenshot-full-page.png', fullPage: true });

  await browser.close();
  console.log('Done! Screenshots saved.');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
