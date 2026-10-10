// Page-length and navigation gate for the manual (docs/). Counts prose words
// per rendered Markdown page — frontmatter, fenced code, HTML comments,
// link targets and inline tags excluded; inline code counts — and fails when
// a page exceeds its tier, sits in an unknown area, is missing from its area
// sidebar, is listed in the wrong area, is listed twice, or is draft: true.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AREAS, SIDEBAR, SRC_EXCLUDE } from '../.vitepress/manual.mjs'

const DOCS = fileURLToPath(new URL('../../docs/', import.meta.url))
const LANDING = 'landing.md'
const NO_SIDEBAR = new Set(['index.md', LANDING])
const AREA_DIRS = AREAS.map((area) => area.link.replace(/^\//, ''))
const AREA_INDEX = new Set(['index.md', ...AREA_DIRS.map((dir) => `${dir}index.md`)])

function limitFor(rel) {
  if (rel === LANDING) return null
  if (AREA_INDEX.has(rel)) return 250
  if (rel.startsWith('advanced/')) return 1500
  if (AREA_DIRS.some((dir) => rel.startsWith(dir))) return 600
  return null
}

function proseWords(markdown) {
  const prose = markdown
    .replace(/^---\n[\s\S]*?\n---\n/, ' ')
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\S\n]*$/gm, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<[^>]+>/g, ' ')
  return prose.split(/\s+/).filter((word) => /[A-Za-z]/.test(word)).length
}

const excluded = (rel) =>
  SRC_EXCLUDE.some((pattern) =>
    pattern.endsWith('/**') ? rel.startsWith(pattern.slice(0, -2)) : rel === pattern,
  )

const route = (rel) => '/' + rel.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')

function sidebarLinks(items) {
  return items.flatMap((item) => [item.link, ...(item.items ? sidebarLinks(item.items) : [])]).filter(Boolean)
}

const areaMembership = Object.fromEntries(
  AREAS.map((area) => [area.link, sidebarLinks(SIDEBAR[area.link] ?? [])]),
)

function pageArea(rel) {
  return AREAS.find((area) => rel.startsWith(area.link.slice(1))) ?? null
}

function membershipProblems(rel, pageRoute) {
  if (NO_SIDEBAR.has(rel)) return []
  const owners = []
  const problems = []
  for (const [area, links] of Object.entries(areaMembership)) {
    const count = links.filter((link) => link === pageRoute).length
    if (count > 1) problems.push('duplicate sidebar')
    if (count >= 1) owners.push(area)
  }
  if (problems.length > 0) return problems
  if (owners.length > 1) return ['duplicate sidebar']
  if (owners.length === 0) return ['in no sidebar']
  const expected = pageArea(rel)
  if (expected && owners[0] !== expected.link) return ['wrong sidebar']
  return []
}

function pages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return pages(path)
    return name.endsWith('.md') ? [relative(DOCS, path).split(sep).join('/')] : []
  })
}

const prefixes = process.argv.slice(2)
const selected = pages(DOCS)
  .filter((rel) => !excluded(rel))
  .filter((rel) => prefixes.length === 0 || prefixes.some((prefix) => rel.startsWith(prefix)))
  .sort()

let total = 0
let failures = 0
for (const rel of selected) {
  const markdown = readFileSync(join(DOCS, rel), 'utf8')
  const wordCount = proseWords(markdown)
  const limit = limitFor(rel)
  const front = markdown.match(/^---\n([\s\S]*?)\n---\n/)
  const problems = []
  const unknown = rel !== LANDING && rel !== 'index.md' && !pageArea(rel)
  if (unknown) problems.push('unknown area')
  else if (rel !== LANDING && limit === null) problems.push('unknown area')
  else if (rel !== LANDING && wordCount > limit) problems.push(`over ${limit}`)
  problems.push(...membershipProblems(rel, route(rel)))
  if (front && /^draft:\s*true\s*$/m.test(front[1])) problems.push('draft')
  total += wordCount
  if (problems.length > 0) failures++
  const unique = [...new Set(problems)]
  console.log(
    `${unique.length ? 'FAIL' : 'ok  '} ${String(wordCount).padStart(5)} / ${limit ?? '-'}  ${rel}${
      unique.length ? '  (' + unique.join(', ') + ')' : ''
    }`,
  )
}
console.log(`${selected.length} pages, ${total} prose words, ${failures} failing`)
process.exit(failures === 0 ? 0 : 1)
