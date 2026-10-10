import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPTS = dirname(fileURLToPath(import.meta.url))

const words = (n) => Array.from({ length: n }, () => 'word').join(' ')

function page(title, n, extra = '') {
  const headingWords = title.split(/\s+/).filter((word) => /[A-Za-z]/.test(word)).length
  const rest = Math.max(0, n - headingWords)
  return `---\ntitle: ${title}\n---\n\n# ${title}\n\n${words(rest)}\n${extra}`
}

const defaultManual = `{
  SRC_EXCLUDE: ['specs/**', 'spikes/**', 'experiments/**', 'gaia/**', 'superpowers/**'],
  AREAS: [
    { label: 'Get started', link: '/get-started/', icon: 'start' },
    { label: 'Extend Designbook', link: '/extend/', icon: 'extend' },
    { label: 'Integrations', link: '/integrations/', icon: 'plug' },
    { label: 'Advanced', link: '/advanced/', icon: 'gear' },
  ],
  SIDEBAR: {
    '/manual': [{ text: 'Documentation', items: [
      { text: 'Get started', link: '/get-started/' },
      { text: 'Extend Designbook', link: '/extend/' },
      { text: 'Integrations', link: '/integrations/' },
      { text: 'Advanced', link: '/advanced/' },
    ] }],
    '/get-started/': [{ text: 'Get started', items: [{ text: 'Overview', link: '/get-started/' }] }],
    '/extend/': [{ text: 'Extend Designbook', items: [{ text: 'Overview', link: '/extend/' }] }],
    '/integrations/': [{ text: 'Integrations', items: [{ text: 'Overview', link: '/integrations/' }] }],
    '/advanced/': [{ text: 'Advanced', items: [{ text: 'Overview', link: '/advanced/' }] }],
  },
}`

function manualModule(overrides = '') {
  return `const data = ${defaultManual}
export const SRC_EXCLUDE = data.SRC_EXCLUDE
export const AREAS = data.AREAS
export const SIDEBAR = data.SIDEBAR
${overrides}
`
}

function html({ title = 'Page', extra = '', nav = true } = {}) {
  const navBlock = nav
    ? `<nav><a href="/designbook/">Home</a><a href="/designbook/manual">Manual</a></nav>`
    : ''
  return `<!doctype html><html><body>${navBlock}<main><div class="vp-doc"><h1 id="title">${title}</h1>${extra}</div></main></body></html>\n`
}

function makeFixture({ docs = {}, manual, routes, dist } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'db-site-'))
  const website = join(root, 'website')
  const docsDir = join(root, 'docs')
  mkdirSync(join(website, 'scripts'), { recursive: true })
  mkdirSync(join(website, '.vitepress'), { recursive: true })
  mkdirSync(docsDir, { recursive: true })
  cpSync(join(SCRIPTS, 'check-pages.mjs'), join(website, 'scripts', 'check-pages.mjs'))
  cpSync(join(SCRIPTS, 'check-site.mjs'), join(website, 'scripts', 'check-site.mjs'))
  writeFileSync(join(website, '.vitepress', 'manual.mjs'), manual ?? manualModule())
  writeFileSync(join(website, 'routes.json'), `${JSON.stringify(routes ?? ['/', '/manual'], null, 2)}\n`)
  for (const [rel, body] of Object.entries(docs)) {
    const path = join(docsDir, rel)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, body)
  }
  if (dist) {
    for (const [rel, body] of Object.entries(dist)) {
      const path = join(website, '.vitepress', 'dist', rel)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, body)
    }
  }
  return { root, website, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

function run(website, script, args = []) {
  return spawnSync(process.execPath, ['scripts/' + script, ...args], {
    cwd: website,
    encoding: 'utf8',
  })
}

const output = (result) => `${result.stdout}${result.stderr}`

const sliceDocs = {
  'index.md': page('Manual', 40),
  'landing.md': '---\nlayout: home\n---\n\n# Designbook\n',
  'get-started/index.md': page('Get started', 40),
  'extend/index.md': page('Extend', 40),
  'integrations/index.md': page('Integrations', 40),
  'advanced/index.md': page('Advanced', 40),
}

test('index at 250 words passes and 251 fails with over 250', () => {
  const pass = makeFixture({
    docs: { ...sliceDocs, 'get-started/index.md': page('Get started', 250) },
  })
  const fail = makeFixture({
    docs: { ...sliceDocs, 'get-started/index.md': page('Get started', 251) },
  })
  try {
    const ok = run(pass.website, 'check-pages.mjs')
    const bad = run(fail.website, 'check-pages.mjs')
    assert.equal(ok.status, 0, output(ok))
    assert.equal(bad.status, 1)
    assert.match(output(bad), /over 250/)
  } finally {
    pass.cleanup()
    fail.cleanup()
  }
})

test('standard page at 600 words passes and 601 fails with over 600', () => {
  const sidebar = manualModule(`
SIDEBAR['/get-started/'] = [{ text: 'Get started', items: [
  { text: 'Overview', link: '/get-started/' },
  { text: 'What is Designbook', link: '/get-started/what-is-designbook' },
]}]
`)
  const pass = makeFixture({
    manual: sidebar,
    docs: { ...sliceDocs, 'get-started/what-is-designbook.md': page('What is Designbook', 600) },
  })
  const fail = makeFixture({
    manual: sidebar,
    docs: { ...sliceDocs, 'get-started/what-is-designbook.md': page('What is Designbook', 601) },
  })
  try {
    const ok = run(pass.website, 'check-pages.mjs')
    const bad = run(fail.website, 'check-pages.mjs')
    assert.equal(ok.status, 0, output(ok))
    assert.equal(bad.status, 1)
    assert.match(output(bad), /over 600/)
  } finally {
    pass.cleanup()
    fail.cleanup()
  }
})

test('Advanced leaf at 1500 words passes and 1501 fails with over 1500', () => {
  const sidebar = manualModule(`
SIDEBAR['/advanced/'] = [{ text: 'Advanced', items: [
  { text: 'Overview', link: '/advanced/' },
  { text: 'Architecture', link: '/advanced/development/architecture' },
]}]
`)
  const pass = makeFixture({
    manual: sidebar,
    docs: { ...sliceDocs, 'advanced/development/architecture.md': page('Architecture', 1500) },
  })
  const fail = makeFixture({
    manual: sidebar,
    docs: { ...sliceDocs, 'advanced/development/architecture.md': page('Architecture', 1501) },
  })
  try {
    const ok = run(pass.website, 'check-pages.mjs')
    const bad = run(fail.website, 'check-pages.mjs')
    assert.equal(ok.status, 0, output(ok))
    assert.equal(bad.status, 1)
    assert.match(output(bad), /over 1500/)
  } finally {
    pass.cleanup()
    fail.cleanup()
  }
})

test('Advanced index uses the 250-word index cap', () => {
  const fail = makeFixture({
    docs: { ...sliceDocs, 'advanced/index.md': page('Advanced', 251) },
  })
  try {
    const bad = run(fail.website, 'check-pages.mjs')
    assert.equal(bad.status, 1)
    assert.match(output(bad), /over 250/)
  } finally {
    fail.cleanup()
  }
})

test('nested Advanced index uses the 250-word index cap', () => {
  const sidebar = manualModule(`
SIDEBAR['/advanced/'] = [{ text: 'Advanced', items: [
  { text: 'Overview', link: '/advanced/' },
  { text: 'CLI', link: '/advanced/cli/' },
]}]
`)
  const pass = makeFixture({
    manual: sidebar,
    docs: { ...sliceDocs, 'advanced/cli/index.md': page('CLI', 250) },
  })
  const fail = makeFixture({
    manual: sidebar,
    docs: { ...sliceDocs, 'advanced/cli/index.md': page('CLI', 251) },
  })
  try {
    const ok = run(pass.website, 'check-pages.mjs')
    const bad = run(fail.website, 'check-pages.mjs')
    assert.equal(ok.status, 0, output(ok))
    assert.equal(bad.status, 1)
    assert.match(output(bad), /over 250/)
  } finally {
    pass.cleanup()
    fail.cleanup()
  }
})

test('excluded working docs are ignored', () => {
  const fixture = makeFixture({
    docs: {
      ...sliceDocs,
      'specs/secret.md': page('Secret', 4000),
      'spikes/note.md': page('Spike', 4000),
      'experiments/x.md': page('Experiment', 4000),
      'gaia/old.md': page('Gaia', 4000),
      'superpowers/plan.md': page('Plan', 4000),
    },
  })
  try {
    const result = run(fixture.website, 'check-pages.mjs')
    assert.equal(result.status, 0, output(result))
    assert.doesNotMatch(output(result), /specs\/secret|spikes\/note|experiments\/x|gaia\/old|superpowers\/plan/)
  } finally {
    fixture.cleanup()
  }
})

test('unknown area fails with a named cause', () => {
  const fixture = makeFixture({
    docs: { ...sliceDocs, 'other/page.md': page('Other', 10) },
  })
  try {
    const result = run(fixture.website, 'check-pages.mjs')
    assert.equal(result.status, 1)
    assert.match(output(result), /unknown area/)
  } finally {
    fixture.cleanup()
  }
})

test('missing sidebar membership fails', () => {
  const fixture = makeFixture({
    docs: { ...sliceDocs, 'get-started/orphan.md': page('Orphan', 10) },
  })
  try {
    const result = run(fixture.website, 'check-pages.mjs')
    assert.equal(result.status, 1)
    assert.match(output(result), /in no sidebar/)
  } finally {
    fixture.cleanup()
  }
})

test('wrong-area sidebar membership fails', () => {
  const manual = manualModule(`
SIDEBAR['/extend/'] = [{ text: 'Extend Designbook', items: [
  { text: 'Overview', link: '/extend/' },
  { text: 'Misplaced', link: '/get-started/misplaced' },
]}]
`)
  const fixture = makeFixture({
    manual,
    docs: { ...sliceDocs, 'get-started/misplaced.md': page('Misplaced', 10) },
  })
  try {
    const result = run(fixture.website, 'check-pages.mjs')
    assert.equal(result.status, 1)
    assert.match(output(result), /wrong sidebar/)
  } finally {
    fixture.cleanup()
  }
})

test('duplicate sidebar membership fails', () => {
  const manual = manualModule(`
SIDEBAR['/get-started/'] = [{ text: 'Get started', items: [
  { text: 'Overview', link: '/get-started/' },
  { text: 'Twice', link: '/get-started/twice' },
  { text: 'Twice again', link: '/get-started/twice' },
]}]
`)
  const fixture = makeFixture({
    manual,
    docs: { ...sliceDocs, 'get-started/twice.md': page('Twice', 10) },
  })
  try {
    const result = run(fixture.website, 'check-pages.mjs')
    assert.equal(result.status, 1)
    assert.match(output(result), /duplicate sidebar/)
  } finally {
    fixture.cleanup()
  }
})

test('draft landing fails', () => {
  const fixture = makeFixture({
    docs: { ...sliceDocs, 'landing.md': '---\nlayout: home\ndraft: true\n---\n\n# Home\n' },
  })
  try {
    const result = run(fixture.website, 'check-pages.mjs')
    assert.equal(result.status, 1)
    assert.match(output(result), /draft/)
  } finally {
    fixture.cleanup()
  }
})

test('fenced code is excluded and inline code is counted', () => {
  const fence = page('Get started', 40, '\n```js\n' + words(400) + '\n```\n')
  const inline = page('Get started', 250, '\n`counted`\n')
  const pass = makeFixture({ docs: { ...sliceDocs, 'get-started/index.md': fence } })
  const fail = makeFixture({ docs: { ...sliceDocs, 'get-started/index.md': inline } })
  try {
    const ok = run(pass.website, 'check-pages.mjs')
    const bad = run(fail.website, 'check-pages.mjs')
    assert.equal(ok.status, 0, output(ok))
    assert.equal(bad.status, 1)
    assert.match(output(bad), /over 250/)
  } finally {
    pass.cleanup()
    fail.cleanup()
  }
})

const baseDist = {
  'index.html': html({ title: 'Home', extra: '<p>Designbook is not a design tool.</p><a href="/designbook/get-started/">Start</a>' }),
  'manual.html': html({ title: 'Manual', extra: '<a href="/designbook/get-started/">Get started</a><a href="/designbook/extend/">Extend</a>' }),
  'get-started/index.html': html({
    title: 'Get started',
    extra: '<a href="#title">here</a><a href="/designbook/manual">Manual</a><a href="/designbook/extend/">Extend</a>',
  }),
  'extend/index.html': html({ title: 'Extend' }),
  'integrations/index.html': html({ title: 'Integrations' }),
  'advanced/index.html': html({ title: 'Advanced' }),
  '404.html': html({ title: 'Not found', nav: false }),
}

const allRoutes = ['/', '/manual', '/get-started/', '/extend/', '/integrations/', '/advanced/']

test('valid /designbook/ and /designbook/manual navigation passes', () => {
  const fixture = makeFixture({ dist: baseDist, routes: allRoutes })
  try {
    const result = run(fixture.website, 'check-site.mjs')
    assert.equal(result.status, 0, output(result))
  } finally {
    fixture.cleanup()
  }
})

test('same-page and cross-page anchors pass when present', () => {
  const dist = {
    ...baseDist,
    'get-started/index.html': html({
      extra: '<h2 id="pipeline">Pipeline</h2><a href="#pipeline">here</a><a href="/designbook/extend/#title">extend title</a>',
    }),
  }
  const fixture = makeFixture({ dist, routes: allRoutes })
  try {
    const result = run(fixture.website, 'check-site.mjs')
    assert.equal(result.status, 0, output(result))
  } finally {
    fixture.cleanup()
  }
})

test('query strings are ignored when resolving pages', () => {
  const dist = {
    ...baseDist,
    'index.html': html({ extra: '<a href="/designbook/get-started/?utm=1">Start</a>' }),
  }
  const fixture = makeFixture({ dist, routes: allRoutes })
  try {
    const result = run(fixture.website, 'check-site.mjs')
    assert.equal(result.status, 0, output(result))
  } finally {
    fixture.cleanup()
  }
})

test('encoded fragments resolve and malformed fragments fail without crashing', () => {
  const encoded = {
    ...baseDist,
    'get-started/index.html': html({
      extra: '<h2 id="hello world">Hello</h2><a href="/designbook/get-started/#hello%20world">hi</a>',
    }),
  }
  const malformed = {
    ...baseDist,
    'get-started/index.html': html({ extra: '<a href="/designbook/get-started/#%E0%A4%A">bad</a>' }),
  }
  const pass = makeFixture({ dist: encoded, routes: allRoutes })
  const fail = makeFixture({ dist: malformed, routes: allRoutes })
  try {
    const ok = run(pass.website, 'check-site.mjs')
    const bad = run(fail.website, 'check-site.mjs')
    assert.equal(ok.status, 0, output(ok))
    assert.equal(bad.status, 1)
    assert.match(output(bad), /malformed fragment|invalid fragment/)
    assert.equal(bad.error, undefined)
  } finally {
    pass.cleanup()
    fail.cleanup()
  }
})

test('missing page, missing anchor and missing asset fail with a reason', () => {
  const dist = {
    ...baseDist,
    'index.html': html({
      extra:
        '<a href="/designbook/missing-page/">gone</a><a href="/designbook/get-started/#nope">anchor</a><a href="/designbook/missing.png">asset</a>',
    }),
  }
  const fixture = makeFixture({ dist, routes: allRoutes })
  try {
    const result = run(fixture.website, 'check-site.mjs')
    assert.equal(result.status, 1)
    const text = output(result)
    assert.match(text, /missing page/)
    assert.match(text, /missing anchor/)
    assert.match(text, /missing asset/)
  } finally {
    fixture.cleanup()
  }
})

test('host-root escapes and duplicated base fail', () => {
  const dist = {
    ...baseDist,
    'index.html': html({
      extra: '<a href="/get-started/">root</a><a href="/designbook/designbook/get-started/">dup</a>',
    }),
  }
  const fixture = makeFixture({ dist, routes: allRoutes })
  try {
    const result = run(fixture.website, 'check-site.mjs')
    assert.equal(result.status, 1)
    const text = output(result)
    assert.match(text, /host root|escapes/)
    assert.match(text, /duplicated base|double[d]? base/)
  } finally {
    fixture.cleanup()
  }
})

test('protocol and external links are ignored', () => {
  const dist = {
    ...baseDist,
    'index.html': html({
      extra:
        '<a href="https://example.com/x">ex</a><a href="mailto:a@b.c">mail</a><a href="https://pen-drop.github.io/designbook/">self</a>',
    }),
  }
  const fixture = makeFixture({ dist, routes: allRoutes })
  try {
    const result = run(fixture.website, 'check-site.mjs')
    assert.equal(result.status, 0, output(result))
  } finally {
    fixture.cleanup()
  }
})

test('nav and home links are included in the check', () => {
  const dist = {
    ...baseDist,
    'index.html': html({ extra: '' }).replace(
      '<a href="/designbook/manual">Manual</a>',
      '<a href="/designbook/no-nav/">Manual</a>',
    ),
  }
  const fixture = makeFixture({ dist, routes: allRoutes })
  try {
    const result = run(fixture.website, 'check-site.mjs')
    assert.equal(result.status, 1)
    assert.match(output(result), /missing page/)
  } finally {
    fixture.cleanup()
  }
})

test('routes.json missing, duplicate and unlisted content routes fail; generated 404 is excluded', () => {
  const missing = makeFixture({ dist: baseDist, routes: ['/', '/manual'] })
  const duplicate = makeFixture({ dist: baseDist, routes: [...allRoutes, '/'] })
  const unlisted = makeFixture({
    dist: { ...baseDist, 'extra.html': html({ title: 'Extra' }) },
    routes: allRoutes,
  })
  const with404 = makeFixture({ dist: baseDist, routes: allRoutes })
  try {
    const miss = run(missing.website, 'check-site.mjs')
    const dup = run(duplicate.website, 'check-site.mjs')
    const extra = run(unlisted.website, 'check-site.mjs')
    const ok = run(with404.website, 'check-site.mjs')
    assert.equal(miss.status, 1)
    assert.match(output(miss), /missing route|not in inventory|unlisted/)
    assert.equal(dup.status, 1)
    assert.match(output(dup), /duplicate/)
    assert.equal(extra.status, 1)
    assert.match(output(extra), /unlisted/)
    assert.equal(ok.status, 0, output(ok))
  } finally {
    missing.cleanup()
    duplicate.cleanup()
    unlisted.cleanup()
    with404.cleanup()
  }
})
