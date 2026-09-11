/**
 * Browser pass that writes one source dump (`extract--<state>.json`) and returns
 * the catalogue skeleton for `reference save` stdout. One dump records one state
 * observed in one session.
 */

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CapturedSource, PropertyNode } from '../tools/inspect/element-walker.js';
import type { StyleEnv } from '../tools/inspect/style-env.js';
import type { DesignbookConfig } from '../shared/config.js';
import { cssFontFamilies } from '../tools/css-font-families.js';
import type { CaptureStep } from '../tools/capture-browser.js';

export interface ExtractLandmark {
  label: string;
  role: string;
  locator: string;
}
export interface ExtractInteractive {
  label: string;
  kind: string;
  text?: string;
  href?: string;
  locator: string;
}
export interface ExtractForm {
  label: string;
  locator: string;
  fields: Array<{ label: string; kind: string; locator: string }>;
}
export interface ExtractImage {
  src: string;
  alt?: string;
  locator: string;
}
export interface ExtractSkeleton {
  url: string;
  breakpoints: string[];
  landmarks: ExtractLandmark[];
  interactive: ExtractInteractive[];
  forms: ExtractForm[];
  images: ExtractImage[];
  fonts: string[];
  /**
   * `@font-face` binaries per family, restricted to the families the walked
   * document actually uses. Capture rules require a local copy of every
   * non-system font, and a computed `font-family` names a family, never a file.
   */
  font_faces: Array<{ family: string; weight?: string; style?: string; urls: string[] }>;
  colors: string[];
}

const INTERACTIVE_KINDS = new Set(['button', 'link', 'input']);

// cssFontFamilies moved to the tools/css-font-families leaf (DESIGNBOOK-60 R5)
// to break the reference-project ↔ extract-page cycle; re-exported here so the
// existing `extract-page` importers keep their public surface.
export { cssFontFamilies };

/** Collect the ids of every descendant of `rootId` from the flat node list. */
function descendantIds(nodes: PropertyNode[], rootId: string): Set<string> {
  const byParent = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parent_id) continue;
    (byParent.get(n.parent_id) ?? byParent.set(n.parent_id, []).get(n.parent_id)!).push(n.id);
  }
  const out = new Set<string>();
  const stack = [...(byParent.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(byParent.get(id) ?? []));
  }
  return out;
}

/**
 * Assemble the catalogue skeleton from a captured DOM tree and (optional)
 * document style env. Pure: same inputs → same output, no browser or IO.
 */
export function buildExtractSkeleton(
  captured: CapturedSource,
  styleEnv: StyleEnv | undefined,
  meta: { url: string; breakpoints: string[] },
): ExtractSkeleton {
  const nodes = captured.nodes ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const landmarks: ExtractLandmark[] = [];
  const interactive: ExtractInteractive[] = [];
  const forms: ExtractForm[] = [];
  const images: ExtractImage[] = [];
  const fonts = new Set<string>();
  const colors = new Set<string>();

  for (const n of nodes) {
    if (n.role) landmarks.push({ label: n.label, role: n.role, locator: n.source.locator });

    if (INTERACTIVE_KINDS.has(n.kind)) {
      interactive.push({
        label: n.label,
        kind: n.kind,
        ...(n.text ? { text: n.text } : {}),
        ...(n.href ? { href: n.href } : {}),
        locator: n.source.locator,
      });
    }

    if (n.kind === 'form') {
      const descendants = descendantIds(nodes, n.id);
      const fields = [...descendants]
        .map((id) => byId.get(id)!)
        .filter((c) => c && c.kind === 'input')
        .map((c) => ({ label: c.label, kind: c.kind, locator: c.source.locator }));
      forms.push({ label: n.label, locator: n.source.locator, fields });
    }

    if ((n.kind === 'image' || n.kind === 'icon') && n.src) {
      images.push({ src: n.src, ...(n.alt ? { alt: n.alt } : {}), locator: n.source.locator });
    }

    if (n.style?.font_family) for (const family of cssFontFamilies(n.style.font_family)) fonts.add(family);
    if (n.style?.background) colors.add(n.style.background);
    if (n.style?.foreground) colors.add(n.style.foreground);
  }

  for (const f of styleEnv?.fonts ?? []) {
    if (!f.family) continue;
    for (const family of cssFontFamilies(f.family)) fonts.add(family);
  }

  // Only the faces of families the document actually renders: a stylesheet
  // routinely declares a dozen weights the observed page never uses, and the
  // capture would otherwise be told to download all of them.
  const usedFaces = (styleEnv?.font_faces ?? []).filter((face) =>
    cssFontFamilies(face.family).some((family) => fonts.has(family)),
  );

  return {
    url: meta.url,
    breakpoints: meta.breakpoints,
    landmarks,
    interactive,
    forms,
    images,
    fonts: [...fonts].sort(),
    font_faces: usedFaces,
    colors: [...colors].sort(),
  };
}

/** Parse a comma-separated breakpoint list (`sm,xl`) into trimmed names. */
export function parseBreakpointNames(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Capture the DOM tree into `<out>/extract.json` and return the catalogue skeleton.
 */
export async function runExtractPage(
  url: string,
  outDir: string,
  opts: {
    breakpoints: string[];
    fonts: string[];
    /** Observed state this dump records; names the dump file. */
    state: string;
    /** Named session to observe as; resolved through `config.sessions`. */
    session: string;
    /** Steps that reach the recorded state before the walk. */
    steps?: CaptureStep[];
    /** Prelude module run after navigation. */
    prelude?: string;
  },
  config: DesignbookConfig,
): Promise<{ dumpPath: string; catalogue: ExtractSkeleton }> {
  const { capture } = await import('../tools/inspect/capture.js');
  const { resolveBreakpointWidths } = await import('../tools/inspect/breakpoint-widths.js');
  const { sourceDumpName } = await import('../tools/reference-project.js');
  const { prepareCapturePass } = await import('../tools/capture-session.js');

  await mkdir(outDir, { recursive: true });
  const dumpPath = resolve(outDir, sourceDumpName(opts.state));
  const widths = resolveBreakpointWidths(config, opts.breakpoints);
  const { storageState, prelude } = await prepareCapturePass(config, {
    session: opts.session,
    ...(opts.prelude ? { prelude: opts.prelude } : {}),
  });
  await capture(url, dumpPath, widths, {
    session: opts.session,
    state: opts.state,
    ...(storageState ? { storageState } : {}),
    ...(prelude ? { prelude } : {}),
    ...(opts.steps ? { steps: opts.steps } : {}),
  });

  const { readFile } = await import('node:fs/promises');
  const captured = JSON.parse(await readFile(dumpPath, 'utf-8')) as CapturedSource;

  let styleEnv: StyleEnv | undefined;
  try {
    const { captureStyleEnv } = await import('../tools/inspect/style-env.js');
    styleEnv = await captureStyleEnv(url, { fonts: opts.fonts });
  } catch {
    styleEnv = undefined; // degrade — the captured tree still yields fonts/colors
  }

  const catalogue = buildExtractSkeleton(captured, styleEnv, {
    url,
    breakpoints: widths.map((w) => w.name).filter(Boolean),
  });

  // The walk records computed `font-family` stacks, which name OS fallbacks the
  // source does not ship. Persisting the used `@font-face` families alongside
  // the nodes is what later lets the projection tell "self-hosted, download it"
  // from "named as a fallback, nothing to download".
  const { writeFile } = await import('node:fs/promises');
  await writeFile(dumpPath, JSON.stringify({ ...captured, font_faces: catalogue.font_faces }, null, 2), 'utf-8');

  return { dumpPath, catalogue };
}
