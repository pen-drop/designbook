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
    // entities first, then components
    ['recipe', 40], ['ingredient', 41.3], ['step', 42.6], ['author', 43.9],
    ['header', 45.6], ['detail', 46.8], ['quantity', 48], ['step-block', 49.2], ['profile', 50.4],
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
    // The row pops up in its real tree position: below a visible parent group, in the captured order.
    const rows = await page.locator('.tree-row').evaluateAll((els) => els.map((e) => ({ id: e.dataset.treeId, top: parseFloat(e.style.top), on: getComputedStyle(e).opacity })))
    const visible = rows.filter((r) => r.on !== '0')
    assert.deepEqual(visible.map((r) => r.top), [...visible.map((r) => r.top)].sort((a, b) => a - b), id + ' tree order')
    const row = await page.locator(`.pair-row[data-id="${id}"]`).getAttribute('data-tree-id')
    const parent = rows.filter((r) => row.startsWith(r.id + '-')).sort((a, b) => b.id.length - a.id.length)[0]
    assert.ok(parent && parent.on === '1' && parent.top < rows.find((r) => r.id === row).top, id + ' below its group')
  }
  for (const t of [0, 8, 10, 16, 20, 25, 33, 37, 54]) {
    await setTime(t)
    assert.doesNotMatch(await page.evaluate(() => document.body.innerText), /Penpot|Screenshot/i)
  }
  for (const t of [51.85, 52.5, 55, 56.9]) {
    await setTime(t)
    assert.equal(await opacity('.illustration-tag'), '1', 'Illustration tag at ' + t)
  }
  for (const [t, title] of [[5, 'Explain your vision'], [13.5, 'Scan your design'], [21, 'Data model'], [29, 'Tokens'], [37, 'Design your screen'], [53, 'Sync to Drupal']]) {
    await setTime(t)
    assert.equal(await page.locator('.chapter-title:visible').innerText(), title)
  }
  // Each chapter's (empty) view is fully on screen before its chat appears.
  for (const [t, scene] of [[4.5, '#vision'], [20, '#model'], [28.5, '#tokens']]) {
    await setTime(t)
    assert.equal(await opacity(scene), '1', scene + ' view before chat')
    assert.equal(await opacity('#chat'), '0', scene + ' chat waits for the view')
  }
  // No reference before it is extracted; the vision prompt names Figma and the agent asks first.
  await setTime(12)
  assert.equal(await opacity('#reference-page'), '0')
  assert.match(await page.locator('#chat').innerText(), /Can I extract the reference\? \[Y\/n\][\s\S]*Y/)
  // The agent previews what it would build; the result only appears after the user's "Yes.".
  for (const [t, preview, result] of [[23.3, /node › recipe/, '#model-page'], [39, /components: header/, '.pair-row[data-id="recipe"]']]) {
    await setTime(t)
    assert.match(await page.locator('#chat').innerText(), preview)
    assert.equal(await opacity(result), '0', result + ' before Yes')
  }
  await setTime(31.7)
  assert.match(await page.locator('#chat').innerText(), /fonts: Montserrat/)
  assert.match(await page.locator('#tokens-full').evaluate((e) => e.style.clipPath), /^inset\(0px 0px 100%/, 'tokens before Yes')
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
  await setTime(51)
  await page.screenshot({ path: output + 'poster.png' })
  assert.deepEqual(errors, [])
  console.log('Rendered 1800 frames; 60 seconds; 1920 × 1080; silent.')
} finally {
  await browser.close()
  server.close()
}
