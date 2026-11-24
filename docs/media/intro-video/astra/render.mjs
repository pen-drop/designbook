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
await page.evaluate(async()=>{await window.ready;await Promise.all([...document.images].map(i=>i.decode()))});
assert.deepEqual(errors,[]);assert.equal(await page.locator('.screen').count(),4);
await page.evaluate(()=>window.setTime(14));const held=await page.screenshot();await page.evaluate(()=>window.setTime(14.9));assert.deepEqual(await page.screenshot(),held,'Final second must remain static');
const ffmpeg=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',fileURLToPath(new URL('intro.mp4',root))],{stdio:['pipe','inherit','inherit']});
const finished=once(ffmpeg,'close');
await mkdir(new URL('frames/',root),{recursive:true});
for(let frame=0;frame<450;frame++){
await page.evaluate(t=>window.setTime(t),frame/30);const png=await page.screenshot();
if(!ffmpeg.stdin.write(png))await once(ffmpeg.stdin,'drain');
if(frame%90===0)console.log('Rendered',frame/30,'seconds');
}
ffmpeg.stdin.end();assert.equal((await finished)[0],0,'Encoding failed');
for(const t of [0,4,7,10,13,14.5]){await page.evaluate(t=>window.setTime(t),t);await page.screenshot({path:fileURLToPath(new URL(`frames/${t}.png`,root))})}
await page.evaluate(()=>window.setTime(4.8));await page.screenshot({path:fileURLToPath(new URL('poster.png',root))});
assert.deepEqual(errors,[]);console.log('Rendered 450 frames; 15 seconds; 1280 × 720; silent.');
}finally{await browser.close();server.close()}
