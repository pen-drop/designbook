import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import assert from 'node:assert/strict'

const require = createRequire(
  new URL('../../../packages/integrations/test-integration-drupal/package.json', import.meta.url),
)
const { chromium } = require('playwright')
const repo = new URL('../../../', import.meta.url)
const output = fileURLToPath(new URL('docs/assets/logo/demo/', repo))
const types = { html: 'text/html', json: 'application/json', svg: 'image/svg+xml', png: 'image/png' }
// film.html fetches JSON and recipe captures, so it is served over HTTP from the repository root.
const server = createServer(async (req, res) => {
  const file = new URL('.' + decodeURIComponent(new URL(req.url, 'http://x').pathname), repo)
  if (!file.href.startsWith(repo.href)) return res.writeHead(403).end()
  try {
    res.setHeader('Content-Type', types[file.pathname.split('.').pop()] ?? 'application/octet-stream')
    res.end(await readFile(file))
  } catch {
    res.writeHead(404).end()
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 })
  page.setDefaultTimeout(3000)
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`http://127.0.0.1:${server.address().port}/website/scripts/demo/film.html`)
  await page.evaluate(async () => {
    await window.ready
    await document.fonts.ready
  })
  const setTime = (t) => page.evaluate((t) => window.setTime(t), t)
  const opacity = (selector) => page.locator(selector).evaluate((e) => getComputedStyle(e).opacity)

  const reference = await page.locator('#reference').evaluate((i) => [i.naturalWidth, i.naturalHeight])
  for (const { id, box } of JSON.parse(await readFile(new URL('website/scripts/demo/reference-regions.json', repo), 'utf8'))) {
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= reference[0] && box.y + box.height <= reference[1], id + ' outside reference')
  }
  const pairs = [
    ['header', 36.6], ['recipe', 37.7], ['detail', 38.8], ['ingredient', 39.9], ['quantity', 41.0],
    ['step', 42.1], ['step-block', 43.2], ['author', 44.3], ['profile', 45.4],
  ]
  for (const [id, at] of pairs) {
    await setTime(at - 0.01)
    for (const s of ['.pair-row', '.target']) assert.equal(await opacity(`${s}[data-id="${id}"]`), '0', id + ' early')
    await setTime(at + 0.2)
    for (const s of ['.pair-row', '.target']) {
      assert.equal(await opacity(`${s}[data-id="${id}"]`), '1', id + ' both sides together')
      const b = await page.locator(`${s}[data-id="${id}"]`).boundingBox()
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 1280 && b.y + b.height <= 720, `${id} ${s} outside frame`)
    }
  }
  for (const t of [0, 10, 33, 52]) {
    await setTime(t)
    assert.doesNotMatch(await page.evaluate(() => document.body.innerText), /Penpot|Screenshot/i)
  }
  for (const t of [48.85, 49.5, 52, 55.9]) {
    await setTime(t)
    assert.equal(await opacity('.illustration-tag'), '1', 'Illustration tag at ' + t)
  }
  for (const [t, title] of [[6, 'Explain your vision'], [16, 'Data model'], [24, 'Tokens'], [31, 'Import your screen'], [50, 'Sync to Drupal']]) {
    await setTime(t)
    assert.equal(await page.locator('.chapter-title:visible').innerText(), title)
  }
  await setTime(59)
  const held = await page.screenshot()
  await setTime(59.97)
  assert.deepEqual(await page.screenshot(), held, 'last second static')

  const ffmpeg = spawn(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-an', '-c:v', 'libx264',
      '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output + 'designbook-demo.mp4'],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  )
  const finished = once(ffmpeg, 'close')
  for (let frame = 0; frame < 1800; frame++) {
    await setTime(frame / 30)
    const png = await page.screenshot()
    if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain')
    if (frame % 300 === 0) console.log('Rendered', frame / 30, 'seconds')
  }
  ffmpeg.stdin.end()
  assert.equal((await finished)[0], 0, 'Video encoding failed')
  await setTime(46)
  await page.screenshot({ path: output + 'poster.png' })
  assert.deepEqual(errors, [])
  console.log('Rendered 1800 frames; 60 seconds; 1920 × 1080; silent.')
} finally {
  await browser.close()
  server.close()
}
