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

/**
 * A dump is one page load in one session at one state, so a revision holds one
 * dump per declared state. Sharing a single dump across states would attach the
 * DOM of whichever state happened to be walked to every other state's sample —
 * an artifact that claims structure it never observed.
 */
export function sourceDumpName(state: string): string {
  if (!state) throw new Error('source dump: expected a state name');
  return `extract--${state}.json`;
}

export function loadSourceDump(directory: string, state: string): CapturedSource {
  const name = sourceDumpName(state);
  const dump = JSON.parse(readFileSync(join(directory, name), 'utf8')) as CapturedSource;
  if (!dump || !Array.isArray(dump.nodes)) throw new Error(`${name}: expected a source dump with nodes[]`);
  return dump;
}

/** Every distinct state declared across a revision's elements, in stable order. */
export function declaredStates(meta: ObservationMeta): string[] {
  return [...new Set(meta.elements.flatMap((element) => element.states.map((state) => state.name)))].sort();
}

export function loadSourceDumps(directory: string, states: string[]): Map<string, CapturedSource> {
  return new Map(states.map((state) => [state, loadSourceDump(directory, state)]));
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
  dumps: Map<string, CapturedSource>,
  meta: ObservationMeta,
  directory: string,
): ObservationExtract {
  const files = listFiles(directory);
  const images: ObservationExtract['images'] = [];
  const fonts: ObservationExtract['fonts'] = [];
  const fontSeen = new Set<string>();
  const imageSeen = new Set<string>();

  // Only a family the observed document declares as `@font-face` is a font the
  // source ships. Every other non-generic token in a computed `font-family`
  // stack — `"Segoe UI"`, `Arial`, `Apple Color Emoji` — is an OS fallback the
  // page names but never delivers, so demanding a binary for it would make any
  // real-world site unpublishable.
  const declaredFaces = new Set(
    [...dumps.values()].flatMap((dump) =>
      (dump.font_faces ?? []).flatMap((face) => cssFontFamilies(face.family).map(fontIdentity)),
    ),
  );

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
    // A declared face owes a binary even when none was downloaded yet; a family
    // whose binary already sits in `assets/` is self-hosted on that evidence.
    const shipped = !generic && (declaredFaces.has(name) || Boolean(local));
    fonts.push({
      family: name,
      source: generic ? 'system' : shipped ? 'self-hosted' : 'other',
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
    // Resolve the subject once per state: each state has its own dump, so its
    // node, subtree, fonts and images are the ones actually observed there.
    const perState = new Map(
      element.states.map((state) => {
        const dump = dumps.get(state.name);
        const node = dump ? matchNode(dump, element.locator.value) : undefined;
        return [state.name, { dump, node, tree: dump && node ? descendants(dump, node) : [] }] as const;
      }),
    );
    for (const { tree } of perState.values())
      for (const item of tree) {
        if (item.style.font_family) for (const family of cssFontFamilies(item.style.font_family)) rememberFont(family);
        if (item.src) rememberImage(item.src, item.alt);
      }
    const samples: ObservationSample[] = element.views.flatMap((view) =>
      element.states.map((state) => {
        const { dump, node, tree } = perState.get(state.name)!;
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
          structure:
            dump && node
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
          // Declaring (subject, state) asserts the subject is observable there.
          // Both gaps are therefore required failures: the earlier "only rest
          // counts" heuristic let a non-rest state publish an empty structure.
          unavailable: !dump
            ? [
                {
                  property: 'structure',
                  reason: `State ${state.name} has no source dump ${sourceDumpName(state.name)}`,
                  required: true,
                },
              ]
            : node
              ? []
              : [
                  {
                    property: 'structure',
                    reason: `Locator ${element.locator.value} is absent from ${sourceDumpName(state.name)}`,
                    required: true,
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
  const dumps = loadSourceDumps(directory, declaredStates(meta));
  return { meta, extract: projectObservations(dumps, meta, directory) };
}
