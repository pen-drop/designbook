import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../../../packages/integrations/test-integration-drupal/package.json',import.meta.url));
const { chromium }=require('playwright');
const root=new URL('./',import.meta.url);
const server=createServer(async(req,res)=>{try{const u=new URL('.'+new URL(req.url,'http://localhost').pathname,root);if(!u.href.startsWith(root.href)){res.writeHead(403).end();return}res.setHeader('Content-Type',u.pathname.endsWith('.html')?'text/html':u.pathname.endsWith('.json')?'application/json':'image/png');res.end(await readFile(u));}catch{res.writeHead(404).end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/film.html`);
await page.evaluate(async()=>{await window.ready;await Promise.all([...document.images].filter(i=>i.getAttribute('src')).map(i=>i.decode()))});
assert.deepEqual(errors,[]);assert.equal(await page.locator('.pair-row').count(),9,'Nine real sidebar targets must be present');
const pairs=JSON.parse(await readFile(new URL('pairs.json',root),'utf8'));
for(const pair of pairs){
 assert.ok(pair.box.width>0&&pair.box.height>0,pair.id+' must target a real visible region');
 await page.evaluate(t=>window.setTime(t),pair.at-.01);
 assert.equal(await page.locator(`.pair-row[data-id="${pair.id}"]`).evaluate(e=>getComputedStyle(e).opacity),'0',pair.id+' must not appear early');
 await page.evaluate(t=>window.setTime(t),pair.at+.2);
 for(const selector of ['.pair-row','.target']){
  const el=page.locator(`${selector}[data-id="${pair.id}"]`);
  assert.equal(await el.evaluate(e=>getComputedStyle(e).opacity),'1',pair.id+' must reveal both sides together');
  const box=await el.boundingBox();
  assert.ok(box.x>=0&&box.y>=90&&box.x+box.width<=1280&&box.y+box.height<=720,`${pair.id} ${selector} outside visible frame: ${JSON.stringify(box)}`);
 }
}
await page.evaluate(()=>window.setTime(4.1));
assert.equal(await page.locator('.pair-row').evaluateAll(es=>es.filter(e=>getComputedStyle(e).opacity!=='0').length),0,'Initial sidebar contains only the three main entries');
await page.evaluate(()=>window.setTime(19));const held=await page.screenshot();await page.evaluate(()=>window.setTime(19.9));assert.deepEqual(await page.screenshot(),held,'Final second must remain static');
const ffmpeg=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',fileURLToPath(new URL('intro.mp4',root))],{stdio:['pipe','inherit','inherit']});
const finished=once(ffmpeg,'close');
await mkdir(new URL('frames/',root),{recursive:true});
for(let frame=0;frame<600;frame++){
await page.evaluate(t=>window.setTime(t),frame/30);const png=await page.screenshot();
if(!ffmpeg.stdin.write(png))await once(ffmpeg.stdin,'drain');
if(frame%90===0)console.log('Rendered',frame/30,'seconds');
}
ffmpeg.stdin.end();assert.equal((await finished)[0],0,'Encoding failed');
for(const t of [0,2.8,4.6,6.5,8.2,9.5,10.3,11.2,12.9,14.3,15.8,17.3,19]){await page.evaluate(t=>window.setTime(t),t);await page.screenshot({path:fileURLToPath(new URL(`frames/${t}.png`,root))})}
await page.evaluate(()=>window.setTime(19));await page.screenshot({path:fileURLToPath(new URL('poster.png',root))});
assert.deepEqual(errors,[]);console.log('Rendered 600 frames; 20 seconds; 1280 × 720; silent.');
}finally{await browser.close();server.close()}
