/**
 * `twig check-includes` — checks that every `{% include '@<ns>/<id>/<id>.twig' with { … } %}`
 * in a Twig file passes only the props and slots its `<id>.schema.yml` declares, and binds
 * every required prop. Used as a backend `validate_cmd` for generated templates.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type { Command } from 'commander';
import { loadConfig } from '../shared/config.js';

/** Top-level keys of a Twig hash literal body (`a: 1, b: {c: 2}` → [a, b]). */
function hashKeys(body: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let i = 0; i <= body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === quote && body[i - 1] !== '\\') quote = '';
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === '{' || ch === '[' || ch === '(') depth++;
    else if (ch === '}' || ch === ']' || ch === ')') depth--;
    else if ((ch === ',' && depth === 0) || i === body.length) {
      const key = body.slice(start, i).match(/^\s*['"]?([A-Za-z_]\w*)['"]?\s*:/);
      if (key) keys.push(key[1]!);
      start = i + 1;
    }
  }
  return keys;
}

/** Hash body after `with {` up to its matching `}`. */
function withBody(source: string, from: number): string {
  let depth = 1;
  for (let i = from; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(from, i);
  }
  return source.slice(from);
}

export function checkTwigIncludes(source: string, componentsDir: string, namespace: string): string[] {
  const errors: string[] = [];
  const include = new RegExp(`\\{%-?\\s*include\\s+['"]@${namespace}/([^/'"]+)/[^'"]+\\.twig['"]([^%]*)`, 'g');
  for (const m of source.matchAll(include)) {
    const id = m[1]!;
    const schemaFile = join(componentsDir, id, `${id}.schema.yml`);
    if (!existsSync(schemaFile)) {
      errors.push(`${id}: no components/${id}/${id}.schema.yml`);
      continue;
    }
    const schema = (parseYaml(readFileSync(schemaFile, 'utf8')) ?? {}) as {
      props?: { properties?: Record<string, unknown>; required?: string[] };
      slots?: Record<string, unknown>;
    };
    const declared = new Set([...Object.keys(schema.props?.properties ?? {}), ...Object.keys(schema.slots ?? {})]);
    const tail = m.index! + m[0].length - m[2]!.length;
    const withAt = m[2]!.search(/\bwith\s*\{/);
    const passed = withAt < 0 ? [] : hashKeys(withBody(source, source.indexOf('{', tail + withAt) + 1));
    for (const key of passed) {
      if (!declared.has(key)) errors.push(`${id}: "${key}" is not a prop or slot of ${id}.schema.yml`);
    }
    for (const req of schema.props?.required ?? []) {
      if (!passed.includes(req)) errors.push(`${id}: required prop "${req}" is not bound`);
    }
  }
  return errors;
}

export function register(program: Command): void {
  program
    .command('twig')
    .description('Twig component framework utilities')
    .command('check-includes <unit> <file>')
    .description("Check component includes in a Twig file against the components' <id>.schema.yml")
    .action((_unit: string, file: string) => {
      if (!file.endsWith('.twig')) return;
      const config = loadConfig();
      const errors = checkTwigIncludes(
        readFileSync(file, 'utf8'),
        String(config['dirs.components'] ?? join(String(config['designbook.home']), 'components')),
        String(config['component.namespace']),
      );
      if (errors.length) {
        console.error(errors.join('\n'));
        process.exitCode = 1;
      }
    });
}
