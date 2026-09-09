/**
 * Browser pass that writes one source dump (`extract--<state>.json`) and returns
 * the catalogue skeleton for `reference save` stdout. One dump records one state
 * observed in one session.
 */

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CapturedSource, PropertyNode } from '../inspect/element-walker.js';
import type { StyleEnv } from '../inspect/style-env.js';
import type { DesignbookConfig } from '../config.js';
import type { CaptureStep } from './capture-browser.js';

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
  colors: string[];
}

const INTERACTIVE_KINDS = new Set(['button', 'link', 'input']);

/**
 * Split a computed CSS `font-family` stack into family identities.
 * `"Sarabun Light", sans-serif` → `Sarabun Light`, `sans-serif`.
 */
export function cssFontFamilies(value: string): string[] {
  const families: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (const ch of value) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ',') {
      const family = current.trim();
      if (family) families.push(family);
      current = '';
      continue;
    }
    current += ch;
  }
  const family = current.trim();
  if (family) families.push(family);
  return families;
}

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

  return {
    url: meta.url,
    breakpoints: meta.breakpoints,
    landmarks,
    interactive,
    forms,
    images,
    fonts: [...fonts].sort(),
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
  const { capture } = await import('../inspect/capture.js');
  const { resolveBreakpointWidths } = await import('../inspect/breakpoint-widths.js');
  const { sourceDumpName } = await import('../reference-project.js');
  const { prepareCapturePass } = await import('./capture-session.js');

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
    const { captureStyleEnv } = await import('../inspect/style-env.js');
    styleEnv = await captureStyleEnv(url, { fonts: opts.fonts });
  } catch {
    styleEnv = undefined; // degrade — the captured tree still yields fonts/colors
  }

  const catalogue = buildExtractSkeleton(captured, styleEnv, {
    url,
    breakpoints: widths.map((w) => w.name).filter(Boolean),
  });
  return { dumpPath, catalogue };
}
