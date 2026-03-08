import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:6009/iframe.html?id=designbook-data-model--docs&viewMode=docs');
  await page.waitForTimeout(3000); 
  
  const html = await page.content();
  console.log("HTML has 'field_body'?", html.includes('field_body'));
  console.log("HTML has 'target_type'?", html.includes('target_type'));
  
  await browser.close();
})();
