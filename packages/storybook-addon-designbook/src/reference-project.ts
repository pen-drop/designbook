/** Project a stored source dump plus meta.yml and PNGs into query observations. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { load } from 'js-yaml';
import { cssFontFamilies } from './cli/extract-page.js';
import type { CapturedSource, CapturedSourceStyle, PropertyNode } from './inspect/element-walker.js';
import type { ObservationExtract, ObservationMeta, ObservationSample } from './reference-capture.js';

const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
  'inherit',
  'initial',
  'unset',
  'revert',
  '-apple-system',
  'blinkmacsystemfont',
]);

export const SOURCE_DUMP = 'extract.json';

export function loadSourceDump(directory: string): CapturedSource {
  const dump = JSON.parse(readFileSync(join(directory, SOURCE_DUMP), 'utf8')) as CapturedSource;
  if (!dump || !Array.isArray(dump.nodes)) throw new Error(`${SOURCE_DUMP}: expected a source dump with nodes[]`);
  return dump;
}

export function pngSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function listFiles(root: string, dir = root): string[] {
  const out: string[] = [];
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(root, path));
    else if (entry.isFile()) out.push(relative(root, path));
  }
  return out;
}

function fontIdentity(family: string): string {
  return family.trim();
}

function isGeneric(family: string): boolean {
  return GENERIC_FAMILIES.has(family.trim().toLowerCase());
}

function layoutFromStyle(style: CapturedSourceStyle): Record<string, string> {
  const display =
    style.layout === 'flex-row' || style.layout === 'flex-col'
      ? 'flex'
      : style.layout === 'grid'
        ? 'grid'
        : style.layout === 'stack'
          ? 'block'
          : 'block';
  return {
    display,
    ...(style.gap ? { gap: style.gap } : {}),
    ...(style.padding && style.padding !== '0' ? { padding: style.padding } : {}),
    ...(style.margin && style.margin !== '0' ? { margin: style.margin } : {}),
  };
}

function matchNode(dump: CapturedSource, locatorValue: string): PropertyNode | undefined {
  return dump.nodes.find((node) => node.source.locator === locatorValue);
}

function structureOf(dump: CapturedSource, root: PropertyNode, locatorKind: string): ObservationSample['structure'] {
  const byId = new Map(dump.nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const nodes: ObservationSample['structure']['nodes'] = [];
  const visit = (id: string) => {
    if (seen.has(id)) return;
    const node = byId.get(id);
    if (!node) return;
    seen.add(id);
    nodes.push({
      id: node.id,
      kind: node.kind,
      locator: { kind: locatorKind, value: node.source.locator },
      children: [...node.child_ids],
    });
    node.child_ids.forEach(visit);
  };
  visit(root.id);
  return { roots: [root.id], nodes };
}

function descendants(dump: CapturedSource, root: PropertyNode): PropertyNode[] {
  const byId = new Map(dump.nodes.map((node) => [node.id, node]));
  const out: PropertyNode[] = [];
  const walk = (id: string) => {
    const node = byId.get(id);
    if (!node) return;
    out.push(node);
    node.child_ids.forEach(walk);
  };
  walk(root.id);
  return out;
}

function captureName(view: string, subject: string, state: string): string {
  return `${view}--${subject}--${state}.png`;
}

export function projectObservations(
  dump: CapturedSource,
  meta: ObservationMeta,
  directory: string,
): ObservationExtract {
  const files = listFiles(directory);
  const images: ObservationExtract['images'] = [];
  const fonts: ObservationExtract['fonts'] = [];
  const fontSeen = new Set<string>();
  const imageSeen = new Set<string>();

  const rememberFont = (family: string) => {
    const name = fontIdentity(family);
    if (!name || fontSeen.has(name)) return name;
    fontSeen.add(name);
    const generic = isGeneric(name);
    const needle = name.toLowerCase().replace(/\s+/g, '');
    const local = files.find(
      (file) =>
        file.startsWith('assets/') &&
        /\.(woff2?|ttf|otf)$/i.test(file) &&
        file
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .includes(needle),
    );
    fonts.push({
      family: name,
      source: generic ? 'system' : local ? 'self-hosted' : 'other',
      ...(local ? { files: [{ local_path: local, format: local.split('.').pop() }] } : generic ? {} : { files: [] }),
    });
    return name;
  };

  const rememberImage = (url: string, alt?: string) => {
    if (!url || imageSeen.has(url)) return url;
    imageSeen.add(url);
    const base = url.split('/').pop()?.split('?')[0] ?? url;
    const stem = base.replace(/\.[^.]+$/, '').toLowerCase();
    const local = files.find((file) => {
      if (!file.startsWith('assets/')) return false;
      const name = file.slice('assets/'.length).toLowerCase();
      return name === base.toLowerCase() || name.startsWith(`${stem}.`) || name === stem;
    });
    images.push({
      url,
      role: 'other',
      ...(alt ? { alt } : {}),
      reference_path: local ?? `assets/${base}`,
    });
    return url;
  };

  const captures: ObservationExtract['captures'] = [];
  const subjects: ObservationExtract['subjects'] = meta.elements.map((element) => {
    const node = matchNode(dump, element.locator.value);
    const tree = node ? descendants(dump, node) : [];
    for (const item of tree) {
      if (item.style.font_family) for (const family of cssFontFamilies(item.style.font_family)) rememberFont(family);
      if (item.src) rememberImage(item.src, item.alt);
    }
    const samples: ObservationSample[] = element.views.flatMap((view) =>
      element.states.map((state) => {
        const path = captureName(view.id, element.id, state.name);
        const file = join(directory, path);
        const bytes = readFileSync(file);
        const size = pngSize(bytes);
        captures.push({
          subject: element.id,
          view: view.id,
          state: state.name,
          path,
          width: size.width,
          height: size.height,
        });
        const families = [
          ...new Set(
            tree.flatMap((item) =>
              item.style.font_family ? cssFontFamilies(item.style.font_family).map(fontIdentity) : [],
            ),
          ),
        ];
        const assetIds = [...new Set(tree.map((item) => item.src).filter((src): src is string => Boolean(src)))];
        const sample: ObservationSample = {
          view: view.id,
          state: state.name,
          ...(view.breakpoint ? { breakpoint: view.breakpoint } : {}),
          structure: node
            ? structureOf(dump, node, element.locator.kind)
            : {
                roots: [element.id],
                nodes: [
                  {
                    id: element.id,
                    kind: 'missing',
                    locator: element.locator,
                    children: [],
                  },
                ],
              },
          observations: node
            ? {
                layout: layoutFromStyle(node.style),
                typography: families.map((family) => ({ family, size: node.style.font_size })),
                content: [
                  ...(node.text ? [{ text: node.text }] : []),
                  ...tree.filter((item) => item.alt).map((item) => ({ alt: item.alt })),
                ],
                interactions: [{ state: state.name }],
                properties: {
                  ...(node.style.background ? { background: node.style.background } : {}),
                  ...(node.style.foreground ? { foreground: node.style.foreground } : {}),
                },
              }
            : { layout: {}, interactions: [{ state: state.name }] },
          dependencies: { parent_ids: [], asset_ids: assetIds, font_families: families },
          unavailable: node
            ? []
            : [
                {
                  property: 'structure',
                  reason: `Locator ${element.locator.value} is absent from the saved extract dump`,
                  required: state.name === 'rest',
                },
              ],
        };
        return sample;
      }),
    );
    return { id: element.id, locator: element.locator, samples };
  });

  return { subjects, parents: [], images, fonts, captures };
}

export function projectPublishedObservations(directory: string): {
  meta: ObservationMeta;
  extract: ObservationExtract;
} {
  if (!isAbsolute(directory)) throw new Error('reference: expected absolute revision directory');
  const meta = load(readFileSync(join(directory, 'meta.yml'), 'utf8')) as ObservationMeta;
  const dump = loadSourceDump(directory);
  return { meta, extract: projectObservations(dump, meta, directory) };
}
