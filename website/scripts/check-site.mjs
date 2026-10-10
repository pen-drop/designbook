// Built-site gate. VitePress fails on a dead Markdown page link; this reads
// the built HTML and fails on missing pages, anchors and assets, host-root
// escapes, a duplicated /designbook base, malformed fragments, and a
// current-route inventory (routes.json union LANDINGS links) that is missing,
// duplicated or incomplete. Generated 404 is excluded from the inventory.
// Navigation, sidebar and home links are included, not only .vp-doc.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LANDINGS } from '../.vitepress/manual.mjs'

const WEBSITE = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(WEBSITE, '.vitepress', 'dist')
const BASE = '/designbook'
const ASSET = /\.(svg|png|jpe?g|gif|webp|ico|txt|xml|json|js|css|pdf|woff2?|map)$/i
const ROUTES = JSON.parse(readFileSync(join(WEBSITE, 'routes.json'), 'utf8'))

const pages = new Map()
function collect(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      collect(path)
      continue
    }
    if (!name.endsWith('.html')) continue
    const html = readFileSync(path, 'utf8')
    const route = ('/' + relative(DIST, path).split(sep).join('/'))
      .replace(/(^|\/)index\.html$/, '$1')
      .replace(/\.html$/, '')
    const hrefs = [...html.matchAll(/<(?:a|link)\s[^>]*\bhref="([^"]+)"/gi)].map((m) =>
      m[1].replace(/&amp;/g, '&'),
    )
    const srcs = [...html.matchAll(/<(?:img|script)\s[^>]*\bsrc="([^"]+)"/gi)].map((m) =>
      m[1].replace(/&amp;/g, '&'),
    )
    pages.set(route, {
      ids: new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])),
      hrefs: [...hrefs, ...srcs],
    })
  }
}
collect(DIST)

function lookup(path) {
  const clean = path.replace(/\.html$/, '').replace(/\/index$/, '/') || '/'
  if (pages.has(clean)) return clean
  if (pages.has(`${clean}/`)) return `${clean}/`
  if (clean !== '/' && pages.has(clean.replace(/\/$/, ''))) return clean.replace(/\/$/, '')
  return null
}

function parseHref(href) {
  let rest = href
  let fragment = null
  const hash = rest.indexOf('#')
  if (hash >= 0) {
    fragment = rest.slice(hash + 1)
    rest = rest.slice(0, hash)
  }
  const query = rest.indexOf('?')
  if (query >= 0) rest = rest.slice(0, query)
  return { path: rest, fragment }
}

function classify(path) {
  if (path === '') return { kind: 'current' }
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) return { kind: 'skip' }
  if (!path.startsWith('/')) return { kind: 'relative', value: path }
  const doubled = BASE + BASE
  if (path === doubled || path.startsWith(`${doubled}/`)) return { kind: 'double' }
  if (path === BASE || path.startsWith(`${BASE}/`)) {
    const stripped = path === BASE || path === `${BASE}/` ? '/' : path.slice(BASE.length)
    return { kind: ASSET.test(stripped) ? 'asset' : 'page', value: stripped }
  }
  return { kind: 'escape' }
}

const problems = []
const report = (where, message) => problems.push({ where, message })

for (const [route, page] of pages) {
  if (route === '/404') continue
  const base = route.endsWith('/') ? route : `${posix.dirname(route)}/`.replace('//', '/')
  for (const href of page.hrefs) {
    const { path, fragment } = parseHref(href)
    const kind = classify(path)
    if (kind.kind === 'skip') continue
    if (kind.kind === 'escape') {
      report(route, `escapes to host root: ${href}`)
      continue
    }
    if (kind.kind === 'double') {
      report(route, `duplicated base: ${href}`)
      continue
    }
    let targetPath = route
    if (kind.kind === 'relative') targetPath = posix.normalize(base + kind.value)
    else if (kind.kind === 'page' || kind.kind === 'asset') targetPath = kind.value
    if (kind.kind === 'asset' || ASSET.test(targetPath)) {
      const file = join(DIST, targetPath.replace(/^\//, ''))
      if (!existsSync(file)) report(route, `links a missing asset: ${href}`)
      continue
    }
    const target = lookup(targetPath)
    if (target === null) {
      report(route, `links a missing page: ${href}`)
      continue
    }
    if (fragment === null || fragment === '') continue
    let decoded
    try {
      decoded = decodeURIComponent(fragment)
    } catch {
      report(route, `malformed fragment: ${href}`)
      continue
    }
    const linked = pages.get(target)
    if (!linked.ids.has(decoded) && !linked.ids.has(fragment)) {
      report(route, `links a missing anchor: ${href}`)
    }
  }
}

const landingRoutes = (Array.isArray(LANDINGS) ? LANDINGS : []).map((entry) => entry.link)

if (!Array.isArray(ROUTES)) {
  report('routes.json', 'inventory must be a JSON array of current routes')
} else {
  const seen = new Set()
  for (const entry of [...ROUTES, ...landingRoutes]) {
    if (seen.has(entry)) report(entry, 'duplicate route in inventory')
    seen.add(entry)
    if (lookup(entry) === null) report(entry, 'missing route: not built')
  }
  for (const route of pages.keys()) {
    if (route === '/404') continue
    const listed = seen.has(route) || seen.has(route.endsWith('/') ? route.slice(0, -1) : `${route}/`)
    if (!listed) report(route, 'unlisted content page')
  }
}

const prefixes = process.argv.slice(2)
const shown = problems.filter(
  ({ where }) => prefixes.length === 0 || prefixes.some((prefix) => where.startsWith(prefix)),
)
for (const { where, message } of shown) console.log(`${where}: ${message}`)
console.log(`${pages.size} built pages, ${Array.isArray(ROUTES) ? ROUTES.length : 0} inventory routes, ${shown.length} problems`)
process.exit(shown.length === 0 ? 0 : 1)
