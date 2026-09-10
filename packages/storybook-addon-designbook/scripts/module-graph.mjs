#!/usr/bin/env node
// Lightweight relative-import module-graph walker for the DESIGNBOOK-60 AC checks.
// It follows only *relative* import/export specifiers ('./', '../') inside src/,
// resolving them to a concrete .ts/.tsx/.js/.jsx file (or an index within a dir).
// Two commands:
//   reach  <startDir> <targetSubstr>  -> exit 1 if any file under startDir can
//                                        transitively reach a file whose resolved
//                                        path contains targetSubstr; else exit 0.
//   cycles <dir>                       -> exit 1 if any import cycle exists; else 0.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';

const SRC = resolve('src');

function walkDir(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkDir(p));
    else if (/\.(ts|tsx|js|jsx)$/.test(name) && !/\.d\.ts$/.test(name)) out.push(p);
  }
  return out;
}

const CANDIDATE_EXT = ['.ts', '.tsx', '.js', '.jsx'];
function resolveSpec(fromFile, spec) {
  // Only relative specifiers participate in the intra-package graph.
  if (!spec.startsWith('.')) return null;
  let base = resolve(dirname(fromFile), spec);
  // Strip an explicit .js/.jsx extension (ESM specifiers point at emitted names).
  const stripped = base.replace(/\.(js|jsx)$/, '');
  const tries = [];
  if (base !== stripped) {
    // e.g. './foo.js' -> try foo.ts, foo.tsx, foo.js, foo.jsx
    for (const e of CANDIDATE_EXT) tries.push(stripped + e);
  }
  for (const e of CANDIDATE_EXT) tries.push(base + e);
  tries.push(base); // exact
  for (const e of CANDIDATE_EXT) tries.push(join(base, 'index' + e));
  for (const t of tries) {
    if (existsSync(t) && statSync(t).isFile()) return t;
  }
  return null;
}

// Static `X from '...'` imports/exports, capturing the clause between the
// keyword and `from` so pure `import type`/`export type` edges can be dropped
// (mirrors eslint import-x/no-cycle `{ ignoreTypeImports: true }`).
const FROM_RE = /(?:^|[\n;])\s*(import|export)\b([^;'"]*?)\bfrom\s*['"]([^'"]+)['"]/g;
// Side-effect imports (`import './x.js'`) and dynamic `import('...')`.
const SIDE_RE = /(?:^|[\n;])\s*import\s*['"]([^'"]+)['"]/g;
const DYN_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const edgeCache = new Map();
function edges(file) {
  if (edgeCache.has(file)) return edgeCache.get(file);
  let src = '';
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    edgeCache.set(file, []);
    return [];
  }
  const out = [];
  const add = (spec) => {
    const r = resolveSpec(file, spec);
    if (r) out.push(r);
  };
  let m;
  FROM_RE.lastIndex = 0;
  while ((m = FROM_RE.exec(src))) {
    const clause = m[2].trim();
    if (clause === 'type' || clause.startsWith('type ')) continue; // type-only edge
    add(m[3]);
  }
  SIDE_RE.lastIndex = 0;
  while ((m = SIDE_RE.exec(src))) add(m[1]);
  DYN_RE.lastIndex = 0;
  while ((m = DYN_RE.exec(src))) add(m[1]);
  edgeCache.set(file, out);
  return out;
}

function reach(startDir, targetSubstr) {
  const starts = walkDir(resolve(startDir));
  const offenders = [];
  for (const start of starts) {
    const seen = new Set([start]);
    const stack = [...edges(start)];
    let found = null;
    const path = new Map();
    while (stack.length) {
      const cur = stack.pop();
      if (seen.has(cur)) continue;
      seen.add(cur);
      if (cur.includes(targetSubstr)) {
        found = cur;
        break;
      }
      for (const e of edges(cur)) {
        if (!seen.has(e)) {
          if (!path.has(e)) path.set(e, cur);
          stack.push(e);
        }
      }
    }
    if (found) offenders.push([relative(SRC, start), relative(SRC, found)]);
  }
  if (offenders.length) {
    console.error(`REACH FAIL: ${offenders.length} file(s) under ${startDir} reach "${targetSubstr}":`);
    for (const [a, b] of offenders) console.error(`  ${a}  ->  ...  ->  ${b}`);
    process.exit(1);
  }
  console.log(`reach OK: no file under ${startDir} reaches "${targetSubstr}"`);
}

function cycles(dir) {
  const files = walkDir(resolve(dir));
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map();
  const found = [];
  const stackPath = [];
  function dfs(node) {
    color.set(node, GRAY);
    stackPath.push(node);
    for (const nxt of edges(node)) {
      const c = color.get(nxt) ?? WHITE;
      if (c === GRAY) {
        const idx = stackPath.indexOf(nxt);
        found.push(stackPath.slice(idx).concat(nxt).map((f) => relative(SRC, f)));
      } else if (c === WHITE) {
        dfs(nxt);
      }
    }
    stackPath.pop();
    color.set(node, BLACK);
  }
  for (const f of files) if ((color.get(f) ?? WHITE) === WHITE) dfs(f);
  if (found.length) {
    console.error(`CYCLES FAIL: ${found.length} cycle(s):`);
    for (const c of found.slice(0, 20)) console.error('  ' + c.join(' -> '));
    process.exit(1);
  }
  console.log(`cycles OK: no import cycle under ${dir}`);
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'reach') reach(a, b);
else if (cmd === 'cycles') cycles(a);
else {
  console.error('usage: module-graph.mjs reach <startDir> <targetSubstr> | cycles <dir>');
  process.exit(2);
}
