import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../../../../packages/integrations/test-integration-drupal/package.json', import.meta.url));
const { chromium } = require('playwright');
const root = new URL('./', import.meta.url);
const base = process.env.STORYBOOK_URL || 'http://localhost:34211';
const browser = await chromium.launch();
await mkdir(new URL('screenshots/rows/',root),{recursive:true});
try {
 const page = await browser.newPage({viewport:{width:1140,height:860}});
 await page.goto(`${base}/iframe.html?id=designbook-sections-recipes-scenes--recipe-detail&viewMode=story`);
 await page.getByRole('heading',{name:'Lemon Garlic Roasted Chicken',exact:true}).waitFor();
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
 const boxes = await page.evaluate(()=>{
  const walker=document.createTreeWalker(document.getElementById('storybook-root'),NodeFilter.SHOW_COMMENT),result={};
  while(walker.nextNode()){
   const n=walker.currentNode;if(!n.textContent.startsWith('db:s:'))continue;
   const e=n.nextElementSibling;if(!e)continue;const r=e.getBoundingClientRect();
   result[n.textContent.slice(5)]={x:r.x,y:r.y,width:r.width,height:r.height};
  }
  const r=document.querySelector('#storybook-root h1').getBoundingClientRect();
  result.hero={x:r.x,y:r.y,width:r.width,height:r.height};return result;
 });
 await page.screenshot({path:new URL('screenshots/recipe-full.png',root).pathname,fullPage:true});
 const pairs=[
  {id:'recipe',kind:'entity',name:'Recipe',locator:'hero',at:10.1,mapping:'node.recipe.full.jsonata'},
  {id:'ingredient',kind:'entity',name:'Ingredient',locator:'test_integration_drupal:quantity-item@0.content.ingredients.0',at:10.95,mapping:'paragraph.ingredient.default.jsonata'},
  {id:'step',kind:'entity',name:'Recipe Step',locator:'test_integration_drupal:step-block@0.content.steps.0',at:11.8,mapping:'paragraph.recipe_step.default.jsonata'},
  {id:'author',kind:'entity',name:'Author',locator:'test_integration_drupal:profile-card@0.content.author',at:12.65,mapping:'taxonomy_term.author.default.jsonata'},
  {id:'header',kind:'component',name:'Header',locator:'test_integration_drupal:header@0.header',at:14.05},
  {id:'detail',kind:'component',name:'Detail page',locator:'hero',at:14.8},
  {id:'quantity',kind:'component',name:'Quantity item',locator:'test_integration_drupal:quantity-item@0.content.ingredients.0',at:15.55},
  {id:'step-block',kind:'component',name:'Step block',locator:'test_integration_drupal:step-block@0.content.steps.0',at:16.3},
  {id:'profile',kind:'component',name:'Profile card',locator:'test_integration_drupal:profile-card@0.content.author',at:17.05},
 ];
 for(const pair of pairs){assert.ok(boxes[pair.locator],pair.locator);pair.box=boxes[pair.locator];assert.ok(pair.box.width>0&&pair.box.height>0,pair.id);}
 await page.setViewportSize({width:1440,height:900});
 await page.goto(`${base}/?path=/story/designbook-sections-recipes-scenes--recipe-detail`);
 await page.waitForTimeout(1200);
 const hide=page.getByRole('button',{name:'Hide addon panel',exact:true});if(await hide.count())await hide.last().click();
 const dismiss=page.getByRole('button',{name:'Dismiss notification',exact:true});if(await dismiss.count())await dismiss.first().click();
 await page.screenshot({path:new URL('screenshots/chrome.png',root).pathname});
 for(const name of ['node','paragraph','taxonomy_term','Data Display','Layout','Shell']){
  await page.getByRole('button',{name,exact:true}).first().click();
 }
 for(const pair of pairs){
  const row=page.getByRole('button',{name:pair.name,exact:true}).first();
  await row.screenshot({path:new URL(`screenshots/rows/${pair.id}.png`,root).pathname});
 }
 for(const [id,name] of [['foundation','Foundation'],['design-system','Design System'],['sections','Sections'],['scene','Recipe Detail']]){
  const row=page.getByRole(id==='foundation'||id==='scene'?'link':'button',{name,exact:true}).first();
  await row.screenshot({path:new URL(`screenshots/rows/${id}.png`,root).pathname});
 }
 await writeFile(new URL('pairs.json',root),JSON.stringify(pairs,null,2)+'\n');
 console.log('Captured full recipe, real Storybook chrome and 13 sidebar rows; measured 9 entity/component targets.');
} finally {await browser.close();}
