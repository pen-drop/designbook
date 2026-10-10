import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import assert from 'node:assert/strict'

const require = createRequire(
  new URL('../../../packages/integrations/test-integration-drupal/package.json', import.meta.url),
)
const { chromium } = require('playwright')
const output = fileURLToPath(new URL('../../../docs/assets/logo/demo/', import.meta.url))
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  })
  await page.goto(new URL('./film.html', import.meta.url).href)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((i) => i.decode()))
  })
  assert.equal(await page.locator('.scene').count(), 6)
  const clipped = await page.locator('img').evaluateAll((images) =>
    images.filter((image) => {
      const box = image.getBoundingClientRect()
      return getComputedStyle(image).objectFit !== 'contain' ||
        box.left < 0 || box.right > 1280 || box.top < 0 || box.bottom > 720
    }).map((image) => image.src),
  )
  assert.deepEqual(clipped, [], 'Film screenshots must remain complete and inside the frame')

  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-framerate',
      '24',
      '-i',
      '-',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      output + 'designbook-demo.mp4',
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  )
  const finished = once(ffmpeg, 'close')
  for (let frame = 0; frame < 22 * 24; frame++) {
    await page.evaluate((t) => window.setTime(t), frame / 24)
    const png = await page.screenshot()
    if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain')
    if (frame % 96 === 0) console.log('Rendered', frame / 24, 'seconds')
  }
  ffmpeg.stdin.end()
  assert.equal((await finished)[0], 0, 'Video encoding failed')
  await page.evaluate(() => window.setTime(15))
  await page.screenshot({ path: output + 'poster.png' })
  console.log('Rendered 22 seconds at 1280 × 720, 24 fps')
} finally {
  await browser.close()
}
