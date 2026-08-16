#!/usr/bin/env node
/**
 * Merge a case/suite designbook.config overlay into the workspace-root config.
 *
 * Env:
 *   SRC       path to overlay YAML
 *   ROOT_CFG  path to workspace-root designbook.config.yml
 *   THEME_REL theme path relative to workspace root (e.g. web/themes/custom/…)
 *
 * Theme-relative paths (home: ., dirs.components: components, …) are rewritten
 * under THEME_REL. Command strings with shell escapes are re-emitted as YAML
 * single-quoted scalars so \$ survives.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const srcPath = process.env.SRC;
const rootPath = process.env.ROOT_CFG;
const themeRel = process.env.THEME_REL;

if (!srcPath || !rootPath || !themeRel) {
  console.error('merge-designbook-config.mjs: SRC, ROOT_CFG, THEME_REL required');
  process.exit(1);
}

const overlay = yaml.load(fs.readFileSync(srcPath, 'utf8')) || {};
const root = fs.existsSync(rootPath) ? yaml.load(fs.readFileSync(rootPath, 'utf8')) || {} : {};

for (const [k, v] of Object.entries(overlay)) {
  if (
    v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    root[k] &&
    typeof root[k] === 'object' &&
    !Array.isArray(root[k])
  ) {
    root[k] = { ...root[k], ...v };
  } else {
    root[k] = v;
  }
}

root.designbook = root.designbook || {};
const home = root.designbook.home;
if (home === '.' || home === './' || home === undefined || home === null || home === '') {
  root.designbook.home = themeRel;
} else if (
  typeof home === 'string' &&
  !home.startsWith(themeRel) &&
  !path.isAbsolute(home) &&
  home !== 'web' &&
  !home.startsWith('web/')
) {
  if (!home.includes('/')) root.designbook.home = themeRel;
}

const prefixTheme = (p) => {
  if (typeof p !== 'string' || p === '') return p;
  if (path.isAbsolute(p) || p.startsWith(`${themeRel}/`) || p === themeRel) return p;
  if (p.startsWith('web/')) return p;
  return path.posix.join(themeRel, p);
};

root.dirs = root.dirs || {};
if (root.dirs.components) root.dirs.components = prefixTheme(root.dirs.components);
root.dirs.css = root.dirs.css || {};
if (root.dirs.css.tokens) root.dirs.css.tokens = prefixTheme(root.dirs.css.tokens);
if (root.dirs.css.themes) root.dirs.css.themes = prefixTheme(root.dirs.css.themes);
root.css = root.css || {};
if (root.css.app) root.css.app = prefixTheme(root.css.app);
root.component = root.component || {};
if (root.component.src) root.component.src = prefixTheme(root.component.src);

if (root.workspace === '.' || root.workspace === './') root.workspace = '.';

const sq = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const backendCmd =
  root.backend_cmd && typeof root.backend_cmd === 'object' ? { ...root.backend_cmd } : null;
const renderUrl = typeof root.renderUrlCommand === 'string' ? root.renderUrlCommand : null;
delete root.backend_cmd;
delete root.renderUrlCommand;

let dumped = yaml.dump(root, { lineWidth: -1, noRefs: true });
if (backendCmd) {
  dumped += 'backend_cmd:\n';
  for (const [ck, cv] of Object.entries(backendCmd)) {
    if (typeof cv === 'string') dumped += `  ${ck}: ${sq(cv)}\n`;
    else dumped += `  ${ck}: ${JSON.stringify(cv)}\n`;
  }
}
if (renderUrl !== null) {
  dumped += `renderUrlCommand: ${sq(renderUrl)}\n`;
}
fs.writeFileSync(rootPath, dumped);
