// Captures the real Designbook UI for the Opus intro film and records the
// locator bounding boxes the camera needs. Read-only: it clicks tabs, expands
// tree folders, dismisses the release toast and scrolls — it never edits DOM.
// Usage: node docs/media/intro-video/opus/capture.mjs [storybook-url]
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const require = createRequire(
  new URL('../../../../packages/integrations/test-integration-drupal/package.json', import.meta.url),
)
const { chromium } = require('playwright')
const SB = process.argv[2] ?? 'http://localhost:37541'
const out = fileURLToPath(new URL('./screenshots/', import.meta.url))
const W = 1600, H = 900
const boxes = {}
const rect = (r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) })

const index = await (await fetch(SB + '/index.json')).json()
for (const id of ['designbook-sections-saas-demo-scenes--landing', 'entities-node-pricing-plan--card', 'entities-node-pricing-plan--docs', 'designbook-foundation--foundation'])
  assert.ok(index.entries[id], 'missing story ' + id)

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

async function open(path) {
  await page.goto(`${SB}/?path=${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  if (await page.getByText(/Learn what.s new/).count()) {
    const btn = page.getByText(/Learn what.s new/).locator('xpath=ancestor::*[.//button][1]').locator('button').last()
    await btn.click().catch(() => {})
    await page.waitForTimeout(300)
  }
}
const sidebarItem = async (name) => rect(await page.locator('#storybook-explorer-tree').getByText(name, { exact: true }).first().boundingBox())
async function expand(name) {
  const el = page.locator('#storybook-explorer-tree').getByRole('button', { name, exact: true }).first()
  if ((await el.getAttribute('aria-expanded')) === 'false') await el.click()
  await page.waitForTimeout(250)
}
async function hidePanel() {
  const btn = page.getByRole('button', { name: /hide addon panel|hide addons/i }).first()
  if (await btn.count()) await btn.click()
  await page.waitForTimeout(400)
}
const preview = () => page.frame({ name: 'storybook-preview-iframe' })
async function iframeBox() { return rect(await page.locator('#storybook-preview-iframe').boundingBox()) }

// 1+2: Landing scene inside Storybook, preview scrolled to the pricing section.
await open('/story/designbook-sections-saas-demo-scenes--landing')
await hidePanel()
await expand('Action')
await expand('Data Display')
const ifr = await iframeBox()
boxes.iframe = ifr
const scrollY = await preview().evaluate(() => {
  const cards = [...document.querySelectorAll('main section:last-of-type article')]
  const bottom = Math.max(...cards.map((c) => c.getBoundingClientRect().bottom + scrollY))
  const y = Math.round(bottom + 40 - innerHeight)
  scrollTo(0, y)
  return y
})
await page.waitForTimeout(600)
boxes.scrollY = scrollY
const inIframe = await preview().evaluate(() => {
  const r = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height } }
  const [free, pro, business] = document.querySelectorAll('main section:last-of-type article')
  return {
    pricingCard: r(free),
    checkList: r(pro.querySelector('ul')),
    button: r(business.querySelector('a')),
    freePrice: r(free.querySelector('.items-baseline')),
    texts: [free, pro, business].map((a) => a.innerText.split('\n')[0]),
  }
})
assert.deepEqual(inIframe.texts, ['Free', 'Pro', 'Business'])
const shift = (r) => rect({ x: r.x + ifr.x, y: r.y + ifr.y, width: r.width, height: r.height })
boxes.landing = {
  pricingCard: shift(inIframe.pricingCard),
  checkList: shift(inIframe.checkList),
  button: shift(inIframe.button),
  freePrice: shift(inIframe.freePrice),
  navPricingCard: await sidebarItem('saas-pricing-card'),
  navCheckList: await sidebarItem('saas-check-list'),
  navButton: await sidebarItem('saas-button'),
  navLanding: await sidebarItem('Landing'),
}
await page.mouse.move(800, 8)
await page.evaluate(() => document.activeElement?.blur())
await page.waitForTimeout(300)
await page.screenshot({ path: out + 'sb-landing.png' })

// 1: the same scene as a bare website, full page, at the preview iframe width.
const site = await ctx.newPage()
await site.setViewportSize({ width: ifr.w, height: ifr.h })
await site.goto(`${SB}/iframe.html?id=designbook-sections-saas-demo-scenes--landing&viewMode=story`, { waitUntil: 'networkidle' })
await site.waitForTimeout(1500)
boxes.siteHeight = await site.evaluate(() => document.documentElement.scrollHeight)
await site.screenshot({ path: out + 'site-full.png', fullPage: true })
await site.close()

// 3: standalone pricing_plan entity story, entity selected in the sidebar.
await open('/story/entities-node-pricing-plan--card')
await hidePanel()
const entityPreview = await preview().evaluate(() => {
  const a = document.querySelector('article'), p = a.querySelector('.items-baseline')
  const r = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height } }
  return { card: r(a), price: r(p), name: a.innerText.split('\n')[0] }
})
assert.equal(entityPreview.name, 'Free')
const eifr = await iframeBox()
boxes.entity = {
  iframe: eifr,
  card: rect({ ...entityPreview.card, x: entityPreview.card.x + eifr.x, y: entityPreview.card.y + eifr.y }),
  price: rect({ ...entityPreview.price, x: entityPreview.price.x + eifr.x, y: entityPreview.price.y + eifr.y }),
  navPricingPlan: await sidebarItem('Pricing Plan'),
  navCard: await sidebarItem('card'),
}
await page.screenshot({ path: out + 'sb-entity.png' })

// 4: same story with the Structure panel open and enlarged to show the mapping rows.
await page.keyboard.press('Alt+a').catch(() => {})
await page.waitForTimeout(400)
if (!(await page.getByRole('tab', { name: 'Structure' }).count())) await open('/story/entities-node-pricing-plan--card')
await page.getByRole('tab', { name: 'Structure' }).click()
await page.waitForTimeout(800)
const tabs = await page.getByRole('tab', { name: 'Structure' }).boundingBox()
await page.mouse.move(W / 2 + 150, tabs.y - 3)
await page.mouse.down()
await page.mouse.move(W / 2 + 150, tabs.y - 160, { steps: 8 })
await page.mouse.up()
await page.waitForTimeout(800)
const panel = page.locator('#storybook-panel-root')
const pt = async (text, n = 0) => rect(await panel.getByText(text, { exact: true }).nth(n).boundingBox())
const rowOf = async (text) => rect(await panel.getByText(text, { exact: true }).first().locator('xpath=..').boundingBox())
boxes.structure = {
  panel: rect(await panel.boundingBox()),
  tab: await pt('Structure'),
  compEntity: await pt('node/pricing_plan (card)'),
  detailEntity: rect(await panel.getByText('node/pricing_plan', { exact: true }).first().locator('xpath=..').boundingBox()),
  mappingLine: rect(await panel.getByText(/^mapping: /).first().boundingBox()),
  dataSource: rect(await panel.getByText('Data Source', { exact: false }).first().locator('xpath=..').boundingBox()),
  srcPrice: await rowOf('price'),
  slotPrice: await rowOf('slot: price'),
  componentHead: await pt('test_integration_drupal:saas-pricing-card'),
  navCard: await sidebarItem('card'),
}
await page.screenshot({ path: out + 'sb-entity-structure.png' })

// 5: the entity's Docs page — the real JSONata line that feeds slot price from field_price.
await open('/docs/entities-node-pricing-plan--docs')
const difr = await iframeBox()
const line = await preview().evaluate(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    const i = node.data.indexOf('"price": $replace(field_price')
    if (i < 0) continue
    const range = document.createRange()
    const f = node.data.indexOf('field_price', i)
    range.setStart(node, i); range.setEnd(node, node.data.indexOf('\n', i))
    const l = range.getBoundingClientRect()
    range.setStart(node, f); range.setEnd(node, f + 'field_price'.length)
    const t = range.getBoundingClientRect()
    range.setStart(node, i); range.setEnd(node, i + '"price"'.length)
    const k = range.getBoundingClientRect()
    const box = (b) => ({ x: b.x, y: b.y, width: b.width, height: b.height })
    return { line: box(l), field: box(t), key: box(k) }
  }
  return null
})
assert.ok(line, 'mapping line with field_price not found on Docs page')
const dshift = (r) => rect({ ...r, x: r.x + difr.x, y: r.y + difr.y })
boxes.docs = {
  line: dshift(line.line),
  field: dshift(line.field),
  key: dshift(line.key),
  navDocs: await sidebarItem('Docs'),
}
await page.screenshot({ path: out + 'docs-mapping.png' })

// 6: data model detail of node.pricing_plan with the field_price row.
await open('/story/designbook-foundation--foundation')
await hidePanel()
await preview().getByText('Data Model', { exact: true }).first().click()
await page.waitForTimeout(1200)
await preview().getByText('Pricing plan', { exact: true }).first().click()
await page.waitForTimeout(1500)
const fifr = await iframeBox()
const fm = await preview().evaluate(() => {
  const r = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height } }
  const cell = [...document.querySelectorAll('td')].find((td) => td.textContent.trim() === 'field_price')
  const row = cell.closest('tr')
  const desc = row.nextElementSibling && row.nextElementSibling.textContent.includes('Display price') ? row.nextElementSibling : null
  const title = [...document.querySelectorAll('h1,h2,h3')].find((h) => h.textContent.includes('Pricing plan'))
  const machine = [...document.querySelectorAll('code,span,div')].find((e) => e.children.length === 0 && e.textContent.trim() === 'node.pricing_plan')
  return { cell: r(cell), row: r(row), desc: desc && r(desc), rowText: row.innerText, title: r(title), machine: machine && r(machine) }
})
assert.match(fm.rowText, /field_price\s+string\s+Price/)
const fshift = (r) => r && rect({ ...r, x: r.x + fifr.x, y: r.y + fifr.y })
boxes.field = { cell: fshift(fm.cell), row: fshift(fm.row), desc: fshift(fm.desc), title: fshift(fm.title), machine: fshift(fm.machine), rowText: fm.rowText }
await page.screenshot({ path: out + 'datamodel-field.png' })

await browser.close()
writeFileSync(fileURLToPath(new URL('./boxes.js', import.meta.url)), 'window.BOXES = ' + JSON.stringify(boxes, null, 2) + '\n')
console.log(JSON.stringify(boxes, null, 2))
