import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'

// Captures real Storybook views for the film:
// STORYBOOK_URL — reference-stage drupal-recipe workspace (empty states, imported reference);
// FINAL_STORYBOOK_URL — finished-screen workspace (sidebar tree rows in their real order).
const require = createRequire(
  new URL('../../../packages/integrations/test-integration-drupal/package.json', import.meta.url),
)
const { chromium } = require('playwright')
const base = process.env.STORYBOOK_URL
const final = process.env.FINAL_STORYBOOK_URL
if (!base || !final) throw new Error('Set STORYBOOK_URL (reference stage) and FINAL_STORYBOOK_URL (finished screen)')
const out = new URL('./screenshots/', import.meta.url)
await mkdir(new URL('tree/', out), { recursive: true })

// Sidebar rows of the finished screen: every mapped entry with its section header and group.
const TREE = [
  'designbook', 'designbook-foundation--foundation', 'designbook-design-system', 'designbook-sections', 'designbook-references',
  'entities', 'entities-node', 'entities-node-recipe', 'entities-paragraph', 'entities-paragraph-ingredient',
  'entities-paragraph-recipe-step', 'entities-taxonomy-term', 'entities-taxonomy-term-author',
  'test-integration-drupal', 'test-integration-drupal-data-display', 'test-integration-drupal-data-display-profile-card',
  'test-integration-drupal-data-display-quantity-item', 'test-integration-drupal-data-display-step-block',
  'test-integration-drupal-layout', 'test-integration-drupal-layout-detail-page', 'test-integration-drupal-shell',
  'test-integration-drupal-shell-header',
]
const hideChrome = async (page) => {
  const hide = page.getByRole('button', { name: 'Hide addon panel', exact: true })
  if (await hide.count()) await hide.last().click()
  const dismiss = page.getByRole('button', { name: 'Dismiss notification', exact: true })
  if (await dismiss.count()) await dismiss.first().click()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(500)
}

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
    await hideChrome(page)
    await page.screenshot({ path: fileURLToPath(new URL(`${file}.png`, out)) })
  }

  const index = await (await fetch(`${base}/index.json`)).json()
  const id = Object.keys(index.entries).find((s) => s.startsWith('designbook-references-') && s.endsWith('--recipe-desktop-rest'))
  if (!id) throw new Error('No imported recipe reference in the reference-stage Storybook')
  await page.goto(`${base}/?path=/story/${id}`)
  await page.frameLocator('#storybook-preview-iframe').getByText('recipe · desktop · rest').first().waitFor()
  await page.locator(`[data-item-id="${id}"]`).waitFor()
  await hideChrome(page)
  await page.screenshot({ path: fileURLToPath(new URL('reference-page.png', out)) })

  const tree = await browser.newPage({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 2 })
  await tree.goto(`${final}/?path=/story/test-integration-drupal-shell-footer--default`)
  await tree.locator('[data-item-id="test-integration-drupal-shell"]').waitFor()
  // A group is expanded when its first captured child row is rendered.
  for (const [group, child] of [['entities-node', 'entities-node-recipe'], ['entities-paragraph', 'entities-paragraph-ingredient'],
    ['entities-taxonomy-term', 'entities-taxonomy-term-author'], ['test-integration-drupal-data-display', 'test-integration-drupal-data-display-profile-card'],
    ['test-integration-drupal-layout', 'test-integration-drupal-layout-detail-page'], ['test-integration-drupal-shell', 'test-integration-drupal-shell-header']]) {
    if (!(await tree.locator(`[data-item-id="${child}"]`).count())) await tree.locator(`[data-item-id="${group}"]`).click()
    await tree.locator(`[data-item-id="${child}"]`).waitFor()
  }
  // The selected story's collapsed ancestors are highlighted, so a story whose row is not captured is selected.
  if (await tree.locator('[data-item-id="designbook-sections--sections"]').count()) await tree.locator('[data-item-id="designbook-sections"]').click()
  await hideChrome(tree)
  // Expanding a group leaves Storybook's transient keyboard highlight on it; show unselected rows at rest.
  await tree.addStyleTag({ content: '.sidebar-item[data-selected="false"]{background:transparent!important}' })
  const order = await tree.evaluate(() => [...document.querySelectorAll('#storybook-explorer-tree [data-item-id]')].map((e) => e.dataset.itemId))
  const rows = []
  for (const id of TREE) {
    const row = tree.locator(`[data-item-id="${id}"]`)
    if (!(await row.count())) throw new Error(`Sidebar row ${id} missing in the finished workspace`)
    await row.screenshot({ path: fileURLToPath(new URL(`tree/${id}.png`, out)) })
    rows.push({ id, kind: await row.getAttribute('data-nodetype'), order: order.indexOf(id) })
  }
  rows.sort((a, b) => a.order - b.order)
  await writeFile(new URL('tree.json', out), JSON.stringify(rows.map(({ id, kind }) => ({ id, kind })), null, 2) + '\n')
  console.log(`Captured ${views.length} real empty states, the imported reference and ${rows.length} sidebar rows`)
} finally {
  await browser.close()
}
