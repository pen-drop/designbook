import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'

// Captures real Storybook views for the film, each from a drupal-recipe workspace at the stage
// the chapter shows. Only views whose stage URL is set are captured (see README › Rebuild):
//   START_URL        empty workspace                         → empty Vision
//   VISION_URL       empty workspace + vision.yml only       → vision (no reference yet)
//   REFERENCE_URL    + reference + vision                    → imported reference, empty Data Model
//   MODEL_URL        + data model                            → data model graph, empty Tokens
//   TOKENS_URL       + tokens                                → tokens
//   FINAL_URL        finished screen                         → sidebar tree rows in their real order
const require = createRequire(
  new URL('../../../packages/integrations/test-integration-drupal/package.json', import.meta.url),
)
const { chromium } = require('playwright')
const env = process.env
const out = new URL('./screenshots/', import.meta.url)
const file = (name) => fileURLToPath(new URL(name, out))
await mkdir(new URL('tree/', out), { recursive: true })

// Sidebar rows of the finished screen: every mapped entry with its section header and group.
const TREE = [
  'designbook', 'designbook-foundation--foundation', 'designbook-design-system', 'designbook-sections', 'designbook-references',
  'entities', 'entities-node', 'entities-node-recipe', 'entities-node-recipe--full', 'entities-paragraph',
  'entities-paragraph-ingredient', 'entities-paragraph-ingredient--default', 'entities-paragraph-recipe-step',
  'entities-paragraph-recipe-step--default', 'entities-taxonomy-term', 'entities-taxonomy-term-author',
  'entities-taxonomy-term-author--default',
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

// Opens a stage view. With `reference`, the imported reference itself is opened (References expanded);
// every other view keeps the sidebar at the four Designbook entries.
async function open (page, url, { story, tab, wait, reference }) {
  if (reference) {
    const index = await (await fetch(`${url}/index.json`)).json()
    const id = Object.keys(index.entries).find((s) => s.startsWith('designbook-references-') && s.endsWith('--recipe-desktop-rest'))
    if (!id) throw new Error(`No imported recipe reference at ${url}`)
    await page.goto(`${url}/?path=/story/${id}`)
    await page.locator(`[data-item-id="${id}"]`).waitFor()
    if (story) await page.locator(`[data-item-id="${story}"]`).click()
  } else await page.goto(`${url}/?path=/story/${story}`)
  const preview = page.frameLocator('#storybook-preview-iframe')
  if (tab) {
    await preview.getByRole('tab', { name: tab, exact: true }).waitFor()
    await page.waitForTimeout(1500)
    await preview.getByRole('tab', { name: tab, exact: true }).click()
  }
  try {
    await preview.getByText(wait, { exact: true }).first().waitFor({ timeout: 15000 })
  } catch {
    throw new Error(`"${wait}" not shown at ${url} (${story} ${tab ?? ''})`)
  }
  await hideChrome(page)
  return preview
}

const FOUNDATION = 'designbook-foundation--foundation'
const DESIGN_SYSTEM = 'designbook-design-system--design-system'
const views = [
  ['START_URL', 'empty-vision.png', { story: FOUNDATION, wait: 'No vision defined yet' }],
  ['VISION_URL', 'vision.png', { story: FOUNDATION, wait: 'Cooks Delight' }],
  ['REFERENCE_URL', 'reference-page.png', { reference: true, wait: 'recipe · desktop · rest' }],
  ['REFERENCE_URL', 'empty-model.png', { story: FOUNDATION, tab: 'Data Model', wait: 'No data model defined yet' }],
  ['MODEL_URL', 'model.png', { story: FOUNDATION, tab: 'Data Model', wait: 'Graph', graph: true }],
  ['MODEL_URL', 'empty-tokens.png', { story: DESIGN_SYSTEM, wait: 'No design tokens defined yet' }],
  ['TOKENS_URL', 'tokens.png', { story: DESIGN_SYSTEM, wait: 'Design Tokens' }],
]
const browser = await chromium.launch()
try {
  const captured = []
  for (const [stage, name, view] of views) {
    if (!env[stage]) continue
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const preview = await open(page, env[stage], view)
    if (view.graph) {
      await preview.getByRole('button', { name: 'Graph', exact: true }).click()
      await page.waitForTimeout(3000)
      // Node and edge geometry in screenshot pixels, so the film can build the real graph node by node.
      const frame = await page.locator('#storybook-preview-iframe').boundingBox()
      const graph = await preview.locator('svg:has(foreignObject)').evaluate((svg) => {
        const box = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })
        const at = (path, l) => { const q = path.getPointAtLength(l).matrixTransform(path.getScreenCTM()); return [q.x, q.y] }
        return {
          area: box(svg.getBoundingClientRect()),
          nodes: [...svg.querySelectorAll('foreignObject')].map((n) => ({ id: [...n.querySelectorAll('*')].find((e) => e.tagName !== 'title' && !e.children.length && e.textContent.trim()).textContent.trim(), box: box(n.getBoundingClientRect()) })),
          edges: [...svg.querySelectorAll('path[data-edge-id]')].map((e) => ({ id: e.dataset.edgeId, box: box(e.getBoundingClientRect()), from: at(e, 0), to: at(e, e.getTotalLength()) })),
        }
      })
      const shift = (b) => ({ ...b, x: b.x + frame.x, y: b.y + frame.y })
      const point = ([x, y]) => [x + frame.x, y + frame.y]
      await writeFile(new URL('model-graph.json', out), JSON.stringify({
        area: shift(graph.area),
        nodes: graph.nodes.map((n) => ({ ...n, box: shift(n.box) })),
        edges: graph.edges.map((e) => ({ id: e.id, box: shift(e.box), from: point(e.from), to: point(e.to) })),
      }, null, 2) + '\n')
    }
    await page.screenshot({ path: file(name) })
    await page.close()
    captured.push(name)
  }

  if (env.FINAL_URL) {
  const tree = await browser.newPage({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 2 })
    await tree.goto(`${env.FINAL_URL}/?path=/story/test-integration-drupal-shell-footer--default`)
    await tree.locator('[data-item-id="test-integration-drupal-shell"]').waitFor()
    // A group is expanded when its first captured child row is rendered.
    for (const [group, child] of [['entities-node', 'entities-node-recipe'], ['entities-paragraph', 'entities-paragraph-ingredient'],
      ['entities-taxonomy-term', 'entities-taxonomy-term-author'], ['test-integration-drupal-data-display', 'test-integration-drupal-data-display-profile-card'],
      ['test-integration-drupal-layout', 'test-integration-drupal-layout-detail-page'], ['test-integration-drupal-shell', 'test-integration-drupal-shell-header'],
    // each entity's view mode story
    ['entities-node-recipe', 'entities-node-recipe--full'], ['entities-paragraph-ingredient', 'entities-paragraph-ingredient--default'],
    ['entities-paragraph-recipe-step', 'entities-paragraph-recipe-step--default'], ['entities-taxonomy-term-author', 'entities-taxonomy-term-author--default']]) {
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
    captured.push(`${rows.length} sidebar rows`)
  }
  console.log(`Captured ${captured.join(', ')}`)
} finally {
  await browser.close()
}
