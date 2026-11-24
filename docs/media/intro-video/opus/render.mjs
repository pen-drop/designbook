// Renders film.html to intro.mp4 (exactly 15 s, 1920x1080, 30 fps, silent) and poster.png.
// Usage: node docs/media/intro-video/opus/render.mjs [--stills 0,4,7,10,13,14.5]
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import assert from 'node:assert/strict'

const require = createRequire(
  new URL('../../../../packages/integrations/test-integration-drupal/package.json', import.meta.url),
)
const { chromium } = require('playwright')
const here = fileURLToPath(new URL('./', import.meta.url))
const FPS = 30, SECONDS = 15, POSTER_T = 4.45
const stillsArg = process.argv.indexOf('--stills')
const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(new URL('./film.html', import.meta.url).href)
  await page.evaluate(async () => { await Promise.all([...document.images].map((i) => i.decode())) })
  // Captures must be shown whole at their native aspect ratio: no cropped or stretched source images.
  const distorted = await page.locator('img').evaluateAll((imgs) => imgs.filter((i) =>
    Math.abs(i.naturalWidth / i.naturalHeight - i.offsetWidth / i.offsetHeight) > 0.002).map((i) => i.src))
  assert.deepEqual(distorted, [], 'Screenshots must keep their aspect ratio')
  assert.deepEqual(errors, [])

  if (stills) {
    for (const t of stills) {
      await page.evaluate((x) => window.setTime(x), t)
      await page.screenshot({ path: `/tmp/opus-still-${t}.png` })
    }
    console.log('Stills written to /tmp/opus-still-<t>.png')
  } else {
    const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-frames:v', String(FPS * SECONDS), '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-r', String(FPS), '-movflags', '+faststart', here + 'intro.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] })
    const finished = once(ffmpeg, 'close')
    for (let frame = 0; frame < FPS * SECONDS; frame++) {
      await page.evaluate((t) => window.setTime(t), frame / FPS)
      const png = await page.screenshot()
      if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain')
      if (frame % (FPS * 3) === 0) console.log('Rendered', frame / FPS, 's')
    }
    ffmpeg.stdin.end()
    assert.equal((await finished)[0], 0, 'Video encoding failed')
    await page.evaluate((t) => window.setTime(t), POSTER_T)
    await page.screenshot({ path: here + 'poster.png' })
    assert.deepEqual(errors, [])
    console.log(`Rendered ${SECONDS} s at 1920x1080, ${FPS} fps`)
  }
} finally {
  await browser.close()
}
