import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'

// Captures the addon's real empty states from a reference-stage drupal-recipe workspace.
const require = createRequire(
  new URL('../../../packages/integrations/test-integration-drupal/package.json', import.meta.url),
)
const { chromium } = require('playwright')
const base = process.env.STORYBOOK_URL
if (!base) throw new Error('Set STORYBOOK_URL to the reference-stage Storybook')
const out = new URL('./screenshots/', import.meta.url)
await mkdir(out, { recursive: true })

const views = [
  ['empty-vision', 'Vision', 'designbook-foundation--foundation', null, 'No vision defined yet'],
  ['empty-model', 'Data Model', 'designbook-foundation--foundation', 'Data Model', 'No data model defined yet'],
  ['empty-tokens', 'Tokens', 'designbook-design-system--design-system', null, 'No design tokens defined yet'],
]
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  for (const [file, view, story, tab, message] of views) {
    await page.goto(`${base}/?path=/story/${story}`)
    const preview = page.frameLocator('#storybook-preview-iframe')
    if (tab) await preview.getByRole('tab', { name: tab, exact: true }).click()
    const empty = preview.getByText(message, { exact: true })
    try {
      await empty.waitFor({ timeout: 15000 })
    } catch {
      throw new Error(`No real empty state for ${view}`)
    }
    const hide = page.getByRole('button', { name: 'Hide addon panel', exact: true })
    if (await hide.count()) await hide.last().click()
    const dismiss = page.getByRole('button', { name: 'Dismiss notification', exact: true })
    if (await dismiss.count()) await dismiss.first().click()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(500)
    await page.screenshot({ path: fileURLToPath(new URL(`${file}.png`, out)) })
  }
  console.log(`Captured ${views.length} real empty states`)
} finally {
  await browser.close()
}
