import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative, sep } from 'node:path';
import { globSync } from 'glob';
import type { Plugin } from 'vite';

// `twing` is an optional peer: load it lazily, and through its CJS build — the ESM build
// imports extension-less `locutus/*` paths that only a bundler (Vite) resolves.
const require = createRequire(import.meta.url);

const ENV_ID = 'virtual:designbook-twig-env';

// Twing autoescapes only when `autoEscapingStrategy` is set; leaving it unset matches the
// project convention (templates escape text props with `|e`, slots arrive as raw HTML).

function templateName(componentsDir: string, namespace: string, file: string): string {
  return `@${namespace}/${relative(componentsDir, file).split(sep).join('/')}`;
}

function templateMap(componentsDir: string, namespace: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const file of globSync('**/*.twig', { cwd: componentsDir, absolute: true })) {
    map[templateName(componentsDir, namespace, file)] = readFileSync(file, 'utf-8');
  }
  return map;
}

/** Node-side render with the same environment shape as the browser module. */
export function renderTwigForTest(componentsDir: string, namespace: string, file: string, ctx: object): string {
  const { createSynchronousArrayLoader, createSynchronousEnvironment } = require('twing') as typeof import('twing');
  const env = createSynchronousEnvironment(createSynchronousArrayLoader(templateMap(componentsDir, namespace)));
  return env.render(templateName(componentsDir, namespace, file), ctx as Record<string, unknown>);
}

/** `.twig` under componentsDir → `export default (ctx) => html` via one shared sync Twing env. */
export function designbookTwigPlugin(opts: { componentsDir: string; namespace: string }): Plugin {
  return {
    name: 'designbook-twig',
    resolveId: (id) => (id === ENV_ID ? '\0' + ENV_ID : null),
    load(id) {
      if (id === '\0' + ENV_ID) {
        for (const f of globSync('**/*.twig', { cwd: opts.componentsDir, absolute: true })) this.addWatchFile(f);
        return [
          `import { createSynchronousArrayLoader, createSynchronousEnvironment } from 'twing';`,
          `const templates = ${JSON.stringify(templateMap(opts.componentsDir, opts.namespace))};`,
          `export const env = createSynchronousEnvironment(createSynchronousArrayLoader(templates));`,
        ].join('\n');
      }
      if (!id.endsWith('.twig') || !id.startsWith(opts.componentsDir)) return null;
      return [
        `import { env } from '${ENV_ID}';`,
        `export default (ctx) => env.render(${JSON.stringify(templateName(opts.componentsDir, opts.namespace, id))}, ctx);`,
      ].join('\n');
    },
    handleHotUpdate({ file, server }) {
      if (!file.endsWith('.twig')) return;
      const mod = server.moduleGraph.getModuleById('\0' + ENV_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },
  };
}
